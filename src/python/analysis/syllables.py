# analysis/syllables.py
# Contagem de sílabas para Português Brasileiro usando pyphen + regras fonéticas

import re
try:
    import pyphen
    _dic = pyphen.Pyphen(lang='pt_BR')
    HAS_PYPHEN = True
except Exception:
    _dic = None
    HAS_PYPHEN = False

from unidecode import unidecode

VOWELS = set('aeiouáéíóúâêîôûãõàäëïöü')


def _count_syllables_pyphen(word: str) -> int:
    """Conta sílabas via pyphen (mais preciso)."""
    if not _dic:
        return _count_syllables_fallback(word)
    try:
        hyphenated = _dic.inserted(word.lower())
        return hyphenated.count('-') + 1
    except Exception:
        return _count_syllables_fallback(word)


def _count_syllables_fallback(word: str) -> int:
    """Fallback por contagem de vogais com regras básicas do PB."""
    word = word.lower()
    # Remover acentos para simplificar
    word_plain = unidecode(word)
    count = 0
    prev_is_vowel = False

    i = 0
    while i < len(word_plain):
        c = word_plain[i]
        is_vowel = c in 'aeiou'

        if is_vowel and not prev_is_vowel:
            count += 1
        elif is_vowel and prev_is_vowel:
            # Ditongo: ui, ai, ei, oi, au, eu, ou → 1 sílaba
            prev = word_plain[i - 1]
            pair = prev + c
            if pair not in ('ai', 'ei', 'oi', 'ui', 'au', 'eu', 'ou', 'iu', 'ia', 'ie', 'io', 'ua', 'ue', 'uo'):
                count += 1  # hiato → sílaba separada

        prev_is_vowel = is_vowel
        i += 1

    return max(1, count)


def count_syllables(word: str) -> int:
    """Conta sílabas de uma palavra, aplicando elisão opcional."""
    word = re.sub(r'[^\wáéíóúâêîôûãõàç]', '', word.lower())
    if not word:
        return 0
    if HAS_PYPHEN:
        return _count_syllables_pyphen(word)
    return _count_syllables_fallback(word)


def count_line_syllables(line: str, apply_elision: bool = True) -> dict:
    """
    Conta sílabas de um verso completo.
    Retorna contagem total, palavras e elisões aplicadas.
    """
    words = re.findall(r"[\w'áéíóúâêîôûãõàç]+", line.lower())
    if not words:
        return {'total': 0, 'words': [], 'elisions': []}

    word_counts = []
    elisions = []
    total = 0

    for i, word in enumerate(words):
        count = count_syllables(word)

        # Elisão: palavra terminando em vogal + próxima começando em vogal
        if apply_elision and i < len(words) - 1:
            next_word = words[i + 1]
            word_ends_vowel   = word[-1]  in 'aeiouáéíóúâêîôûãõà'
            next_starts_vowel = next_word[0] in 'aeiouáéíóúâêîôûãõà'
            if word_ends_vowel and next_starts_vowel and count > 1:
                elisions.append(f'{word}_{next_word}')
                count -= 1  # elisão reduz 1 sílaba

        word_counts.append({'word': word, 'syllables': count})
        total += count

    return {
        'total': total,
        'words': word_counts,
        'elisions': elisions,
        'has_pyphen': HAS_PYPHEN,
    }


def analyze_lines(text: str) -> list[dict]:
    """Analisa todas as linhas de um texto."""
    results = []
    for i, line in enumerate(text.split('\n')):
        line = line.strip()
        if not line:
            results.append({'line': i, 'text': '', 'syllables': 0, 'words': [], 'elisions': []})
            continue
        data = count_line_syllables(line)
        results.append({
            'line': i,
            'text': line,
            'syllables': data['total'],
            'words': data['words'],
            'elisions': data['elisions'],
        })
    return results
