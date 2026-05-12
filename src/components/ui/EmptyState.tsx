// src/components/ui/EmptyState.tsx
// Componente de estado vazio usado nos painéis de análise

interface EmptyStateProps {
  icon: string
  text: string
  subtext?: string
}

export function EmptyState({ icon, text, subtext }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-40 gap-2 text-center px-4">
      <span className="text-3xl opacity-30">{icon}</span>
      <p className="text-xs text-text-muted">{text}</p>
      {subtext && <p className="text-[10px] text-text-muted opacity-60">{subtext}</p>}
    </div>
  )
}
