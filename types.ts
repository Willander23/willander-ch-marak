
export interface BibleBook {
  id: string;
  name: string;
  englishName: string;
  chapters: number;
  testament: 'Old' | 'New';
}

export interface Verse {
  number: number;
  text: string;
}

export interface BibleChapter {
  bookName: string;
  chapterNumber: number;
  verses: Verse[];
}

export type Theme = 'light' | 'dark' | 'sepia';
