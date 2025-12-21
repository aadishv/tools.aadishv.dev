import { useState } from "react";

const SIZE = 16;

function Square() {
  const [count, setCount] = useState(0);
  return (
    <div
      className="w-10 h-10 m-[1px] rounded-lg bg-gray-200 text-center py-2"
      onContextMenu={(e) => {
        e.preventDefault();
        setCount((c) => c - 1);
      }}
      onClick={() => setCount((c) => c + 1)}
    >
      {count}
    </div>
  );
}

export default function App() {
  return (
    <div className="flex flex-col m-auto">
      {/* X-axis labels */}
      <div className="flex flex-row">
        <div className="w-6" /> {/* Spacer for Y-axis label column */}
        {Array.from({ length: SIZE }).map((_, colIdx) => (
          <div
            key={`x-label-${colIdx}`}
            className="w-[calc(2.5rem+2px)] h-6 flex items-center justify-center text-xs text-gray-700"
          >
            {colIdx}
          </div>
        ))}
      </div>
      {/* Grid with Y-axis labels */}
      {Array.from({ length: SIZE }).map((_, rowIdx) => (
        <div className="flex flex-row" key={rowIdx}>
          {/* Y-axis label */}
          <div className="w-6 h-10 flex items-center justify-center text-xs text-gray-700">
            {rowIdx}
          </div>
          {Array.from({ length: SIZE }).map((_, colIdx) => (
            <Square key={colIdx + rowIdx * SIZE} />
          ))}
        </div>
      ))}
    </div>
  );
}
