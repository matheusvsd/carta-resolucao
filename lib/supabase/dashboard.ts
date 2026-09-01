import { supabase } from "./client";
import type { Subject } from "@/types/question";

const WEEK_AGO = () => new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

export interface WeeklySummary {
  respondidas: number;
  acertos: number;
  pctAcerto: number;
  flashcardsRevisados: number;
}

export async function fetchWeeklySummary(): Promise<WeeklySummary> {
  const since = WEEK_AGO();

  const { data: qData, error: qErr } = await supabase
    .from("questions")
    .select("acertou")
    .not("answered_at", "is", null)
    .gte("answered_at", since);
  if (qErr) throw qErr;

  const respondidas = qData?.length ?? 0;
  const acertos = qData?.filter((r) => r.acertou).length ?? 0;
  const pctAcerto = respondidas === 0 ? 0 : Math.round((acertos / respondidas) * 100);

  const { count: fcCount, error: fcErr } = await supabase
    .from("flashcards")
    .select("*", { count: "exact", head: true })
    .not("ultima_avaliacao", "is", null)
    .gte("last_reviewed_at", since);
  if (fcErr) throw fcErr;

  return { respondidas, acertos, pctAcerto, flashcardsRevisados: fcCount ?? 0 };
}

export interface TemaOption {
  tema: string;
  total: number;
}

export async function fetchTemasDisponiveis(subject: Subject): Promise<TemaOption[]> {
  const { data, error } = await supabase
    .from("questions")
    .select("tema")
    .eq("subject", subject);
  if (error) throw error;

  const map = new Map<string, number>();
  for (const row of data ?? []) {
    map.set(row.tema, (map.get(row.tema) ?? 0) + 1);
  }
  return Array.from(map.entries()).map(([tema, total]) => ({ tema, total }));
}