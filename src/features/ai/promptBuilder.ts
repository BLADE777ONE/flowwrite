import type { CompactLyricContext, LyricAssistantAction } from './types'

const ACTION_LABELS: Record<LyricAssistantAction, string> = {
  analyze_flow: 'analisar flow e metrica',
  improve_bar: 'melhorar a barra ativa',
  internal_rhyme: 'sugerir rimas internas',
  complete_verse: 'completar o verso mantendo o desenho',
  explain_rhyme: 'explicar o esquema de rima',
  trap_variation: 'criar variacao trap/plug',
}

export const LYRIC_ASSISTANT_SYSTEM_PROMPT = `Voce e o produtor lirico do OBloco.
Ajude MCs de rap, trap, plug, drill e funk consciente.
Seja direto, musical e pratico.
Nao reescreva a musica inteira.
Use apenas o contexto compacto enviado.
Priorize:
- rima interna
- fechamento de barra
- respiracao
- encaixe no BPM
- clareza da ideia

Formato:
Diagnostico: uma frase.
Ajuste: uma frase.
Sugestoes: 2 a 4 linhas curtas que o artista pode usar.

Nao use markdown, tabela ou bloco de codigo.`

export function buildLyricAssistantPrompt(context: CompactLyricContext): string {
  return `Acao: ${ACTION_LABELS[context.action]}
BPM: ${context.bpm}
Palavra selecionada: ${context.selectedWord || 'nenhuma'}
Barra ativa: ${context.activeLine || 'nenhuma'}
Esquema de rima do bloco: ${context.rhymeScheme}
Media de silabas: ${context.averageSyllables}
Velocidade de flow: ${context.flowSpeed}
Avisos locais: ${context.warnings.length > 0 ? context.warnings.join(' | ') : 'nenhum'}

Trecho ativo:
${context.activeLines.map((line, index) => `${index + 1}. ${line}`).join('\n')}

Responda apenas para esta acao.`
}
