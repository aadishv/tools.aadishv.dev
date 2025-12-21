import { useMemo, useState } from "react";
import RelativeTime from "@yaireo/relative-time";
import { useSelector } from "@xstate/store/react";
import { store, type AppMode } from "./Store";
import MyModal from "./components/MyModal";
import SettingsModal from "./components/SettingsModal";
import { SentenceReview, Footer } from "./components/SentenceReviewAndFooter";
import { SentenceDetails } from "./components/DetailsAndButton";
import { Toaster } from "sonner";

export default function App() {
  const [historyModalIsOpen, setHistoryModalIsOpen] = useState(false);
  const [settingsModalIsOpen, setSettingsModalIsOpen] = useState(false);
  const [mode, setMode] = useState<AppMode | null>(null);

  // Function to show modals
  const showHistoryModal = () => setHistoryModalIsOpen(true);
  const showSettingsModal = () => setSettingsModalIsOpen(true);

  // Function to close modals
  const closeHistoryModal = () => setHistoryModalIsOpen(false);
  const closeSettingsModal = () => setSettingsModalIsOpen(false);

  const history = useSelector(store, (state) => state.context.history);
  const times = useMemo(() => {
    const state = store.getSnapshot();
    const history = state.context.history;
    const rtf = new RelativeTime();
    let times = {
      character: {} as Record<string, string>,
      pinyin: {} as Record<string, string>,
      listen: {} as Record<string, string>,
    };

    Object.entries(history.character || {}).forEach(
      ([char, [_, sessionId]]) => {
        if (state.context.sessions[sessionId]) {
          const time = new Date(state.context.sessions[sessionId]);
          times.character[char] = rtf.from(time);
        }
      },
    );
    Object.entries(history.pinyin || {}).forEach(([char, [_, sessionId]]) => {
      if (state.context.sessions[sessionId]) {
        const time = new Date(state.context.sessions[sessionId]);
        times.pinyin[char] = rtf.from(time);
      }
    });
    Object.entries(history.listen || {}).forEach(([key, [_, sessionId]]) => {
      if (state.context.sessions[sessionId]) {
        const time = new Date(state.context.sessions[sessionId]);
        times.listen[key] = rtf.from(time);
      }
    });
    return times;
  }, [history]);

  const currentId = useSelector(
    store,
    (state) => state.context.sentences[0].id,
  );

  return (
    <div className="flex flex-col items-center text-2xl mt-[4rem] mx-auto w-[50rem]">
      {/* Fixed header area */}
      <div className="flex justify-center flex-row w-full">
        <div className="flex flex-col w-full">
          <Footer
            showModal={showHistoryModal}
            showSettingsModal={showSettingsModal}
            progressSentence={() => store.trigger.progressSentence()}
          />
          <SentenceDetails />
        </div>
      </div>

      {/* Scrollable middle content area */}
      <div className="w-full flex-grow overflow-y-auto my-4">
        <SentenceReview key={currentId} mode={mode} />
      </div>

      <MyModal
        modalIsOpen={historyModalIsOpen}
        closeModal={closeHistoryModal}
        relativeTimes={times}
        history={history}
      />

      <SettingsModal
        modalIsOpen={settingsModalIsOpen}
        closeModal={closeSettingsModal}
        currentMode={mode}
        setMode={setMode}
      />
      <Toaster />
    </div>
  );
}
