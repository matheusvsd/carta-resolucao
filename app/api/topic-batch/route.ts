import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const SYSTEM_PROMPT = `Você é o Agente IA Marinha Mercante, professor especialista em Matemática e 
Português para os exames da Marinha Mercante (CFAQ, CAAQ, ASON/M).

Você vai receber um material de estudo (PDF ou texto colado) que cobre uma 
categoria de conteúdo. Sua tarefa é LER TODO o material, IDENTIFICAR cada 
subtema/tópico distinto abordado nele, e escrever um resumo de estudo 
completo e didático para CADA um desses tópicos, baseado FIELMENTE no 
conteúdo fornecido.

REGRAS:
- Baseie-se estritamente no material fornecido — não invente conteúdo que 
  não esteja lá, mas pode complementar com exemplos didáticos se ajudar a 
  ilustrar o que o material explica.
- Cada tópico identificado deve ser específico e ter um nome curto e claro 
  (ex: "Substantivo", "Regra de três simples", não "Capítulo 1").
- Use exemplos claros e, quando fizer sentido, com contexto marítimo.
- Destaque em negrito Markdown (**assim**) os termos e palavras-chave mais 
  importantes. Use com moderação.
- Seja direto e objetivo, como um material de curso preparatório.

FORMATO DE SAÍDA:
Responda APENAS com um JSON válido (um array), sem texto antes ou depois, 
sem markdown fora dos campos de texto, sem crases, seguindo exatamente 
esta estrutura:

[
  {
    "topico": string,
    "definicao": string,
    "como_identificar": string,
    "exemplos": [string],
    "macete": string
  }
]

Dentro dos campos de texto, use **texto** para destacar palavras-chave.`;

export async function POST(request: Request) {
  try {
    const { subject, categoria, sourceType, text, pdfBase64 } = await request.json();

    const contentBlocks: any[] = [];

    if (sourceType === "pdf" && pdfBase64) {
      contentBlocks.push({
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: pdfBase64 },
      });
    }

    contentBlocks.push({
      type: "text",
      text: `Matéria: ${subject}\nCategoria: ${categoria}\n${
        sourceType === "texto" ? `Material de estudo:\n${text}` : "Leia o material em anexo e extraia os tópicos."
      }`,
    });

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: contentBlocks }],
    });

    const rawText = message.content
      .filter((block) => block.type === "text")
      .map((block: any) => block.text)
      .join("");

    const cleaned = rawText.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    return NextResponse.json(parsed);
  } catch (err) {
    console.error("Erro na rota /api/topic-batch:", err);
    return NextResponse.json(
      { error: "Erro ao processar o material. Tente novamente." },
      { status: 500 }
    );
  }
}