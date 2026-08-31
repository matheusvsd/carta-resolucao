import { supabase } from "./client";
import type { Subject } from "@/types/question";

export interface FlashcardRecord {
  id: string;
  subject: Subject;
  categoria: string;
  pergunta: string;
  resposta: string;
  origem: string;
  intervalDias: number;
  nextReviewAt: string;
  ultimaAvaliacao: string | null;
  createdAt: string;
}

function mapRow(row: any): FlashcardRecord {
  return {
    id: row.id,
    subject: row.subject,
    categoria: row.categoria,
    pergunta: row.pergunta,
    resposta: row.resposta,
    origem: row.origem,
    intervalDias: row.interval_dias,
    nextReviewAt: row.next_review_at,
    ultimaAvaliacao: row.ultima_avaliacao,
    createdAt: row.created_at,
  };
}

export async function fetchFlashcards(subject: Subject): Promise<FlashcardRecord[]> {
  const { data, error } = await supabase
    .from("flashcards")
    .select("*")
    .eq("subject", subject)
    .order("next_review_at", { ascending: true });

  if (error) throw error;
  return (data ?? []).map(mapRow);
}

export async function createFlashcard(record: { subject: Subject; categoria: string; pergunta: string; resposta: string; origem?: string; sourceId?: string }) {
  const { data, error } = await supabase
    .from("flashcards")
    .insert({
      subject: record.subject,
      categoria: record.categoria,
      pergunta: record.pergunta,
      resposta: record.resposta,
      origem: record.origem ?? "manual",
      source_id: record.sourceId ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return mapRow(data);
}

export async function deleteFlashcard(id: string) {
  const { error } = await supabase.from("flashcards").delete().eq("id", id);
  if (error) throw error;
}

const INTERVALS: Record<string, number> = {
  errei: 0,
  dificil: 1,
  bom: 6,
  facil: 12,
};

export async function reviewFlashcard(id: string, avaliacao: "errei" | "dificil" | "bom" | "facil") {
  const dias = INTERVALS[avaliacao];
  const nextReviewAt = new Date(Date.now() + dias * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase
    .from("flashcards")
    .update({
      interval_dias: dias,
      next_review_at: nextReviewAt,
      ultima_avaliacao: avaliacao,
    })
    .eq("id", id);

  if (error) throw error;
  return nextReviewAt;
}

export async function syncAutoFlashcards(subject: Subject) {
  const { data: existing, error: e1 } = await supabase
    .from("flashcards")
    .select("source_id")
    .eq("subject", subject)
    .not("source_id", "is", null);
  if (e1) throw e1;
  const existingIds = new Set((existing ?? []).map((r) => r.source_id));

  const { data: questions, error: e2 } = await supabase
    .from("questions")
    .select("id, tema, solved")
    .eq("subject", subject);
  if (e2) throw e2;

  const { data: topics, error: e3 } = await supabase
    .from("topics")
    .select("id, categoria, topico, resumo")
    .eq("subject", subject);
  if (e3) throw e3;

  const toInsert: any[] = [];

  for (const q of questions ?? []) {
    if (existingIds.has(q.id)) continue;
    const macete = q.solved?.macete;
    if (!macete) continue;
    toInsert.push({
      subject,
      categoria: q.tema ?? "Geral",
      pergunta: `Qual o macete para questões de ${q.tema}?`,
      resposta: macete,
      origem: "questao",
      source_id: q.id,
    });
  }

  for (const t of topics ?? []) {
    if (existingIds.has(t.id)) continue;
    const definicao = t.resumo?.definicao;
    if (!definicao) continue;
    toInsert.push({
      subject,
      categoria: t.categoria,
      pergunta: `O que é ${t.topico}?`,
      resposta: definicao,
      origem: "topico",
      source_id: t.id,
    });
  }

  if (toInsert.length > 0) {
    const { error: e4 } = await supabase.from("flashcards").insert(toInsert);
    if (e4) throw e4;
  }

  return toInsert.length;
}