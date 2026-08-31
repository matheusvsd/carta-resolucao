"use client";
import { useEffect, useMemo, useState } from "react";
import type { Subject } from "@/types/question";
import { SUBJECT_LABELS } from "@/lib/topics";
import { fetchFlashcards, reviewFlashcard, syncAutoFlashcards, type FlashcardRecord } from "@/lib/supabase/flashcards";

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

const RATE_OPTIONS = [
  { key: "errei", label: "Errei", sub: "< 1 min" },
  { key: "dificil", label: "Difícil", sub: "1 dia" },
  { key: "bom", label: "Bom", sub: "6 dias" },
  { key: "facil", label: "Fácil", sub: "12 dias" },
] as const;

export default function FlashcardsPage() {
  const [subject, setSubject] = useState<Subject>("matematica");
  const [cards, setCards] = useState<FlashcardRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    syncAutoFlashcards(subject)
      .catch((err) => console.error("Erro ao sincronizar flashcards:", err))
      .finally(() => {
        fetchFlashcards(subject)
          .then((data) => { if (active) setCards(data); })
          .catch((err) => console.error(err))
          .finally(() => { if (active) setLoading(false); });
      });
    return () => { active = false; };
  }, [subject]);

  const due = useMemo(
    () => cards.filter((c) => new Date(c.nextReviewAt).getTime() <= Date.now()),
    [cards]
  );
  const current = due[0] ?? null;
  const dominadoPct = cards.length === 0 ? 0 : Math.round(((cards.length - due.length) / cards.length) * 100);

  async function handleRate(key: "errei" | "dificil" | "bom" | "facil") {
    if (!current) return;
    try {
      const nextReviewAt = await reviewFlashcard(current.id, key);
      const dias = { errei: 0, dificil: 1, bom: 6, facil: 12 }[key];
      setConfirming(dias === 0 ? "Agendado — volta em menos de 1 dia" : `Agendado — volta em ${dias} dias`);
      setCards((prev) => prev.map((c) => c.id === current.id ? { ...c, nextReviewAt, ultimaAvaliacao: key } : c));
      setTimeout(() => {
        setConfirming(null);
        setRevealed(false);
      }, 1200);
    } catch (err) {
      console.error(err);
      alert("Erro ao registrar avaliação.");
    }
  }

  return (
    <main className="wrap">
      <header>
        <div className="eyebrow">Agente IA · Marinha Mercante</div>
        <h1>Flashcards</h1>
        <p className="sub">Revise por repetição espaçada — o sistema traz de volta o que você mais precisa reforçar.</p>
      </header>

      <section className="chart" style={{ marginBottom: 20 }}>
        <div className="subject-tabs">
          <button className={`subject-tab ${subject === "matematica" ? "active" : ""}`} onClick={() => { setSubject("matematica"); setRevealed(false); }}>🧮 Matemática</button>
          <button className={`subject-tab ${subject === "portugues" ? "active" : ""}`} onClick={() => { setSubject("portugues"); setRevealed(false); }}>📘 Português</button>
        </div>
      </section>

      <div className="fc-page-header">
        <div className="fc-page-title">🗂️ Flashcards · {SUBJECT_LABELS[subject]}</div>
        <div className="fc-due-badge">{due.length} pra revisar</div>
      </div>

      <div className="fc-card-wrap">
        {loading ? (
          <div className="fc-empty">Carregando...</div>
        ) : !current ? (
          <div className="fc-empty">
            {cards.length === 0
              ? "Nenhum flashcard ainda. Resolva questões ou cadastre tópicos em Matérias para gerar cards automaticamente."
              : "Tudo revisado por agora! 🎉 Volte mais tarde."}
          </div>
        ) : (
          <>
            <div className="fc-categoria-row">
              <div className="fc-categoria-left">
                <span className="fc-dot" />
                {current.categoria}
              </div>
              <div className="fc-dominado">{dominadoPct}% dominado</div>
            </div>

            <div className="fc-card">
              {!revealed ? (
                <>
                  <span className="fc-badge">Pergunta</span>
                  <p className="fc-pergunta-text">{current.pergunta}</p>
                  <div className="fc-hint">🔄 toque para ver a resposta</div>
                </>
              ) : (
                <>
                  <span className="fc-badge resposta">Resposta</span>
                  <p className="fc-resposta-text">{renderHighlighted(current.resposta)}</p>
                  <div className="fc-fonte">{current.categoria}</div>
                </>
              )}
            </div>

            {confirming ? (
              <div className="fc-confirm">✓ {confirming}</div>
            ) : !revealed ? (
              <button className="fc-reveal-btn" onClick={() => setRevealed(true)}>Mostrar resposta</button>
            ) : (
              <div className="fc-rate-row">
                {RATE_OPTIONS.map((opt) => (
                  <button key={opt.key} className={`fc-rate-btn ${opt.key}`} onClick={() => handleRate(opt.key)}>
                    <span className="fc-rate-label">{opt.label}</span>
                    <span className="fc-rate-sub">{opt.sub}</span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}