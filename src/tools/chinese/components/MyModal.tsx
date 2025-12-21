import { useState, useMemo } from "react";
import { useSelector } from "@xstate/store/react";
import Modal from "react-modal";
import { TrafficLights } from "../Review";
import { store } from "../Store";

type MyModalProps = {
  modalIsOpen: boolean;
  closeModal: () => void;
  relativeTimes: {
    character: Record<string, string>;
    pinyin: Record<string, string>;
    listen: Record<string, string>;
  };
  history: {
    character: Record<string, [number, string]>;
    pinyin: Record<string, [number, string]>;
    listen: Record<string, [number, string]>;
  };
};

function Button({
  name,
  onClick,
  red = false,
}: {
  name: string;
  onClick: () => void;
  red?: boolean;
}) {
  return (
    <button
      className={`m-0 h-8 justify-center truncate p-0 font-lora underline transition-all duration-300 ease-in-out ${
        red ? "hover:decoration-red-600" : "hover:decoration-header"
      } ${red ? "decoration-red-400" : "decoration-header2"}`}
      onClick={onClick}
    >
      {name}
    </button>
  );
}

const MyModal: React.FC<MyModalProps> = ({
  modalIsOpen,
  closeModal,
  relativeTimes,
  history,
}) => {
  const [activeTab, setActiveTab] = useState<"character" | "pinyin" | "listen">(
    "character",
  );
  const numSentences = useSelector(
    store,
    (state) => state.context.sentences.length,
  );
  const sentenceIndex = useSelector(store, (s) => s.context.sentenceIndex);

  const labeledEntries = useMemo(() => {
    if (activeTab !== "listen") return null;
    return Object.entries(history.listen).map(([id, value]) => {
      const label = sentenceIndex[id] || id;
      return { id, label, value } as {
        id: string;
        label: string;
        value: [number, string];
      };
    });
  }, [history.listen, sentenceIndex, activeTab]);

  const currentHistory = history[activeTab] || {};

  return (
    <Modal
      isOpen={modalIsOpen}
      onRequestClose={closeModal}
      contentLabel="History Modal"
      className="m-auto w-3/4 max-w-lg bg-white font-lora"
      overlayClassName="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
      ariaHideApp={false}
    >
      <div className="bg-stripes-header2 h-full w-full p-6">
        <h2 className="mb-4 text-xl font-bold">Learning history</h2>
        <p className="">You have {numSentences} sentences left this cycle.</p>
        <div className="mb-4 flex border-b border-header">
          <button
            className={`mr-4 px-2 py-1 font-medium ${
              activeTab === "character"
                ? "border-b-2 border-header text-header"
                : "text-gray-500"
            }`}
            onClick={() => setActiveTab("character")}
          >
            Characters
          </button>
          <button
            className={`px-2 py-1 font-medium ${
              activeTab === "pinyin"
                ? "border-b-2 border-header text-header"
                : "text-gray-500"
            }`}
            onClick={() => setActiveTab("pinyin")}
          >
            Pinyin
          </button>
          <button
            className={`ml-4 px-2 py-1 font-medium ${
              activeTab === "listen"
                ? "border-b-2 border-header text-header"
                : "text-gray-500"
            }`}
            onClick={() => setActiveTab("listen")}
          >
            Listening
          </button>
        </div>

        <div className="mb-4">
          {!Object.keys(currentHistory).length ? (
            <p>
              Your {activeTab} learning history will appear here. It is
              currently empty.
            </p>
          ) : activeTab === "listen" && labeledEntries ? (
            <div className="list-disc">
              {labeledEntries.map(({ id, label, value }) => (
                <div key={id} className="flex">
                  <span className="min-w-40 font-lora text-xl font-bold truncate">
                    {label}
                  </span>
                  <span className="my-auto px-4">
                    <TrafficLights state={value[0]} checkMark={false} />
                  </span>
                  <span className="my-auto px-4 font-mono text-gray-500">
                    {relativeTimes.listen[id]}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="list-disc">
              {Object.entries(currentHistory).map(([key, value]) => (
                <div key={key} className="flex">
                  <span className="w-20 font-lora text-xl font-bold">
                    {key}
                  </span>
                  <span className="my-auto px-4">
                    <TrafficLights state={value[0]} checkMark={false} />
                  </span>
                  <span className="my-auto px-4 font-mono text-gray-500">
                    {relativeTimes[activeTab][key]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex justify-between">
          <div className="px-4 py-2">
            <Button
              name="Clear Data"
              red
              onClick={() => {
                if (
                  confirm(
                    "Are you sure you want to delete all data from past practice sessions?",
                  )
                ) {
                  const storedData = JSON.parse(
                    localStorage.getItem("chinese_app_data") || "{}",
                  );
                  if (storedData) {
                    localStorage.setItem(
                      "chinese_app_data",
                      JSON.stringify(storedData),
                    );
                  }
                  window.location.reload();
                }
              }}
            />
          </div>
          <div className="px-4 py-2">
            <Button name="Close" onClick={closeModal} />
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default MyModal;
