# 🎵 FlowWriter — Estúdio de Escrita Inteligente

Software desktop para composição de rap, trap, drill, boombap e estilos urbanos.  
Roda 100% local. Sem IA online. Sem envio de dados.

---

## Stack

| Camada       | Tecnologia                          |
|-------------|-------------------------------------|
| Desktop     | Electron 28                         |
| Frontend    | React 18 + TypeScript               |
| Build       | Vite 5                              |
| Estilo      | Tailwind CSS (dark theme)           |
| Estado      | Zustand                             |
| Banco       | SQLite via Prisma                   |
| Editor      | TipTap 2                            |
| Workers     | Web Workers (análise em background) |

---

## Instalação

```bash
# 1. Clonar / baixar o projeto
cd flowwriter

# 2. Instalar dependências
npm install

# 3. Copiar .env
cp .env.example .env

# 4. Gerar cliente Prisma
npx prisma generate

# 5. Criar banco e rodar migrations
npx prisma migrate dev --name init

# 6. Popular banco com dados iniciais (opcional)
npm run db:seed
```

---

## Rodar em Desenvolvimento

```bash
npm run electron:dev
```

Isso inicia o Vite (porta 5173) e o Electron simultaneamente.

---

## Build para Windows

```bash
npm run electron:build
```

O instalador `.exe` será gerado em `release/`.

---

## Estrutura de Pastas

```
src/
  main/               ← Electron main process + IPC handlers
    ipc/              ← Handlers por domínio (project, lyric, analysis…)
    index.ts          ← Janela principal, segurança, lifecycle
    preload.ts        ← Bridge segura renderer ↔ main (contextBridge)

  renderer/           ← Ponto de entrada React
    main.tsx
    App.tsx           ← Layout: sidebar + editor + painel + bottombar
    styles/

  features/           ← Arquitetura feature-based
    editor/           ← TipTap, debounce, autosave, worker trigger
    projects/         ← CRUD de projetos e letras, sidebar
    analysis/         ← Todos os painéis de análise + stores
    rhyme/            ← Motor fonético PT-BR + dicionário local
    metrics/          ← Escansão silábica, tônica, elisão, flow
    cliches/          ← Detector de clichês + alternativas
    artistDNA/        ← Entropia vocabular, temas, perfil estilístico
    insights/         ← Ad-libs, wordplay, onomatopeias
    quality/          ← Score geral da letra
    export/           ← Exportação TXT / JSON

  database/
    prisma/schema.prisma
    db.ts             ← Singleton PrismaClient
    seed.ts           ← Dados iniciais

  workers/
    analysisWorker.ts ← Web Worker: roda análise fora da UI thread

  shared/
    types/            ← Interfaces TypeScript compartilhadas
    utils/            ← textUtils, stringSimilarity, portugueseUtils…

  components/
    ui/               ← Componentes UI reutilizáveis (EmptyState…)
```

---

## Fluxo de Análise

```
Usuário digita
     ↓
Editor (TipTap) dispara onUpdate
     ↓
Debounce 500ms
     ↓
Web Worker recebe { content, vibe }
     ↓
  ├─ RhymeService    → fonética PT-BR, cadeias, esquema
  ├─ MetricsService  → sílabas, tônica, flow speed
  ├─ ClicheService   → frases comuns + alternativas
  ├─ QualityService  → scores ponderados
  └─ InsightService  → ad-libs, wordplay, campos semânticos
     ↓
Worker postMessage({ type: 'result', ... })
     ↓
analysisStore.setResults(...)
     ↓
Painéis React atualizam via Zustand
```

---

## Fluxo IPC (Electron)

```
Renderer (React)
  window.flowAPI.invoke('project:list')
       ↓
  preload.ts (contextBridge — whitelist de canais)
       ↓
  ipcMain.handle('project:list')
       ↓
  PrismaClient → SQLite local
       ↓
  retorna dados ao renderer
```

---

## O que já funciona no Estágio 1

- ✅ Editor TipTap com debounce e autosave
- ✅ Motor fonético PT-BR (heurístico)
- ✅ Análise de rimas: final, interna, multissilábica, assonância, aliteração
- ✅ Cadeias de rima com cores
- ✅ Escansão silábica linha por linha
- ✅ Detecção de tônica e pontos de respiração
- ✅ Detector de clichês com alternativas criativas
- ✅ Score de qualidade (6 dimensões)
- ✅ Insights: ad-libs, wordplay, onomatopeias
- ✅ Artist DNA: entropia vocabular, temas, vibe dominante
- ✅ Web Worker para análise fora da UI thread
- ✅ Exportação TXT
- ✅ Banco SQLite local via Prisma
- ✅ IPC seguro (contextIsolation, whitelist de canais)
- ✅ Layout dark mode studio-ready

---

## Limitações do MVP (Estágio 1)

| Limitação | Motivo | Solução Futura |
|-----------|--------|----------------|
| Fonética heurística | Sem corpus linguístico real | Integrar biblioteca CMUDict PT-BR |
| Rima rich/poor aproximada | Sem POS tagger | Integrar spaCy ou similar offline |
| Escansão simplificada | Separação silábica real é complexa | Dataset de separação silábica |
| Sem highlights no editor | TipTap marks requer implementação extra | Extension personalizada no Estágio 2 |
| Artist DNA só na sessão | Worker não persiste entre sessões | Salvar no SQLite via IPC no Estágio 2 |
| Sem BPM automático | Requer análise de áudio | Integrar Aubio no Estágio 3 |

---

## Próximos Passos — Estágio 2

1. **Highlights visuais** no TipTap — colorir cadeias de rima diretamente no editor
2. **Ghost Notes overlay** — marcadores de tônica acima das palavras
3. **Persistência do Artist DNA** — salvar perfil no banco após cada save
4. **Blocos de seção** — Intro / Verso / Refrão como nós TipTap distintos
5. **Dicionário expansível** — usuário pode adicionar suas próprias rimas
6. **Versioning de letras** — histórico de versões com diff visual
7. **Modo Ghostwriter** — sugestão de verso no mesmo estilo do artista
8. **BPM manual** — grid visual de encaixe no beat

---

## Segurança

- `contextIsolation: true` — renderer não acessa Node diretamente
- `nodeIntegration: false` — sem Node no renderer
- `webSecurity: true` — CORS e políticas ativas
- IPC com whitelist explícita de canais no preload
- Dados 100% locais — nenhuma letra sai do computador
- Letras de artistas famosos nunca usadas como dataset
