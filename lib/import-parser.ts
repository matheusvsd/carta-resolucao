export interface ParsedQuestion {
  numero: string;
  enunciado: string;
  gabarito: string | null;
}

export function parseQuestoesTexto(raw: string): ParsedQuestion[] {
  const blocos = raw.split(/QUEST[ÃA]O\s+(\d+)/i).slice(1);
  const resultado: ParsedQuestion[] = [];

  for (let i = 0; i < blocos.length; i += 2) {
    const numero = blocos[i].trim();
    const conteudo = blocos[i + 1] ?? "";

    const gabaritoMatch = conteudo.match(/Gabarito Oficial:\s*([A-E])/i);
    const gabarito = gabaritoMatch ? gabaritoMatch[1].toUpperCase() : null;

    let corpo = conteudo
      .replace(/={5,}/g, "")
      .replace(/Gabarito Oficial:[\s\S]*$/i, "")
      .trim();

    corpo = corpo
      .replace(/^Texto Base:\s*/im, "")
      .replace(/^Enunciado:\s*/im, "\n")
      .replace(/^Alternativas:\s*/im, "\n")
      .replace(/\(([a-e])\)/gi, (_, l) => `${l.toUpperCase()})`)
      .trim();

    if (corpo.length > 20) {
      resultado.push({ numero, enunciado: corpo, gabarito });
    }
  }

  return resultado;
}