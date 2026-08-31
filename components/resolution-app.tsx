"use client";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { QuestionRecord, Subject } from "@/types/question";
import { SUBJECT_LABELS } from "@/lib/topics";
import { fetchQuestions, saveQuestion, deleteQuestion, markReviewed, toggleAttention, submitAnswer, clearAnswer } from "@/lib/supabase/questions";
import { QuestionFigure } from "@/components/question-figure";

const placeholders: Record<Subject, string> = {
  matematica: `Ex.: Um navio percorre 240 milhas em 8 horas. Mantendo a mesma velocidade, quantas milhas percorrerá em 5 horas?\nA) 120   B) 150   C) 160   D) 180`,
  portugues: `Ex.: Assinale a alternativa em que a concordância verbal está de acordo com a norma-padrão:\nA) Fazem dois anos que ele embarcou.\nB) Existem vários motivos para a demora.`
};

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function isReviewedThisWeek(reviewedAt?: string | null) {
  if (!reviewedAt) return false;
  return Date.now() - new Date(reviewedAt).getTime() < WEEK_MS;
}

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

export function ResolutionApp() {
  const searchParams = useSearchParams();
  const [subject, setSubject] = useState<Subject>(
    (searchParams.get("subject") as Subject) || "matematica"
  );
  const [question, setQuestion] = useState("");
  const [search, setSearch] = useState(searchParams.get("tema") || "");
  const [questions, setQuestions] = useState<QuestionRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [solving, setSolving] = useState(false);
  const [selected, setSelected] = useState<QuestionRecord | null>(null);
  const [bankTab, setBankTab] = useState<"diario" | "atencao">("diario");
  const [answering, setAnswering] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchQuestions(subject)
      .then((data) => { if (active) setQuestions(data); })
      .catch((err) => console.error("Erro ao buscar questões:", err))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [subject]);

  const filtered = useMemo(() => {
    const base = bankTab === "atencao" ? questions.filter(q => q.attention) : questions;
    return base.filter(q => `${q.tema} ${q.preview}`.toLowerCase().includes(search.toLowerCase()));
  }, [questions, search, bankTab]);

  const reviewedCount = useMemo(() => questions.filter(q => isReviewedThisWeek(q.reviewedAt)).length, [questions]);
  const totalCount = questions.length;
  const pendingCount = totalCount - reviewedCount;
  const progressPct = totalCount === 0 ? 0 : Math.round((reviewedCount / totalCount) * 100);

  async function handleSolve() {
    if (!question.trim()) return;
    setSolving(true);
    try {
      const res = await fetch("/api/solve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionText: question, subject }),
      });

      if (!res.ok) throw new Error("Falha na resolução");
      const solved = await res.json();

      const preview = question.trim().slice(0, 120);
      const saved = await saveQuestion({
        subject,
        questionText: question,
        preview,
        tema: solved.tema ?? "Geral",
        level: "—",
        solved,
        lesson: solved.lesson ?? null,
      });

      const record: QuestionRecord = {
        id: saved.id,
        subject: saved.subject,
        questionText: saved.question_text,
        preview: saved.preview,
        tema: saved.tema,
        level: saved.level,
        solved: saved.solved,
        lesson: saved.lesson,
        createdAt: saved.created_at,
        reviewedAt: saved.reviewed_at,
        attention: saved.attention ?? false,
        respostaUsuario: saved.resposta_usuario,
        acertou: saved.acertou,
        answeredAt: saved.answered_at,
      };

      setQuestions((prev) => [record, ...prev]);
      setSelected(record);
      setQuestion("");
    } catch (err) {
      console.error(err);
      alert("Erro ao traçar a rota de resolução. Tente novamente.");
    } finally {
      setSolving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir esta questão?")) return;
    try {
      await deleteQuestion(id);
      setQuestions((prev) => prev.filter((q) => q.id !== id));
      if (selected?.id === id) setSelected(null);
    } catch (err) {
      console.error(err);
      alert("Erro ao excluir a questão.");
    }
  }

  async function handleMarkReviewed(id: string) {
    try {
      await markReviewed(id);
      const now = new Date().toISOString();
      setQuestions((prev) => prev.map((q) => q.id === id ? { ...q, reviewedAt: now } : q));
      setSelected((prev) => prev && prev.id === id ? { ...prev, reviewedAt: now } : prev);
    } catch (err) {
      console.error(err);
      alert("Erro ao marcar como revisada.");
    }
  }

  async function handleToggleAttention(id: string, current: boolean) {
    try {
      await toggleAttention(id, !current);
      setQuestions((prev) => prev.map((q) => q.id === id ? { ...q, attention: !current } : q));
      setSelected((prev) => prev && prev.id === id ? { ...prev, attention: !current } : prev);
    } catch (err) {
      console.error(err);
      alert("Erro ao atualizar atenção.");
    }
  }

    async function handleRetry(id: string) {
    try {
      await clearAnswer(id);
      setQuestions((prev) => prev.map((q) => q.id === id ? { ...q, respostaUsuario: null, acertou: null, answeredAt: null } : q));
      setSelected((prev) => prev && prev.id === id ? { ...prev, respostaUsuario: null, acertou: null, answeredAt: null } : prev);
    } catch (err) {
      console.error(err);
      alert("Erro ao refazer a questão.");
    }
  }


  function handleNext() {
    if (!selected) return;
    const idx = filtered.findIndex((q) => q.id === selected.id);
    if (idx === -1) return;
    const next = filtered[(idx + 1) % filtered.length];
    setSelected(next);
  }


  async function handleAnswer(letra: string) {
    if (!selected || !selected.solved) return;
    setAnswering(true);
    try {
      const normalizar = (s: string) => s.trim().toUpperCase().replace(/[^A-E]/g, "");
      const acertou = normalizar(letra) === normalizar(selected.solved.alternativa_correta ?? "");
      await submitAnswer(selected.id, letra, acertou);
      const now = new Date().toISOString();
      const updated = { ...selected, respostaUsuario: letra, acertou, answeredAt: now };
      setSelected(updated);
      setQuestions((prev) => prev.map((q) => q.id === selected.id ? updated : q));
    } catch (err) {
      console.error(err);
      alert("Erro ao registrar sua resposta.");
    } finally {
      setAnswering(false);
    }
  }

  const jaRespondida = !!selected?.respostaUsuario;

  return (
    <main className="wrap">
      <header>
        <div className="eyebrow">Agente IA · Marinha Mercante</div>
        <h1>Carta de Resolução</h1>
        <p className="sub">Cole uma questão de Matemática ou Português. Eu traço a rota completa da resolução — passo a passo, regra por regra.</p>
      </header>

      <div className="progress-box">
        <div className="progress-row">
          <span className="section-label" style={{ marginBottom: 0 }}>Progresso semanal — {SUBJECT_LABELS[subject]}</span>
          <span className="progress-count">{reviewedCount}/{totalCount}</span>
        </div>
        <div className="progress-bar-track">
          <div className="progress-bar-fill" style={{ width: `${progressPct}%` }} />
        </div>
        <div className="progress-pending">
          {totalCount === 0
            ? "Nenhuma questão salva ainda nessa matéria."
            : pendingCount === 0
              ? "Tudo revisado nos últimos 7 dias! 🎉"
              : `${pendingCount} questão(ões) aguardando revisão.`}
        </div>
      </div>

      <section className="chart">
        <div className="subject-tabs">
          <button className={`subject-tab ${subject === "matematica" ? "active" : ""}`} onClick={() => setSubject("matematica")}>🧮 Matemática</button>
          <button className={`subject-tab ${subject === "portugues" ? "active" : ""}`} onClick={() => setSubject("portugues")}>📘 Português</button>
        </div>
        <div className="section-label">Registro da questão</div>
        <label className="field-label">Cole o enunciado e as alternativas</label>
        <textarea value={question} onChange={e => setQuestion(e.target.value)} placeholder={placeholders[subject]} />
        <div className="controls">
          <button className="chart-btn" disabled={!question.trim() || solving} onClick={handleSolve}>
            {solving ? "Traçando rota..." : "⚓ Traçar rota da resolução"}
          </button>
        </div>
      </section>

            {selected && selected.solved && !jaRespondida && (
        <section className="chart recall-box">
          <div className="recall-question-text">{extractEnunciado(selected.questionText)}</div>
          <h3 className="recall-title">🎯 Qual é a alternativa correta?</h3>
          <div className="recall-options">
            {selected.solved.alternativas?.map((a: any) => (
              <button key={a.letra} className="recall-option" disabled={answering} onClick={() => handleAnswer(a.letra)}>
                <span className="alt-letra">{a.letra}</span>
                <span>{a.texto}</span>
              </button>
            ))}
          </div>
          <div className="recall-locked-note">A resolução completa é liberada depois que você responder.</div>
        </section>
      )}

            {selected && selected.solved && jaRespondida && (
        <section className="chart result-card">
                    <div className={`recall-result ${selected.acertou ? "correto" : "errado"}`}>
            <span>{selected.acertou ? "✓ Você acertou!" : `✗ Você errou. Marcou ${selected.respostaUsuario}, a certa é ${selected.solved.alternativa_correta}.`}</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="recall-retry-btn" onClick={() => handleRetry(selected.id)}>🔄 Refazer</button>
              {filtered.length > 1 && (
                <button className="recall-retry-btn" onClick={handleNext}>Próxima ▶</button>
              )}
            </div>
          </div>

          <div className="result-tema-tag">🏷️ Tema: {selected.solved.tema}</div>

          <div className="result-final">
            <div className="result-final-label">Resposta final</div>
            <div className="result-final-text">{selected.solved.resposta_final}</div>
          </div>
          <div className="result-meta">Matéria: {selected.solved.materia}</div>

          <QuestionFigure figura={selected.solved.figura} />

          <div className="section-label">Rota de resolução</div>
          {selected.solved.passos?.map((p: any, i: number) => (
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

          <div className="section-label">Por que cada alternativa está certa ou errada</div>
          <div className="alt-list">
            {selected.solved.alternativas?.map((a: any) => (
              <div key={a.letra} className={`alt-item ${a.correta ? "correct" : ""} ${selected.respostaUsuario === a.letra ? "your-pick" : ""}`}>
                <span className="alt-letra">{a.letra}</span>
                <span className="alt-texto">{a.texto}</span>
                {selected.respostaUsuario === a.letra && <span className="your-pick-tag">sua resposta</span>}
                {!a.correta && a.motivo_erro && (
                  <p className="alt-motivo">{renderHighlighted(a.motivo_erro)}</p>
                )}
              </div>
            ))}
          </div>

          {selected.solved.macete && (
            <div className="macete-box">
              <span className="macete-label">⚓ Macete de prova:</span>
              {renderHighlighted(selected.solved.macete)}
            </div>
          )}

          {selected.lesson && (
            <>
              <div className="section-label">Aula do tema</div>
              <div className="lesson-block">
                <h4 className="lesson-title">🎯 O que essa questão está testando</h4>
                <p className="lesson-text">{renderHighlighted(selected.lesson.o_que_a_questao_pede)}</p>
              </div>
              <div className="lesson-block">
                <h4 className="lesson-title">🧭 Como interpretar o enunciado</h4>
                <p className="lesson-text">{renderHighlighted(selected.lesson.como_interpretar)}</p>
              </div>
              <div className="lesson-block">
                <h4 className="lesson-title">📖 A matéria explicada</h4>
                <p className="lesson-text">{renderHighlighted(selected.lesson.explicacao_da_regra)}</p>
              </div>
              <div className="lesson-block">
                <h4 className="lesson-title">⚠️ Erro comum de quem erra essa questão</h4>
                <p className="lesson-text">{renderHighlighted(selected.lesson.erro_comum)}</p>
              </div>
              {selected.lesson.youtube_busca && (
                <div className="youtube-tip">▶️ Estude mais: busque no YouTube por "{selected.lesson.youtube_busca}"</div>
              )}
            </>
          )}

                    <div className="result-actions">
            <button
              className={`action-btn ${isReviewedThisWeek(selected.reviewedAt) ? "reviewed" : ""}`}
              onClick={() => handleMarkReviewed(selected.id)}
            >
              {isReviewedThisWeek(selected.reviewedAt) ? "✓ Revisado essa semana" : "Marcar como revisei"}
            </button>
            <button
              className={`action-btn ${selected.attention ? "attention-on" : ""}`}
              onClick={() => handleToggleAttention(selected.id, selected.attention)}
            >
              {selected.attention ? "★ Atenção marcada" : "☆ Marcar atenção"}
            </button>
            
          </div>
        </section>
      )}

      <section className="chart bank-chart">
        <div className="bank-tabs">
          <button className={`bank-tab ${bankTab === "diario" ? "active" : ""}`} onClick={() => setBankTab("diario")}>Diário de bordo</button>
          <button className={`bank-tab ${bankTab === "atencao" ? "active" : ""}`} onClick={() => setBankTab("atencao")}>⭐ Atenção</button>
        </div>
        <div className="section-label">{bankTab === "diario" ? `Diário de bordo — ${SUBJECT_LABELS[subject]}` : `Questões de atenção — ${SUBJECT_LABELS[subject]}`}</div>
        <div className="bank-controls-row">
          <input className="bank-search-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por tema ou palavra-chave..." />
        </div>
        <div className="bank-list">
          {loading ? (
            <div className="bank-empty">Carregando...</div>
          ) : filtered.length === 0 ? (
            <div className="bank-empty">
              {bankTab === "atencao" ? "Nenhuma questão marcada com atenção ainda." : "Nenhuma questão salva ainda. Cole uma questão acima para começar."}
            </div>
          ) : filtered.map(q => (
            <div className={`bank-item ${!isReviewedThisWeek(q.reviewedAt) ? "pending-review" : ""}`} key={q.id}>
              <button className="bank-item-main" onClick={() => setSelected(q)}>
                <span className="bank-tag">
                  {q.tema}{q.attention ? " · ⭐" : ""}
                  {q.respostaUsuario && (q.acertou ? " · ✓" : " · ✗")}
                </span>
                <p className="bank-preview">{q.preview}</p>
              </button>
              <button onClick={() => handleDelete(q.id)} style={{ marginLeft: "0.5rem" }}>🗑️</button>
            </div>
          ))}
        </div>
      </section>
      <footer>corrija · aprenda o macete · repita a rota até dominar o rumo</footer>
    </main>
  );
}