import { ToasterProvider } from "@/components/toaster-provider";
import type { Metadata } from "next";
import AuthContext from "./context/AuthContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "Relearn Foundation",
  description: "Welcome to Relearn Foundation",
  viewport: "width=device-width, initial-scale=1.0",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AuthContext>
          {children}
          <ToasterProvider />
        </AuthContext>
      </body>
    </html>
  );
}
