import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Assessor Pessoal de IA",
  description:
    "Assistente pessoal via WhatsApp com painel web, lembretes, hábitos e rotinas.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  );
}
