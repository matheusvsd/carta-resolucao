"use client";
import { useEffect, useMemo, useState } from "react";
import type { QuestionRecord, Subject } from "@/types/question";
import { SUBJECT_LABELS } from "@/lib/topics";
import { fetchQuestions, saveQuestion, deleteQuestion } from "@/lib/supabase/questions";

const placeholders: Record<Subject, string> = {
  matematica: `Ex.: Um navio percorre 240 milhas em 8 horas. Mantendo a mesma velocidade, quantas milhas percorrerá em 5 horas?\nA) 120   B) 150   C) 160   D) 180`,
  portugues: `Ex.: Assinale a alternativa em que a concordância verbal está de acordo com a norma-padrão:\nA) Fazem dois anos que ele embarcou.\nB) Existem vários motivos para a demora.`
};

export function ResolutionApp() {
  const [subject, setSubject] = useState<Subject>("matematica");
  const [question, setQuestion] = useState("");
  const [search, setSearch] = useState("");
  const [questions, setQuestions] = useState<QuestionRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchQuestions(subject)
      .then((data) => { if (active) setQuestions(data); })
      .catch((err) => console.error("Erro ao buscar questões:", err))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [subject]);

  const filtered = useMemo(() => questions.filter(q =>
    `${q.tema} ${q.preview}`.toLowerCase().includes(search.toLowerCase())
  ), [questions, search]);

  async function handleSolve() {
    if (!question.trim()) return;
    setSaving(true);
    try {
      const preview = question.trim().slice(0, 120);
      const saved = await saveQuestion({
        subject,
        questionText: question,
        preview,
        tema: "Geral",
        level: "A definir",
        solved: null,
        lesson: null,
      });
      setQuestions((prev) => [
        {
          id: saved.id,
          subject: saved.subject,
          questionText: saved.question_text,
          preview: saved.preview,
          tema: saved.tema,
          level: saved.level,
          solved: saved.solved,
          lesson: saved.lesson,
          createdAt: saved.created_at,
        },
        ...prev,
      ]);
      setQuestion("");
      alert("Questão salva no banco de dados! Na Etapa 3 vamos conectar a IA para gerar a resolução automaticamente.");
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar a questão. Veja o console para detalhes.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir esta questão?")) return;
    try {
      await deleteQuestion(id);
      setQuestions((prev) => prev.filter((q) => q.id !== id));
    } catch (err) {
      console.error(err);
      alert("Erro ao excluir a questão.");
    }
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
          <button className="chart-btn" disabled={!question.trim() || saving} onClick={handleSolve}>
            {saving ? "Salvando..." : "⚓ Traçar rota da resolução"}
          </button>
        </div>
      </section>
      <section className="chart bank-chart">
        <div className="section-label">Diário de bordo — {SUBJECT_LABELS[subject]}</div>
        <div className="bank-controls-row">
          <input className="bank-search-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por tema ou palavra-chave..." />
        </div>
        <div className="bank-list">
          {loading ? (
            <div className="bank-empty">Carregando...</div>
          ) : filtered.length === 0 ? (
            <div className="bank-empty">
              Nenhuma questão salva ainda. Cole uma questão acima para começar.
            </div>
          ) : filtered.map(q => (
            <div className="bank-item" key={q.id}>
              <button className="bank-item-main">
                <span className="bank-tag">{q.tema} · {q.level}</span>
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