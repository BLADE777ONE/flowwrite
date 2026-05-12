// src/renderer/App.tsx — MODO RESGATE MVP
import React, { useState, useEffect, useRef } from 'react';
import { findRhymes } from '../features/rhyme/RhymeService';

interface Project {
  id: string
  title: string
  _count?: { songs: number }
}

interface Song {
  id: string
  title: string
  content: string
  projectId: string
  updatedAt: string
}

declare global {
  interface Window {
    flowAPI: {
      invoke: (channel: string, ...args: unknown[]) => Promise<unknown>
      on: (channel: string, listener: (...args: unknown[]) => void) => void
      off: (channel: string) => void
    }
    appInfo: { platform: string }
  }
}

// --- LÓGICA LOCAL SIMPLIFICADA PARA DEBUGAREMOS A UI ---
const countSyllables = (text: string) => {
  const words = text.trim().toLowerCase().split(/\s+/);
  return words.reduce((total, word) => {
    const vowelBlocks = word.match(/[aeiouáéíóúâêôãõ]+/g);
    return total + (vowelBlocks ? vowelBlocks.length : 0);
  }, 0);
};


export default function App() {
  const [lyrics, setLyrics] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [selectedWord, setSelectedWord] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'rhymes' | 'metrics'>('metrics');

  const [projects, setProjects] = useState<Project[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [saving, setSaving] = useState(false);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLoadingRef = useRef(false);

  const lines = lyrics.split('\n');

  // Detecta última palavra para o motor de rimas
  useEffect(() => {
    const words = lyrics.trim().split(/\s+/);
    const lastWord = words[words.length - 1]?.toLowerCase().replace(/[^a-z-záéíóúâêôãõç]/g, '') || '';
    setSelectedWord(lastWord);
  }, [lyrics]);

  // Carrega projetos ao iniciar
  useEffect(() => {
    if (!window.flowAPI) return;
    window.flowAPI.invoke('project:list').then((data) => {
      const list = data as Project[];
      setProjects(list);
      if (list.length > 0) loadProject(list[0]);
    });
  }, []);

  // Autosave com debounce de 2s
  useEffect(() => {
    if (!currentSong || !window.flowAPI || isLoadingRef.current) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      setSaving(true);
      await window.flowAPI.invoke('lyric:update', currentSong.id, { content: lyrics, title });
      setSaving(false);
    }, 2000);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [lyrics, title]);

  async function loadProject(project: Project) {
    setCurrentProject(project);
    const songList = (await window.flowAPI.invoke('lyric:list', project.id)) as Song[];
    setSongs(songList);
    if (songList.length > 0) loadSong(songList[0]);
    else { setCurrentSong(null); setTitle(''); setLyrics(''); }
  }

  function loadSong(song: Song) {
    isLoadingRef.current = true;
    setCurrentSong(song);
    setTitle(song.title ?? '');
    setLyrics(song.content ?? '');
    setTimeout(() => { isLoadingRef.current = false; }, 100);
  }

  async function handleNewLyric() {
    if (!window.flowAPI) return;
    let project = currentProject;
    if (!project) {
      project = (await window.flowAPI.invoke('project:create', { title: 'Meu Projeto' })) as Project;
      setProjects(prev => [project!, ...prev]);
      setCurrentProject(project);
    }
    const newSong = (await window.flowAPI.invoke('lyric:create', {
      projectId: project.id,
      title: 'Nova Letra',
    })) as Song;
    setSongs(prev => [newSong, ...prev]);
    loadSong(newSong);
  }

  return (
    <div className="flex h-screen bg-[#121212] text-gray-200 font-sans">

      {/* LATERAL ESQUERDA - Projetos */}
      <div className="w-64 bg-[#181818] border-r border-gray-800 p-4 flex flex-col">
        <h1 className="text-xl font-bold text-white mb-6">FlowWriter</h1>
        <button
          onClick={handleNewLyric}
          className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded mb-4 transition font-semibold"
        >
          + Nova Letra
        </button>
        <div className="flex-1 overflow-y-auto">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2 font-bold">Letras Salvas</p>
          {songs.length === 0 && (
            <p className="text-xs text-gray-600 mt-2">Nenhuma letra ainda. Clique em + Nova Letra.</p>
          )}
          {songs.map(song => (
            <div
              key={song.id}
              onClick={() => loadSong(song)}
              className={`p-3 rounded cursor-pointer border transition mb-2 ${currentSong?.id === song.id ? 'bg-purple-900/40 border-purple-600' : 'bg-gray-800 border-gray-700 hover:border-purple-500'}`}
            >
              <p className="text-sm text-white truncate font-medium">{song.title || 'Sem título'}</p>
              <p className="text-xs text-gray-400 mt-1">{currentProject?.title ?? 'Projeto'}</p>
            </div>
          ))}
        </div>
      </div>

      {/* EDITOR CENTRAL */}
      <div className="flex-1 flex flex-col relative bg-[#121212]">
        <div className="h-14 border-b border-gray-800 flex items-center px-6 bg-[#181818]">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-transparent text-lg font-semibold text-white focus:outline-none w-full placeholder-gray-600"
            placeholder="Título da música..."
          />
        </div>

        <div className="flex-1 overflow-hidden flex">
          <textarea
            value={lyrics}
            onChange={(e) => setLyrics(e.target.value)}
            placeholder="Escreva suas barras aqui..."
            className="flex-1 h-full w-full bg-transparent text-gray-200 text-xl leading-relaxed p-8 focus:outline-none resize-none"
            spellCheck={false}
          />
        </div>

        <div className="h-10 border-t border-gray-800 bg-[#181818] flex items-center px-6 text-xs text-gray-400 space-x-6 font-medium">
          <span>{lyrics.trim().split(/\s+/).filter(w => w.length > 0).length} Palavras</span>
          <span>{lines.length} Linhas</span>
          {saving
            ? <span className="text-yellow-500 border border-yellow-900 px-2 py-0.5 rounded">Salvando...</span>
            : <span className="text-green-500 border border-green-900 px-2 py-0.5 rounded">Salvo</span>
          }
        </div>
      </div>

      {/* LATERAL DIREITA - Inteligência Lógica */}
      <div className="w-80 bg-[#181818] border-l border-gray-800 flex flex-col relative">

        {/* Espaçador para evitar colisão com os botões do Windows */}
        <div className="h-14 border-b border-gray-800 flex items-center px-4 bg-[#181818] app-region-drag">
          <span className="text-xs text-gray-500 font-bold tracking-wider">FERRAMENTAS LÍRICAS</span>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-800">
          <button
            onClick={() => setActiveTab('metrics')}
            className={`flex-1 py-3 text-sm font-semibold transition ${activeTab === 'metrics' ? 'text-purple-500 border-b-2 border-purple-500 bg-gray-900/50' : 'text-gray-500 hover:text-gray-300'}`}
          >
            Métrica
          </button>
          <button
            onClick={() => setActiveTab('rhymes')}
            className={`flex-1 py-3 text-sm font-semibold transition ${activeTab === 'rhymes' ? 'text-purple-500 border-b-2 border-purple-500 bg-gray-900/50' : 'text-gray-500 hover:text-gray-300'}`}
          >
            Rimas
          </button>
        </div>

        <div className="p-5 flex-1 overflow-y-auto">
          {activeTab === 'metrics' && (
            <div>
              <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-4 font-bold">Flow Meter (Sílabas)</h3>
              <div className="space-y-3">
                {lines.map((line, index) => {
                  if (!line.trim()) return null;
                  const syllables = countSyllables(line);
                  return (
                    <div key={index} className="bg-gray-800/80 border border-gray-700/50 p-3 rounded flex justify-between items-center">
                      <p className="text-sm truncate mr-3 flex-1 text-gray-300">"{line}"</p>
                      <span className={`text-xs px-2.5 py-1 rounded font-bold ${syllables > 12 ? 'bg-red-900/50 text-red-300 border border-red-800' : 'bg-gray-700 text-gray-300'}`}>
                        {syllables} síl.
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'rhymes' && (() => {
            const rhymes = findRhymes(selectedWord);
            return (
              <div>
                <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-4 font-bold">
                  Rimas para: <span className="text-purple-400 capitalize">{selectedWord || '...'}</span>
                </h3>
                {rhymes.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {rhymes.map((rhyme, idx) => (
                      <span key={idx} className="bg-gray-800 border border-gray-600 px-3 py-1 rounded-md text-sm text-gray-200 cursor-pointer hover:bg-gray-700 hover:border-purple-500 transition shadow-sm">
                        {rhyme}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="text-center mt-10">
                    <p className="text-sm text-gray-500">Continue escrevendo para ver sugestões baseadas na última palavra.</p>
                    <p className="text-xs text-gray-600 mt-2">O motor detecta rimas automaticamente em português.</p>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
