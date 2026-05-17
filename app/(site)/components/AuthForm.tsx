"use client";

import axios from "axios";
import { signIn, useSession } from "next-auth/react";
import Script from "next/script";
import { BsGoogle } from "react-icons/bs";

import Button from "@/components/Button";
import Input from "@/components/Inputs/Input";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { FieldValues, SubmitHandler, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import AuthSocialButton from "./AuthSocialButton";

type Variant = "LOGIN" | "REGISTER";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: {
          sitekey: string;
          callback?: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
        },
      ) => string;
      reset: (widgetId?: string) => void;
      remove?: (widgetId?: string) => void;
    };
  }
}

export function AuthForm() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [variant, setVariant] = useState<Variant>("LOGIN");
  const [isLoading, setIsLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileReady, setTurnstileReady] = useState(false);

  const turnstileRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.roles) {
      const roles = session.user.roles;

      if (roles.includes("PENDING")) {
        router.push("/pending");
      } else {
        router.push("/dashboard");
      }
    }
  }, [status, session, router]);

  const renderTurnstile = useCallback(() => {
    if (!window.turnstile || !turnstileRef.current) return;
    if (widgetIdRef.current) return;

    widgetIdRef.current = window.turnstile.render(turnstileRef.current, {
      sitekey: process.env.NEXT_PUBLIC_CF_TURNSTILE_SITE_KEY!,
      theme: "auto",
      callback: (token: string) => {
        setTurnstileToken(token);
      },
      "expired-callback": () => {
        setTurnstileToken("");
        toast.error("Verification expired. Please verify again.");
      },
      "error-callback": () => {
        setTurnstileToken("");
        toast.error("Verification failed. Please try again.");
      },
    });
  }, []);

  const resetTurnstile = useCallback(() => {
    setTurnstileToken("");

    if (window.turnstile && widgetIdRef.current) {
      window.turnstile.reset(widgetIdRef.current);
    }
  }, []);

  const toggleVariant = useCallback(() => {
    setVariant((current) => (current === "LOGIN" ? "REGISTER" : "LOGIN"));
    resetTurnstile();
  }, [resetTurnstile]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FieldValues>({
    defaultValues: {
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    if (turnstileReady) {
      renderTurnstile();
    }
  }, [turnstileReady, renderTurnstile]);

  const getAxiosErrorMessage = (error: any) => {
    const status = error?.response?.status;
    const serverMessage =
      error?.response?.data?.error || error?.response?.data || error?.message;

    if (status === 429) {
      const retryAfter = error?.response?.headers?.["retry-after"];
      return retryAfter
        ? `Too many attempts. Please wait ${retryAfter} seconds and try again.`
        : "Too many attempts. Please try again later.";
    }

    if (status === 403) {
      return "Bot verification failed. Please complete the verification and try again.";
    }

    if (status === 400) {
      if (typeof serverMessage === "string") return serverMessage;
      return "Invalid request. Please check your details and try again.";
    }

    if (status === 500) {
      return "Server error. Please try again after some time.";
    }

    return typeof serverMessage === "string"
      ? serverMessage
      : "Something went wrong. Please try again.";
  };

  const onSubmit: SubmitHandler<FieldValues> = async (data) => {
    if (!turnstileToken) {
      toast.error("Please complete the verification first.");
      return;
    }

    setIsLoading(true);

    if (variant === "REGISTER") {
      const loadingToast = toast.loading("Creating your account...");

      try {
        await axios.post("/api/register", {
          ...data,
          cfToken: turnstileToken,
        });
        const tokenSnapshot = turnstileToken;
        toast.success("Registration successful! Signing you in...", {
          id: loadingToast,
        });

        resetTurnstile();

        const callback = await signIn("credentials", {
          ...data,
          cfToken: tokenSnapshot,
          redirect: false,
        });

        if (callback?.error) {
          toast.error(
            "Account created, but automatic sign-in failed. Please sign in manually.",
          );
          return;
        }

        toast.success("Logged in successfully!");
        router.push("/dashboard");
      } catch (error: any) {
        toast.error(getAxiosErrorMessage(error), { id: loadingToast });
        resetTurnstile();
      } finally {
        setIsLoading(false);
      }
    }

    if (variant === "LOGIN") {
      const loadingToast = toast.loading("Signing you in...");

      try {
        const callback = await signIn("credentials", {
          ...data,
          cfToken: turnstileToken,
          redirect: false,
        });

        if (callback?.error) {
          toast.error(
            "Invalid credentials or verification failed. Please try again.",
            { id: loadingToast },
          );
          resetTurnstile();
          return;
        }

        if (callback?.ok) {
          toast.success("Logged in successfully!", { id: loadingToast });
          router.push("/dashboard");
          return;
        }

        toast.error("Could not sign you in. Please try again.", {
          id: loadingToast,
        });
        resetTurnstile();
      } catch (error: any) {
        toast.error("Login failed. Please try again shortly.", {
          id: loadingToast,
        });
        resetTurnstile();
      } finally {
        setIsLoading(false);
      }
    }
  };

  const socialAction = async (action: string) => {
    if (!turnstileToken) {
      toast.error("Please complete the verification first.");
      return;
    }

    setIsLoading(true);
    const loadingToast = toast.loading("Redirecting to Google...");

    try {
      const callback = await signIn(action, {
        redirect: false,
        cfToken: turnstileToken,
      });

      if (callback?.error) {
        toast.error("Google sign-in failed. Please try again.", {
          id: loadingToast,
        });
        resetTurnstile();
        return;
      }

      if (callback?.ok) {
        toast.success("Redirecting...", { id: loadingToast });
      }
    } catch (error) {
      toast.error("Social login failed. Please try again later.", {
        id: loadingToast,
      });
      resetTurnstile();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        async
        defer
        onLoad={() => setTurnstileReady(true)}
      />

      <div className="bg-white px-4 py-8 shadow sm:rounded-lg sm:px-10">
        <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <Input
            disabled={isLoading}
            register={register}
            errors={errors}
            required
            id="email"
            label="Email address"
            type="email"
            validation={{
              required: "Email is required",
              pattern: {
                value: /\S+@\S+\.\S+/,
                message: "Invalid email address",
              },
            }}
          />

          <Input
            disabled={isLoading}
            register={register}
            errors={errors}
            required
            id="password"
            label="Password"
            type="password"
          />

          <div className="space-y-2">
            <div ref={turnstileRef} />

            {!turnstileToken && (
              <p className="text-sm text-gray-500">
                Please complete the verification before continuing.
              </p>
            )}
          </div>

          <div>
            <Button
              disabled={isLoading || !turnstileToken}
              fullWidth
              type="submit"
            >
              {variant === "LOGIN" ? "Sign in" : "Register"}
            </Button>
          </div>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>

            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-2 text-gray-500">
                Or continue with
              </span>
            </div>
          </div>

          <div className="mt-6 flex gap-2">
            <AuthSocialButton
              icon={BsGoogle}
              onClick={() => socialAction("google")}
            />
          </div>
        </div>

        <div className="mt-6 flex justify-center gap-2 px-2 text-sm text-gray-500">
          <div>
            {variant === "LOGIN"
              ? "Don't have an account?"
              : "Already have an account?"}
          </div>

          <div
            className="cursor-pointer text-gray-500 underline"
            onClick={toggleVariant}
          >
            {variant === "LOGIN" ? "Create an account" : "Login"}
          </div>
        </div>
      </div>
    </div>
  );
}
