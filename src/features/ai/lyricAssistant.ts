import { findRhymes } from '../rhyme/RhymeService'
import { buildCompactLyricContext, getContextSavings } from './contextBuilder'
import { getAIModelConfig } from './modelRegistry'
import { buildLyricAssistantPrompt, LYRIC_ASSISTANT_SYSTEM_PROMPT } from './promptBuilder'
import type { CompactLyricContext, LyricAssistantRequest, LyricAssistantResult } from './types'

const GEMINI_ENDPOINT_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

function cleanResponse(text: string): string {
  return String(text || '')
    .replace(/\r\n/g, '\n')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/^\s*[-*]\s+/gm, '')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function extractGeminiText(data: unknown): string {
  const parts = (data as any)?.candidates?.[0]?.content?.parts
  if (!Array.isArray(parts)) return ''
  return cleanResponse(parts.map(part => typeof part?.text === 'string' ? part.text : '').join('\n'))
}

function getLastWord(line: string): string {
  const match = line.toLowerCase().match(/[a-zA-ZÀ-ÿ]+(?=[^a-zA-ZÀ-ÿ]*$)/)
  return match?.[0] || ''
}

function buildSuggestions(context: CompactLyricContext): string[] {
  const anchor = context.selectedWord || getLastWord(context.activeLine) || getLastWord(context.activeLines.at(-1) || '')
  const rhymes = anchor ? findRhymes(anchor, 6) : []

  if (context.action === 'complete_verse') {
    return rhymes.slice(0, 4).map(word => `eu mantenho meu foco e fecho em ${word}`)
  }

  if (context.action === 'internal_rhyme') {
    return rhymes.slice(0, 4).map(word => `${word} no meio da barra para puxar eco interno`)
  }

  if (context.action === 'trap_variation') {
    return [
      'corta uma palavra e deixa o 808 respirar',
      'entra atrasado no primeiro tempo e resolve no final',
      'repete a ultima ideia como ad-lib curto',
    ]
  }

  return rhymes.slice(0, 5)
}

function localAssistant(request: LyricAssistantRequest, context: CompactLyricContext): LyricAssistantResult {
  const suggestions = buildSuggestions(context)
  const dense = context.averageSyllables >= 14
  const empty = context.activeLines.length === 0
  const rhymeLine = context.rhymeScheme && context.rhymeScheme !== 'livre'
    ? `O bloco esta lendo como ${context.rhymeScheme}; preserve a familia mais forte e varie uma linha para nao virar monotono.`
    : 'O desenho ainda esta livre; escolha uma familia sonora antes de fechar o bloco.'

  const actionText: Record<string, string> = {
    analyze_flow: `Diagnostico: ${empty ? 'Ainda nao ha barras suficientes para ler o flow.' : rhymeLine}\nAjuste: ${dense ? 'Tem muita silaba por barra; corte excesso ou crie pausa.' : 'O bloco esta respirando melhor; teste cantar em voz alta no BPM.'}\nSugestoes: ${suggestions.slice(0, 3).join(' | ') || 'adicione uma palavra-chave para puxar rimas.'}`,
    improve_bar: `Diagnostico: A barra ativa pode ganhar mais impacto se fechar com som mais claro.\nAjuste: Corte palavras de ligacao e coloque a imagem forte no fim.\nSugestoes: ${suggestions.slice(0, 3).join(' | ') || 'troque o final por uma palavra com vogal mais marcada.'}`,
    internal_rhyme: `Diagnostico: Rima interna ajuda o ouvinte sentir bounce antes do fim da linha.\nAjuste: Coloque uma palavra da mesma familia sonora no meio da barra.\nSugestoes: ${suggestions.slice(0, 4).join(' | ') || 'repita o som da ultima palavra no meio da proxima linha.'}`,
    complete_verse: `Diagnostico: Complete mantendo o desenho do bloco, nao mudando tudo de uma vez.\nAjuste: Use a mesma familia sonora da ultima barra e resolva em uma imagem simples.\nSugestoes: ${suggestions.slice(0, 4).join(' | ') || 'fecha com uma linha curta e direta.'}`,
    explain_rhyme: `Diagnostico: ${rhymeLine}\nAjuste: Letras iguais indicam familias sonoras parecidas; duas linhas vazias separam outro bloco.\nSugestoes: use AABB para fechamento forte, ABAB para ida e volta, ABCB para historia com punch final.`,
    trap_variation: `Diagnostico: Para soar mais trap, menos texto pode bater mais forte.\nAjuste: Deixe buracos para o beat, use repeticao curta e resolva no contratempo.\nSugestoes: ${suggestions.slice(0, 3).join(' | ')}`,
  }

  return {
    source: 'local',
    action: request.action,
    text: actionText[request.action] || actionText.analyze_flow,
    suggestions,
    tokenEstimate: {
      input: context.estimatedInputTokens,
      outputLimit: 0,
      savedByContext: getContextSavings(request.text, context),
    },
  }
}

export async function runLyricAssistant(request: LyricAssistantRequest): Promise<LyricAssistantResult> {
  const context = buildCompactLyricContext(request)
  const apiKey = process.env.AI_API_KEY
  const model = getAIModelConfig()

  if (!request.text.trim()) return localAssistant(request, context)
  if (!apiKey) return localAssistant(request, context)

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 15000)

  try {
    const response = await fetch(`${GEMINI_ENDPOINT_BASE}/${model.id}:generateContent`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: LYRIC_ASSISTANT_SYSTEM_PROMPT }] },
        contents: [{ role: 'user', parts: [{ text: buildLyricAssistantPrompt(context) }] }],
        generationConfig: {
          temperature: model.temperature,
          topP: 0.9,
          maxOutputTokens: model.maxOutputTokens,
          responseMimeType: 'text/plain',
        },
      }),
    })

    if (!response.ok) {
      console.error('[LyricAssistant] HTTP error:', response.status, await response.text().catch(() => ''))
      return localAssistant(request, context)
    }

    const data = await response.json()
    const text = extractGeminiText(data)
    if (!text) return localAssistant(request, context)

    return {
      source: 'ai',
      action: request.action,
      text,
      suggestions: buildSuggestions(context),
      tokenEstimate: {
        input: context.estimatedInputTokens,
        outputLimit: model.maxOutputTokens,
        savedByContext: getContextSavings(request.text, context),
      },
    }
  } catch (error) {
    console.error('[LyricAssistant] fallback local:', error)
    return localAssistant(request, context)
  } finally {
    clearTimeout(timeoutId)
  }
}

export async function analyzeFlowCompat(text: string, bpm: number): Promise<string> {
  const result = await runLyricAssistant({ action: 'analyze_flow', text, bpm })
  return result.text
}
