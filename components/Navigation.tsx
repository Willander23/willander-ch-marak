
import React, { useState } from 'react';
import { BIBLE_BOOKS } from '../constants.tsx';
import { BibleBook } from '../types.ts';

interface NavigationProps {
  onSelectBook: (book: BibleBook) => void;
  selectedBookId?: string;
}

export default function Navigation({ onSelectBook, selectedBookId }: NavigationProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredBooks = BIBLE_BOOKS.filter(book => {
    return book.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
           book.englishName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const oldTestament = filteredBooks.filter(b => b.testament === 'Old');
  const newTestament = filteredBooks.filter(b => b.testament === 'New');

  const renderBookButton = (book: BibleBook) => (
    <button
      key={book.id}
      onClick={() => onSelectBook(book)}
      className={`flex items-center justify-between px-5 py-4 rounded-2xl border transition-all active:scale-[0.98] ${
        selectedBookId === book.id 
          ? 'bg-amber-500/10 border-amber-500 text-amber-600 dark:text-amber-500' 
          : 'bg-white dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-900 shadow-sm dark:shadow-none'
      }`}
    >
      <div className="text-left">
        <span className="block font-bold text-sm tracking-tight">{book.name}</span>
        <span className="block text-[10px] opacity-60 dark:opacity-40 uppercase tracking-widest font-black mt-1">
          {book.englishName}
        </span>
      </div>
      <div className={`text-[10px] font-black px-2.5 py-1 rounded-md ${
        selectedBookId === book.id ? 'bg-amber-500 text-zinc-950' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
      }`}>
        {book.chapters}
      </div>
    </button>
  );

  return (
    <div className="space-y-10 pb-10">
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-400 group-focus-within:text-amber-600 dark:group-focus-within:text-amber-500 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
        </div>
        <input 
          type="text" 
          placeholder="Ki·tapko am·bo (Search books)..." 
          className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl pl-12 pr-4 py-4 text-sm focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500/50 transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-600 text-zinc-900 dark:text-zinc-50 shadow-sm dark:shadow-none"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {oldTestament.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-4 px-2">
            <h3 className="text-lg font-black text-amber-600 dark:text-amber-500/90 tracking-tight">Sastro Gitcham</h3>
            <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800/50"></div>
            <span className="text-[10px] font-black text-zinc-400 dark:text-zinc-600 uppercase tracking-widest">Old Testament</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {oldTestament.map((book) => renderBookButton(book))}
          </div>
        </section>
      )}

      {newTestament.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-4 px-2">
            <h3 className="text-lg font-black text-amber-600 dark:text-amber-500/90 tracking-tight">Sastro Gital</h3>
            <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800/50"></div>
            <span className="text-[10px] font-black text-zinc-400 dark:text-zinc-600 uppercase tracking-widest">New Testament</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {newTestament.map((book) => renderBookButton(book))}
          </div>
        </section>
      )}

      {filteredBooks.length === 0 && (
        <div className="text-center py-20 text-zinc-400">
          <p className="text-sm font-bold uppercase tracking-widest">Uia gita ki·taprang dongja.</p>
        </div>
      )}
    </div>
  );
}
