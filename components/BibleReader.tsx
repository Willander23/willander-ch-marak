
import React, { useEffect, useState, useRef } from 'react';
import { BibleBook, BibleChapter } from '../types.ts';
import { fetchChapterText, generateChapterSummary } from '../services/bibleService.ts';
import { generateVerseAudio, decodeBase64, decodeAudioData, VoiceType } from '../services/audioService.ts';

interface BibleReaderProps {
  book: BibleBook;
  chapter: number;
  onPrevChapter: () => void;
  onNextChapter: () => void;
}

export default function BibleReader({ book, chapter, onPrevChapter, onNextChapter }: BibleReaderProps) {
  const [content, setContent] = useState<BibleChapter | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fontSize, setFontSize] = useState(22);
  const [playbackRate, setPlaybackRate] = useState(1);
  
  // UI States
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summaryText, setSummaryText] = useState<string | null>(null);
  const [currentVerseIndex, setCurrentVerseIndex] = useState<number | null>(null);
  const [selectedVoice, setSelectedVoice] = useState<VoiceType>('Puck'); 
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [audioError, setAudioError] = useState<{ message: string; index: number | 'summary' } | null>(null);
  
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const isPlayingRef = useRef(false);
  const isSummarizingRef = useRef(false);
  const verseRefs = useRef<(HTMLDivElement | null)[]>([]);

  const audioBufferCache = useRef<Map<number, AudioBuffer>>(new Map());
  const prefetchQueue = useRef<Set<number>>(new Set());

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);
    setAudioError(null);
    stopAudio();
    setSummaryText(null);
    audioBufferCache.current.clear();
    prefetchQueue.current.clear();

    fetchChapterText(book.id, book.englishName, chapter)
      .then(({ data }) => {
        if (isMounted) {
          setContent(data);
          setLoading(false);
          verseRefs.current = new Array(data.verses.length).fill(null);
          for(let i=0; i<3; i++) prefetchVerse(i, data);
        }
      })
      .catch(err => {
        if (isMounted) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => { 
      isMounted = false;
      stopAudio();
    };
  }, [book, chapter]);

  const stopAudio = () => {
    if (sourceNodeRef.current) {
      try { sourceNodeRef.current.stop(); } catch(e) {}
      sourceNodeRef.current = null;
    }
    isPlayingRef.current = false;
    isSummarizingRef.current = false;
    setIsPlaying(false);
    setIsSummarizing(false);
    setCurrentVerseIndex(null);
    setIsAudioLoading(false);
  };

  const getAudioContext = async () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      await audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  };

  const prefetchVerse = async (index: number, currentContent: BibleChapter | null = content) => {
    if (!currentContent || index >= currentContent.verses.length || audioBufferCache.current.has(index) || prefetchQueue.current.has(index)) return;
    prefetchQueue.current.add(index);
    try {
      const verse = currentContent.verses[index];
      const base64Audio = await generateVerseAudio(verse.text, selectedVoice);
      const audioCtx = await getAudioContext();
      const audioData = decodeBase64(base64Audio);
      const audioBuffer = await decodeAudioData(audioData, audioCtx);
      audioBufferCache.current.set(index, audioBuffer);
    } catch (e) {
      console.warn(`Prefetch failed for index ${index}`, e);
    } finally {
      prefetchQueue.current.delete(index);
    }
  };

  const playVerse = async (index: number) => {
    if (!content) return;
    if (index >= content.verses.length) {
      stopAudio();
      return;
    }
    
    setAudioError(null);

    if (sourceNodeRef.current) {
      try { sourceNodeRef.current.stop(); } catch(e) {}
    }

    try {
      setIsSummarizing(false);
      isSummarizingRef.current = false;
      setSummaryText(null);
      setCurrentVerseIndex(index);
      setIsPlaying(true);
      isPlayingRef.current = true;

      const el = verseRefs.current[index];
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });

      let audioBuffer = audioBufferCache.current.get(index);
      
      if (!audioBuffer) {
        setIsAudioLoading(true);
        const verse = content.verses[index];
        const base64Audio = await generateVerseAudio(verse.text, selectedVoice);
        const audioCtx = await getAudioContext();
        const audioData = decodeBase64(base64Audio);
        audioBuffer = await decodeAudioData(audioData, audioCtx);
        audioBufferCache.current.set(index, audioBuffer);
        setIsAudioLoading(false);
      }

      if (!isPlayingRef.current || isSummarizingRef.current) return;

      const audioCtx = await getAudioContext();
      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.playbackRate.value = playbackRate;
      source.connect(audioCtx.destination);
      
      source.onended = () => {
        if (isPlayingRef.current && !isSummarizingRef.current) {
          playVerse(index + 1);
        }
      };

      source.start();
      sourceNodeRef.current = source;
      for (let i = 1; i <= 5; i++) prefetchVerse(index + i);
    } catch (err) {
      console.error("Audio playback error:", err);
      setIsAudioLoading(false);
      setIsPlaying(false);
      isPlayingRef.current = false;
      setAudioError({ 
        message: "Audio generate ka·na man·jaeng·a. Internet-ko nina nang·gen.", 
        index 
      });
    }
  };

  const playSummary = async () => {
    if (!content) return;
    setAudioError(null);
    try {
      if (sourceNodeRef.current) {
        try { sourceNodeRef.current.stop(); } catch(e) {}
      }
      
      setIsAudioLoading(true);
      setIsSummarizing(true);
      isSummarizingRef.current = true;
      setIsPlaying(true);
      isPlayingRef.current = true;

      const smartSummary = summaryText || await generateChapterSummary(content);
      if (!summaryText) setSummaryText(smartSummary);
      
      const base64Audio = await generateVerseAudio(smartSummary, selectedVoice, true);
      if (!isPlayingRef.current || !isSummarizingRef.current) return;

      const audioCtx = await getAudioContext();
      const audioData = decodeBase64(base64Audio);
      const audioBuffer = await decodeAudioData(audioData, audioCtx);

      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.playbackRate.value = playbackRate;
      source.connect(audioCtx.destination);
      source.onended = () => stopAudio();
      source.start();
      sourceNodeRef.current = source;
      setIsAudioLoading(false);
    } catch (err) {
      console.error("Summary playback error:", err);
      setIsAudioLoading(false);
      setIsPlaying(false);
      isPlayingRef.current = false;
      setAudioError({ 
        message: "Gisik ra·ani audio generate ka·na man·jaeng·a.", 
        index: 'summary' 
      });
    }
  };

  const togglePlayback = () => {
    if (isPlaying && !isSummarizing) stopAudio();
    else playVerse(currentVerseIndex !== null ? currentVerseIndex : 0);
  };

  const handleRetryAudio = () => {
    if (!audioError) return;
    const { index } = audioError;
    setAudioError(null);
    if (index === 'summary') {
      playSummary();
    } else {
      playVerse(index);
    }
  };

  const handleSkipAudio = () => {
    if (!audioError) return;
    const { index } = audioError;
    setAudioError(null);
    if (index !== 'summary' && content && index < content.verses.length - 1) {
      playVerse(index + 1);
    } else {
      stopAudio();
    }
  };

  useEffect(() => {
    if (sourceNodeRef.current) {
      sourceNodeRef.current.playbackRate.value = playbackRate;
    }
  }, [playbackRate]);

  if (loading) return (
    <div className="flex-1 flex flex-col items-center justify-center space-y-4">
      <div className="w-14 h-14 border-[3px] border-amber-500/10 border-t-amber-500 animate-spin rounded-full"></div>
      <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em]">Isolni Katta Am·eng·a</p>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-50 dark:bg-zinc-950 overflow-hidden relative transition-colors duration-300">
      <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-900 flex items-center justify-between bg-white/80 dark:bg-zinc-950/80 backdrop-blur-lg z-10">
        <div className="flex items-center gap-4">
          <button onClick={onPrevChapter} className="p-2.5 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-xl text-zinc-500 transition-all active:scale-90">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <div className="flex flex-col">
            <h2 className="text-base font-black tracking-tight text-zinc-900 dark:text-zinc-50">{book.name}</h2>
            <span className="text-[10px] font-black text-amber-600 dark:text-amber-500/60 uppercase tracking-widest">Adhyai {chapter}</span>
          </div>
          <button onClick={onNextChapter} className="p-2.5 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-xl text-zinc-500 transition-all active:scale-90">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
          </button>
        </div>
        <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-900/50 p-1 rounded-xl border border-zinc-200 dark:border-zinc-800">
           <button onClick={() => setFontSize(Math.max(14, fontSize - 2))} className="w-9 h-9 flex items-center justify-center hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg text-zinc-500 dark:text-zinc-400 font-black">A-</button>
           <button onClick={() => setFontSize(Math.min(32, fontSize + 2))} className="w-9 h-9 flex items-center justify-center hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg text-zinc-500 dark:text-zinc-400 font-black">A+</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-12 lg:px-20 max-w-4xl mx-auto w-full scroll-smooth scrollbar-hide">
        <div className="bible-text space-y-10 leading-relaxed">
          <header className="mb-16 text-center space-y-4">
            <h1 className="text-5xl lg:text-7xl font-black text-zinc-900 dark:text-white tracking-tighter drop-shadow-2xl">{book.name}</h1>
            <div className="flex items-center justify-center gap-6">
              <span className="h-px w-8 bg-zinc-200 dark:bg-zinc-800"></span>
              <p className="text-2xl font-bold italic text-amber-600/50 dark:text-amber-500/40 tracking-widest uppercase">Adhyai {chapter}</p>
              <span className="h-px w-8 bg-zinc-200 dark:bg-zinc-800"></span>
            </div>
            
            {isSummarizing && summaryText && (
              <div className="mt-10 p-10 bg-white dark:bg-zinc-900/50 border border-amber-500/20 rounded-[2.5rem] text-left shadow-2xl dark:shadow-3xl animate-in zoom-in-95 duration-700">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse shadow-[0_0_15px_rgba(245,158,11,0.5)]"></div>
                  <span className="text-[11px] font-black uppercase tracking-[0.3em] text-amber-600 dark:text-amber-500">Gisik Gnanggipa Reflection</span>
                </div>
                <p className="text-zinc-800 dark:text-zinc-100 text-2xl leading-relaxed italic font-medium selection:bg-amber-500/20">{summaryText}</p>
              </div>
            )}
          </header>
          
          <div className={`space-y-6 pb-60 transition-all duration-1000 ${isSummarizing ? 'opacity-20 scale-95' : 'opacity-100 scale-100'}`}>
            {content?.verses.map((v, idx) => (
              <div 
                key={v.number} 
                ref={el => verseRefs.current[idx] = el}
                onClick={() => playVerse(idx)}
                className={`group flex gap-8 items-start p-6 rounded-3xl transition-all duration-500 cursor-pointer border ${
                  currentVerseIndex === idx && !isSummarizing 
                    ? 'bg-amber-500/5 border-amber-500/20 ring-1 ring-amber-500/10' 
                    : 'hover:bg-zinc-100 dark:hover:bg-zinc-900/40 border-transparent'
                }`}
              >
                <span className={`shrink-0 w-10 text-right text-xs font-black pt-1.5 font-mono tracking-tighter transition-colors ${
                  currentVerseIndex === idx && !isSummarizing ? 'text-amber-600 dark:text-amber-500' : 'text-zinc-300 dark:text-zinc-800'
                }`}>{v.number}</span>
                <p className={`transition-colors duration-500 ${currentVerseIndex === idx && !isSummarizing ? 'text-zinc-900 dark:text-zinc-50' : 'text-zinc-500 dark:text-zinc-400'}`} style={{ fontSize: `${fontSize}px` }}>{v.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {audioError && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 w-[90%] max-w-md z-50 animate-in slide-in-from-top duration-300">
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 p-4 rounded-2xl shadow-xl flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/50 rounded-full text-red-600 dark:text-red-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-red-900 dark:text-red-100">Audio Error</p>
                <p className="text-xs text-red-700 dark:text-red-400 mt-1">{audioError.message}</p>
              </div>
              <button onClick={() => setAudioError(null)} className="text-red-400 hover:text-red-600 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={handleRetryAudio}
                className="flex-1 bg-red-600 text-white py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-700 active:scale-95 transition-all shadow-lg shadow-red-600/20"
              >
                Dak·taibo (Retry)
              </button>
              {audioError.index !== 'summary' && (
                <button 
                  onClick={handleSkipAudio}
                  className="flex-1 bg-white dark:bg-zinc-800 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-50 dark:hover:bg-red-900/50 active:scale-95 transition-all"
                >
                  Battaibo (Skip)
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[98%] max-w-4xl z-40 px-2">
        <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-3xl border border-zinc-200 dark:border-zinc-800 rounded-[2rem] p-3 shadow-2xl dark:shadow-3xl flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button 
              onClick={togglePlayback} 
              disabled={isAudioLoading && !isSummarizing} 
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                isPlaying && !isSummarizing 
                  ? 'bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-950 scale-90' 
                  : 'bg-amber-500 text-zinc-950 hover:bg-amber-400 active:scale-95'
              } shadow-2xl shadow-amber-500/10`}
            >
              {isAudioLoading && !isSummarizing ? <div className="w-6 h-6 border-[3px] border-zinc-950 border-t-transparent animate-spin rounded-full" /> : 
               (isPlaying && !isSummarizing) ? <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="5" height="16" rx="1"/><rect x="13" y="4" width="5" height="16" rx="1"/></svg> :
               <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="currentColor" className="ml-1"><path d="M5 3l14 9-14 9V3z"/></svg>}
            </button>
            
            <button 
              onClick={playSummary} 
              disabled={isAudioLoading} 
              className={`flex items-center gap-2 px-4 py-4 rounded-[1.5rem] border transition-all active:scale-95 ${
                isSummarizing 
                  ? 'bg-amber-500/20 border-amber-500 text-amber-600 dark:text-amber-500 shadow-xl' 
                  : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-700'
              }`}
            >
              {isAudioLoading && isSummarizing ? <div className="w-5 h-5 border-2 border-amber-600 dark:border-amber-500 border-t-transparent animate-spin rounded-full" /> : 
               <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M8 7h8"/><path d="M8 11h8"/></svg>}
              <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Gisik Ra·ani (Smart Summary)</span>
            </button>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <div className="flex gap-1 bg-zinc-50 dark:bg-zinc-950 p-1 rounded-xl border border-zinc-200 dark:border-zinc-800 shrink-0">
              <button onClick={() => setPlaybackRate(0.75)} className={`px-2 py-1 rounded-lg text-[9px] font-black ${playbackRate === 0.75 ? 'bg-white dark:bg-zinc-800 text-amber-600 dark:text-amber-500' : 'text-zinc-400 dark:text-zinc-600'}`}>0.75x</button>
              <button onClick={() => setPlaybackRate(1)} className={`px-2 py-1 rounded-lg text-[9px] font-black ${playbackRate === 1 ? 'bg-white dark:bg-zinc-800 text-amber-600 dark:text-amber-500' : 'text-zinc-400 dark:text-zinc-600'}`}>1x</button>
              <button onClick={() => setPlaybackRate(1.25)} className={`px-2 py-1 rounded-lg text-[9px] font-black ${playbackRate === 1.25 ? 'bg-white dark:bg-zinc-800 text-amber-600 dark:text-amber-500' : 'text-zinc-400 dark:text-zinc-600'}`}>1.25x</button>
            </div>

            <div className="flex gap-1 bg-zinc-50 dark:bg-zinc-950 p-1 rounded-xl border border-zinc-200 dark:border-zinc-800 shrink-0">
              {[
                { id: 'Puck', label: 'Male 1', meta: 'Deep' },
                { id: 'Charon', label: 'Male 2', meta: 'Asian' },
                { id: 'Kore', label: 'Female 1', meta: 'Soft' },
                { id: 'Zephyr', label: 'Female 2', meta: 'Elder' }
              ].map(voice => (
                <button 
                  key={voice.id}
                  onClick={() => { setSelectedVoice(voice.id as VoiceType); stopAudio(); }} 
                  className={`px-2 py-1 rounded-lg text-[9px] font-black transition-all flex flex-col items-center ${selectedVoice === voice.id ? 'bg-white dark:bg-zinc-800 text-amber-600 dark:text-amber-500' : 'text-zinc-400 dark:text-zinc-600'}`}
                >
                  <span>{voice.label}</span>
                  <span className="text-[7px] opacity-60 uppercase">{voice.meta}</span>
                </button>
              ))}
            </div>
          </div>
          
          {(isPlaying || audioError) && (
            <button onClick={stopAudio} className="p-3 text-zinc-400 hover:text-red-500 transition-all active:scale-90">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3h18v18H3z"/></svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
