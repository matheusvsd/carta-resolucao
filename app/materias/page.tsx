"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Subject } from "@/types/question";
import { SUBJECT_LABELS } from "@/lib/topics";
import { fetchTopics, saveTopic, deleteTopic, updateTopicResumo, type TopicRecord, type TopicResumo } from "@/lib/supabase/topics";
import { useSearchParams } from "next/navigation";

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
  const searchParams = useSearchParams();
  const [subject, setSubject] = useState<Subject>("matematica");
  const [topics, setTopics] = useState<TopicRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<TopicRecord | null>(null);

  const [modo, setModo] = useState<"simples" | "material">(
    searchParams.get("modo") === "material" ? "material" : "simples"
  );

  const [editando, setEditando] = useState(false);
  const [editDraft, setEditDraft] = useState<TopicResumo | null>(null);
  const [salvandoEdit, setSalvandoEdit] = useState(false);
  const [categoria, setCategoria] = useState("");
  const [topico, setTopico] = useState("");
  const [generating, setGenerating] = useState(false);
  const [draft, setDraft] = useState<TopicResumo | null>(null);
  const [saving, setSaving] = useState(false);

  const [categoriaMaterial, setCategoriaMaterial] = useState("");
  const [textoMaterial, setTextoMaterial] = useState("");
  const [arquivoNome, setArquivoNome] = useState("");
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [processandoMaterial, setProcessandoMaterial] = useState(false);
  const [draftBatch, setDraftBatch] = useState<Array<TopicResumo & { topico: string }> | null>(null);
  const [salvandoBatch, setSalvandoBatch] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setArquivoNome(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      setPdfBase64(base64);
    };
    reader.readAsDataURL(file);
  }

  async function handleProcessarMaterial() {
    if (!categoriaMaterial.trim()) return;
    if (!pdfBase64 && !textoMaterial.trim()) return;
    setProcessandoMaterial(true);
    setDraftBatch(null);
    try {
      const res = await fetch("/api/topic-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          categoria: categoriaMaterial,
          sourceType: pdfBase64 ? "pdf" : "texto",
          text: textoMaterial,
          pdfBase64,
        }),
      });
      if (!res.ok) throw new Error("Falha ao processar");
      const data = await res.json();
      setDraftBatch(data);
    } catch (err) {
      console.error(err);
      alert("Erro ao processar o material. Tente novamente.");
    } finally {
      setProcessandoMaterial(false);
    }
  }

  async function handleSalvarBatch() {
    if (!draftBatch) return;
    setSalvandoBatch(true);
    let sucesso = 0;
    for (const item of draftBatch) {
      try {
        const saved = await saveTopic({
          subject,
          categoria: categoriaMaterial,
          topico: item.topico,
          resumo: { definicao: item.definicao, como_identificar: item.como_identificar, exemplos: item.exemplos, macete: item.macete },
        });
        setTopics((prev) => [...prev, {
          id: saved.id, subject: saved.subject, categoria: saved.categoria,
          topico: saved.topico, resumo: saved.resumo, createdAt: saved.created_at,
        }]);
        sucesso++;
      } catch (err) {
        console.error(`Erro ao salvar tópico ${item.topico}:`, err);
      }
    }
    alert(`${sucesso} de ${draftBatch.length} tópicos salvos com sucesso.`);
    setDraftBatch(null);
    setCategoriaMaterial("");
    setTextoMaterial("");
    setArquivoNome("");
    setPdfBase64(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setSalvandoBatch(false);
  }

  function iniciarEdicao() {
    if (!selected?.resumo) return;
    setEditDraft({ ...selected.resumo });
    setEditando(true);
  }

  async function salvarEdicao() {
    if (!selected || !editDraft) return;
    setSalvandoEdit(true);
    try {
      await updateTopicResumo(selected.id, editDraft);
      const atualizado = { ...selected, resumo: editDraft };
      setSelected(atualizado);
      setTopics((prev) => prev.map((t) => t.id === selected.id ? atualizado : t));
      setEditando(false);
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar edição.");
    } finally {
      setSalvandoEdit(false);
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

        <div className="topic-mode-tabs">
          <button className={`topic-mode-tab ${modo === "simples" ? "active" : ""}`} onClick={() => setModo("simples")}>✏️ Criar tópico simples</button>
          <button className={`topic-mode-tab ${modo === "material" ? "active" : ""}`} onClick={() => setModo("material")}>📄 Importar de PDF/texto</button>
        </div>

        {modo === "simples" && (
          <>
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
          </>
        )}

        {modo === "material" && (
          <div className="topic-material-form">
            <div className="topic-form-field">
              <label className="field-label" style={{ fontSize: 13 }}>Categoria (ex.: Morfologia)</label>
              <input
                className="bank-search-input"
                value={categoriaMaterial}
                onChange={(e) => setCategoriaMaterial(e.target.value)}
                placeholder="Ex.: Morfologia"
              />
            </div>

            <div className="topic-upload-row">
              <button className="action-btn" onClick={() => fileInputRef.current?.click()}>
                📎 {arquivoNome || "Escolher PDF"}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                style={{ display: "none" }}
                onChange={handleFileSelect}
              />
              {pdfBase64 && (
                <button className="action-btn" onClick={() => { setPdfBase64(null); setArquivoNome(""); if (fileInputRef.current) fileInputRef.current.value = ""; }}>
                  ✕ remover
                </button>
              )}
            </div>

            <div className="topic-or-divider">ou cole o texto abaixo</div>

            <textarea
              value={textoMaterial}
              onChange={(e) => setTextoMaterial(e.target.value)}
              placeholder="Cole aqui o texto do material de estudo..."
              disabled={!!pdfBase64}
              style={{ minHeight: 140 }}
            />

            <div className="controls">
              <button
                className="chart-btn"
                disabled={!categoriaMaterial.trim() || (!pdfBase64 && !textoMaterial.trim()) || processandoMaterial}
                onClick={handleProcessarMaterial}
              >
                {processandoMaterial ? "Analisando material..." : "✨ Extrair tópicos com IA"}
              </button>
            </div>

            {draftBatch && (
              <div className="topic-draft">
                <div className="section-label">{draftBatch.length} tópicos identificados — revise antes de salvar</div>
                <div className="topic-batch-list">
                  {draftBatch.map((t, i) => (
                    <details key={i} className="topic-batch-item">
                      <summary>{t.topico}</summary>
                      <TopicResumoView resumo={t} />
                    </details>
                  ))}
                </div>
                <div className="controls">
                  <button className="action-btn" onClick={() => setDraftBatch(null)} style={{ marginRight: 8 }}>Descartar tudo</button>
                  <button className="chart-btn" onClick={handleSalvarBatch} disabled={salvandoBatch}>
                    {salvandoBatch ? "Salvando..." : `Salvar todos os ${draftBatch.length} tópicos`}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {selected && selected.resumo && !editando && (
        <section className="chart result-card">
          <div className="result-tema-tag">📚 {selected.categoria} · {selected.topico}</div>
          <TopicResumoView resumo={selected.resumo} />
          <div className="result-actions">
            <a className="action-btn" href={`/questoes?tema=${encodeURIComponent(selected.topico)}&subject=${subject}`}>
              ⚓ Ver questões relacionadas
            </a>
            <button className="action-btn" onClick={iniciarEdicao}>✏️ Editar</button>
            <button className="action-btn" onClick={() => handleDelete(selected.id)}>🗑️ Excluir tópico</button>
          </div>
        </section>
      )}

      {selected && editando && editDraft && (
        <section className="chart result-card">
          <div className="result-tema-tag">✏️ Editando: {selected.topico}</div>

          <label className="field-label" style={{ fontSize: 13 }}>Definição</label>
          <textarea value={editDraft.definicao} onChange={(e) => setEditDraft({ ...editDraft, definicao: e.target.value })} style={{ minHeight: 80, marginBottom: 14 }} />

          <label className="field-label" style={{ fontSize: 13 }}>Como identificar</label>
          <textarea value={editDraft.como_identificar} onChange={(e) => setEditDraft({ ...editDraft, como_identificar: e.target.value })} style={{ minHeight: 80, marginBottom: 14 }} />

          <label className="field-label" style={{ fontSize: 13 }}>Exemplos (um por linha)</label>
          <textarea
            value={editDraft.exemplos?.join("\n") ?? ""}
            onChange={(e) => setEditDraft({ ...editDraft, exemplos: e.target.value.split("\n") })}
            style={{ minHeight: 80, marginBottom: 14 }}
          />

          <label className="field-label" style={{ fontSize: 13 }}>Macete</label>
          <textarea value={editDraft.macete} onChange={(e) => setEditDraft({ ...editDraft, macete: e.target.value })} style={{ minHeight: 60, marginBottom: 14 }} />

          <div className="controls">
            <button className="action-btn" onClick={() => setEditando(false)} style={{ marginRight: 8 }}>Cancelar</button>
            <button className="chart-btn" onClick={salvarEdicao} disabled={salvandoEdit}>
              {salvandoEdit ? "Salvando..." : "Salvar alterações"}
            </button>
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
