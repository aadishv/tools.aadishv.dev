import { useEffect, useMemo, useState } from "react";
import { useSelector } from "@xstate/store/react";
import { store } from "../Store";
import { getSentences, CharState } from "../Data";
import { TrafficLights } from "../Review";
import { toast } from "sonner";

function isChineseVoice(v: SpeechSynthesisVoice) {
  const l = (v.lang || "").toLowerCase();
  return (
    l.startsWith("zh") ||
    l.includes("zh-cn") ||
    l.includes("zh-hk") ||
    l.includes("zh-tw")
  );
}

export default function ListenReview({
  persistentId,
}: {
  persistentId: string;
}) {
  const sentences = useSelector(store, (s) => s.context.sentences);
  const enabledLessons = useSelector(store, (s) => s.context.enabledLessons);
  const listenPreferences = useSelector(
    store,
    (s) => s.context.listenPreferences,
  );
  const current = sentences[0];

  // Voices
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [rate, setRate] = useState<number>(listenPreferences.rate);

  useEffect(() => {
    const update = () => {
      const vs = window.speechSynthesis.getVoices().filter(isChineseVoice);
      setVoices(vs);
      let def = vs.find((v) => v.name.toLowerCase().includes("tingting"));
      if (listenPreferences.voiceName) {
        const storedVoice = vs.find(
          (v) => v.name === listenPreferences.voiceName,
        );
        if (storedVoice) {
          def = storedVoice;
        }
      }
      setVoice(def || vs[0] || null);
    };
    update();
    if (typeof window !== "undefined") {
      window.speechSynthesis.onvoiceschanged = update;
    }
  }, [listenPreferences.voiceName]);

  // Index current sentence label for friendly history display
  useEffect(() => {
    const label = current.words.map((w) => w.character).join("");
    store.trigger.indexSentence({ id: current.id, label });
    setRevealed(false);
  }, [current.id]);

  const speak = () => {
    if (!voice) return;
    const u = new SpeechSynthesisUtterance(
      current.words.map((w) => w.character).join(""),
    );
    u.voice = voice;
    u.rate = rate;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  };

  const handleVoiceChange = (newVoice: SpeechSynthesisVoice | null) => {
    setVoice(newVoice);
    store.trigger.updateListenPreferences({
      voiceName: newVoice?.name || null,
      rate: rate,
    });
  };

  const handleRateChange = (newRate: number) => {
    setRate(newRate);
    store.trigger.updateListenPreferences({
      voiceName: voice?.name || null,
      rate: newRate,
    });
  };

  // MCQ options from full dataset respecting enabled lessons
  const allData = useMemo(() => getSentences(), []);
  const pool = useMemo(() => {
    const eligible = allData.filter((s) => enabledLessons.includes(s.lesson));
    const defs = Array.from(
      new Set(eligible.map((s) => s.def).filter((d) => d !== current.def)),
    );
    const shuffled = [...defs].sort(() => Math.random() - 0.5).slice(0, 3);
    const opts = [...shuffled, current.def].sort(() => Math.random() - 0.5);
    return opts;
  }, [allData, enabledLessons, current.id]);

  const [selected, setSelected] = useState<string | null>(null);
  const [state, setState] = useState<CharState>(CharState.green);
  const [attempts, setAttempts] = useState<number>(0);
  const [completed, setCompleted] = useState<boolean>(false);
  const [revealed, setRevealed] = useState<boolean>(false);

  const onSubmit = () => {
    if (completed) return;
    if (!selected) return;
    const correct = selected === current.def;
    if (attempts === 0) {
      if (correct) {
        store.trigger.updateCharacter({
          character: current.id,
          newState: CharState.green,
          id: persistentId,
          mode: "listen" as any,
        });
        setCompleted(true);
      } else {
        toast.error("wrong choice");
        setState(CharState.yellow);
        setAttempts(1);
      }
    } else {
      if (correct) {
        store.trigger.updateCharacter({
          character: current.id,
          newState: CharState.yellow,
          id: persistentId,
          mode: "listen" as any,
        });
      } else {
        toast.error("wrong choice");
        setState(CharState.red);
        store.trigger.updateCharacter({
          character: current.id,
          newState: CharState.red,
          id: persistentId,
          mode: "listen" as any,
        });
      }
      setCompleted(true);
    }
  };

  return (
    <div className="w-full flex flex-col items-center gap-4">

        <div className={`flex items-center gap-4 ${!voice && "opacity-0"}`}>
          <button className="text-foreground/50 lowercase text-base" onClick={speak}>
            play
          </button>
          <div className="flex items-center gap-2 text-base text-foreground/60">
            <span>speed</span>
            <input
              type="range"
              min={0.6}
              max={1.4}
              step={0.1}
              value={rate}
              onChange={(e) => handleRateChange(parseFloat(e.target.value))}
            />
          </div>
          <div className="flex items-center gap-2 text-base text-foreground/60">
            <span>voice</span>
            <select
              className="bg-transparent underline"
              value={voice?.name || ""}
              onChange={(e) =>
                handleVoiceChange(
                  voices.find((v) => v.name === e.target.value) || null,
                )
              }
            >
              {voices.map((v) => (
                <option key={v.name} value={v.name}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>
        </div>

      <TrafficLights state={state} checkMark={completed} />

      {!revealed ? (
        <button className="text-xl text-foreground/70" onClick={() => setRevealed(true)}>
          reveal questions
        </button>
      ) : (
        <div className="w-full max-w-xl">
          {pool.map((opt) => {
            const isCorrect = opt === current.def;
            let cls = "border bg-white px-3 py-2 my-2 cursor-pointer ";
            if (completed) {
              // On completion, fill correct in green and wrong in red
              cls += isCorrect
                ? "bg-green-500 border-green-600 text-white "
                : "bg-red-500 border-red-600 text-white ";
            } else if (selected === opt) {
              cls += "bg-gray-50 border-header2 ";
            } else {
              cls += "border-header ";
            }
            return (
              <div
                key={opt}
                className={cls}
                onClick={() => !completed && setSelected(opt)}
              >
                <input
                  type="radio"
                  className="mr-2"
                  checked={selected === opt}
                  readOnly
                />
                <span className="text-lg text-foreground/80">{opt}</span>
              </div>
            );
          })}
        </div>
      )}

      {completed ? (
        <div className="flex flex-col items-center ">
          <p>{current.words.map((w) => w.character).join("")}</p>
          <p>{current.words.map((w) => w.pinyin === "" ? w.character : w.pinyin).join(" ")}</p>
        </div>
      ) : revealed ? (
        <div
          className={`transition-opacity duration-500 ${
            completed ? "opacity-0" : "opacity-100"
          }`}
        >
          <button className="text-foreground/70" onClick={onSubmit}>
            {attempts === 0 ? "submit" : "try again"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
