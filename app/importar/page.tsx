"use client";
import { useState } from "react";
import type { Subject } from "@/types/question";
import { parseQuestoesTexto, type ParsedQuestion } from "@/lib/import-parser";
import { saveQuestion } from "@/lib/supabase/questions";

type StatusItem = "pendente" | "processando" | "ok" | "erro";

export default function ImportarPage() {
  const [subject, setSubject] = useState<Subject>("portugues");
  const [texto, setTexto] = useState("");
  const [parsed, setParsed] = useState<ParsedQuestion[]>([]);
  const [status, setStatus] = useState<Record<string, StatusItem>>({});
  const [rodando, setRodando] = useState(false);

  function handleAnalisar() {
    const result = parseQuestoesTexto(texto);
    setParsed(result);
    const st: Record<string, StatusItem> = {};
    result.forEach((q) => { st[q.numero] = "pendente"; });
    setStatus(st);
  }

  async function handleImportarTudo() {
    setRodando(true);
    for (const q of parsed) {
      setStatus((prev) => ({ ...prev, [q.numero]: "processando" }));
      try {
        const res = await fetch("/api/solve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            questionText: q.enunciado,
            subject,
            gabaritoOficial: q.gabarito,
          }),
        });
        if (!res.ok) throw new Error("Falha na IA");
        const solved = await res.json();

        await saveQuestion({
          subject,
          questionText: q.enunciado,
          preview: q.enunciado.slice(0, 120),
          tema: solved.tema ?? "Geral",
          level: "—",
          solved,
          lesson: solved.lesson ?? null,
        });

        setStatus((prev) => ({ ...prev, [q.numero]: "ok" }));
      } catch (err) {
        console.error(`Erro na questão ${q.numero}:`, err);
        setStatus((prev) => ({ ...prev, [q.numero]: "erro" }));
      }
    }
    setRodando(false);
  }

  const totalOk = Object.values(status).filter((s) => s === "ok").length;
  const totalErro = Object.values(status).filter((s) => s === "erro").length;
  const concluido = parsed.length > 0 && totalOk + totalErro === parsed.length;

  return (
    <main className="wrap">
      <header>
        <div className="eyebrow">Agente IA · Marinha Mercante</div>
        <h1>Importar questões em lote</h1>
        <p className="sub">Cole um arquivo com várias questões (com gabarito oficial) e deixe a IA resolver todas de uma vez.</p>
      </header>

      <section className="chart">
        <div className="subject-tabs">
          <button className={`subject-tab ${subject === "matematica" ? "active" : ""}`} onClick={() => setSubject("matematica")}>🧮 Matemática</button>
          <button className={`subject-tab ${subject === "portugues" ? "active" : ""}`} onClick={() => setSubject("portugues")}>📘 Português</button>
        </div>

        <div className="section-label">Cole o texto com as questões</div>
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Cole aqui o conteúdo do arquivo de questões..."
          style={{ minHeight: 220 }}
        />
        <div className="controls">
          <button className="chart-btn" disabled={!texto.trim() || rodando} onClick={handleAnalisar}>
            🔍 Analisar arquivo
          </button>
        </div>
      </section>

      {parsed.length > 0 && (
        <section className="chart">
          <div className="section-label">
            {parsed.length} questões encontradas
            {parsed.some((q) => !q.gabarito) && " (algumas sem gabarito identificado)"}
          </div>

          <div className="import-list">
            {parsed.map((q) => (
              <div key={q.numero} className={`import-item ${status[q.numero]}`}>
                <span className="import-num">Q{q.numero}</span>
                <span className="import-preview">{q.enunciado.slice(0, 70)}...</span>
                <span className="import-gabarito">{q.gabarito ? `Gab: ${q.gabarito}` : "sem gabarito"}</span>
                <span className="import-status">
                  {status[q.numero] === "pendente" && "⏳"}
                  {status[q.numero] === "processando" && "⚙️"}
                  {status[q.numero] === "ok" && "✅"}
                  {status[q.numero] === "erro" && "❌"}
                </span>
              </div>
            ))}
          </div>

          <div className="controls">
            {concluido ? (
              <span className="dash-hint">Concluído: {totalOk} importadas, {totalErro} com erro.</span>
            ) : (
              <button className="chart-btn" disabled={rodando} onClick={handleImportarTudo}>
                {rodando ? "Importando..." : `⚓ Importar todas (${parsed.length})`}
              </button>
            )}
          </div>
        </section>
      )}
      <footer>corrija · aprenda o macete · repita a rota até dominar o rumo</footer>
    </main>
  );
}