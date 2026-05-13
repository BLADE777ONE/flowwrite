# analysis/stress.py
# Análise de acentuação tônica e padrões de flow em Português Brasileiro

import re

VOWELS = set('aeiouáéíóúâêîôûãõàäëïöü')
ACCENTED = set('áéíóúâêîôûãõà')

# Palavras funcionais (átonas por natureza)
FUNCTION_WORDS = {
    'a', 'o', 'as', 'os', 'um', 'uma', 'de', 'da', 'do', 'das', 'dos',
    'no', 'na', 'nos', 'nas', 'em', 'e', 'ou', 'que', 'se', 'por',
    'para', 'com', 'sem', 'ao', 'à', 'aos', 'às', 'pelo', 'pela',
    'me', 'te', 'se', 'nos', 'vos', 'lhe', 'lhes', 'ele', 'ela',
    'eu', 'tu', 'nós', 'meu', 'minha', 'seu', 'sua', 'mas', 'nem',
    'já', 'só', 'bem', 'não',
}


def get_stress_position(word: str) -> int:
    """
    Retorna a posição da sílaba tônica (0 = última, 1 = penúltima, 2 = antepenúltima).
    """
    word = word.lower().strip()
    # Acento explícito → tônica na sílaba acentuada
    for i, c in enumerate(word):
        if c in ACCENTED:
            return _position_from_accent(word, i)

    # Regras padrão do PB:
    # 1. Palavras terminadas em i, u, is, us, im, um, ão, ãos, ões → oxítona (última)
    if re.search(r'(i|u|is|us|im|um|ão|ãos|ões|ens?)$', word):
        return 0

    # 2. Terminadas em consoante (exceto -s do plural) → oxítona
    if re.search(r'[^aeiouáéíóúâêîôûãõs]$', word):
        return 0

    # 3. Caso padrão → paroxítona (penúltima sílaba)
    return 1


def _position_from_accent(word: str, accent_idx: int) -> int:
    """Calcula posição tônica a partir do índice do acento."""
    after = word[accent_idx + 1:]
    vowels_after = sum(1 for c in after if c in VOWELS)
    return vowels_after


def classify_word_stress(word: str) -> str:
    """Classifica a palavra como: strong, medium, weak."""
    w = word.lower().strip()
    if w in FUNCTION_WORDS or len(w) <= 2:
        return 'weak'
    if any(c in ACCENTED for c in w):
        return 'strong'
    if len(w) >= 4:
        return 'medium'
    return 'weak'


def analyze_line_stress(line: str) -> list[dict]:
    """
    Analisa o padrão de acentuação de um verso.
    Retorna lista de {word, position, stress, syllables}.
    """
    words = re.findall(r"[\w'áéíóúâêîôûãõàç]+", line.lower())
    result = []
    for i, word in enumerate(words):
        stress_type = classify_word_stress(word)
        result.append({
            'word':     word,
            'position': i,
            'stress':   stress_type,
        })
    return result


def get_breath_points(words: list[dict]) -> list[int]:
    """
    Identifica pontos naturais de respiração no verso.
    Geralmente após grupos de 4-6 sílabas ou após palavras tônicas longas.
    """
    if not words:
        return []

    breath_points = []
    syl_acc = 0

    for i, word_data in enumerate(words):
        word = word_data.get('word', '')
        # Contar sílabas simples
        vowel_count = sum(1 for c in word if c in VOWELS)
        syl_acc += max(1, vowel_count)

        # Respirar a cada ~4 sílabas
        if syl_acc >= 4 and i < len(words) - 1:
            breath_points.append(i)
            syl_acc = 0

    return breath_points


def get_flow_speed(avg_syllables: float, bpm: int) -> str:
    """
    Classifica velocidade do flow baseado em sílabas por verso e BPM.
    """
    # Sílabas por segundo estimado: (bpm / 60) * 2 beats/linha → ~bpm/30 syl/s
    syl_per_beat = avg_syllables / 8  # 8 beats por 2 compassos
    if syl_per_beat < 1:
        return 'slow'
    if syl_per_beat < 2:
        return 'medium'
    if syl_per_beat < 3.5:
        return 'fast'
    return 'very_fast'
