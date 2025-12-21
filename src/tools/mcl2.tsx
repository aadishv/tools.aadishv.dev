import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useState } from "react";

const data = [
  { color: "bg-red-500", value: 7 }, // Red
  { color: "bg-orange-500", value: 3 }, // Orange
  { color: "bg-yellow-400", value: 6 }, // Yellow
  { color: "bg-green-500", value: 2 }, // Green
  { color: "bg-blue-500", value: 5 }, // Blue
  { color: "bg-indigo-700", value: 4 }, // Indigo
  { color: "bg-violet-500", value: 1 }, // Violet
];
const lines = [0, 1 / 7, 2 / 7, 3 / 7, 4 / 7, 5 / 7, 6 / 7];
const sum = 28;
const offset = 0.7 / 14;
export function ParticlesVertical() {
  return (
    <div className="flex flex-col gap-3">
      {data.map((d, i) => (
        <div className="flex gap-3" key={d.color}>
          <div
            className={`h-7 border-5 opacity-75 rounded-full text-center pt-0.5 ${d.color}`}
            style={{ width: `${d.value * 10}%` }}
          ></div>
          weight: {d.value}
        </div>
      ))}
    </div>
  );
}
export function ParticlesPercent() {
  return (
    <div className="flex">
      {data.map((d, i) => (
        <div
          className="flex gap-3 flex-col text-center"
          key={d.color}
          style={{ width: `${(100 * d.value) / sum}%` }}
        >
          <div
            className={`h-7 border-5 opacity-75 rounded-lg text-center pt-0.5 ${d.color}`}
          ></div>
          {`${((100 * d.value) / sum).toFixed(0)}%`}
        </div>
      ))}
    </div>
  );
}
export function ParticlesLines() {
  return (
    <div className="flex flex-col">
      <div className="flex relative mb-5 w-full">
        {lines.map((l) => (
          <div
            key={l}
            className="absolute translate-x-1/4"
            style={{ left: `${100 * l}%` }}
          >
            ↓
          </div>
        ))}
      </div>
      <div className="flex">
        {data.map((d, i) => (
          <div
            className="flex gap-3 flex-col text-center"
            key={d.color}
            style={{ width: `${(100 * d.value) / sum}%` }}
          >
            <div
              className={`h-7 border-5 opacity-75 rounded-lg text-center pt-0.5 ${d.color}`}
            ></div>
            {`${((100 * d.value) / sum).toFixed(0)}%`}
          </div>
        ))}
      </div>
    </div>
  );
}
export function ParticlesLines2() {
  return (
    <div className="flex flex-col">
      <div className="flex relative mb-5 w-full">
        <div
          className="h-3 absolute translate-y-1/2 border-r border-l border-foreground/60"
          style={{ width: `${100 * offset}%` }}
        >
          <div className="h-0.5 bg-foreground/60 w-full mt-[0.3125rem]"></div>
        </div>
        {lines.map((l) => (
          <div
            key={l}
            className="absolute"
            style={{ left: `${100 * (l + offset)}%` }}
          >
            ↓
          </div>
        ))}
      </div>
      <div className="flex">
        {data.map((d, i) => (
          <div
            className="flex gap-3 flex-col text-center"
            key={d.color}
            style={{ width: `${(100 * d.value) / sum}%` }}
          >
            <div
              className={`h-7 border-5 opacity-75 rounded-lg text-center pt-0.5 ${d.color}`}
            ></div>
            {`${((100 * d.value) / sum).toFixed(0)}%`}
          </div>
        ))}
      </div>
    </div>
  );
}
const colorFor = (l: any) => {
  let s = 0;
  for (const d of data) {
    s += d.value / 28;
    if (s > l) {
      return d.color;
    }
  }
};
export function ParticlesLines3() {
  return (
    <div className="flex flex-col">
      <div className="flex relative mb-5 w-full">
        {lines.map((l) => (
          <div
            key={l}
            className={`absolute aspect-square h-4 rounded-full ${colorFor(l)}`}
            style={{ left: `${100 * (l + offset)}%` }}
          ></div>
        ))}
      </div>
      <div className="flex">
        {data.map((d) => (
          <div
            className="flex gap-3 flex-col text-center"
            key={d.color}
            style={{ width: `${(100 * d.value) / sum}%` }}
          >
            <div
              className={`h-7 border-5 opacity-75 rounded-lg text-center pt-0.5 ${d.color}`}
            ></div>
            {`${((100 * d.value) / sum).toFixed(0)}%`}
          </div>
        ))}
      </div>
    </div>
  );
}
const sumFor = (n: number) =>
  data.slice(0, n).reduce((acc, d) => acc + (d.value / sum) * 100, 0);
const steps = [
  {
    sum: 0,
    line: 0,
    lineForList: 0,
    particle: null,
    message: "Basic setup of particles, lines, and current line",
  },
  {
    sum: 0,
    line: 0,
    lineForList: 0,
    particle: 0,
    message:
      "Start iterating through particles, starting with the first (red).",
  },
  {
    sum: sumFor(1),
    line: 0,
    lineForList: 0,
    particle: 0,
    message: "Add particle weight to sum",
  },
  {
    sum: sumFor(1),
    line: 0,
    lineForList: 1,
    particle: 0,
    message:
      "Since the current line's value is less than the running sum, we copy the current particle to our new list and move to the next line.",
  },
  {
    sum: sumFor(1),
    line: 1,
    lineForList: 2,
    particle: 0,
    message:
      "The second line's value is still less than the running sum, so we repeat.",
  },
  {
    sum: sumFor(1),
    line: 2,
    lineForList: 2,
    particle: 0,
    message:
      "The third line's value is more than the running sum, so we move on to the next particle.",
  },
  {
    sum: sumFor(2),
    line: 2,
    lineForList: 2,
    particle: 1,
    message: "Update our running sum for the second particle.",
  },
  {
    sum: sumFor(2),
    line: 2,
    lineForList: 3,
    particle: 1,
    message:
      "Now the third line's value is less than the running sum, so we copy the current particle to our new list and move on to the next line.",
  },
  {
    sum: sumFor(2),
    line: 3,
    lineForList: 3,
    particle: 1,
    message:
      "The fourth line's value is more than the running sum, so we move on to the next particle.",
  },
  {
    sum: sumFor(3),
    line: 3,
    lineForList: 3,
    particle: 2,
    message: "Update our running sum for the third particle.",
  },
  {
    sum: sumFor(3),
    line: 3,
    lineForList: 4,
    particle: 2,
    message:
      "Now the fourth line's value is less than the running sum, so we copy the current particle to our new list and move on to the next line.",
  },
  {
    sum: sumFor(3),
    line: 4,
    lineForList: 4,
    particle: 2,
    message:
      "The fifth line's value is more than the running sum, so we move on to the next particle.",
  },
  {
    sum: sumFor(3),
    line: 4,
    lineForList: 4,
    particle: 3,
    message: "Update our running sum for the fourth particle.",
  },
  {
    sum: sumFor(4),
    line: 4,
    lineForList: 5,
    particle: 3,
    message:
      "Now the fifth line's value is less than the running sum, so we copy the current particle to our new list and move on to the next line.",
  },
  {
    sum: sumFor(4),
    line: 5,
    lineForList: 5,
    particle: 3,
    message:
      "The sixth line's value is more than the running sum, so we move on to the next particle.",
  },
  {
    sum: sumFor(4),
    line: 5,
    lineForList: 5,
    particle: 4,
    message: "Update our running sum for the fifth particle.",
  },
  {
    sum: sumFor(5),
    line: 5,
    lineForList: 6,
    particle: 4,
    message:
      "Now the sixth line's value is less than the running sum, so we copy the current particle to our new list and move on to the next line.",
  },
  {
    sum: sumFor(5),
    line: 6,
    lineForList: 6,
    particle: 4,
    message:
      "The seventh line's value is more than the running sum, so we move on to the next particle.",
  },
  {
    sum: sumFor(6),
    line: 6,
    lineForList: 6,
    particle: 5,
    message: "Update our running sum for the sixth particle.",
  },
  {
    sum: sumFor(6),
    line: 6,
    lineForList: 7,
    particle: 5,
    message:
      "Now the seventh line's value is less than the running sum, so we copy the current particle to our new list and move on to the next line.",
  },
  {
    sum: sumFor(7),
    line: null,
    lineForList: 7,
    particle: null,
    message:
      "But wait, there is no next line! Voila - we've now successfully associated each line to its respective particle, and thus determined our list of new particles.",
  },
];
export function StepThrough() {
  const [step, setStep] = useState(0);
  const state = steps[step];
  return (
    <div className="flex flex-col">
      <div className="flex">
        <div className="flex flex-col w-full">
          <div className="relative mb-8">
            {lines.map((l, i) => (
              <div
                key={l}
                className="absolute -translate-x-1/2 transition-all flex flex-col text-center -translate-y-6"
                style={{ left: `${100 * (l + offset)}%` }}
              >
                <span className="text-foreground/50">{`${(100 * (l + offset)).toFixed()}%`}</span>
                <span
                  className={`${i === state.line ? "bg-foreground/20 px-2 py-0 rounded-full" : ""}`}
                >
                  ↓
                </span>
              </div>
            ))}
          </div>
          <div className="flex gap-1">
            {data.map((d, i) => (
              <div
                className="flex gap-1 flex-col text-center text-sm"
                key={d.color}
                style={{ width: `${(100 * d.value) / sum}%` }}
              >
                <div
                  className={`h-7 border-5 transition-all ${i === state.particle ? `opacity-100 ring-[2.5px]` : `opacity-75`} rounded-lg text-center pt-0.5 ${d.color}`}
                ></div>
                {`${((100 * d.value) / sum).toFixed()}%`}
              </div>
            ))}
          </div>
        </div>
        <p className="font-mono text-lg w-40 pl-5 my-auto transition-all">
          sum = {state.sum.toFixed()}%
        </p>
      </div>
      <p className="text-lg text-foreground/70 mx-auto flex w-full">
        <Button
          variant="outline"
          disabled={step == 0}
          onClick={() => setStep(step - 1)}
        >
          <ArrowLeft />
        </Button>
        <span className="my-auto mx-auto font-bold text-center">
          {state.message}
        </span>
        <Button
          variant="outline"
          disabled={step == steps.length - 1}
          onClick={() => setStep(step + 1)}
        >
          <ArrowRight />
        </Button>
      </p>
      <div className="transition-all mx-auto flex gap-2">
        <span className="my-auto">new particle list:</span>
        {state.lineForList
          ? lines
              .slice(0, state.lineForList)
              .map((l) => (
                <div
                  key={l}
                  className={`${colorFor(l)} w-4 h-4 rounded-full my-auto opacity-90 transition-all`}
                ></div>
              ))
          : "[empty]"}
      </div>
    </div>
  );
}
