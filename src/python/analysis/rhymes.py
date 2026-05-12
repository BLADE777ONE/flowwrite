# analysis/rhymes.py
# Detecção de rimas em Português Brasileiro

import re
from .phonetics import rhyme_score, get_rhyme_ending, normalize_word, get_vowels_only

RHYME_COLORS = ['#a855f7','#22d3ee','#fbbf24','#34d399','#f87171','#f472b6','#a3e635','#fb923c']
RHYME_THRESHOLD = 0.4   # score mínimo para considerar rima


def extract_line_end_word(line: str) -> str:
    """Última palavra significativa de um verso."""
    words = re.findall(r"[\w'áéíóúâêîôûãõàç]+", line.lower())
    # Ignorar palavras muito curtas no final (artigos, preposições)
    stop_words = {'de', 'da', 'do', 'no', 'na', 'em', 'a', 'o', 'e', 'que', 'os', 'as', 'um', 'uma'}
    for word in reversed(words):
        if len(word) > 2 and word not in stop_words:
            return word
    return words[-1] if words else ''


def detect_rhyme_scheme(lines: list[str]) -> list[str]:
    """
    Detecta o esquema de rimas (ABAB, AABB, etc.) para um conjunto de versos.
    Retorna lista de letras correspondendo a cada verso.
    """
    end_words = [extract_line_end_word(l) for l in lines if l.strip()]

    if not end_words:
        return []

    scheme: list[str] = ['?'] * len(end_words)
    groups: dict[str, list[int]] = {}   # letra → índices
    next_letter = ord('A')

    for i, word_i in enumerate(end_words):
        if scheme[i] != '?':
            continue

        # Procurar rima nos anteriores
        assigned = False
        for j in range(i - 1, -1, -1):
            score = rhyme_score(word_i, end_words[j])
            if score >= RHYME_THRESHOLD:
                existing_letter = scheme[j]
                scheme[i] = existing_letter
                groups.setdefault(existing_letter, []).append(i)
                assigned = True
                break

        if not assigned:
            letter = chr(next_letter)
            next_letter += 1
            if next_letter > ord('Z'):
                next_letter = ord('A')
            scheme[i] = letter
            groups[letter] = [i]

    return scheme


def build_rhyme_chains(lines: list[str]) -> list[dict]:
    """
    Constrói cadeias de rima entre os versos.
    Retorna lista de grupos com cor, label e palavras rimadas.
    """
    non_empty = [(i, l) for i, l in enumerate(lines) if l.strip()]
    if not non_empty:
        return []

    end_words = [(i, extract_line_end_word(l)) for i, l in non_empty]
    chains: list[dict] = []
    assigned: set[int] = set()

    for idx_a, (line_a, word_a) in enumerate(end_words):
        if line_a in assigned:
            continue

        chain_lines = [line_a]
        chain_words = [word_a]

        for idx_b, (line_b, word_b) in enumerate(end_words):
            if idx_b <= idx_a or line_b in assigned:
                continue
            score = rhyme_score(word_a, word_b)
            if score >= RHYME_THRESHOLD:
                chain_lines.append(line_b)
                chain_words.append(word_b)
                assigned.add(line_b)

        if len(chain_lines) >= 2:
            assigned.add(line_a)
            color_idx = len(chains) % len(RHYME_COLORS)
            label = chr(ord('A') + len(chains))
            # Score médio da cadeia
            avg_score = _chain_avg_score(chain_words)
            chains.append({
                'id':     f'chain_{len(chains)}',
                'label':  label,
                'color':  RHYME_COLORS[color_idx],
                'lines':  chain_lines,
                'words':  chain_words,
                'score':  round(avg_score, 2),
                'type':   _classify_rhyme_type(chain_words),
            })

    return chains


def _chain_avg_score(words: list[str]) -> float:
    if len(words) < 2:
        return 0.0
    scores = []
    for i in range(len(words)):
        for j in range(i + 1, len(words)):
            scores.append(rhyme_score(words[i], words[j]))
    return sum(scores) / len(scores) if scores else 0.0


def _classify_rhyme_type(words: list[str]) -> str:
    """Classifica o tipo de rima: perfeita, assonante, aproximada."""
    if len(words) < 2:
        return 'none'
    endings = [get_rhyme_ending(w) for w in words]
    vowels_list = [get_vowels_only(w)[-3:] for w in words]

    if len(set(endings)) == 1:
        return 'perfect'
    if len(set(vowels_list)) == 1 and len(vowels_list[0]) >= 2:
        return 'assonant'
    return 'approximate'


def detect_internal_rhymes(line: str) -> list[dict]:
    """Detecta rimas internas em um único verso."""
    words = re.findall(r"[\w'áéíóúâêîôûãõàç]+", line.lower())
    if len(words) < 3:
        return []

    internal = []
    seen_pairs: set[tuple] = set()

    for i, word_a in enumerate(words[:-1]):
        if len(word_a) < 3:
            continue
        for j, word_b in enumerate(words[i + 2:], start=i + 2):  # skip adjacent
            if len(word_b) < 3:
                continue
            pair = (min(word_a, word_b), max(word_a, word_b))
            if pair in seen_pairs:
                continue
            score = rhyme_score(word_a, word_b)
            if score >= 0.6:
                seen_pairs.add(pair)
                internal.append({
                    'word_a':   word_a,
                    'word_b':   word_b,
                    'pos_a':    i,
                    'pos_b':    j,
                    'score':    round(score, 2),
                })

    return internal


def full_rhyme_analysis(text: str) -> dict:
    """
    Análise completa de rimas de uma letra.
    """
    lines = [l for l in text.split('\n')]
    non_empty_lines = [l for l in lines if l.strip()]

    if not non_empty_lines:
        return {
            'scheme': '',
            'chains': [],
            'rhymeDensity': 0,
            'internalRhymes': [],
            'multisyllabicMatches': [],
            'matches': [],
            'suggestions': [],
        }

    chains = build_rhyme_chains(non_empty_lines)
    scheme_list = detect_rhyme_scheme(non_empty_lines)
    scheme_str = ''.join(scheme_list)

    # Linhas que rimam
    rhymed_lines: set[int] = set()
    for chain in chains:
        for line_idx in chain['lines']:
            rhymed_lines.add(line_idx)

    rhyme_density = len(rhymed_lines) / max(len(non_empty_lines), 1)

    # Rimas internas por linha
    all_internal = []
    for line in non_empty_lines:
        internals = detect_internal_rhymes(line)
        all_internal.extend(internals)

    # Rimas multissilábicas (palavras com 4+ sílabas rimando)
    multi = [c for c in chains if any(len(re.findall(r'[aeiou]', w)) >= 3 for w in c['words'])]

    # Matches simples (para o frontend)
    matches = [
        {'word_a': c['words'][0], 'word_b': c['words'][1], 'score': c['score']}
        for c in chains if len(c['words']) >= 2
    ]

    # Sugestões de rima para a última palavra
    last_word = extract_line_end_word(non_empty_lines[-1]) if non_empty_lines else ''
    suggestions = _generate_suggestions(last_word, non_empty_lines)

    return {
        'scheme':               scheme_str,
        'chains':               chains,
        'rhymeDensity':         round(rhyme_density, 3),
        'internalRhymes':       all_internal,
        'multisyllabicMatches': [{'words': c['words'], 'score': c['score']} for c in multi],
        'matches':              matches,
        'suggestions':          suggestions,
    }


def _generate_suggestions(word: str, context_lines: list[str]) -> list[dict]:
    """Sugere palavras que rimam com 'word' baseadas no contexto."""
    if not word:
        return []

    # Extrair todas as palavras do contexto como candidatas
    all_words: set[str] = set()
    for line in context_lines:
        for w in re.findall(r"[\w'áéíóúâêîôûãõàç]+", line.lower()):
            if len(w) >= 3:
                all_words.add(w)

    scored = []
    for candidate in all_words:
        if candidate == normalize_word(word):
            continue
        score = rhyme_score(word, candidate)
        if score >= 0.5:
            scored.append((candidate, score))

    scored.sort(key=lambda x: -x[1])

    return [{'forWord': word, 'suggestions': [w for w, _ in scored[:8]]}] if scored else []
