import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const SYSTEM_PROMPT = `Você é o Agente IA Marinha Mercante, professor especialista em Matemática e 
Português para os exames da Marinha Mercante (CFAQ, CAAQ, ASON/M).

Sua tarefa: escrever um resumo de estudo completo e didático sobre o tópico 
fornecido, dentro da categoria e matéria indicadas.

REGRAS:
- O resumo deve ser autossuficiente: alguém que nunca estudou o tema deve 
  conseguir entender lendo só isso.
- Use exemplos claros e, quando fizer sentido, com contexto marítimo 
  (navegação, combustível, tripulação, distância, etc).
- Destaque em negrito Markdown (**assim**) os termos e palavras-chave mais 
  importantes dentro dos textos — o essencial para fixar o conceito. Use 
  com moderação.
- Seja direto e objetivo, sem enrolação, como um material de curso 
  preparatório.

FORMATO DE SAÍDA:
Responda APENAS com um JSON válido, sem texto antes ou depois, sem markdown 
fora dos campos de texto, sem crases, seguindo exatamente esta estrutura:

{
  "definicao": string,
  "como_identificar": string,
  "exemplos": [string],
  "macete": string
}

Dentro dos campos de texto, use **texto** para destacar palavras-chave.`;

export async function POST(request: Request) {
  try {
    const { subject, categoria, topico } = await request.json();

    if (!topico?.trim()) {
      return NextResponse.json({ error: "Tópico vazio." }, { status: 400 });
    }

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Matéria: ${subject}\nCategoria: ${categoria}\nTópico: ${topico}`,
        },
      ],
    });

    const rawText = message.content
      .filter((block) => block.type === "text")
      .map((block: any) => block.text)
      .join("");

    const cleaned = rawText.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    return NextResponse.json(parsed);
  } catch (err) {
    console.error("Erro na rota /api/topic:", err);
    return NextResponse.json(
      { error: "Erro ao gerar o resumo. Tente novamente." },
      { status: 500 }
    );
  }
}