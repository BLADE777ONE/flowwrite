#!/usr/bin/env python3
# server.py — OBloco Python Analysis Server
# Roda em localhost:5001, chamado pelo Electron main process

import sys
import os
import json
import logging

# Adicionar diretório do script ao path para importar analysis/
sys.path.insert(0, os.path.dirname(__file__))

from flask import Flask, request, jsonify
from analysis.syllables import analyze_lines, count_syllables, HAS_PYPHEN
from analysis.rhymes import full_rhyme_analysis
from analysis.stress import analyze_line_stress, get_breath_points, get_flow_speed
from analysis.phonetics import rhyme_score, to_phonetic_key

# Suprimir logs do Flask (silencioso)
log = logging.getLogger('werkzeug')
log.setLevel(logging.ERROR)

app = Flask(__name__)
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 5001


# ─── Health check ────────────────────────────────────────────────────────────

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'ok':       True,
        'pyphen':   HAS_PYPHEN,
        'version':  '1.0.0',
        'lang':     'pt_BR',
    })


# ─── Análise de sílabas ───────────────────────────────────────────────────────

@app.route('/syllables', methods=['POST'])
def syllables():
    """
    Body: { "text": "..." }
    Retorna: lista de linhas com contagem de sílabas
    """
    data = request.get_json(silent=True) or {}
    text = data.get('text', '')

    lines = analyze_lines(text)
    non_empty = [l for l in lines if l['syllables'] > 0]

    avg = sum(l['syllables'] for l in non_empty) / max(len(non_empty), 1)
    totals = [l['syllables'] for l in non_empty]

    # Regularidade: baixo desvio padrão → alta regularidade
    if len(totals) >= 2:
        mean = sum(totals) / len(totals)
        variance = sum((x - mean) ** 2 for x in totals) / len(totals)
        std_dev = variance ** 0.5
        regularity = max(0, round(100 - (std_dev / max(mean, 1)) * 100))
    else:
        regularity = 100

    return jsonify({
        'lines':        lines,
        'average':      round(avg, 2),
        'regularity':   regularity,
        'has_pyphen':   HAS_PYPHEN,
    })


# ─── Análise de rimas ─────────────────────────────────────────────────────────

@app.route('/rhymes', methods=['POST'])
def rhymes():
    """
    Body: { "text": "..." }
    Retorna: análise completa de rimas
    """
    data = request.get_json(silent=True) or {}
    text = data.get('text', '')

    result = full_rhyme_analysis(text)
    return jsonify(result)


# ─── Análise completa ─────────────────────────────────────────────────────────

@app.route('/analyze', methods=['POST'])
def analyze():
    """
    Análise completa: sílabas + rimas + stress + flow.
    Body: { "text": "...", "bpm": 90 }
    """
    data = request.get_json(silent=True) or {}
    text = data.get('text', '')
    bpm  = data.get('bpm', 90)

    if not text.strip():
        return jsonify({'error': 'empty text'}), 400

    # Sílabas
    syl_lines   = analyze_lines(text)
    non_empty   = [l for l in syl_lines if l['text'].strip()]
    syl_counts  = [l['syllables'] for l in non_empty]
    avg_syl     = sum(syl_counts) / max(len(syl_counts), 1)

    # Regularidade
    if len(syl_counts) >= 2:
        mean      = avg_syl
        variance  = sum((x - mean) ** 2 for x in syl_counts) / len(syl_counts)
        std_dev   = variance ** 0.5
        regularity = max(0, round(100 - (std_dev / max(mean, 1)) * 100))
    else:
        regularity = 100

    # Rimas
    rhyme_data = full_rhyme_analysis(text)

    # Stress por linha
    stress_lines = []
    for line_data in non_empty:
        line_text = line_data['text']
        stress    = analyze_line_stress(line_text)
        breaths   = get_breath_points(stress)
        stress_lines.append({
            'text':           line_text,
            'syllables':      line_data['syllables'],
            'stressWords':    stress,
            'breathPoints':   breaths,
            'isTooLong':      line_data['syllables'] > 20,
            'isTooShort':     0 < line_data['syllables'] < 5,
        })

    # Flow speed
    flow_speed = get_flow_speed(avg_syl, bpm)

    # Warnings
    warnings = []
    too_long  = [l for l in stress_lines if l['isTooLong']]
    too_short = [l for l in stress_lines if l['isTooShort']]
    if len(too_long) > 2:
        warnings.append(f'{len(too_long)} versos muito longos (>20 sílabas) — pode dificultar o flow')
    if len(too_short) > 2:
        warnings.append(f'{len(too_short)} versos muito curtos (<5 sílabas)')
    if rhyme_data['rhymeDensity'] < 0.3 and len(non_empty) > 4:
        warnings.append('Densidade de rimas baixa — considere mais rimas finais')

    return jsonify({
        'syllables': {
            'lines':       stress_lines,
            'average':     round(avg_syl, 2),
            'regularity':  regularity,
            'totalLines':  len(non_empty),
            'flowSpeed':   flow_speed,
            'warnings':    warnings,
            'has_pyphen':  HAS_PYPHEN,
        },
        'rhymes': rhyme_data,
    })


# ─── Score de rima entre duas palavras ───────────────────────────────────────

@app.route('/rhyme-score', methods=['POST'])
def rhyme_score_endpoint():
    data = request.get_json(silent=True) or {}
    word_a = data.get('word_a', '')
    word_b = data.get('word_b', '')
    score  = rhyme_score(word_a, word_b)
    return jsonify({'score': score, 'phonetic_a': to_phonetic_key(word_a), 'phonetic_b': to_phonetic_key(word_b)})


# ─── Main ─────────────────────────────────────────────────────────────────────

if __name__ == '__main__':
    print(f'[OBloco Python] Servidor iniciando em http://127.0.0.1:{PORT}', flush=True)
    print(f'[OBloco Python] pyphen: {"OK" if HAS_PYPHEN else "NAO instalado — usando fallback"}', flush=True)
    app.run(host='127.0.0.1', port=PORT, debug=False, threaded=True)
