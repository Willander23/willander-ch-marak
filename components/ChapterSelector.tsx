
import React from 'react';
import { BibleBook } from '../types.ts';

interface ChapterSelectorProps {
  book: BibleBook;
  onSelectChapter: (chapter: number) => void;
  selectedChapter?: number;
}

export default function ChapterSelector({ book, onSelectChapter, selectedChapter }: ChapterSelectorProps) {
  return (
    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3 p-2 sm:p-6">
      {Array.from({ length: book.chapters }, (_, i) => i + 1).map((chapter) => (
        <button
          key={chapter}
          onClick={() => onSelectChapter(chapter)}
          className={`aspect-square flex items-center justify-center text-sm font-black rounded-2xl transition-all border ${
            selectedChapter === chapter
              ? 'bg-amber-500 border-amber-500 text-zinc-950 shadow-lg shadow-amber-500/20'
              : 'bg-white dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:border-amber-500 dark:hover:border-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 shadow-sm dark:shadow-none'
          }`}
        >
          {chapter}
        </button>
      ))}
    </div>
  );
}
