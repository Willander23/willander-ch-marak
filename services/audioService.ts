
import { GoogleGenAI, Modality } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Voices selected for their clarity in tonal Asian/Tibeto-Burman adjacent phonetics
export type VoiceType = 'Puck' | 'Charon' | 'Kore' | 'Zephyr'; 

export function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export async function generateVerseAudio(text: string, voiceName: VoiceType, isSummary: boolean = false): Promise<string> {
  // Enhanced phonetic guidance for Garo glottal markers and syllable timing
  const instruction = `
    Task: Read the following A·chik (Garo) text.
    Accent Style: Native A·chik speaker from Tura/Garo Hills. 
    Phonetic Guidance:
    - The symbol '·' indicates a sharp glottal stop. Pause briefly and sharply at these points.
    - Syllables should be rhythmic and evenly stressed. 
    - Avoid the rising intonation of English questions or the heavy stress of English nouns.
    - Treat 'ch' like 'ts' in some contexts, and 'j' as soft.
    - ${isSummary ? "Speak like a wise elder giving a sermon (Gisikni Katta)." : "Read clearly and reverently as if in church."}
  `;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: `${instruction}\n\nText: ${text}` }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) throw new Error("Audio generate ka·na man·jaeng·a");
  return base64Audio;
}
