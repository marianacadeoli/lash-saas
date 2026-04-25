import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lash SaaS",
  description: "Sistema de gestão para lash designers",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}