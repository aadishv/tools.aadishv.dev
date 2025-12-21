import { createStore } from "@xstate/store";
import { getSentences, CharState, type Sentence } from "./Data";

// Single storage key for all Chinese app data
const CHINESE_APP_STORAGE_KEY = "chinese_app_data";

export const loadFromStorage = (): Object | null => {
  try {
    const storedData = localStorage.getItem(CHINESE_APP_STORAGE_KEY);
    if (storedData) {
      return JSON.parse(storedData);
    }
  } catch (error) {
    console.error("Failed to load data from localStorage:", error);
  }
  return null;
};

/**
 * Saves application state to localStorage
 * @param {any} data - Current application state to persist
 */
export const saveToStorage = (data: any) => {
  try {
    localStorage.setItem(CHINESE_APP_STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error("Failed to save data to localStorage:", error);
  }
};
export type AppMode = "pinyin" | "character" | "listen";

type HistoryType = {
  character: Record<string, [CharState, string]>;
  pinyin: Record<string, [CharState, string]>;
  listen: Record<string, [CharState, string]>;
};

const defaultHistory: HistoryType = { character: {}, pinyin: {}, listen: {} };

// Get all available lesson names
export const getAllLessons = (): string[] => {
  const allSentences = getSentences();
  const uniqueLessons = new Set<string>();

  allSentences.forEach((sentence) => {
    uniqueLessons.add(sentence.lesson);
  });

  return Array.from(uniqueLessons).sort();
};

// Load stored data and initialize context
const storedData = loadFromStorage() as {
  history?: HistoryType;
  sentences?: Sentence[];
  sessions?: Record<string, string>;
  enabledLessons?: string[];
  enabledModes?: AppMode[];
  sentenceIndex?: Record<string, string>;
  listenPreferences?: { voiceName: string | null; rate: number };
} | null;
const allLessons = getAllLessons();

const initialContext = {
  history: { ...defaultHistory, ...(storedData?.history || {}) } as HistoryType,
  sentences:
    storedData?.sentences ??
    ([...getSentences()].sort(() => 0.5 - Math.random()) as Sentence[]),
  sessions: (storedData?.sessions ?? {}) as Record<string, string>,
  completedCount: 0, // Always starts at 0 and is not persisted
  enabledLessons: storedData?.enabledLessons ?? allLessons, // Default to all lessons enabled
  enabledModes: (storedData?.enabledModes ?? [
    "character",
    "pinyin",
    "listen",
  ]) as AppMode[],
  currentQuestionMode: null as AppMode | null,
  sentenceIndex: (storedData?.sentenceIndex ?? {}) as Record<string, string>,
  listenPreferences: (storedData?.listenPreferences ?? {
    voiceName: null,
    rate: 1,
  }) as { voiceName: string | null; rate: number },
};

export const store = createStore({
  context: initialContext,
  on: {
    updateCharacter: (
      context,
      event: {
        character: string;
        newState: CharState;
        id: string;
        mode: AppMode;
      },
    ) => {
      const lastState = context.history[event.mode][event.character];
      const noChange = lastState && lastState[0] === event.newState;

      return {
        ...context,
        completedCount: context.completedCount + 1,
        history: noChange
          ? context.history
          : ({
              ...context.history,
              [event.mode]: {
                ...context.history[event.mode],
                [event.character]: [event.newState, event.id],
              },
            } as HistoryType),
      };
    },
    setCurrentQuestionMode: (context, event: { mode: AppMode | null }) => {
      return {
        ...context,
        currentQuestionMode: event.mode,
      };
    },
    updateEnabledModes: (context, event: { modes: AppMode[] }) => {
      return {
        ...context,
        enabledModes: event.modes,
      };
    },
    indexSentence: (context, event: { id: string; label: string }) => {
      return {
        ...context,
        sentenceIndex: {
          ...context.sentenceIndex,
          [event.id]: event.label,
        },
      };
    },
    resetCompletedCount: (context, _) => {
      const newContext = {
        ...context,
        completedCount: 0,
      };
      return newContext;
    },
    updateSession: (context, event: { key: string; date: Date }) => {
      return {
        ...context,
        sessions: {
          ...context.sessions,
          [event.key]: event.date.toISOString(),
        },
      };
    },
    progressSentence: (context) => {
      const enabledLessons = context.enabledLessons;
      let sentences = context.sentences.slice(1);
      if (sentences.length === 0) {
        sentences = [...getSentences()].sort(() => Math.random() - 0.5);
      }
      while (
        enabledLessons.length > 0 &&
        sentences.length > 0 &&
        !enabledLessons.includes(sentences[0].lesson)
      ) {
        sentences = sentences.slice(1);
        if (sentences.length === 0) {
          sentences = [...getSentences()].sort(() => Math.random() - 0.5);
        }
      }
      return {
        ...context,
        completedCount: 0,
        sentences: sentences,
      };
    },
    updateEnabledLessons: (context, event: { enabledLessons: string[] }) => {
      return {
        ...context,
        enabledLessons: event.enabledLessons,
      };
    },
    increaseCompletedCount: (context) => {
      return {
        ...context,
        completedCount: context.completedCount + 1,
      };
    },
    updateListenPreferences: (
      context,
      event: { voiceName: string | null; rate: number },
    ) => {
      return {
        ...context,
        listenPreferences: event,
      };
    },
  },
});

store.subscribe((snapshot) => saveToStorage(snapshot.context));
