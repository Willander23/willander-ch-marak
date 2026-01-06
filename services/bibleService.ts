
import { GoogleGenAI, Type } from "@google/genai";
import { BibleChapter } from "../types.ts";
import { saveChapterToCache, getChapterFromCache } from "./db.ts";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      const isRetryable = e.message?.includes('500') || e.message?.includes('xhr') || e.message?.includes('UNKNOWN');
      if (isRetryable && i < maxRetries - 1) {
        await delay(Math.pow(2, i) * 1000);
        continue;
      }
      throw e;
    }
  }
  throw lastError;
}

export async function fetchChapterText(bookId: string, bookName: string, chapterNumber: number): Promise<{ data: BibleChapter; fromCache: boolean }> {
  const cachedData = await getChapterFromCache(bookId, chapterNumber);
  if (cachedData) {
    return { data: cachedData, fromCache: true };
  }

  const systemInstruction = `You are a linguistic expert in PURE A·CHIK (Standard Garo). 
  SOURCE: Use the semantic meaning of the 'Easy English Bible'.
  STRICT LINGUISTIC RULES:
  1. NO "GAROLISH": Avoid English word order. Use natural A·chik SOV grammar.
  2. PURE VOCABULARY: Use authentic terms like 'Dakgipa', 'Ka·saani', 'Nama Katta', 'Gisik Rongtal'.
  3. GLOTTAL STOPS: Use '·' correctly (e.g., 'Am·eng·a').
  4. NATIVE FLOW: The text must sound like the traditional 'Sastro Song·gital'.`;

  const prompt = `Provide the full text of the Bible book "${bookName}", chapter ${chapterNumber} as a JSON object.`;

  try {
    const data = await withRetry(async () => {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              bookName: { type: Type.STRING },
              chapterNumber: { type: Type.NUMBER },
              verses: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    number: { type: Type.NUMBER },
                    text: { type: Type.STRING },
                  },
                  required: ["number", "text"],
                },
              },
            },
            required: ["bookName", "chapterNumber", "verses"],
          },
        },
      });
      return JSON.parse(response.text) as BibleChapter;
    });

    await saveChapterToCache(bookId, chapterNumber, data);
    return { data, fromCache: false };
  } catch (error) {
    console.error("Error fetching Bible text:", error);
    throw new Error("Batmonge: Katta am·ani chu·sokja. Internet-ko nina nang·gen.");
  }
}

export async function generateChapterSummary(content: BibleChapter): Promise<string> {
  const fullText = content.verses.map(v => `${v.number}. ${v.text}`).join(' ');
  const systemInstruction = `Act as an A·chik (Garo) Christian Elder and Teacher. Speak with "Ku·pali" (wisdom) and high-level A·chik vocabulary.`;
  const prompt = `Provide a spiritual reflection (Gisikni Nama) on this chapter: ${fullText}. Start with: "Ia Sastro Song·gitalni bak gimin chinga iandake gisik ra·na man·a..."`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: { 
        systemInstruction,
        thinkingConfig: { thinkingBudget: 0 } 
      }
    });
    return response.text || "Reflection generate ka·na man·jaeng·a.";
  } catch (error) {
    return "Reflection generate ka·na man·jaeng·a.";
  }
}

export async function fetchDailyVerse(): Promise<{ verse: string; reference: string }> {
  const prompt = `Provide one encouraging Bible verse translated into pure, poetic A·chik (Garo). Return as JSON with 'verse' and 'reference'.`;
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            verse: { type: Type.STRING },
            reference: { type: Type.STRING },
          },
          required: ["verse", "reference"],
        },
      },
    });
    return JSON.parse(response.text);
  } catch (error) {
    return { verse: "Isol saksan Dakgipa aro Ka·saani bitchi ong·a.", reference: "Genesis 1:1" };
  }
}
