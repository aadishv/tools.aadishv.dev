import { useEffect, useMemo, useRef } from "react";
import { useSelector } from "@xstate/store/react";
import { Review } from "../Review";
import { store, type AppMode } from "../Store";
import ListenReview from "./ListenReview";

/**
 * Component that renders a full sentence review interface for the current question
 */
export function SentenceReview({ mode }: { mode: AppMode | null }) {
  const enabledModes = useSelector(store, (s) => s.context.enabledModes);
  const id = useRef({
    id: Math.random().toString(36).substring(2, 10) + Date.now().toString(36),
    m: null as AppMode | null,
  }).current;

  const chosenMode = useMemo<AppMode>(() => {
    if (mode) return mode;
    const modes =
      enabledModes && enabledModes.length
        ? enabledModes
        : (["character", "pinyin", "listen"] as AppMode[]);
    return modes[Math.floor(Math.random() * modes.length)];
  }, [mode, enabledModes]);

  // Track session and expose current question mode
  useEffect(() => {
    id.m = chosenMode;
    store.trigger.updateSession({ key: id.id, date: new Date() });
    store.trigger.setCurrentQuestionMode({ mode: chosenMode });
    return () => {
      store.trigger.setCurrentQuestionMode({ mode: null });
    };
  }, [chosenMode]);

  const sentences = useSelector(store, (state) => state.context.sentences);

  if (chosenMode === "listen") {
    return <ListenReview persistentId={id.id} />;
  }

  return (
    <div className="flex w-full flex-wrap justify-center gap-4 overflow-visible">
      {sentences[0].words.map(
        (word: { character: string; pinyin: string }, index: number) => {
          const isPunctuation = word.pinyin === "";
          return (
            <div
              key={index}
              className={
                isPunctuation
                  ? "-ml-2 inline-block whitespace-nowrap"
                  : undefined
              }
              style={isPunctuation ? { position: "relative" } : undefined}
            >
              <Review
                character={word.character}
                pinyin={word.pinyin}
                persistentId={id.id}
                mode={chosenMode as "character" | "pinyin"}
              />
            </div>
          );
        },
      )}
    </div>
  );
}

type FooterProps = {
  showModal: () => void;
  showSettingsModal: () => void;
  progressSentence: () => void;
};

export function Footer({
  showModal,
  showSettingsModal,
  progressSentence,
}: FooterProps) {
  return (
    <div className="flex w-full">
      <div className="mb-0 mr-auto flex flex-row gap-5">
        <button
          className="text-xl text-foreground/70"
          onClick={() => {
            window.location.href = "/using-chinese";
          }}
        >
          help
        </button>
        <button className="text-xl text-foreground/70" onClick={showModal}>
          history
        </button>
        <button className="text-xl text-foreground/70" onClick={showSettingsModal}>
          settings
        </button>
      </div>
      <div className="mb-0 ml-auto flex flex-row gap-5">
        <button className="text-xl text-foreground/70" onClick={progressSentence}>
          continue
        </button>
      </div>
    </div>
  );
}
