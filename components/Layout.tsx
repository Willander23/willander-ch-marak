
import React from 'react';
import { Theme } from '../types.ts';

interface LayoutProps {
  // Make children optional to resolve TypeScript property missing error in parent components
  children?: React.ReactNode;
  theme: Theme;
  onThemeToggle: () => void;
}

export default function Layout({ children, theme, onThemeToggle }: LayoutProps) {
  return (
    <div className={`flex flex-col h-screen w-full transition-colors duration-300 ${theme === 'dark' ? 'bg-zinc-950 text-zinc-50' : 'bg-zinc-50 text-zinc-900'} selection:bg-amber-500/30`}>
      <header className={`flex-none flex items-center justify-between px-6 py-4 border-b ${theme === 'dark' ? 'border-zinc-900 bg-zinc-950/90' : 'border-zinc-200 bg-white/90'} backdrop-blur-xl z-50 transition-colors`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-950"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M8 7h6"/><path d="M8 11h8"/></svg>
          </div>
          <div className="hidden xs:block">
            <h1 className="text-base font-black tracking-tight leading-none">Sastro Song·gital</h1>
            <p className="text-[9px] text-amber-600 dark:text-amber-500/80 font-black tracking-widest uppercase mt-1">Garo Holy Bible</p>
          </div>
        </div>
        <div className="flex items-center gap-3 sm:gap-6">
          <button 
            onClick={onThemeToggle}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all active:scale-95 ${
              theme === 'dark' 
                ? 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-amber-500' 
                : 'bg-zinc-100 border-zinc-200 text-zinc-600 hover:text-amber-600'
            }`}
          >
            {theme === 'dark' ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
                <span className="text-[10px] font-black uppercase tracking-wider">Seng·a</span>
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
                <span className="text-[10px] font-black uppercase tracking-wider">Andala</span>
              </>
            )}
          </button>
          <div className={`h-6 w-px ${theme === 'dark' ? 'bg-zinc-800' : 'bg-zinc-200'} hidden sm:block`}></div>
          <span className={`text-[10px] font-black uppercase tracking-tighter px-3 py-1.5 rounded-lg border transition-colors ${
            theme === 'dark' ? 'bg-zinc-900 border-zinc-800 text-zinc-400' : 'bg-white border-zinc-200 text-zinc-500'
          }`}>A·chik</span>
        </div>
      </header>
      <main className="flex-1 overflow-hidden relative">
        {children}
      </main>
    </div>
  );
}
