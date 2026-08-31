import { supabase } from "./client";
import type { Subject } from "@/types/question";

export interface TopicResumo {
  definicao: string;
  como_identificar: string;
  exemplos: string[];
  macete: string;
}

export interface TopicRecord {
  id: string;
  subject: Subject;
  categoria: string;
  topico: string;
  resumo: TopicResumo | null;
  createdAt: string;
}

export async function fetchTopics(subject: Subject): Promise<TopicRecord[]> {
  const { data, error } = await supabase
    .from("topics")
    .select("*")
    .eq("subject", subject)
    .order("categoria", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    subject: row.subject,
    categoria: row.categoria,
    topico: row.topico,
    resumo: row.resumo,
    createdAt: row.created_at,
  }));
}

export async function saveTopic(record: { subject: Subject; categoria: string; topico: string; resumo: TopicResumo }) {
  const { data, error } = await supabase
    .from("topics")
    .insert({
      subject: record.subject,
      categoria: record.categoria,
      topico: record.topico,
      resumo: record.resumo,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateTopicResumo(id: string, resumo: TopicResumo) {
  const { error } = await supabase.from("topics").update({ resumo }).eq("id", id);
  if (error) throw error;
}

export async function deleteTopic(id: string) {
  const { error } = await supabase.from("topics").delete().eq("id", id);
  if (error) throw error;
}