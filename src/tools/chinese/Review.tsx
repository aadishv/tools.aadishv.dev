import { useState, useRef, useEffect } from "react";
import HanziWriter from "hanzi-writer";
import { useSelector, useStore } from "@xstate/store/react";
import { store, type AppMode } from "./Store";
import { CharState } from "./Data";
import { toast } from "sonner";
const CHARACTER_SIZE_STYLE = "h-28 w-28";

function parsePinyinToNumbered(raw: string): { p: string; t: number } {
  // Normalize input
  const input = raw.toLowerCase().trim();

  if (!input) return { p: "", t: 0 };

  // If it ends with a tone digit (1-5), use that
  const toneDigitMatch = input.match(/^(.*?)([1-5])$/);
  if (toneDigitMatch) {
    const base = toneDigitMatch[1].replace(/ü/g, "v");
    const tone = parseInt(toneDigitMatch[2], 10);
    return { p: base, t: tone };
  }

  // Map precomposed vowel characters with tone marks to base + tone
  const diacriticMap: Record<string, { base: string; tone: number }> = {
    // a
    ā: { base: "a", tone: 1 },
    á: { base: "a", tone: 2 },
    ǎ: { base: "a", tone: 3 },
    à: { base: "a", tone: 4 },
    // e
    ē: { base: "e", tone: 1 },
    é: { base: "e", tone: 2 },
    ě: { base: "e", tone: 3 },
    è: { base: "e", tone: 4 },
    // i
    ī: { base: "i", tone: 1 },
    í: { base: "i", tone: 2 },
    ǐ: { base: "i", tone: 3 },
    ì: { base: "i", tone: 4 },
    // o
    ō: { base: "o", tone: 1 },
    ó: { base: "o", tone: 2 },
    ǒ: { base: "o", tone: 3 },
    ò: { base: "o", tone: 4 },
    // u
    ū: { base: "u", tone: 1 },
    ú: { base: "u", tone: 2 },
    ǔ: { base: "u", tone: 3 },
    ù: { base: "u", tone: 4 },
    // ü (v) variants
    ǖ: { base: "ü", tone: 1 },
    ǘ: { base: "ü", tone: 2 },
    ǚ: { base: "ü", tone: 3 },
    ǜ: { base: "ü", tone: 4 },
    // Capital variants (just in case)
    Ā: { base: "a", tone: 1 },
    Á: { base: "a", tone: 2 },
    Ǎ: { base: "a", tone: 3 },
    À: { base: "a", tone: 4 },
    Ē: { base: "e", tone: 1 },
    É: { base: "e", tone: 2 },
    Ě: { base: "e", tone: 3 },
    È: { base: "e", tone: 4 },
    Ī: { base: "i", tone: 1 },
    Í: { base: "i", tone: 2 },
    Ǐ: { base: "i", tone: 3 },
    Ì: { base: "i", tone: 4 },
    Ō: { base: "o", tone: 1 },
    Ó: { base: "o", tone: 2 },
    Ǒ: { base: "o", tone: 3 },
    Ò: { base: "o", tone: 4 },
    Ū: { base: "u", tone: 1 },
    Ú: { base: "u", tone: 2 },
    Ǔ: { base: "u", tone: 3 },
    Ù: { base: "u", tone: 4 },
    Ǖ: { base: "ü", tone: 1 },
    Ǘ: { base: "ü", tone: 2 },
    Ǚ: { base: "ü", tone: 3 },
    Ǜ: { base: "ü", tone: 4 },
  };

  // Find any accented vowel to determine tone
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (diacriticMap[ch]) {
      // Replace that character with its base and remove other diacritics
      const tone = diacriticMap[ch].tone;
      // Replace all accented characters with their base equivalent
      let replaced = input
        .split("")
        .map((c) => {
          if (diacriticMap[c]) return diacriticMap[c].base;
          return c;
        })
        .join("");
      // Normalize combining marks if any (NFD), then remove combining diacritics
      replaced = replaced.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      // Convert ü to v for consistent comparison
      replaced = replaced.replace(/ü/g, "v");
      // Also convert any remaining literal 'v' stays as 'v'
      return { p: replaced, t: tone };
    }
  }

  // No explicit tone info (neither digit nor diacritic)
  // Return base with t = 0 to indicate unspecified/neutral
  const baseNoDiacritics = input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return { p: baseNoDiacritics.replace(/ü/g, "v"), t: 0 };
}

export function TrafficLights({
  checkMark,
  state,
}: {
  checkMark: boolean;
  state: CharState;
}) {
  const checkMarkElement = (
    <svg
      width="20"
      height="20"
      viewBox="0 0 16 16"
      xmlns="http://www.w3.org/2000/svg"
      fill="white"
    >
      <path
        fillRule="evenodd"
        d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0z"
      />
    </svg>
  );
  return (
    <div className="flex gap-2">
      <div
        className={`h-5 w-5 rounded-full bg-green-500 transition-all ${state === CharState.green ? "hover:opacity-70" : "opacity-30 hover:opacity-15"}`}
      >
        {checkMark && state === CharState.green && checkMarkElement}
      </div>
      <div
        className={`h-5 w-5 rounded-full bg-yellow-500 transition-all ${state === CharState.yellow ? "hover:opacity-70" : "opacity-30 hover:opacity-15"}`}
      >
        {checkMark && state === CharState.yellow && checkMarkElement}
      </div>
      <div
        className={`h-5 w-5 rounded-full bg-red-500 transition-all ${state === CharState.red ? "hover:opacity-70" : "opacity-30 hover:opacity-15"}`}
      >
        {checkMark && state === CharState.red && checkMarkElement}
      </div>
    </div>
  );
}

export function Review({
  character,
  pinyin,
  persistentId,
  mode,
}: {
  character: string;
  pinyin: string;
  persistentId: string;
  mode: AppMode;
}) {
  if (pinyin === "") {
    useEffect(() => {
      store.trigger.increaseCompletedCount();
    }, []); // Empty dependency array ensures this runs only once on mount

    return (
      // Single div with appropriate top padding to align with other characters
      <div className="mt-24 inline-flex flex-col items-center px-2">
        <span
          className="font-kaishu text-5xl text-gray-600"
          title="Punctuation"
        >
          {character}
        </span>
      </div>
    );
  }
  const data = {
    char: character,
    id: persistentId,
    mode: mode,
  };
  const local_store = useStore({
    context: {
      mistakes: 0,
      state: CharState.green,
      state2: CharState.green,
      isCompleted: false,
      mistakesToYellow: data.mode == "character" ? 5 : 2,
      mistakesToRed: data.mode == "character" ? 4 : 7,
      parentData: data,
    },
    emits: {
      showSolution: () => {},
      showPartialSolution: () => {},
    },
    on: {
      solved: (context, _: {}, enqueue) => {
        store.trigger.updateCharacter({
          character: context.parentData.char,
          newState: context.state,
          id: context.parentData.id,
          mode: context.parentData.mode,
        });
        enqueue.emit.showSolution();
        return { ...context, isCompleted: true };
      },
      mistake: (context) => {
        const newMistakes = context.mistakes + 1;

        if (
          context.state === CharState.green &&
          newMistakes >= context.mistakesToYellow
        ) {
          return {
            ...context,
            mistakes: 0,
            state: CharState.yellow,
          };
        }

        if (
          context.state === CharState.yellow &&
          newMistakes >= context.mistakesToRed
        ) {
          return {
            ...context,
            mistakes: 0,
            state: CharState.red,
          };
        }

        return { ...context, mistakes: newMistakes };
      },
      button: (context, _: {}, enqueue) => {
        if (context.isCompleted) {
          return context;
        } else if (context.state2 === CharState.green) {
          enqueue.emit.showPartialSolution();
          return {
            ...context,
            state:
              context.state === CharState.red
                ? CharState.red
                : CharState.yellow,
            state2: CharState.yellow,
            mistakes: context.state === CharState.yellow ? context.mistakes : 0,
          };
        } else if (context.state2 === CharState.yellow) {
          local_store.trigger.solved();
          store.trigger.updateCharacter({
            character: context.parentData.char,
            newState: CharState.red,
            id: context.parentData.id,
            mode: context.parentData.mode,
          });
          return {
            ...context,
            state: CharState.red,
            state2: CharState.red,
            isCompleted: true,
          };
        }
      },
    },
  });

  const state = useSelector(local_store, (state) => state.context.state);
  const isCompleted = useSelector(
    local_store,
    (state) => state.context.isCompleted,
  );
  const buttonName = useSelector(local_store, (state) => {
    if (state.context.isCompleted) {
      return mode == "character" ? "Replay" : "Completed";
    }
    return state.context.state2 === CharState.green
      ? mode == "character"
        ? "Show outline"
        : "Show letters"
      : "Show solution";
  });
  // CHARACTER STUFF
  const writerRef = useRef<HTMLDivElement>(null);
  const [writer, setWriter] = useState<HanziWriter | null>(null);
  useEffect(() => {
    const localWriter = HanziWriter.create(
      writerRef!.current as HTMLElement,
      character,
      {
        padding: 5,
        strokeColor: "#000000",
        drawingColor: "#000000",
        outlineColor: mode === "pinyin" ? "#000000" : "rgba(0, 0, 0, 0.5)",
        acceptBackwardsStrokes: true,
        showHintAfterMisses: false,
        showOutline: mode === "pinyin",
        strokeFadeDuration: 0,
      },
    );
    setWriter(localWriter);
    if (mode == "character") {
      localWriter.quiz({
        onMistake: local_store.trigger.mistake,
        onComplete: () => local_store.trigger.solved(),
        leniency: 1.2,
      });

      const subscription = local_store.on("showSolution", ({}) => {
        localWriter.animateCharacter();
      });
      const subscription2 = local_store.on("showPartialSolution", ({}) => {
        localWriter.showOutline();
      });
      return () => {
        subscription.unsubscribe();
        subscription2.unsubscribe();
      };
    }
  }, []);
  // PINYIN STUFF
  const [input, setInput] = useState(mode == "character" ? pinyin : "");
  const submitted = () => {
    if (!input.trim()) return;

    const userObj = parsePinyinToNumbered(input);
    const correctObj = parsePinyinToNumbered(pinyin);
    // Compare both base pinyin and tone number
    if (userObj.p === correctObj.p && userObj.t === correctObj.t) {
      local_store.trigger.solved();
    } else {
      local_store.trigger.mistake();
      toast.error("wrong pinyin");
    }
  };
  if (mode === "pinyin") {
    useEffect(() => {
      const subscription = local_store.on("showSolution", ({}) => {
        // Show the full pinyin as provided (could be with marks or numbers)
        setInput(pinyin);
      });
      const subscription2 = local_store.on("showPartialSolution", ({}) => {
        // Show pinyin without tone marks/digits (base only)
        const parsed = parsePinyinToNumbered(pinyin);
        setInput(parsed.p);
      });
      return () => {
        subscription.unsubscribe();
        subscription2.unsubscribe();
      };
    }, []);
  }
  // MAIN UI
  return (
    <div className="mb-2 flex w-28 flex-col">
      {/* HEADER */}
      <div className="w-full">
        <button
          className={`text-foreground/50 lowercase text-base ${mode === "pinyin" && isCompleted ? "opacity-0" : ""}`}
          onClick={() => {
            if (isCompleted) {
              writer!.animateCharacter();
            } else {
              local_store.trigger.button();
            }
          }}
          disabled={isCompleted && mode === "pinyin"}
        >
          {buttonName}
        </button>
        <TrafficLights state={state} checkMark={isCompleted} />
      </div>
      {/* CHARACTER UI */}
      <div
        className={`mt-2 ${CHARACTER_SIZE_STYLE} border border-header bg-white`}
        ref={writerRef}
      ></div>
      {/* PINYIN UI */}
      <div className="relative mx-auto w-28">
        <div className="flex">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className={`w-full bg-transparent py-1 text-center font-lora ${mode === "pinyin" ? "text-header underline" : ""} outline-none`}
            disabled={isCompleted || mode !== "pinyin"}
            placeholder="pinyin"
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              submitted();
            }}
          />
        </div>
      </div>
    </div>
  );
}
