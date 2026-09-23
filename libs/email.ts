type TransactionalEmail = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

function emailSettings() {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  if (!apiKey || !senderEmail) return null;

  return {
    apiKey,
    sender: {
      email: senderEmail,
      name: process.env.BREVO_SENDER_NAME || "Relearn Foundation",
    },
  };
}

export function passwordEmailIsConfigured() {
  if (!emailSettings()) return false;
  try {
    applicationUrl();
    return true;
  } catch {
    return false;
  }
}

export function applicationUrl() {
  const value = process.env.APP_URL || process.env.NEXTAUTH_URL;
  if (!value) throw new Error("APP_URL or NEXTAUTH_URL must be configured");
  const url = new URL(value);
  if (url.protocol !== "https:" && process.env.NODE_ENV === "production") {
    throw new Error("APP_URL must use HTTPS in production");
  }
  return url.toString().replace(/\/$/, "");
}

export async function sendTransactionalEmail(message: TransactionalEmail) {
  const settings = emailSettings();
  if (!settings) throw new Error("Brevo email settings are not configured");

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": settings.apiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      sender: settings.sender,
      to: [{ email: message.to }],
      subject: message.subject,
      textContent: message.text,
      htmlContent: message.html,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(`Brevo rejected the email (${response.status}): ${responseText.slice(0, 300)}`);
  }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] ?? character);
}

export function passwordResetEmail({ name, resetUrl }: { name: string | null; resetUrl: string }) {
  const greeting = name?.trim() ? `Hello ${escapeHtml(name.trim())},` : "Hello,";
  return {
    subject: "Reset your Relearn Foundation password",
    text: `A password reset was requested for your Relearn Foundation account. Reset it within 15 minutes: ${resetUrl}\n\nIf you did not request this, you can safely ignore this email.`,
    html: `<p>${greeting}</p><p>A password reset was requested for your Relearn Foundation account.</p><p><a href="${escapeHtml(resetUrl)}">Reset your password</a></p><p>This link expires in 15 minutes and can be used once.</p><p>If you did not request this, you can safely ignore this email.</p>`,
  };
}

export function passwordResetConfirmationEmail({ name }: { name: string | null }) {
  const greeting = name?.trim() ? `Hello ${escapeHtml(name.trim())},` : "Hello,";
  return {
    subject: "Your Relearn Foundation password was reset",
    text: "Your Relearn Foundation password was reset. All existing sessions have been signed out. If this was not you, contact an administrator immediately.",
    html: `<p>${greeting}</p><p>Your Relearn Foundation password was reset. All existing sessions have been signed out.</p><p>If this was not you, contact an administrator immediately.</p>`,
  };
}
