// src/features/rhyme/rhymeDictionary.ts
// Dicionário local de sugestões de rimas para PT-BR / Rap/Trap
// Expandir progressivamente com as letras do usuário

export const RHYME_DICTIONARY: Record<string, string[]> = {
  // ─── Rimas inclinadas por L vocalizado / assinatura AU ─────────────────────
  'alto': ['calmo', 'asfalto', 'salto', 'assalto', 'sobressalto', 'ressalto', 'palco', 'malto'],
  'calmo': ['alto', 'asfalto', 'salto', 'assalto', 'sobressalto', 'ressalto', 'salmo', 'palco'],
  'asfalto': ['alto', 'calmo', 'salto', 'assalto', 'sobressalto', 'ressalto'],

  // ─── Ditongo OI — família de "hoje" ─────────────────────────────────────────
  'hoje': ['foice', 'coice', 'açoite', 'noite', 'boi', 'foi', 'dói', 'pois', 'oito', 'dezoito', 'boite', 'doido', 'moita', 'foda-se', 'foisse', 'foi-se'],

  'foice': ['coice', 'açoite', 'hoje', 'noite', 'boi', 'foi', 'oito', 'moita', 'foda-se'],
  'coice': ['foice', 'açoite', 'hoje', 'noite', 'boi', 'foi', 'oito', 'moita'],

  // ─── Favela / Quebrada ──────────────────────────────────────────────────────
  'favela': ['janela', 'viela', 'cautela', 'novela', 'passarela', 'sentinela', 'capela', 'aquarela'],
  'quebrada': ['madrugada', 'encruzilhada', 'embalada', 'marcada', 'blindada', 'descalçada'],
  'rua': ['sua', 'lua', 'pua', 'continua', 'flutua', 'tatua', 'sacua'],

  // ─── Temáticas de trap/rap ──────────────────────────────────────────────────
  'mente': ['corrente', 'quente', 'urgente', 'frequente', 'diferente', 'presente', 'consciente', 'inocente'],
  'dinheiro': ['pensamento', 'sofrimento', 'movimento', 'momento', 'tormento'],
  'vida': ['vinda', 'descida', 'ferida', 'sacudida', 'batida', 'comida', 'perdida'],

  // ─── Multissilábicas ────────────────────────────────────────────────────────
  'frequência rara': ['presença cara', 'sentença clara', 'vivência amarga', 'potência braba', 'essência rara'],
  'mente blindada': ['gente marcada', 'frente fechada', 'noite gelada', 'sorte virada', 'vida dobrada'],
  'coração partido': ['pensamento repetido', 'movimento acelerado', 'sentimento esquecido'],

  // ─── Emoções e estados ──────────────────────────────────────────────────────
  'coração': ['solidão', 'ilusão', 'multidão', 'decisão', 'direção', 'evolução', 'traição', 'sensação', 'missão'],
  'saudade': ['verdade', 'lealdade', 'liberdade', 'humildade', 'frialdade', 'dignidade', 'maldade'],
  'dor': ['amor', 'calor', 'vapor', 'rancor', 'pudor', 'valor', 'melhor', 'maior', 'fervor'],

  // ─── Movimento / Ação ────────────────────────────────────────────────────────
  'subir': ['sentir', 'existir', 'dividir', 'seguir', 'fugir', 'resistir', 'descobrir'],
  'correr': ['perceber', 'desaparecer', 'crescer', 'merecer', 'esquecer', 'aparecer'],
  'andar': ['olhar', 'falar', 'lutar', 'ganhar', 'voltar', 'pensar', 'respirar', 'gritar'],

  // ─── Noite / Escuridão (drill/trap) ─────────────────────────────────────────
  'noite': ['foice', 'coice', 'açoite', 'hoje', 'boi', 'foi', 'oito', 'dezoito', 'boite', 'moita', 'afrouxite'],
  'escuridão': ['solidão', 'perdição', 'tentação', 'traição', 'supressão'],
  'sombra': ['bomba', 'tomba', 'tromba', 'romba', 'colomba'],

  // ─── Sucesso / Topo ──────────────────────────────────────────────────────────
  'topo': ['povo', 'sopro', 'outro', 'globo', 'lobo', 'ovo', 'novo', 'lodo'],
  'vitória': ['história', 'memória', 'glória', 'trajetória', 'categoria', 'auditória'],
  'fama': ['chama', 'lama', 'dama', 'cama', 'grama', 'drama', 'trama', 'rama'],

  // ─── Família / Raiz ──────────────────────────────────────────────────────────
  'mãe': ['café', 'pé', 'você', 'é', 'de pé', 'mercê'],
  'pai': ['vai', 'sai', 'daí', 'cai', 'raiz', 'país', 'maiz'],
  'família': ['Bahia', 'teria', 'alegria', 'magia', 'energia', 'harmonia', 'fantasia'],

  // ─── Fogo / Intensidade ──────────────────────────────────────────────────────
  'fogo': ['jogo', 'afogo', 'logo', 'diálogo', 'monólogo', 'catálogo'],
  'chama': ['fama', 'drama', 'panorama', 'trama', 'proclama', 'inflama'],
  'quente': ['mente', 'frente', 'presente', 'urgente', 'frequente', 'iminente'],
}

/**
 * Busca sugestões de rima para uma palavra no dicionário local
 * Retorna array vazio se não encontrar (fallback para engine fonético)
 */
export function lookupDictionary(word: string): string[] {
  const key = word.toLowerCase().trim()
  return RHYME_DICTIONARY[key] || []
}

/**
 * Encontra entradas do dicionário que rimam foneticamente com a palavra
 */
export function fuzzyDictionaryLookup(phoneticKey: string, allPhoneticKeys: Map<string, string[]>): string[] {
  const results: string[] = []
  // Procurar terminações iguais
  for (const [, suggestions] of allPhoneticKeys) {
    results.push(...suggestions)
  }
  return [...new Set(results)].slice(0, 10)
}
