// src/database/seed.ts
// Seed inicial do banco — popula dicionário de rimas e configurações padrão

import { getDB } from './db'

const INITIAL_RHYME_ENTRIES = [
  { term: 'favela',    phoneticKey: 'FAVELА',  category: 'lugar',   suggestionsJson: JSON.stringify(['janela','viela','cautela','novela','passarela','sentinela']) },
  { term: 'coração',   phoneticKey: 'KORASÃO', category: 'emoção',  suggestionsJson: JSON.stringify(['solidão','ilusão','multidão','decisão','direção','sensação']) },
  { term: 'dor',       phoneticKey: 'DOR',     category: 'emoção',  suggestionsJson: JSON.stringify(['amor','calor','vapor','rancor','valor','melhor','fervor']) },
  { term: 'vida',      phoneticKey: 'VIDA',    category: 'abstrato',suggestionsJson: JSON.stringify(['vinda','descida','ferida','batida','perdida','construída']) },
  { term: 'mente',     phoneticKey: 'MENTI',   category: 'abstrato',suggestionsJson: JSON.stringify(['corrente','quente','urgente','presente','consciente','diferente']) },
  { term: 'rua',       phoneticKey: 'RUA',     category: 'lugar',   suggestionsJson: JSON.stringify(['sua','lua','continua','flutua','tatua']) },
  { term: 'noite',     phoneticKey: 'NOJTI',   category: 'tempo',   suggestionsJson: JSON.stringify(['açoite','dezoito','estoite']) },
  { term: 'fogo',      phoneticKey: 'FOGU',    category: 'abstrato',suggestionsJson: JSON.stringify(['jogo','afogo','logo','diálogo']) },
  { term: 'saudade',   phoneticKey: 'SAUDADI', category: 'emoção',  suggestionsJson: JSON.stringify(['verdade','lealdade','liberdade','dignidade','maldade']) },
  { term: 'vitória',   phoneticKey: 'VITORJA', category: 'abstrato',suggestionsJson: JSON.stringify(['história','memória','glória','trajetória']) },
]

const DEFAULT_SETTINGS = [
  { key: 'theme',           value: 'dark'    },
  { key: 'autosave',        value: 'true'    },
  { key: 'debounceMs',      value: '500'     },
  { key: 'analysisEnabled', value: 'true'    },
  { key: 'onboardingDone',  value: 'false'   },
]

async function seed() {
  const db = getDB()
  console.log('🌱 Iniciando seed do banco OBloco…')

  // Dicionário de rimas
  for (const entry of INITIAL_RHYME_ENTRIES) {
    await db.rhymeDictionary.upsert({
      where: { term: entry.term },
      update: entry,
      create: entry
    })
  }
  console.log(`✓ ${INITIAL_RHYME_ENTRIES.length} entradas no dicionário de rimas`)

  // Configurações padrão
  for (const setting of DEFAULT_SETTINGS) {
    await db.appSettings.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: setting
    })
  }
  console.log(`✓ ${DEFAULT_SETTINGS.length} configurações padrão`)

  // Projeto de exemplo
  const existing = await db.project.findFirst()
  if (!existing) {
    const project = await db.project.create({
      data: {
        title: 'Meu Primeiro Projeto',
        vibe: 'trap',
        songs: {
          create: {
            title: 'Rascunho 1',
            content: ''
          }
        }
      }
    })
    console.log(`✓ Projeto de exemplo criado: ${project.title}`)
  }

  console.log('✅ Seed concluído!')
  await db.$disconnect()
}

seed().catch(e => {
  console.error('Erro no seed:', e)
  process.exit(1)
})
