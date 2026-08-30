"use client";
import { useEffect, useState } from "react";

const ITEMS = [
  { label: "Questões", href: "/", icon: "⚓", disponivel: true },
  { label: "Matérias", href: "#", icon: "📚", disponivel: false },
  { label: "Flashcards", href: "#", icon: "🗂️", disponivel: false },
];

export function NavMenu() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
  }, [open]);

  return (
    <>
      <button
        className="nav-hamburger"
        onClick={() => setOpen(true)}
        aria-label="Abrir menu"
      >
        <span />
        <span />
        <span />
      </button>

      <div className={`nav-overlay ${open ? "open" : ""}`} onClick={() => setOpen(false)} />

      <nav className={`nav-drawer ${open ? "open" : ""}`}>
        <div className="nav-drawer-header">
          <div className="nav-drawer-title">
            <span className="eyebrow">Agente IA</span>
            <strong>Marinha Mercante</strong>
          </div>
          <button className="nav-close" onClick={() => setOpen(false)} aria-label="Fechar menu">✕</button>
        </div>

        <div className="nav-drawer-list">
          {ITEMS.map((item) => (
            
              <a key={item.label}
              href={item.disponivel ? item.href : undefined}
              className={`nav-item ${!item.disponivel ? "disabled" : ""}`}
              onClick={(e) => {
                if (!item.disponivel) {
                  e.preventDefault();
                  return;
                }
                setOpen(false);
              }}
            >
              <span className="nav-item-icon">{item.icon}</span>
              <span className="nav-item-label">{item.label}</span>
              {!item.disponivel && <span className="nav-item-badge">em breve</span>}
            </a>
          ))}
        </div>

        <div className="nav-drawer-footer">
          corrija · aprenda o macete · repita a rota até dominar o rumo
        </div>
      </nav>
    </>
  );
}