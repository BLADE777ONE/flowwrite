export interface AIModelConfig {
  id: string
  provider: 'gemini'
  label: string
  maxOutputTokens: number
  temperature: number
}

export const DEFAULT_AI_MODEL = 'gemini-2.5-flash'

export const AI_MODELS: AIModelConfig[] = [
  {
    id: DEFAULT_AI_MODEL,
    provider: 'gemini',
    label: 'Gemini Flash',
    maxOutputTokens: 700,
    temperature: 0.35,
  },
]

export function getAIModelConfig(modelId = process.env.AI_MODEL || DEFAULT_AI_MODEL): AIModelConfig {
  return AI_MODELS.find(model => model.id === modelId) ?? {
    ...AI_MODELS[0],
    id: modelId,
  }
}
