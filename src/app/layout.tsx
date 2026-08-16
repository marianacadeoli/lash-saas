import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Painel Emprest",
  description: "Sistema de gestão de empréstimos",
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