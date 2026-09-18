import { ToasterProvider } from "@/components/toaster-provider";
import { authOptions } from "@/libs/authOptions";
import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import AuthContext from "./context/AuthContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "Relearn Foundation",
  description: "Welcome to Relearn Foundation",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en">
      <body>
        <AuthContext session={session}>
          {children}
          <ToasterProvider />
        </AuthContext>
      </body>
    </html>
  );
}
