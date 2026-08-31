"use client";
import { useEffect, useMemo, useState } from "react";
import type { Subject } from "@/types/question";
import { SUBJECT_LABELS } from "@/lib/topics";
import { fetchTopics, saveTopic, updateTopicResumo, deleteTopic, type TopicRecord, type TopicResumo } from "@/lib/supabase/topics";

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

export default function MateriasPage() {
  const [subject, setSubject] = useState<Subject>("matematica");
  const [topics, setTopics] = useState<TopicRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<TopicRecord | null>(null);

  const [categoria, setCategoria] = useState("");
  const [topico, setTopico] = useState("");
  const [generating, setGenerating] = useState(false);
  const [draft, setDraft] = useState<TopicResumo | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchTopics(subject)
      .then((data) => { if (active) setTopics(data); })
      .catch((err) => console.error(err))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [subject]);

  const grouped = useMemo(() => {
    const map: Record<string, TopicRecord[]> = {};
    for (const t of topics) {
      if (!map[t.categoria]) map[t.categoria] = [];
      map[t.categoria].push(t);
    }
    return map;
  }, [topics]);

  const categoriasExistentes = useMemo(() => Array.from(new Set(topics.map((t) => t.categoria))), [topics]);

  async function handleGenerate() {
    if (!categoria.trim() || !topico.trim()) return;
    setGenerating(true);
    setDraft(null);
    try {
      const res = await fetch("/api/topic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, categoria, topico }),
      });
      if (!res.ok) throw new Error("Falha ao gerar");
      const data = await res.json();
      setDraft(data);
    } catch (err) {
      console.error(err);
      alert("Erro ao gerar o resumo. Tente novamente.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleSaveDraft() {
    if (!draft) return;
    setSaving(true);
    try {
      const saved = await saveTopic({ subject, categoria, topico, resumo: draft });
      const record: TopicRecord = {
        id: saved.id,
        subject: saved.subject,
        categoria: saved.categoria,
        topico: saved.topico,
        resumo: saved.resumo,
        createdAt: saved.created_at,
      };
      setTopics((prev) => [...prev, record]);
      setDraft(null);
      setCategoria("");
      setTopico("");
      setSelected(record);
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar. Verifique se esse tópico já não existe nessa categoria.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir este tópico?")) return;
    try {
      await deleteTopic(id);
      setTopics((prev) => prev.filter((t) => t.id !== id));
      if (selected?.id === id) setSelected(null);
    } catch (err) {
      console.error(err);
      alert("Erro ao excluir.");
    }
  }

  return (
    <main className="wrap">
      <header>
        <div className="eyebrow">Agente IA · Marinha Mercante</div>
        <h1>Matérias</h1>
        <p className="sub">Cadastre tópicos por categoria e gere resumos completos com a IA, prontos para revisar.</p>
      </header>

      <section className="chart">
        <div className="subject-tabs">
          <button className={`subject-tab ${subject === "matematica" ? "active" : ""}`} onClick={() => { setSubject("matematica"); setSelected(null); }}>🧮 Matemática</button>
          <button className={`subject-tab ${subject === "portugues" ? "active" : ""}`} onClick={() => { setSubject("portugues"); setSelected(null); }}>📘 Português</button>
        </div>

        <div className="section-label">Novo tópico</div>
        <div className="topic-form-row">
          <div className="topic-form-field">
            <label className="field-label" style={{ fontSize: 13 }}>Categoria</label>
            <input
              className="bank-search-input"
              list="categorias-existentes"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              placeholder="Ex.: Morfologia"
            />
            <datalist id="categorias-existentes">
              {categoriasExistentes.map((c) => <option key={c} value={c} />)}
            </datalist>
          </div>
          <div className="topic-form-field">
            <label className="field-label" style={{ fontSize: 13 }}>Tópico</label>
            <input
              className="bank-search-input"
              value={topico}
              onChange={(e) => setTopico(e.target.value)}
              placeholder="Ex.: Sujeito"
            />
          </div>
        </div>
        <div className="controls">
          <button className="chart-btn" disabled={!categoria.trim() || !topico.trim() || generating} onClick={handleGenerate}>
            {generating ? "Gerando..." : "✨ Gerar resumo com IA"}
          </button>
        </div>

        {draft && (
          <div className="topic-draft">
            <div className="section-label">Prévia — revise antes de salvar</div>
            <TopicResumoView resumo={draft} />
            <div className="controls">
              <button className="action-btn" onClick={() => setDraft(null)} style={{ marginRight: 8 }}>Descartar</button>
              <button className="chart-btn" onClick={handleSaveDraft} disabled={saving}>
                {saving ? "Salvando..." : "Salvar tópico"}
              </button>
            </div>
          </div>
        )}
      </section>

      {selected && selected.resumo && (
        <section className="chart result-card">
          <div className="result-tema-tag">📚 {selected.categoria} · {selected.topico}</div>
          <TopicResumoView resumo={selected.resumo} />
          <div className="result-actions">
            <a className="action-btn" href={`/?tema=${encodeURIComponent(selected.topico)}&subject=${subject}`}>
              ⚓ Ver questões relacionadas
            </a>
            <button className="action-btn" onClick={() => handleDelete(selected.id)}>🗑️ Excluir tópico</button>
          </div>
        </section>
      )}

      <section className="chart bank-chart">
        <div className="section-label">Tópicos cadastrados — {SUBJECT_LABELS[subject]}</div>
        {loading ? (
          <div className="bank-empty">Carregando...</div>
        ) : topics.length === 0 ? (
          <div className="bank-empty">Nenhum tópico cadastrado ainda nessa matéria.</div>
        ) : (
          Object.entries(grouped).map(([cat, items]) => (
            <div key={cat} className="topic-categoria-group">
              <div className="topic-categoria-title">{cat}</div>
              <div className="bank-list">
                {items.map((t) => (
                  <div className="bank-item" key={t.id}>
                    <button className="bank-item-main" onClick={() => setSelected(t)}>
                      <p className="bank-preview">{t.topico}</p>
                    </button>
                    <button onClick={() => handleDelete(t.id)} style={{ marginLeft: "0.5rem" }}>🗑️</button>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </section>
      <footer>corrija · aprenda o macete · repita a rota até dominar o rumo</footer>
    </main>
  );
}

function TopicResumoView({ resumo }: { resumo: TopicResumo }) {
  return (
    <>
      <div className="lesson-block">
        <h4 className="lesson-title">📖 Definição</h4>
        <p className="lesson-text">{renderHighlighted(resumo.definicao)}</p>
      </div>
      <div className="lesson-block">
        <h4 className="lesson-title">🧭 Como identificar</h4>
        <p className="lesson-text">{renderHighlighted(resumo.como_identificar)}</p>
      </div>
      <div className="lesson-block">
        <h4 className="lesson-title">💡 Exemplos</h4>
        <ul className="topic-exemplos">
          {resumo.exemplos?.map((ex, i) => (
            <li key={i}>{renderHighlighted(ex)}</li>
          ))}
        </ul>
      </div>
      {resumo.macete && (
        <div className="macete-box">
          <span className="macete-label">⚓ Macete:</span>
          {renderHighlighted(resumo.macete)}
        </div>
      )}
    </>
  );
}