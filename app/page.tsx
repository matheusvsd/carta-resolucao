"use client";
import { useEffect, useMemo, useState } from "react";
import type { Subject } from "@/types/question";
import { SUBJECT_LABELS } from "@/lib/topics";
import { fetchWeeklySummary, fetchTemasDisponiveis, type WeeklySummary, type TemaOption } from "@/lib/supabase/dashboard";

export default function DashboardPage() {
  const [summary, setSummary] = useState<WeeklySummary | null>(null);
  const [subject, setSubject] = useState<Subject>("matematica");
  const [temas, setTemas] = useState<TemaOption[]>([]);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchWeeklySummary().then(setSummary).catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setSelecionados(new Set());
    fetchTemasDisponiveis(subject)
      .then((data) => { if (active) setTemas(data); })
      .catch((err) => console.error(err))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [subject]);

  function toggleTema(tema: string) {
    setSelecionados((prev) => {
      const next = new Set(prev);
      if (next.has(tema)) next.delete(tema);
      else next.add(tema);
      return next;
    });
  }

  function toggleTodos() {
    if (selecionados.size === temas.length) {
      setSelecionados(new Set());
    } else {
      setSelecionados(new Set(temas.map((t) => t.tema)));
    }
  }

  const totalSelecionado = useMemo(
    () => temas.filter((t) => selecionados.has(t.tema)).reduce((acc, t) => acc + t.total, 0),
    [temas, selecionados]
  );

  const sessaoHref = `/sessao?subject=${subject}&temas=${encodeURIComponent(Array.from(selecionados).join("|"))}`;

  return (
    <main className="wrap">
      <header>
        <div className="eyebrow">Agente IA · Marinha Mercante</div>
        <h1>Carta de Resolução</h1>
        <p className="sub">Seu painel de estudo diário.</p>
      </header>

      {summary && (
        <div className="dash-summary">
          <div className="dash-summary-title">📅 Essa semana</div>
          <div className="dash-summary-grid">
            <div className="dash-summary-item">
              <div className="dash-summary-num">{summary.respondidas}</div>
              <div className="dash-summary-label">questões respondidas</div>
            </div>
            <div className="dash-summary-item">
              <div className="dash-summary-num">{summary.pctAcerto}%</div>
              <div className="dash-summary-label">de acerto</div>
            </div>
            <div className="dash-summary-item">
              <div className="dash-summary-num">{summary.flashcardsRevisados}</div>
              <div className="dash-summary-label">flashcards revisados</div>
            </div>
          </div>
        </div>
      )}

      <section className="chart">
        <div className="section-label">Iniciar sessão de revisão</div>
        <div className="subject-tabs">
          <button className={`subject-tab ${subject === "matematica" ? "active" : ""}`} onClick={() => setSubject("matematica")}>🧮 Matemática</button>
          <button className={`subject-tab ${subject === "portugues" ? "active" : ""}`} onClick={() => setSubject("portugues")}>📘 Português</button>
        </div>

        {loading ? (
          <div className="bank-empty">Carregando temas...</div>
        ) : temas.length === 0 ? (
          <div className="bank-empty">Nenhuma questão salva ainda em {SUBJECT_LABELS[subject]}. Vá em Questões e resolva algumas primeiro.</div>
        ) : (
          <>
            <button className="dash-select-all" onClick={toggleTodos}>
              {selecionados.size === temas.length ? "Desmarcar todos" : "Selecionar todos"}
            </button>
            <div className="dash-tema-list">
              {temas.map((t) => (
                <label key={t.tema} className={`dash-tema-item ${selecionados.has(t.tema) ? "checked" : ""}`}>
                  <input type="checkbox" checked={selecionados.has(t.tema)} onChange={() => toggleTema(t.tema)} />
                  <span className="dash-tema-name">{t.tema}</span>
                  <span className="dash-tema-count">{t.total}q</span>
                </label>
              ))}
            </div>
            <div className="controls">
              {selecionados.size === 0 ? (
                <span className="dash-hint">Selecione ao menos um tema para iniciar</span>
              ) : (
                <a className="chart-btn" href={sessaoHref}>
                  ⚓ Iniciar sessão ({totalSelecionado} questões)
                </a>
              )}
            </div>
          </>
        )}
      </section>
      <footer>corrija · aprenda o macete · repita a rota até dominar o rumo</footer>
    </main>
  );
}