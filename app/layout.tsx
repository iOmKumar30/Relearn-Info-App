import type { Metadata } from "next";

import AuthContext from "./context/AuthContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "Relearn Foundation",
  description: "Welcome to Relearn Foundation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AuthContext>{children}</AuthContext>
      </body>
    </html>
  );
}
