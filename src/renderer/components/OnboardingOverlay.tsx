import { useEffect, useMemo, useState } from 'react'
import type { ActiveToolTab } from '../types'

type OnboardingStep = {
  id: string
  eyebrow: string
  title: string
  description: string
  selector?: string
  preferredSide?: 'left' | 'right' | 'top' | 'bottom' | 'center'
  toolTab?: ActiveToolTab
}

interface OnboardingOverlayProps {
  hasProjects: boolean
  hasCurrentProject: boolean
  onComplete: () => Promise<void> | void
  onSkip: () => Promise<void> | void
  onCreateFirstProject: () => Promise<void> | void
  onFocusToolTab: (tab: ActiveToolTab) => void
}

type SpotlightRect = {
  top: number
  left: number
  width: number
  height: number
}

const SPOTLIGHT_PADDING = 10
const CARD_WIDTH = 360

const steps: OnboardingStep[] = [
  {
    id: 'welcome',
    eyebrow: 'Bem-vindo ao OBloco',
    title: 'Seu estudio de escrita',
    description:
      'Aqui voce escreve barras, acompanha metrica, testa flow no BPM e usa ferramentas liricas sem sair da mesma tela.',
    preferredSide: 'center',
  },
  {
    id: 'sidebar',
    eyebrow: 'Biblioteca',
    title: 'Projetos e letras no mesmo bloco',
    description:
      'Organize ideias por projeto, abra sessoes rapidamente e crie uma nova letra quando a canetada bater.',
    selector: '[data-onboarding="sidebar"]',
    preferredSide: 'right',
  },
  {
    id: 'editor',
    eyebrow: 'Editor central',
    title: 'Escreva suas barras com leitura visual',
    description:
      'Digite como em um bloco premium. O editor acompanha linhas, separa blocos e destaca rimas automaticamente: linha cheia para final de barra, pontilhado para rima interna.',
    selector: '[data-onboarding="lyrics-editor"]',
    preferredSide: 'right',
  },
  {
    id: 'rhymes',
    eyebrow: 'Rimas visuais',
    title: 'Entenda as cores antes de rimar',
    description:
      'Cores iguais indicam a mesma familia sonora. No painel Rimas, A/B/C mostram o desenho da estrofe, como AABB, ABAB ou ABCB. Duas quebras de linha iniciam uma nova estrofe.',
    selector: '[data-onboarding="right-panel"]',
    preferredSide: 'left',
    toolTab: 'rhymes',
  },
  {
    id: 'rhythm',
    eyebrow: 'Partitura',
    title: 'Veja o flow de cada barra em tempo real',
    description:
      'O painel ritmico transforma o texto em uma leitura de compasso para voce sentir respiro, densidade e bounce.',
    selector: '[data-onboarding="rhythm-panel"]',
    preferredSide: 'top',
  },
  {
    id: 'metrics',
    eyebrow: 'Metricas',
    title: 'Diagnostico do bloco atual',
    description:
      'Confira silabas, consistencia, respiro e alertas de encaixe baseados no trecho que voce esta editando.',
    selector: '[data-onboarding="right-panel"]',
    preferredSide: 'left',
    toolTab: 'metrics',
  },
  {
    id: 'dictionary',
    eyebrow: 'Dicionario',
    title: 'Rimas, girias e sinonimos no contexto',
    description:
      'Selecione uma palavra no editor e use o painel para buscar alternativas sem quebrar seu raciocinio.',
    selector: '[data-onboarding="right-panel"]',
    preferredSide: 'left',
    toolTab: 'dictionary',
  },
  {
    id: 'finish',
    eyebrow: 'Tudo pronto',
    title: 'Abra o bloco e comece a escrever',
    description:
      'Crie seu primeiro projeto ou va direto para a sessao atual. O tutorial fica salvo e nao aparece de novo.',
    preferredSide: 'center',
  },
]

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function getSpotlightRect(selector?: string): SpotlightRect | null {
  if (!selector) return null

  const element = document.querySelector<HTMLElement>(selector)
  if (!element) return null

  const rect = element.getBoundingClientRect()
  return {
    top: clamp(rect.top - SPOTLIGHT_PADDING, 12, window.innerHeight - 64),
    left: clamp(rect.left - SPOTLIGHT_PADDING, 12, window.innerWidth - 64),
    width: Math.min(rect.width + SPOTLIGHT_PADDING * 2, window.innerWidth - 24),
    height: Math.min(rect.height + SPOTLIGHT_PADDING * 2, window.innerHeight - 24),
  }
}

function getCardPosition(rect: SpotlightRect | null, preferredSide: OnboardingStep['preferredSide']) {
  if (!rect || preferredSide === 'center') {
    return {
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
    }
  }

  const gap = 20
  const cardHeight = 250
  const centerY = rect.top + rect.height / 2
  const centerX = rect.left + rect.width / 2

  if (preferredSide === 'left') {
    return {
      top: `${clamp(centerY - cardHeight / 2, 24, window.innerHeight - cardHeight - 24)}px`,
      left: `${clamp(rect.left - CARD_WIDTH - gap, 24, window.innerWidth - CARD_WIDTH - 24)}px`,
      transform: 'none',
    }
  }

  if (preferredSide === 'right') {
    return {
      top: `${clamp(centerY - cardHeight / 2, 24, window.innerHeight - cardHeight - 24)}px`,
      left: `${clamp(rect.left + rect.width + gap, 24, window.innerWidth - CARD_WIDTH - 24)}px`,
      transform: 'none',
    }
  }

  if (preferredSide === 'top') {
    return {
      top: `${clamp(rect.top - cardHeight - gap, 24, window.innerHeight - cardHeight - 24)}px`,
      left: `${clamp(centerX - CARD_WIDTH / 2, 24, window.innerWidth - CARD_WIDTH - 24)}px`,
      transform: 'none',
    }
  }

  return {
    top: `${clamp(rect.top + rect.height + gap, 24, window.innerHeight - cardHeight - 24)}px`,
    left: `${clamp(centerX - CARD_WIDTH / 2, 24, window.innerWidth - CARD_WIDTH - 24)}px`,
    transform: 'none',
  }
}

export function OnboardingOverlay({
  hasProjects,
  hasCurrentProject,
  onComplete,
  onSkip,
  onCreateFirstProject,
  onFocusToolTab,
}: OnboardingOverlayProps) {
  const [stepIndex, setStepIndex] = useState(0)
  const [spotlightRect, setSpotlightRect] = useState<SpotlightRect | null>(null)
  const step = steps[stepIndex]
  const isFirst = stepIndex === 0
  const isLast = stepIndex === steps.length - 1
  const progress = ((stepIndex + 1) / steps.length) * 100
  const finalActionLabel = !hasProjects
    ? 'Criar primeiro projeto'
    : hasCurrentProject
      ? 'Criar nova letra'
      : 'Comecar no OBloco'

  useEffect(() => {
    if (step.toolTab) onFocusToolTab(step.toolTab)
  }, [onFocusToolTab, step.toolTab])

  useEffect(() => {
    let activeElement: HTMLElement | null = null
    let previousPosition = ''
    let previousZIndex = ''
    let previousFilter = ''

    function updateSpotlight() {
      const rect = getSpotlightRect(step.selector)
      setSpotlightRect(rect)
    }

    if (step.selector) {
      activeElement = document.querySelector<HTMLElement>(step.selector)
      if (activeElement) {
        previousPosition = activeElement.style.position
        previousZIndex = activeElement.style.zIndex
        previousFilter = activeElement.style.filter

        const computedPosition = window.getComputedStyle(activeElement).position
        if (computedPosition === 'static') activeElement.style.position = 'relative'
        activeElement.style.zIndex = '80'
        activeElement.style.filter = 'brightness(1.05)'
      }
    }

    updateSpotlight()
    window.addEventListener('resize', updateSpotlight)
    window.addEventListener('scroll', updateSpotlight, true)

    return () => {
      window.removeEventListener('resize', updateSpotlight)
      window.removeEventListener('scroll', updateSpotlight, true)

      if (activeElement) {
        activeElement.style.position = previousPosition
        activeElement.style.zIndex = previousZIndex
        activeElement.style.filter = previousFilter
      }
    }
  }, [step.selector])

  const cardPosition = useMemo(
    () => getCardPosition(spotlightRect, step.preferredSide),
    [spotlightRect, step.preferredSide],
  )

  async function finish() {
    await onComplete()
  }

  async function skip() {
    await onSkip()
  }

  async function createFirstProject() {
    await onCreateFirstProject()
    await onComplete()
  }

  return (
    <div className="fixed inset-0 z-[120] pointer-events-none font-sans">
      {spotlightRect ? (
        <div
          className="absolute rounded-xl border border-cyan-300/45 shadow-[0_0_0_9999px_rgba(3,3,8,0.78),0_0_32px_rgba(0,229,255,0.28)] transition-all duration-200"
          style={{
            top: spotlightRect.top,
            left: spotlightRect.left,
            width: spotlightRect.width,
            height: spotlightRect.height,
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-[#030308]/88" />
      )}

      <div
        className="absolute w-[min(360px,calc(100vw-32px))] pointer-events-auto rounded-lg border border-white/[0.10] bg-[#07070f]/96 p-5 text-white shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl"
        style={cardPosition}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg border border-cyan-400/35 bg-cyan-400/10 flex items-center justify-center shadow-[0_0_22px_rgba(0,229,255,0.16)]">
              <svg viewBox="0 0 32 32" aria-hidden="true" className="h-6 w-6 text-cyan-300">
                <rect x="8" y="5" width="16" height="22" rx="3" fill="currentColor" opacity="0.12" />
                <rect x="10" y="8" width="12" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
                <path d="M13 13h6M13 17h5M13 21h7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                <path d="M24 11h2M24 15h2M24 19h2" stroke="#a855f7" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <p className="font-display text-sm font-black leading-none">OBloco</p>
              <p className="mt-1 text-[9px] uppercase tracking-[0.2em] text-cyan-300 font-black">Onboarding</p>
            </div>
          </div>

          <span className="rounded border border-white/[0.08] bg-white/[0.04] px-2 py-1 font-mono text-[10px] text-gray-400">
            {stepIndex + 1}/{steps.length}
          </span>
        </div>

        <div className="mt-5 h-1 overflow-hidden rounded-full bg-white/[0.08]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-purple-500 to-cyan-300 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="mt-5">
          <p className="text-[10px] uppercase tracking-[0.22em] text-cyan-300 font-black">{step.eyebrow}</p>
          <h2 className="mt-2 text-xl font-black tracking-tight">{step.title}</h2>
          <p className="mt-3 text-sm leading-6 text-gray-300">{step.description}</p>
        </div>

        {isFirst && (
          <div className="mt-5 rounded-md border border-purple-500/20 bg-purple-500/10 px-3 py-2.5">
            <p className="text-xs leading-5 text-purple-100">
              O tour leva menos de um minuto e mostra onde ficam as ferramentas principais do seu estudio.
            </p>
          </div>
        )}

        <div className="mt-6 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={skip}
            className="rounded-md border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs font-bold text-gray-400 transition hover:border-white/[0.16] hover:text-white"
          >
            Pular tutorial
          </button>

          <div className="flex items-center gap-2">
            {!isFirst && (
              <button
                type="button"
                onClick={() => setStepIndex(index => Math.max(index - 1, 0))}
                className="rounded-md border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs font-bold text-gray-300 transition hover:border-white/[0.16] hover:text-white"
              >
                Voltar
              </button>
            )}

            {isLast ? (
              <button
                type="button"
                onClick={createFirstProject}
                className="rounded-md border border-cyan-300/30 bg-gradient-to-r from-purple-700 to-cyan-700 px-3.5 py-2 text-xs font-black text-white shadow-[0_0_24px_rgba(0,229,255,0.18)] transition hover:brightness-110"
              >
                {finalActionLabel}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setStepIndex(index => Math.min(index + 1, steps.length - 1))}
                className="rounded-md border border-purple-400/40 bg-purple-600 px-4 py-2 text-xs font-black text-white shadow-[0_0_22px_rgba(168,85,247,0.24)] transition hover:bg-purple-500"
              >
                Proximo
              </button>
            )}
          </div>
        </div>

        {isLast && (
          <button
            type="button"
            onClick={finish}
            className="mt-3 w-full rounded-md border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs font-bold text-gray-300 transition hover:border-white/[0.16] hover:text-white"
          >
            Concluir sem criar
          </button>
        )}
      </div>
    </div>
  )
}
