"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { QuestionRecord } from "@/types/question";
import { fetchQuestions, submitAnswer } from "@/lib/supabase/questions";
import { QuestionFigure } from "@/components/question-figure";

function extractEnunciado(text: string) {
  const match = text.search(/\n\s*[A-E]\)/);
  return match === -1 ? text : text.slice(0, match).trim();
}

function renderHighlighted(text?: string) {
  if (!text) return null;
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <span key={i} className="hl">{part.slice(2, -2)}</span>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function formatTime(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const s = (totalSeconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

const QTD_POR_MATERIA = 20;

export default function SimuladoPage() {
  const [status, setStatus] = useState<"carregando" | "pronto" | "em_andamento" | "concluido">("carregando");
  const [fila, setFila] = useState<QuestionRecord[]>([]);
  const [avisoFaltando, setAvisoFaltando] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [respostas, setRespostas] = useState<Record<string, { letra: string; acertou: boolean }>>({});
  const [answering, setAnswering] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    async function montarSimulado() {
      const [mat, port] = await Promise.all([fetchQuestions("matematica"), fetchQuestions("portugues")]);
      const matResolvidas = mat.filter((q) => q.solved);
      const portResolvidas = port.filter((q) => q.solved);

      const matSelecionadas = shuffle(matResolvidas).slice(0, QTD_POR_MATERIA);
      const portSelecionadas = shuffle(portResolvidas).slice(0, QTD_POR_MATERIA);

      const faltando: string[] = [];
      if (matSelecionadas.length < QTD_POR_MATERIA) faltando.push(`Matemática (${matSelecionadas.length}/${QTD_POR_MATERIA})`);
      if (portSelecionadas.length < QTD_POR_MATERIA) faltando.push(`Português (${portSelecionadas.length}/${QTD_POR_MATERIA})`);
      if (faltando.length > 0) setAvisoFaltando(`Banco insuficiente: ${faltando.join(" · ")}. Resolva mais questões para simulados completos.`);

      setFila([...matSelecionadas, ...portSelecionadas]);
      setStatus("pronto");
    }
    montarSimulado();
  }, []);

  function iniciar() {
    setStatus("em_andamento");
    timerRef.current = setInterval(() => setSegundos((s) => s + 1), 1000);
  }

  function pararCronometro() {
    if (timerRef.current) clearInterval(timerRef.current);
  }

  useEffect(() => () => pararCronometro(), []);

  const atual = fila[index] ?? null;
  const respostaAtual = atual ? respostas[atual.id] : undefined;

  async function handleAnswer(letra: string) {
    if (!atual || !atual.solved) return;
    setAnswering(true);
    try {
      const normalizar = (s: string) => s.trim().toUpperCase().replace(/[^A-E]/g, "");
      const acertou = normalizar(letra) === normalizar(atual.solved.alternativa_correta ?? "");
      await submitAnswer(atual.id, letra, acertou);
      setRespostas((prev) => ({ ...prev, [atual.id]: { letra, acertou } }));
    } catch (err) {
      console.error(err);
      alert("Erro ao registrar resposta.");
    } finally {
      setAnswering(false);
    }
  }

  function handleNext() {
    if (index + 1 >= fila.length) {
      pararCronometro();
      setStatus("concluido");
    } else {
      setIndex((i) => i + 1);
    }
  }

  const stats = useMemo(() => {
    const matIds = fila.filter((q) => q.subject === "matematica").map((q) => q.id);
    const portIds = fila.filter((q) => q.subject === "portugues").map((q) => q.id);
    const contar = (ids: string[]) => {
      const total = ids.length;
      const acertos = ids.filter((id) => respostas[id]?.acertou).length;
      return { total, acertos, pct: total ? Math.round((acertos / total) * 100) : 0 };
    };
    return { mat: contar(matIds), port: contar(portIds), geral: contar(fila.map((q) => q.id)) };
  }, [fila, respostas]);

  return (
    <main className="wrap">
      <header>
        <div className="eyebrow">Simulado completo</div>
        <h1>Marinha Mercante</h1>
        <p className="sub">{QTD_POR_MATERIA} questões de Matemática + {QTD_POR_MATERIA} de Português, na proporção real da prova.</p>
      </header>

      {status === "carregando" && <div className="bank-empty">Montando seu simulado...</div>}

      {status === "pronto" && (
        <section className="chart" style={{ textAlign: "center" }}>
          {avisoFaltando && <div className="desemp-alert" style={{ textAlign: "left" }}>⚠️ {avisoFaltando}</div>}
          <p>Você tem {fila.length} questões prontas. O cronômetro começa a contar assim que você iniciar — sem limite de tempo, só para acompanhar seu ritmo.</p>
          <div className="controls" style={{ justifyContent: "center" }}>
            <button className="chart-btn" onClick={iniciar} disabled={fila.length === 0}>⚓ Iniciar simulado</button>
          </div>
        </section>
      )}

      {status === "em_andamento" && atual && (
        <>
          <div className="sim-topbar">
            <div className="sim-progress-text">Questão {index + 1} de {fila.length} · {atual.subject === "matematica" ? "🧮 Matemática" : "📘 Português"}</div>
            <div className="sim-timer">⏱ {formatTime(segundos)}</div>
          </div>
          <div className="progress-bar-track" style={{ marginBottom: 18 }}>
            <div className="progress-bar-fill" style={{ width: `${(index / fila.length) * 100}%` }} />
          </div>

          {!respostaAtual ? (
            <section className="chart recall-box">
              <div className="recall-question-text">{extractEnunciado(atual.questionText)}</div>
              <h3 className="recall-title">🎯 Qual é a alternativa correta?</h3>
              <div className="recall-options">
                {atual.solved?.alternativas?.map((a: any) => (
                  <button key={a.letra} className="recall-option" disabled={answering} onClick={() => handleAnswer(a.letra)}>
                    <span className="alt-letra">{a.letra}</span>
                    <span>{a.texto}</span>
                  </button>
                ))}
              </div>
            </section>
          ) : (
            <section className="chart result-card">
              <div className={`recall-result ${respostaAtual.acertou ? "correto" : "errado"}`}>
                <span>{respostaAtual.acertou ? "✓ Você acertou!" : `✗ Você errou. A certa é ${atual.solved?.alternativa_correta}.`}</span>
                <button className="recall-retry-btn" onClick={handleNext}>
                  {index + 1 >= fila.length ? "Entregar prova ▶" : "Próxima ▶"}
                </button>
              </div>

              <QuestionFigure figura={atual.solved?.figura} />

              <div className="section-label">Rota de resolução</div>
              {atual.solved?.passos?.map((p: any, i: number) => (
                <div className="step" key={i}>
                  <div className="step-num">{i + 1}</div>
                  <div className="step-body">
                    <h3 className="step-title">{p.titulo}</h3>
                    {p.regra && <div className="step-regra">{p.regra}</div>}
                    <p className="step-explicacao">{renderHighlighted(p.explicacao)}</p>
                    {p.calculo && <code className="step-calculo">{p.calculo}</code>}
                  </div>
                </div>
              ))}

              {atual.solved?.macete && (
                <div className="macete-box">
                  <span className="macete-label">⚓ Macete:</span>
                  {renderHighlighted(atual.solved.macete)}
                </div>
              )}
            </section>
          )}
        </>
      )}

      {status === "concluido" && (
        <section className="chart result-card" style={{ textAlign: "center" }}>
          <h2>🏁 Prova entregue!</h2>
          <p className="sim-tempo-final">Tempo total: {formatTime(segundos)}</p>
          <div className="dash-summary" style={{ margin: "20px 0" }}>
            <div className="dash-summary-grid">
              <div className="dash-summary-item">
                <div className="dash-summary-num">{stats.geral.pct}%</div>
                <div className="dash-summary-label">nota geral</div>
              </div>
              <div className="dash-summary-item">
                <div className="dash-summary-num">{stats.mat.acertos}/{stats.mat.total}</div>
                <div className="dash-summary-label">Matemática</div>
              </div>
              <div className="dash-summary-item">
                <div className="dash-summary-num">{stats.port.acertos}/{stats.port.total}</div>
                <div className="dash-summary-label">Português</div>
              </div>
            </div>
          </div>
          <div className="controls" style={{ justifyContent: "center" }}>
            <a className="chart-btn" href="/">Voltar ao início</a>
          </div>
        </section>
      )}
      <footer>corrija · aprenda o macete · repita a rota até dominar o rumo</footer>
    </main>
  );
}