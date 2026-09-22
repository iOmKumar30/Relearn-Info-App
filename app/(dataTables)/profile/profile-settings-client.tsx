"use client";

import { UploadButton } from "@/libs/uploadthing";
import {
  Camera,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Mail,
  Save,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";

type Profile = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  address: string | null;
  gender: "M" | "F" | "O" | null;
  avatarUrl: string | null;
  roles: string[];
  hasPassword: boolean;
  canChangeEmail: boolean;
  emailManagedBy: string[];
};

type PasswordForm = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

const EMPTY_PASSWORD_FORM: PasswordForm = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

function initials(name: string | null, email: string) {
  const words = (name || email)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  return words.map((word) => word[0]?.toUpperCase()).join("") || "U";
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="mb-1.5 block text-sm font-medium text-slate-700">{children}</label>;
}

export default function ProfileSettingsClient() {
  const router = useRouter();
  const { update } = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [form, setForm] = useState<Profile | null>(null);
  const [passwordForm, setPasswordForm] = useState<PasswordForm>(EMPTY_PASSWORD_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function loadProfile() {
      try {
        const response = await fetch("/api/users/me", { cache: "no-store" });
        if (!response.ok) throw new Error(await response.text());
        const nextProfile = (await response.json()) as Profile;
        if (mounted) {
          setProfile(nextProfile);
          setForm(nextProfile);
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to load your profile");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadProfile();
    return () => {
      mounted = false;
    };
  }, []);

  const profileChanged = useMemo(
    () => JSON.stringify(profile) !== JSON.stringify(form),
    [form, profile],
  );

  function updateField<Key extends keyof Profile>(key: Key, value: Profile[Key]) {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form) return;
    if (!form.name?.trim()) {
      toast.error("Name is required");
      return;
    }

    try {
      setSaving(true);
      const response = await fetch("/api/users/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          address: form.address,
          gender: form.gender,
          avatarUrl: form.avatarUrl,
        }),
      });
      if (!response.ok) throw new Error(await response.text());

      const saved = await response.json();
      const nextProfile = { ...form, ...saved };
      setProfile(nextProfile);
      setForm(nextProfile);
      await update({
        name: saved.name,
        email: saved.email,
        image: saved.avatarUrl,
      });
      router.refresh();
      toast.success("Profile updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save profile");
    } finally {
      setSaving(false);
    }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("New password and confirmation do not match");
      return;
    }

    try {
      setChangingPassword(true);
      const response = await fetch("/api/users/me/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });
      if (!response.ok) throw new Error(await response.text());

      setPasswordForm(EMPTY_PASSWORD_FORM);
      toast.success("Password changed. Please sign in again.");
      window.setTimeout(() => signOut({ callbackUrl: "/" }), 900);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to change password");
    } finally {
      setChangingPassword(false);
    }
  }

  if (loading || !form) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-blue-600" aria-label="Loading profile" />
      </div>
    );
  }

  const inputClass = "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500";

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 pb-10">
      <header className="rounded-3xl border border-slate-200 bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
              <UserRound className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">Account</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Profile settings</h1>
              <p className="mt-1 text-sm text-slate-600">Manage the personal details and sign-in settings for your account.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {form.roles.map((role) => (
              <span key={role} className="rounded-full border border-blue-100 bg-white/80 px-3 py-1 text-xs font-semibold text-blue-700 shadow-sm">
                {role.replaceAll("_", " ")}
              </span>
            ))}
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_330px]">
        <form onSubmit={saveProfile} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-xl bg-slate-100 p-2 text-slate-600"><UserRound className="h-5 w-5" /></div>
            <div>
              <h2 className="font-bold text-slate-900">Personal details</h2>
              <p className="text-sm text-slate-500">Only you can edit these details.</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel>Full name</FieldLabel>
              <input className={inputClass} value={form.name ?? ""} onChange={(event) => updateField("name", event.target.value)} maxLength={120} autoComplete="name" required />
            </div>
            <div>
              <FieldLabel>Email address</FieldLabel>
              <input className={inputClass} type="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} maxLength={254} autoComplete="email" disabled={!form.canChangeEmail} required />
              {!form.canChangeEmail && (
                <p className="mt-1.5 text-xs leading-5 text-slate-500">Managed by {form.emailManagedBy.join(", ") || "your sign-in provider"}.</p>
              )}
            </div>
            <div>
              <FieldLabel>Phone number</FieldLabel>
              <input className={inputClass} type="tel" value={form.phone ?? ""} onChange={(event) => updateField("phone", event.target.value || null)} maxLength={24} autoComplete="tel" placeholder="Add a phone number" />
            </div>
            <div>
              <FieldLabel>Gender</FieldLabel>
              <select className={inputClass} value={form.gender ?? ""} onChange={(event) => updateField("gender", (event.target.value || null) as Profile["gender"])}>
                <option value="">Prefer not to say</option>
                <option value="M">Male</option>
                <option value="F">Female</option>
                <option value="O">Other</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <FieldLabel>Address</FieldLabel>
              <textarea className={`${inputClass} min-h-28 resize-y`} value={form.address ?? ""} onChange={(event) => updateField("address", event.target.value || null)} maxLength={500} autoComplete="street-address" placeholder="Street, city, state, and postal code" />
            </div>
          </div>

          <div className="mt-7 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500">Your role, membership, and account-status information is managed separately.</p>
            <button type="submit" disabled={saving || !profileChanged} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save changes
            </button>
          </div>
        </form>

        <aside className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 text-center shadow-sm">
            <div className="mx-auto flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-3xl font-bold text-white shadow-xl shadow-blue-600/20">
              {form.avatarUrl ? <img src={form.avatarUrl} alt="Your profile" className="h-full w-full object-cover" /> : initials(form.name, form.email)}
            </div>
            <h2 className="mt-4 font-bold text-slate-900">Profile photo</h2>
            <p className="mt-1 text-sm leading-5 text-slate-500">Use a square image up to 2 MB for the best result.</p>
            <div className="mt-4 flex flex-col items-center gap-2">
              <UploadButton
                endpoint="profilePhoto"
                appearance={{
                  button: "ut-ready:bg-blue-600 ut-uploading:cursor-not-allowed rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700",
                  allowedContent: "hidden",
                }}
                content={{ button: ({ ready }) => ready ? <span className="inline-flex items-center gap-2"><Camera className="h-4 w-4" />Upload photo</span> : "Preparing upload…" }}
                onClientUploadComplete={(result) => {
                  const url = result?.[0]?.url;
                  if (url) {
                    updateField("avatarUrl", url);
                    toast.success("Photo ready. Save your profile to apply it.");
                  }
                }}
                onUploadError={() => {
                  toast.error("Photo upload failed. Please try another image.");
                }}
              />
              {form.avatarUrl && (
                <button type="button" onClick={() => updateField("avatarUrl", null)} className="text-xs font-semibold text-rose-600 transition hover:text-rose-700">Remove photo</button>
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-emerald-50 p-2 text-emerald-700"><ShieldCheck className="h-5 w-5" /></div>
              <div>
                <h2 className="font-bold text-slate-900">Account protection</h2>
                <p className="mt-1 text-sm leading-5 text-slate-500">Roles, membership, approvals, and account status cannot be changed here.</p>
              </div>
            </div>
          </section>
        </aside>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-amber-50 p-2 text-amber-700"><KeyRound className="h-5 w-5" /></div>
          <div>
            <h2 className="font-bold text-slate-900">Change password</h2>
            <p className="mt-1 text-sm text-slate-500">You will be signed out after changing it.</p>
          </div>
        </div>

        {form.hasPassword ? (
          <form onSubmit={changePassword} className="mt-6 grid gap-4 lg:grid-cols-3">
            {(["currentPassword", "newPassword", "confirmPassword"] as const).map((field) => (
              <div key={field}>
                <FieldLabel>{field === "currentPassword" ? "Current password" : field === "newPassword" ? "New password" : "Confirm new password"}</FieldLabel>
                <div className="relative">
                  <input className={`${inputClass} pr-11`} type={showPasswords ? "text" : "password"} value={passwordForm[field]} onChange={(event) => setPasswordForm((current) => ({ ...current, [field]: event.target.value }))} autoComplete={field === "currentPassword" ? "current-password" : "new-password"} required />
                  <button type="button" onClick={() => setShowPasswords((visible) => !visible)} className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-slate-400 hover:text-slate-700" aria-label={showPasswords ? "Hide passwords" : "Show passwords"}>{showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                </div>
              </div>
            ))}
            <div className="flex items-end">
              <button type="submit" disabled={changingPassword} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-500/20 disabled:cursor-not-allowed disabled:opacity-50">
                {changingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Change password
              </button>
            </div>
          </form>
        ) : (
          <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800"><Mail className="mr-2 inline h-4 w-4" />This account uses an external sign-in provider. Manage its password with that provider.</div>
        )}
      </section>
    </div>
  );
}
