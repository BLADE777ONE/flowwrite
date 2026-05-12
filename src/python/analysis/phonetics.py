# analysis/phonetics.py
# Fonética do Português Brasileiro para análise de rimas e acentuação

from unidecode import unidecode
import re

# Mapeamento fonético de dígrafos e letras especiais do PB
DIGRAPHS = [
    ('nh', 'N'), ('lh', 'L'), ('ch', 'X'),
    ('qu', 'K'), ('gu', 'G'), ('ss', 'S'), ('rr', 'R'),
    ('xc', 'S'), ('sc', 'S'),
]

VOWELS = set('aeiouáéíóúâêîôûãõàäëïöü')
VOWELS_PLAIN = set('aeiou')

# Grupos fonéticos para rima aproximada
RHYME_GROUPS = {
    # Vogais abertas vs fechadas
    'a':  ['a', 'á', 'â', 'ã'],
    'e':  ['e', 'é', 'ê'],
    'i':  ['i', 'í', 'y'],
    'o':  ['o', 'ó', 'ô', 'õ'],
    'u':  ['u', 'ú'],
    # Consoantes similares
    's':  ['s', 'z', 'x', 'c', 'ss', 'sc'],
    'k':  ['k', 'c', 'qu'],
    'g':  ['g', 'gu'],
    'r':  ['r', 'rr', 'R'],
    'n':  ['n', 'nh'],
    'l':  ['l', 'lh'],
    'j':  ['j', 'g', 'X'],
    'f':  ['f', 'v', 'ph'],
}

# Inversão para lookup rápido
CHAR_TO_GROUP: dict[str, str] = {}
for group_key, members in RHYME_GROUPS.items():
    for m in members:
        CHAR_TO_GROUP[m] = group_key


def normalize_word(word: str) -> str:
    """Remove pontuação, lowercase."""
    word = word.lower().strip()
    word = re.sub(r"[^\wáéíóúâêôãõàüïç'-]", '', word)
    return word


def to_phonetic_key(word: str) -> str:
    """
    Converte a palavra para uma chave fonética simplificada do PB.
    Ex: 'nação' -> 'nasaum', 'filho' -> 'fiLu'
    """
    w = normalize_word(word).lower()

    # Aplicar dígrafos
    for digraph, replacement in DIGRAPHS:
        w = w.replace(digraph, replacement)

    # Normalizar acentos para base (mantendo nasais)
    result = []
    i = 0
    while i < len(w):
        c = w[i]
        # Mapear para grupo fonético se existir
        mapped = CHAR_TO_GROUP.get(c, c)
        result.append(mapped)
        i += 1

    return ''.join(result)


def get_vowels_only(word: str) -> str:
    """Retorna apenas as vogais da palavra (para rima assonante)."""
    normalized = unidecode(normalize_word(word))
    return ''.join(c for c in normalized if c in VOWELS_PLAIN)


def get_rhyme_ending(word: str, depth: int = 3) -> str:
    """
    Extrai o final fonético da palavra a partir da última vogal tônica.
    'depth' controla quantas letras após a vogal incluir.
    """
    w = normalize_word(word)
    if not w:
        return ''

    # Encontrar posição da última vogal acentuada (tônica) ou última vogal
    tonic_pos = -1
    for i, c in enumerate(w):
        if c in 'áéíóúâêôãõà':
            tonic_pos = i
        elif c in VOWELS and tonic_pos == -1:
            tonic_pos = i

    if tonic_pos == -1:
        # Sem vogal — usar últimas letras
        return unidecode(w[-depth:])

    # Retornar da última vogal tônica em diante, ou as últimas `depth` letras
    ending = w[tonic_pos:]
    return unidecode(ending).lower()


def rhyme_score(word_a: str, word_b: str) -> float:
    """
    Score de rima entre duas palavras (0.0 a 1.0).
    Combina rima perfeita, assonante e aproximada.
    """
    if not word_a or not word_b:
        return 0.0

    wa = normalize_word(word_a)
    wb = normalize_word(word_b)

    if wa == wb:
        return 0.0  # mesma palavra não conta como rima

    ending_a = get_rhyme_ending(wa)
    ending_b = get_rhyme_ending(wb)

    # Rima perfeita
    if ending_a == ending_b and len(ending_a) >= 2:
        return 1.0

    # Sufixo compartilhado
    shared = _longest_common_suffix(ending_a, ending_b)
    if shared >= 3:
        return 0.9
    if shared >= 2:
        return 0.7

    # Rima assonante — só vogais
    vowels_a = get_vowels_only(wa)[-3:]
    vowels_b = get_vowels_only(wb)[-3:]
    if vowels_a == vowels_b and len(vowels_a) >= 2:
        return 0.6

    vowel_shared = _longest_common_suffix(vowels_a, vowels_b)
    if vowel_shared >= 2:
        return 0.4

    # Rima aproximada (fonética)
    phon_a = to_phonetic_key(wa)[-4:]
    phon_b = to_phonetic_key(wb)[-4:]
    phon_shared = _longest_common_suffix(phon_a, phon_b)
    if phon_shared >= 3:
        return 0.5
    if phon_shared >= 2:
        return 0.3

    return 0.0


def _longest_common_suffix(a: str, b: str) -> int:
    """Comprimento do sufixo mais longo compartilhado."""
    count = 0
    for ca, cb in zip(reversed(a), reversed(b)):
        if ca == cb:
            count += 1
        else:
            break
    return count
