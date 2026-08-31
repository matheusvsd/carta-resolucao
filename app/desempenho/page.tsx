"use client";
import { useEffect, useState } from "react";
import type { Subject } from "@/types/question";
import { SUBJECT_LABELS } from "@/lib/topics";
import { fetchDesempenho, type DesempenhoTema } from "@/lib/supabase/questions";

function corPorPct(pct: number) {
  if (pct < 50) return "ruim";
  if (pct < 75) return "medio";
  return "bom";
}

export default function DesempenhoPage() {
  const [subject, setSubject] = useState<Subject>("matematica");
  const [dados, setDados] = useState<DesempenhoTema[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchDesempenho(subject)
      .then((data) => { if (active) setDados(data); })
      .catch((err) => console.error(err))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [subject]);

  const totalRespondidas = dados.reduce((acc, d) => acc + d.total, 0);
  const totalAcertos = dados.reduce((acc, d) => acc + d.acertos, 0);
  const pctGeral = totalRespondidas === 0 ? 0 : Math.round((totalAcertos / totalRespondidas) * 100);
  const piores = dados.filter((d) => d.pctAcerto < 75).slice(0, 3);

  return (
    <main className="wrap">
      <header>
        <div className="eyebrow">Agente IA · Marinha Mercante</div>
        <h1>Desempenho</h1>
        <p className="sub">Veja onde você mais acerta e onde precisa reforçar, tema por tema.</p>
      </header>

      <section className="chart" style={{ marginBottom: 20 }}>
        <div className="subject-tabs">
          <button className={`subject-tab ${subject === "matematica" ? "active" : ""}`} onClick={() => setSubject("matematica")}>🧮 Matemática</button>
          <button className={`subject-tab ${subject === "portugues" ? "active" : ""}`} onClick={() => setSubject("portugues")}>📘 Português</button>
        </div>
      </section>

      <div className="desemp-geral">
        <div className="desemp-geral-pct">{pctGeral}%</div>
        <div className="desemp-geral-info">
          <div className="desemp-geral-label">Acerto geral — {SUBJECT_LABELS[subject]}</div>
          <div className="desemp-geral-sub">{totalAcertos} de {totalRespondidas} questões respondidas</div>
        </div>
      </div>

      {piores.length > 0 && (
        <div className="desemp-alert">
          ⚠️ <strong>Foco recomendado:</strong> {piores.map((p) => p.tema).join(", ")}
        </div>
      )}

      <section className="chart">
        <div className="section-label">Desempenho por tema</div>
        {loading ? (
          <div className="bank-empty">Carregando...</div>
        ) : dados.length === 0 ? (
          <div className="bank-empty">Ainda não há questões respondidas nessa matéria. Resolva algumas questões para ver seu desempenho aqui.</div>
        ) : (
          <div className="desemp-list">
            {dados.map((d) => (
              <div key={d.tema} className="desemp-item">
                <div className="desemp-item-top">
                  <span className="desemp-item-tema">{d.tema}</span>
                  <span className={`desemp-item-pct ${corPorPct(d.pctAcerto)}`}>{d.pctAcerto}%</span>
                </div>
                <div className="desemp-bar-track">
                  <div className={`desemp-bar-fill ${corPorPct(d.pctAcerto)}`} style={{ width: `${d.pctAcerto}%` }} />
                </div>
                <div className="desemp-item-sub">{d.acertos} acertos · {d.erros} erros · {d.total} respondidas</div>
              </div>
            ))}
          </div>
        )}
      </section>
      <footer>corrija · aprenda o macete · repita a rota até dominar o rumo</footer>
    </main>
  );
}