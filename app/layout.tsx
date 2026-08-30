import type { Metadata } from "next";
import "./globals.css";
import { NavMenu } from "@/components/nav-menu";

export const metadata: Metadata = {
  title: "Carta de Resolução — Marinha Mercante",
  description: "Resolva questões de Matemática e Português com explicação passo a passo.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        <NavMenu />
        {children}
      </body>
    </html>
  );
}