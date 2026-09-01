import { supabase } from "./client";
import type { QuestionRecord, Subject } from "@/types/question";
import { recordStudyDay } from "./streak";

export async function fetchQuestions(subject: Subject): Promise<QuestionRecord[]> {
  const { data, error } = await supabase
    .from("questions")
    .select("*")
    .eq("subject", subject)
    .order("created_at", { ascending: false });

  if (error) throw error;

    return (data ?? []).map((row) => ({
    id: row.id,
    subject: row.subject,
    questionText: row.question_text,
    preview: row.preview,
    tema: row.tema,
    level: row.level,
    solved: row.solved,
    lesson: row.lesson,
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at,
    attention: row.attention ?? false,
    respostaUsuario: row.resposta_usuario,
    acertou: row.acertou,
    answeredAt: row.answered_at,
  }));
}

export async function saveQuestion(record: Omit<QuestionRecord, "id" | "createdAt" | "reviewedAt" | "attention">) {
  const { data, error } = await supabase
    .from("questions")
    .insert({
      subject: record.subject,
      question_text: record.questionText,
      preview: record.preview,
      tema: record.tema,
      level: record.level,
      solved: record.solved ?? null,
      lesson: record.lesson ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteQuestion(id: string) {
  const { error } = await supabase.from("questions").delete().eq("id", id);
  if (error) throw error;
}

export async function markReviewed(id: string) {
  const { error } = await supabase
    .from("questions")
    .update({ reviewed_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function toggleAttention(id: string, attention: boolean) {
  const { error } = await supabase
    .from("questions")
    .update({ attention })
    .eq("id", id);
  if (error) throw error;
}


export async function submitAnswer(id: string, letra: string, acertou: boolean) {
  const { error } = await supabase
    .from("questions")
    .update({
      resposta_usuario: letra,
      acertou,
      answered_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
  recordStudyDay().catch((err) => console.error("Erro ao registrar dia de estudo:", err));
}



export async function clearAnswer(id: string) {
  const { error } = await supabase
    .from("questions")
    .update({ resposta_usuario: null, acertou: null, answered_at: null })
    .eq("id", id);
  if (error) throw error;
}


export interface DesempenhoTema {
  tema: string;
  total: number;
  acertos: number;
  erros: number;
  pctAcerto: number;
}

export async function fetchDesempenho(subject: Subject): Promise<DesempenhoTema[]> {
  const { data, error } = await supabase
    .from("questions")
    .select("tema, acertou")
    .eq("subject", subject)
    .not("acertou", "is", null);

  if (error) throw error;

  const map = new Map<string, { total: number; acertos: number }>();
  for (const row of data ?? []) {
    const atual = map.get(row.tema) ?? { total: 0, acertos: 0 };
    atual.total += 1;
    if (row.acertou) atual.acertos += 1;
    map.set(row.tema, atual);
  }

  return Array.from(map.entries())
    .map(([tema, v]) => ({
      tema,
      total: v.total,
      acertos: v.acertos,
      erros: v.total - v.acertos,
      pctAcerto: Math.round((v.acertos / v.total) * 100),
    }))
    .sort((a, b) => a.pctAcerto - b.pctAcerto);
}