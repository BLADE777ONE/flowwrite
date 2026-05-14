const GEMINI_ENDPOINT_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'
const DEFAULT_MODEL = 'gemini-2.5-flash'
const STUDIO_SIGNAL_ERROR = 'Sinal do estúdio caiu. Verifique sua conexão.'
const AI_TIMEOUT_ERROR = 'A IA demorou para responder. Tente de novo em alguns segundos.'
const AI_AUTH_ERROR = 'A chave da IA não foi aceita. Confira se a AI_API_KEY está correta e ativa no Google AI Studio.'
const AI_QUOTA_ERROR = 'A IA bateu limite de uso agora. Aguarde um pouco ou confira a cota da chave.'
const AI_REQUEST_ERROR = 'A IA recusou o pedido. Confira o modelo configurado em AI_MODEL ou tente novamente.'

const SYSTEM_PROMPT = `Você é o Assistente Lírico e Rítmico do OBloco, um software premium para MCs de Rap, Trap e Plug. Sua função é analisar versos, identificar falhas de métrica e sugerir melhorias baseadas nas seguintes regras de engenharia de flow:

1. REGRAS DE DENSIDADE E BPM:
- Boom Bap (85-95 BPM): O ideal são 10 a 14 sílabas por compasso.
- Trap (130-150 BPM): O ideal são 8 a 12 sílabas por compasso.
- Plug (110-130 BPM): O ideal são 6 a 10 sílabas por compasso.
* Ação: Se a letra exceder esses limites, alerte sobre "atropelamento do beat" e falta de fôlego.

2. TRIPLET FLOW (TERCINAS):
- No Trap, sugira o "Triplet Flow" (dividir o compasso em 3 partes rápidas: A, B, C) se o MC usar a mesma métrica linear por muitas linhas. Quebrar a cadência gera "bounce".

3. ELISÃO FONÉTICA:
- Identifique palavras que terminam em vogal e a próxima começa em vogal (ex: "tão re-al"). Sugira que o MC cante de forma unida ("tão-ral") para poupar espaço no tempo rítmico.

4. RESPIRO E SWING:
- Um flow sem pausas é robótico. Recomende deixar espaços vazios (silêncio) no grid de 16 tempos para garantir a respiração e o swing da música.

SEU TOM DE VOZ:
Comunique-se de forma direta, técnica, mas usando a linguagem da cultura urbana (ex: "punchline", "flow", "bounce", "canetada", "atropelar o beat"). Seja objetivo, como um produtor experiente dentro do estúdio conversando com o MC.

FORMATO DA RESPOSTA:
- Não use markdown, asteriscos, tabelas ou blocos de código.
- Responda em texto puro, curto e escaneável.
- Use no máximo 5 seções: Diagnóstico, Risco, Elisão, Swing, Ajuste.
- Cada seção deve ter 1 ou 2 frases curtas.`

function buildUserPrompt(letraUsuario: string, bpmAtual: number): string {
  return `Analise diretamente este trecho para o MC, considerando o BPM atual da sessão.

BPM atual: ${bpmAtual}

Letra do usuário:
${letraUsuario}

Retorne uma análise curta, completa e pronta para a interface.
Não use markdown.
Estruture exatamente assim:
Diagnóstico: ...
Risco: ...
Elisão: ...
Swing: ...
Ajuste: ...`
}

function extractGeminiResult(data: unknown): { text: string; finishReason?: string } {
  const candidate = (data as any)?.candidates?.[0]
  const parts = candidate?.content?.parts
  if (!Array.isArray(parts)) return { text: '', finishReason: candidate?.finishReason }

  return {
    text: parts
      .map(part => typeof part?.text === 'string' ? part.text : '')
      .join('\n')
      .trim(),
    finishReason: candidate?.finishReason,
  }
}

function cleanResponse(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/^\s*[-*]\s+/gm, '')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

async function buildErrorMessage(response: Response): Promise<string> {
  const body = await response.text().catch(() => '')
  console.error('[AI Flow] Gemini HTTP error:', response.status, body)

  if (response.status === 401 || response.status === 403) return AI_AUTH_ERROR
  if (response.status === 429) return AI_QUOTA_ERROR
  if (response.status === 400 || response.status === 404) return AI_REQUEST_ERROR
  return STUDIO_SIGNAL_ERROR
}

export async function analisarMétricaFlow(letraUsuario: string, bpmAtual: number): Promise<string> {
  const apiKey = process.env.AI_API_KEY
  const lyric = String(letraUsuario || '').trim()
  const bpm = Number.isFinite(bpmAtual) && bpmAtual > 0 ? Math.round(bpmAtual) : 120

  if (!lyric) return 'Manda algumas barras primeiro para eu analisar o flow.'
  if (!apiKey) return 'IA do estúdio ainda não foi configurada. Defina AI_API_KEY no ambiente.'

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 15000)
  const model = process.env.AI_MODEL || DEFAULT_MODEL

  try {
    const response = await fetch(`${GEMINI_ENDPOINT_BASE}/${model}:generateContent`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: SYSTEM_PROMPT }],
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: buildUserPrompt(lyric, bpm) }],
          },
        ],
        generationConfig: {
          temperature: 0.25,
          topP: 0.9,
          maxOutputTokens: 1400,
          responseMimeType: 'text/plain',
        },
      }),
    })

    if (!response.ok) {
      return buildErrorMessage(response)
    }

    const data = await response.json()
    const result = extractGeminiResult(data)
    const text = cleanResponse(result.text)
    if (result.finishReason === 'MAX_TOKENS') {
      return `${text}\n\nA análise foi cortada pelo limite da IA. Clique em analisar novamente para gerar uma versão menor.`
    }
    return text || 'Não consegui ler o flow agora. Tenta mandar o trecho de novo.'
  } catch (error) {
    console.error('[AI Flow] Falha na análise:', error)
    if (error instanceof Error && error.name === 'AbortError') return AI_TIMEOUT_ERROR
    return STUDIO_SIGNAL_ERROR
  } finally {
    clearTimeout(timeoutId)
  }
}

export const analisarMetricaFlow = analisarMétricaFlow
