export type Subject = "matematica" | "portugues";

export interface SolvedQuestion {
  tema: string;
  materia: string;
  nivel: string;
  passos: Array<{
    titulo: string;
    regra?: string;
    explicacao: string;
    calculo?: string;
  }>;
  alternativa_correta: string;
  resposta_final: string;
  alternativas: Array<{
    letra: string;
    texto?: string;
    correta: boolean;
    motivo_erro?: string;
  }>;
  macete?: string;
}

export interface Lesson {
  tema: string;
  o_que_a_questao_pede?: string;
  como_interpretar?: string;
  explicacao_da_regra?: string;
  erro_comum?: string;
  youtube_busca?: string;
}

export interface QuestionRecord {
  id: string;
  subject: Subject;
  questionText: string;
  preview: string;
  tema: string;
  level: string;
  solved?: SolvedQuestion | null;
  lesson?: Lesson | null;
  createdAt: string;
}