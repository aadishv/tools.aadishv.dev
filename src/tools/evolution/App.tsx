import { useEffect, useState } from "react";
import one from "./1.png";
import two from "./2.png";
import three from "./3.png";
import four from "./4.jpeg";
import five from "./5.png";
import six from "./6.png";
import seven from "./7.png";
import { Button } from "@/components/ui/button";
const images = [
  one,
  two,
  three,
  four,
  five,
  six,
  seven
]
export default function App() {
  const [state, setState] = useState(0.0);
  const [actualState, setActualState] = useState(0.0);
  useEffect(() => {
    const interval = setInterval(() => {
      setState((prev) => prev + (actualState - prev) * 0.2);
    }, 50);
    return () => clearInterval(interval);
  }, [actualState]);

  const i = Math.floor(state);
  const v = state - i;

  const image = images[i];
  const image2 = images[i + 1];

  return <div className="p-20 ">
    <div className="min-w-1/2 max-w-[50rem] grid grid-cols-1 grid-rows-1 mx-auto">
      <img src={image.src} style={{ gridRow: 1, gridColumn: 1}} className="w-full h-full" />
      <img src={image2.src} style={{ gridRow: 1, gridColumn: 1, width: `${v * 100}%`, objectPosition: "left" }} className="object-cover h-full" />
    </div>
    <div className="flex justify-center gap-4">
      <Button onClick={ () => setActualState(s => s > 0 ? s - 1 : 0)}>Back</Button>
    <Button onClick={ () => setActualState(s => s === 6 ? 6 : s+1)}>Next</Button>
    </div>
  </div>;
}
