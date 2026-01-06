import React, { useState, useEffect } from 'react';
import Layout from './components/Layout.tsx';
import Navigation from './components/Navigation.tsx';
import ChapterSelector from './components/ChapterSelector.tsx';
import BibleReader from './components/BibleReader.tsx';
import { BibleBook, Theme } from './types.ts';
import { BIBLE_BOOKS } from './constants.tsx';
import { fetchDailyVerse, fetchChapterText } from './services/bibleService.ts';
import { getCachedChapterCount } from './services/db.ts';

export default function App() {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('bible-theme');
    return (saved as Theme) || 'dark';
  });
  const [selectedBook, setSelectedBook] = useState<BibleBook | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [dailyVerse, setDailyVerse] = useState<{ verse: string; reference: string } | null>(null);
  const [downloadingBookId, setDownloadingBookId] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [cachedCounts, setCachedCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchDailyVerse().then(setDailyVerse);
    refreshCachedCounts();
  }, []);

  useEffect(() => {
    localStorage.setItem('bible-theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const refreshCachedCounts = async () => {
    const counts: Record<string, number> = {};
    for (const book of BIBLE_BOOKS) {
      counts[book.id] = await getCachedChapterCount(book.id);
    }
    setCachedCounts(counts);
  };

  const handleDownloadBook = async (book: BibleBook) => {
    if (downloadingBookId) return;
    setDownloadingBookId(book.id);
    setDownloadProgress(0);

    for (let i = 1; i <= book.chapters; i++) {
      try {
        await fetchChapterText(book.id, book.englishName, i);
        setDownloadProgress(Math.round((i / book.chapters) * 100));
        // Add a small delay between requests to avoid slamming the proxy
        await new Promise(resolve => setTimeout(resolve, 400));
      } catch (err) {
        console.error("Failed to download chapter", i, err);
      }
    }

    setDownloadingBookId(null);
    refreshCachedCounts();
  };

  const handleSelectBook = (book: BibleBook) => {
    setSelectedBook(book);
    setSelectedChapter(null);
  };

  const handleSelectChapter = (chapter: number) => {
    setSelectedChapter(chapter);
  };

  const handleBackToLibrary = () => {
    setSelectedBook(null);
    setSelectedChapter(null);
    refreshCachedCounts();
  };

  const handleBackToChapters = () => {
    setSelectedChapter(null);
  };

  const handleNextChapter = () => {
    if (!selectedBook || !selectedChapter) return;
    if (selectedChapter < selectedBook.chapters) {
      setSelectedChapter(selectedChapter + 1);
    } else {
      const currentIndex = BIBLE_BOOKS.findIndex(b => b.id === selectedBook.id);
      if (currentIndex < BIBLE_BOOKS.length - 1) {
        setSelectedBook(BIBLE_BOOKS[currentIndex + 1]);
        setSelectedChapter(1);
      }
    }
  };

  const handlePrevChapter = () => {
    if (!selectedBook || !selectedChapter) return;
    if (selectedChapter > 1) {
      setSelectedChapter(selectedChapter - 1);
    } else {
      const currentIndex = BIBLE_BOOKS.findIndex(b => b.id === selectedBook.id);
      if (currentIndex > 0) {
        const prevBook = BIBLE_BOOKS[currentIndex - 1];
        setSelectedBook(prevBook);
        setSelectedChapter(prevBook.chapters);
      }
    }
  };

  const renderContent = () => {
    if (!selectedBook) {
      return (
        <div className="max-w-4xl mx-auto w-full px-4 py-8 space-y-12">
          <div className="space-y-4 text-center">
            <h2 className="text-4xl font-black tracking-tighter text-zinc-900 dark:text-white">Sastro Song·gital</h2>
            <p className="text-zinc-500 font-medium">Isolni kattako A·chik ku·chi poraibo.</p>
          </div>

          {dailyVerse && (
            <div className="bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 p-8 rounded-3xl space-y-5 relative overflow-hidden shadow-xl">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600 dark:text-amber-500/80">Salgini Katta</h3>
              </div>
              <p className="bible-text text-xl lg:text-3xl font-medium leading-relaxed italic text-zinc-800 dark:text-zinc-100">
                "{dailyVerse.verse}"
              </p>
              <div className="flex items-center gap-3">
                <div className="h-px w-6 bg-zinc-200 dark:bg-zinc-800"></div>
                <p className="text-xs font-bold text-zinc-400 dark:text-zinc-500 tracking-widest uppercase">{dailyVerse.reference}</p>
              </div>
            </div>
          )}

          <Navigation 
            onSelectBook={handleSelectBook} 
            selectedBookId={selectedBook?.id} 
          />
        </div>
      );
    }

    if (!selectedChapter) {
      const isDownloaded = cachedCounts[selectedBook.id] === selectedBook.chapters;
      const progress = Math.round((cachedCounts[selectedBook.id] || 0) / selectedBook.chapters * 100);

      return (
        <div className="max-w-4xl mx-auto w-full min-h-full bg-transparent">
          <div className="px-6 py-10 border-b border-zinc-200 dark:border-zinc-900 flex flex-col gap-6">
            <button 
              onClick={handleBackToLibrary}
              className="text-zinc-500 hover:text-amber-600 dark:hover:text-amber-500 text-sm font-bold flex items-center gap-2 transition-colors w-fit"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
              Ki·taprangona
            </button>
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <h2 className="text-5xl font-black text-zinc-900 dark:text-white tracking-tighter">{selectedBook.name}</h2>
                <p className="text-zinc-500 uppercase tracking-widest text-xs font-black mt-3">
                  {selectedBook.englishName} • {selectedBook.chapters} Adhyai
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                {downloadingBookId === selectedBook.id ? (
                   <div className="w-48 space-y-2">
                      <div className="flex justify-between text-[10px] font-bold text-amber-600 dark:text-amber-500 uppercase tracking-wider">
                        <span>Am·eng·a...</span>
                        <span>{downloadProgress}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500 transition-all duration-300" style={{ width: `${downloadProgress}%` }} />
                      </div>
                   </div>
                ) : isDownloaded ? (
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-500 text-[10px] font-black uppercase tracking-widest bg-green-500/10 px-4 py-2 rounded-full border border-green-500/20">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                    Offline Ready
                  </div>
                ) : (
                  <button onClick={() => handleDownloadBook(selectedBook)} className="flex items-center gap-2 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-colors bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-zinc-200 dark:border-zinc-700 shadow-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    Am·e Ra·bo {progress > 0 && `(${progress}%)`}
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="p-6">
             <ChapterSelector book={selectedBook} onSelectChapter={handleSelectChapter} selectedChapter={selectedChapter} />
          </div>
        </div>
      );
    }

    return (
      <div className="h-full flex flex-col bg-transparent">
        <div className="px-6 py-3 border-b border-zinc-200 dark:border-zinc-900 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-sm sticky top-0 z-30">
           <button onClick={handleBackToChapters} className="text-zinc-500 dark:text-zinc-400 hover:text-amber-600 dark:hover:text-amber-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
              Adhyai List
            </button>
        </div>
        <BibleReader book={selectedBook} chapter={selectedChapter} onPrevChapter={handlePrevChapter} onNextChapter={handleNextChapter} />
      </div>
    );
  };

  return (
    <Layout theme={theme} onThemeToggle={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}>
      <div className="h-full overflow-y-auto bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 transition-colors duration-300">
        {renderContent()}
      </div>
    </Layout>
  );
}
