"use client";
import { usePathname } from "next/navigation";

const TABS = [
  { label: "Início", href: "/", icon: "🏠" },
  { label: "Questões", href: "/questoes", icon: "⚓" },
  { label: "Matérias", href: "/materias", icon: "📚" },
  { label: "Cards", href: "/flashcards", icon: "🗂️" },
  { label: "Painel", href: "/desempenho", icon: "📊" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="bottom-nav">
      {TABS.map((tab) => {
        const active = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
        return (
          <a key={tab.href} href={tab.href} className={`bottom-nav-item ${active ? "active" : ""}`}>
            <span className="bottom-nav-icon">{tab.icon}</span>
            <span className="bottom-nav-label">{tab.label}</span>
          </a>
        );
      })}
    </nav>
  );
}