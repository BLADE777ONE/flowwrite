// src/features/metronome/useMetronome.ts
// Metrônomo com Web Audio API + look-ahead scheduler (preciso ao ms)
// Padrão: http://www.html5rocks.com/en/tutorials/audio/scheduling/

import { useEffect, useRef, useState } from 'react'

const LOOKAHEAD_MS      = 25.0   // intervalo do scheduler (ms)
const SCHEDULE_AHEAD_S  = 0.12   // quanto tempo à frente agendar (s)
const CLICK_DURATION_S  = 0.025  // duração do clique (s)
const FLASH_DURATION_MS = 90     // duração do flash visual (ms)

export interface MetronomeState {
  beat: number    // 0-3, compasso atual
  flash: boolean  // true por FLASH_DURATION_MS a cada batida
}

export function useMetronome(bpm: number, enabled: boolean): MetronomeState {
  const [beat, setBeat]   = useState(0)
  const [flash, setFlash] = useState(false)

  // Refs para evitar stale closures no scheduler
  const ctxRef       = useRef<AudioContext | null>(null)
  const bpmRef       = useRef(bpm)
  const nextTimeRef  = useRef(0)
  const beatRef      = useRef(0)
  const timerRef     = useRef<ReturnType<typeof setTimeout>>()
  const enabledRef   = useRef(enabled)
  const flashTimerRef = useRef<ReturnType<typeof setTimeout>>()

  // Mantém refs sincronizados com props
  useEffect(() => { bpmRef.current = bpm }, [bpm])
  useEffect(() => { enabledRef.current = enabled }, [enabled])

  useEffect(() => {
    if (!enabled) {
      clearTimeout(timerRef.current)
      clearTimeout(flashTimerRef.current)
      setBeat(0)
      setFlash(false)
      return
    }

    // AudioContext requer gesto do usuário — criado aqui pois é
    // disparado pelo clique no botão Play via mudança de estado.
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext()
    }
    const ctx = ctxRef.current
    if (ctx.state === 'suspended') ctx.resume()

    beatRef.current   = 0
    nextTimeRef.current = ctx.currentTime + 0.05

    function scheduleClick(beatNum: number, time: number) {
      const osc  = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)

      // Batida 1 (tempo forte): pitch mais alto
      osc.frequency.value = beatNum === 0 ? 880 : 440
      gain.gain.setValueAtTime(beatNum === 0 ? 0.7 : 0.45, time)
      gain.gain.exponentialRampToValueAtTime(0.001, time + CLICK_DURATION_S)

      osc.start(time)
      osc.stop(time + CLICK_DURATION_S)

      // Flash visual sincronizado com o áudio
      const delayMs = Math.max(0, (time - ctx.currentTime) * 1000)
      setTimeout(() => {
        if (!enabledRef.current) return
        setBeat(beatNum)
        setFlash(true)
        clearTimeout(flashTimerRef.current)
        flashTimerRef.current = setTimeout(() => setFlash(false), FLASH_DURATION_MS)
      }, delayMs)
    }

    function tick() {
      if (!enabledRef.current) return
      const now = ctx.currentTime
      while (nextTimeRef.current < now + SCHEDULE_AHEAD_S) {
        scheduleClick(beatRef.current, nextTimeRef.current)
        nextTimeRef.current += 60 / bpmRef.current
        beatRef.current = (beatRef.current + 1) % 4
      }
      timerRef.current = setTimeout(tick, LOOKAHEAD_MS)
    }

    tick()

    return () => {
      clearTimeout(timerRef.current)
      clearTimeout(flashTimerRef.current)
    }
  }, [enabled])

  return { beat, flash }
}
