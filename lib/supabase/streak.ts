import { supabase } from "./client";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export async function recordStudyDay() {
  const { error } = await supabase
    .from("study_days")
    .upsert({ day: todayStr() }, { onConflict: "day", ignoreDuplicates: true });
  if (error) throw error;
}

export interface StreakInfo {
  streak: number;
  totalDias: number;
}

export async function fetchStreak(): Promise<StreakInfo> {
  const { data, error } = await supabase
    .from("study_days")
    .select("day")
    .order("day", { ascending: false });
  if (error) throw error;

  const dias = (data ?? []).map((r) => r.day as string);
  const diasSet = new Set(dias);

  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  if (!diasSet.has(todayStr())) {
    cursor.setDate(cursor.getDate() - 1);
  }

  while (diasSet.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return { streak, totalDias: dias.length };
}