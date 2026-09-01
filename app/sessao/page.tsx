"use client";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { QuestionRecord, Subject } from "@/types/question";
import { fetchQuestions, markReviewed, submitAnswer, clearAnswer } from "@/lib/supabase/questions";
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

export default function SessaoPage() {
  const searchParams = useSearchParams();
  const subject = (searchParams.get("subject") as Subject) || "matematica";
  const temasParam = searchParams.get("temas") || "";
  const temasFiltro = useMemo(() => new Set(temasParam.split("|").filter(Boolean)), [temasParam]);

  const [fila, setFila] = useState<QuestionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const [answering, setAnswering] = useState(false);
  const [acertosSessao, setAcertosSessao] = useState(0);
  const [respondidasSessao, setRespondidasSessao] = useState(0);

  useEffect(() => {
    setLoading(true);
    fetchQuestions(subject)
      .then((data) => {
        const filtradas = data.filter((q) => temasFiltro.has(q.tema));
        setFila(filtradas);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [subject, temasParam]);

  const atual = fila[index] ?? null;
  const acabou = !loading && fila.length > 0 && index >= fila.length;

  async function handleAnswer(letra: string) {
    if (!atual || !atual.solved) return;
    setAnswering(true);
    try {
      const normalizar = (s: string) => s.trim().toUpperCase().replace(/[^A-E]/g, "");
      const acertou = normalizar(letra) === normalizar(atual.solved.alternativa_correta ?? "");
      await submitAnswer(atual.id, letra, acertou);
      await markReviewed(atual.id);
      const atualizada = { ...atual, respostaUsuario: letra, acertou };
      setFila((prev) => prev.map((q) => q.id === atual.id ? atualizada : q));
      setRespondidasSessao((n) => n + 1);
      if (acertou) setAcertosSessao((n) => n + 1);
    } catch (err) {
      console.error(err);
      alert("Erro ao registrar resposta.");
    } finally {
      setAnswering(false);
    }
  }

  async function handleRetryAtual() {
    if (!atual) return;
    try {
      await clearAnswer(atual.id);
      setFila((prev) => prev.map((q) => q.id === atual.id ? { ...q, respostaUsuario: null, acertou: null } : q));
    } catch (err) {
      console.error(err);
    }
  }

  function handleNext() {
    setIndex((i) => i + 1);
  }

  const jaRespondida = !!atual?.respostaUsuario;

  return (
    <main className="wrap">
            <header>
        <div className="eyebrow">Sessão de revisão</div>
        <h1>
          {temasFiltro.size === 0
            ? "Sessão de estudo"
            : temasFiltro.size <= 3
              ? `Estudando: ${Array.from(temasFiltro).join(", ")}`
              : `Estudando ${temasFiltro.size} temas`}
        </h1>
      </header>

      {!acabou && fila.length > 0 && (
        <div className="sessao-progress">
          <div className="sessao-progress-text">Questão {Math.min(index + 1, fila.length)} de {fila.length}</div>
          <div className="progress-bar-track">
            <div className="progress-bar-fill" style={{ width: `${(index / fila.length) * 100}%` }} />
          </div>
        </div>
      )}

      {loading ? (
        <div className="bank-empty">Carregando sessão...</div>
      ) : fila.length === 0 ? (
        <div className="bank-empty">Nenhuma questão encontrada para esse filtro.</div>
      ) : acabou ? (
        <section className="chart result-card" style={{ textAlign: "center" }}>
          <h2>🏁 Sessão concluída!</h2>
          <p>Você respondeu {respondidasSessao} questões e acertou {acertosSessao} ({respondidasSessao ? Math.round((acertosSessao / respondidasSessao) * 100) : 0}%).</p>
          <div className="controls" style={{ justifyContent: "center" }}>
            <a className="chart-btn" href="/">Voltar ao início</a>
          </div>
        </section>
      ) : atual?.solved ? (
        <>
          {!jaRespondida ? (
            <section className="chart recall-box">
              <div className="recall-question-text">{extractEnunciado(atual.questionText)}</div>
              <h3 className="recall-title">🎯 Qual é a alternativa correta?</h3>
              <div className="recall-options">
                {atual.solved.alternativas?.map((a: any) => (
                  <button key={a.letra} className="recall-option" disabled={answering} onClick={() => handleAnswer(a.letra)}>
                    <span className="alt-letra">{a.letra}</span>
                    <span>{a.texto}</span>
                  </button>
                ))}
              </div>
            </section>
          ) : (
            <section className="chart result-card">
              <div className={`recall-result ${atual.acertou ? "correto" : "errado"}`}>
                <span>{atual.acertou ? "✓ Você acertou!" : `✗ Você errou. A certa é ${atual.solved.alternativa_correta}.`}</span>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="recall-retry-btn" onClick={handleRetryAtual}>🔄 Refazer</button>
                  <button className="recall-retry-btn" onClick={handleNext}>
                    {index + 1 >= fila.length ? "Finalizar ▶" : "Próxima ▶"}
                  </button>
                </div>
              </div>

              <QuestionFigure figura={atual.solved.figura} />

              <div className="section-label">Rota de resolução</div>
              {atual.solved.passos?.map((p: any, i: number) => (
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

                            {atual.solved.macete && (
                <div className="macete-box">
                  <span className="macete-label">⚓ Macete:</span>
                  {renderHighlighted(atual.solved.macete)}
                </div>
              )}

              {atual.lesson && (
                <>
                  <div className="section-label">Aula do tema</div>
                  <div className="lesson-block">
                    <h4 className="lesson-title">🎯 O que essa questão está testando</h4>
                    <p className="lesson-text">{renderHighlighted(atual.lesson.o_que_a_questao_pede)}</p>
                  </div>
                  <div className="lesson-block">
                    <h4 className="lesson-title">🧭 Como interpretar o enunciado</h4>
                    <p className="lesson-text">{renderHighlighted(atual.lesson.como_interpretar)}</p>
                  </div>
                  <div className="lesson-block">
                    <h4 className="lesson-title">📖 A matéria explicada</h4>
                    <p className="lesson-text">{renderHighlighted(atual.lesson.explicacao_da_regra)}</p>
                  </div>
                  <div className="lesson-block">
                    <h4 className="lesson-title">⚠️ Erro comum de quem erra essa questão</h4>
                    <p className="lesson-text">{renderHighlighted(atual.lesson.erro_comum)}</p>
                  </div>
                  {atual.lesson.youtube_busca && (
                    <div className="youtube-tip">▶️ Estude mais: busque no YouTube por "{atual.lesson.youtube_busca}"</div>
                  )}
                </>
              )}
            </section>
          )}
        </>
      ) : null}
      <footer>corrija · aprenda o macete · repita a rota até dominar o rumo</footer>
    </main>
  );
}