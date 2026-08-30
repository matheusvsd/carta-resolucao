import { supabase } from "./client";
import type { QuestionRecord, Subject } from "@/types/question";

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
  }));
}

export async function saveQuestion(record: Omit<QuestionRecord, "id" | "createdAt">) {
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