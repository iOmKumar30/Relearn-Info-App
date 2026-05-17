export async function verifyTurnstile(
  token: string,
  ip?: string,
): Promise<boolean> {
  try {
    if (!token) return false;

    const formData = new FormData();
    formData.append("secret", process.env.CF_TURNSTILE_SECRET_KEY!);
    formData.append("response", token);

    if (ip) {
      formData.append("remoteip", ip);
    }

    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        body: formData,
      },
    );

    if (!res.ok) {
      return false;
    }

    const data = await res.json();
    return data.success === true;
  } catch (err) {
    console.error("Turnstile verification failed:", err);
    return false;
  }
}
