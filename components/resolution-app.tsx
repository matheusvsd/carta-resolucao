"use client";

import { useMemo, useState } from "react";
import type { QuestionRecord, Subject } from "@/types/question";
import { SUBJECT_LABELS } from "@/lib/topics";

const placeholders: Record<Subject, string> = {
  matematica: `Ex.: Um navio percorre 240 milhas em 8 horas. Mantendo a mesma velocidade, quantas milhas percorrerá em 5 horas?\nA) 120   B) 150   C) 160   D) 180`,
  portugues: `Ex.: Assinale a alternativa em que a concordância verbal está de acordo com a norma-padrão:\nA) Fazem dois anos que ele embarcou.\nB) Existem vários motivos para a demora.`
};

export function ResolutionApp() {
  const [subject, setSubject] = useState<Subject>("matematica");
  const [question, setQuestion] = useState("");
  const [search, setSearch] = useState("");
  const [questions] = useState<QuestionRecord[]>([]);

  const filtered = useMemo(() => questions.filter(q =>
    q.subject === subject &&
    `${q.tema} ${q.preview}`.toLowerCase().includes(search.toLowerCase())
  ), [questions, search, subject]);

  function handleSolve() {
    alert("Etapa 1 concluída: a interface já está modularizada. Na Etapa 2 conectaremos este botão à API e ao Supabase.");
  }

  return (
    <main className="wrap">
      <header>
        <div className="eyebrow">Agente IA · Marinha Mercante</div>
        <h1>Carta de Resolução</h1>
        <p className="sub">Cole uma questão de Matemática ou Português. Eu traço a rota completa da resolução — passo a passo, regra por regra.</p>
      </header>

      <section className="chart">
        <div className="subject-tabs">
          <button className={`subject-tab ${subject === "matematica" ? "active" : ""}`} onClick={() => setSubject("matematica")}>🧮 Matemática</button>
          <button className={`subject-tab ${subject === "portugues" ? "active" : ""}`} onClick={() => setSubject("portugues")}>📘 Português</button>
        </div>

        <div className="section-label">Registro da questão</div>
        <label className="field-label">Cole o enunciado e as alternativas</label>
        <textarea value={question} onChange={e => setQuestion(e.target.value)} placeholder={placeholders[subject]} />

        <div className="controls">
          <button className="chart-btn" disabled={!question.trim()} onClick={handleSolve}>
            ⚓ Traçar rota da resolução
          </button>
        </div>
      </section>

      <section className="chart bank-chart">
        <div className="section-label">Diário de bordo — {SUBJECT_LABELS[subject]}</div>
        <div className="bank-controls-row">
          <input className="bank-search-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por tema ou palavra-chave..." />
        </div>

        <div className="bank-list">
          {filtered.length === 0 ? (
            <div className="bank-empty">
              Nenhuma questão salva ainda. Na próxima etapa, este diário será conectado ao banco de dados permanente.
            </div>
          ) : filtered.map(q => (
            <div className="bank-item" key={q.id}>
              <button className="bank-item-main">
                <span className="bank-tag">{q.tema} · {q.level}</span>
                <p className="bank-preview">{q.preview}</p>
              </button>
            </div>
          ))}
        </div>
      </section>

      <footer>corrija · aprenda o macete · repita a rota até dominar o rumo</footer>
    </main>
  );
}