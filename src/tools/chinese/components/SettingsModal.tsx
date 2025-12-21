import { useEffect, useMemo, useState } from "react";
import { useSelector } from "@xstate/store/react";
import { store, type AppMode, getAllLessons } from "../Store";
import Modal from "react-modal";
import { toast } from "sonner";

// Re-export Button for use in this file
import { Button } from "./DetailsAndButton";

interface SettingsModalProps {
  modalIsOpen: boolean;
  closeModal: () => void;
  currentMode: AppMode | null;
  setMode: (mode: AppMode | null) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  modalIsOpen,
  closeModal,
}) => {
  // Practice modes multiselect
  const enabledModes = useSelector(store, (s) => s.context.enabledModes);
  const [selectedModes, setSelectedModes] = useState<AppMode[]>(enabledModes);

  const toggleMode = (m: AppMode) => {
    setSelectedModes((prev) => {
      const next = prev.includes(m)
        ? prev.filter((x) => x !== m)
        : [...prev, m];
      if (next.length === 0) {
        toast.error("At least one mode must remain enabled");
        return prev;
      }
      return next;
    });
  };

  useEffect(() => {
    store.trigger.updateEnabledModes({ modes: selectedModes });
  }, [selectedModes]);

  // State for lesson selection
  const allLessons = useMemo(() => getAllLessons(), []);
  const enabledLessons = useSelector(
    store,
    (state) => state.context.enabledLessons,
  );
  const [selectedLessons, setSelectedLessons] =
    useState<string[]>(enabledLessons);

  // Handle the selection/deselection of a lesson
  const toggleLesson = (lesson: string) => {
    setSelectedLessons((prev) =>
      prev.includes(lesson)
        ? prev.filter((l) => l !== lesson)
        : [...prev, lesson],
    );
  };

  // Handle select all / deselect all
  const toggleAllLessons = () => {
    if (selectedLessons.length === allLessons.length) {
      setSelectedLessons([]);
    } else {
      setSelectedLessons([...allLessons]);
    }
  };

  // Apply lesson selection changes
  useEffect(() => {
    // If no lessons are selected, select all (default behavior)
    const lessonsToApply =
      selectedLessons.length === 0 ? allLessons : selectedLessons;

    // Update the store with enabled lessons
    store.trigger.updateEnabledLessons({ enabledLessons: lessonsToApply });
  }, [selectedLessons, allLessons]);

  return (
    <Modal
      isOpen={modalIsOpen}
      onRequestClose={closeModal}
      contentLabel="Settings Modal"
      className="m-auto w-3/4 max-w-lg bg-white font-lora"
      overlayClassName="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
      ariaHideApp={false}
    >
      <div className="bg-stripes-header2 h-full w-full p-6">
        <h2 className="mb-4 text-xl font-bold">Settings</h2>

        <div className="mb-6">
          <h3 className="mb-2 font-medium">Practice Modes</h3>
          <div className="flex flex-col gap-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={selectedModes.includes("character")}
                onChange={() => toggleMode("character")}
                className="mr-2"
              />
              Character
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={selectedModes.includes("pinyin")}
                onChange={() => toggleMode("pinyin")}
                className="mr-2"
              />
              Pinyin
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={selectedModes.includes("listen")}
                onChange={() => toggleMode("listen")}
                className="mr-2"
              />
              Listen -&gt; English
            </label>
          </div>
        </div>

        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-medium">Lessons</h3>
            <Button
              name={
                selectedLessons.length === allLessons.length
                  ? "Deselect All"
                  : "Select All"
              }
              onClick={toggleAllLessons}
            />
          </div>
          <div className="max-h-40 overflow-y-auto rounded border border-gray-200 p-2">
            {allLessons.map((lesson) => (
              <label key={lesson} className="mb-1 flex items-center">
                <input
                  type="checkbox"
                  checked={selectedLessons.includes(lesson)}
                  onChange={() => toggleLesson(lesson)}
                  className="mr-2"
                />
                {lesson}
              </label>
            ))}
          </div>
          {selectedLessons.length === 0 && (
            <p className="mt-1 text-sm text-gray-500">
              When no lessons are selected, all lessons will be used.
            </p>
          )}
        </div>

        <div className="flex justify-end">
          <div className="px-4 py-2">
            <Button name="Close" onClick={closeModal} />
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default SettingsModal;
