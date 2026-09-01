"use client";
import { useState } from "react";
import { ResolutionApp } from "@/components/resolution-app";

export default function PraticarPage() {
  const [tab, setTab] = useState<"questoes" | "simulado" | "importar">("questoes");

  return (
    <main className="wrap">
      <header>
        <div className="eyebrow">Agente IA · Marinha Mercante</div>
        <h1>Praticar</h1>
        <p className="sub">Resolva questões, faça simulados ou importe novo conteúdo.</p>
      </header>

      <div className="praticar-tabs">
        <button className={`praticar-tab ${tab === "questoes" ? "active" : ""}`} onClick={() => setTab("questoes")}>⚓ Questões</button>
        <button className={`praticar-tab ${tab === "simulado" ? "active" : ""}`} onClick={() => setTab("simulado")}>⏱️ Simulado</button>
        <button className={`praticar-tab ${tab === "importar" ? "active" : ""}`} onClick={() => setTab("importar")}>📥 Importar</button>
      </div>

      {tab === "questoes" && <ResolutionApp embedHeader={false} />}
      {tab === "simulado" && (
        <div className="praticar-embed">
          <a className="chart-btn" href="/simulado" style={{ display: "inline-block" }}>Abrir Simulado completo ▶</a>
          <p className="dash-hint" style={{ marginTop: 10 }}>O simulado abre em tela própria para melhor foco durante a prova cronometrada.</p>
        </div>
      )}
      {tab === "importar" && (
        <div className="praticar-embed">
          <a className="chart-btn" href="/importar" style={{ display: "inline-block" }}>Abrir Importação em lote ▶</a>
        </div>
      )}
    </main>
  );
}