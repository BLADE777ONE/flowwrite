// src/renderer/globals.tsx
// Registra componentes globais via window para uso sem import em todos os painéis
// Em React 18 a abordagem preferida é importar diretamente — use este arquivo
// apenas como referência de onde EmptyState está definido.
//
// Nos arquivos de painel, adicione no topo:
// import { EmptyState } from '../../../components/ui/EmptyState'
//
// O componente está em: src/components/ui/EmptyState.tsx

export { EmptyState } from '../components/ui/EmptyState'
