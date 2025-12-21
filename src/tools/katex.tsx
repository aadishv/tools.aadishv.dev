import React, { useEffect, useRef, useState } from "react";

// KaTeX and auto-render are loaded via CDN in index.html or can be loaded dynamically if needed
// For this tool, we assume KaTeX and renderMathInElement are available globally

declare global {
  interface Window {
    katex: any;
    renderMathInElement: (
      el: HTMLElement,
      opts?: {
        delimiters?: { left: string; right: string; display: boolean }[];
        errorCallback?: (msg: string, err: any) => void;
      },
    ) => void;
  }
}

const CACHE_KEY = "KaTeXInput";

type KatexError = {
  msg: string;
  err: any;
};

function modifyMessage(msg: string, e: any) {
  // \u0332 is used for emphasis, but not ideal for fonts
  return `${msg} + ${e}`;
}

export function App() {
  const [input, setInput] = useState<string>("");
  const [errors, setErrors] = useState<KatexError[]>([]);
  const outputRef = useRef<HTMLDivElement>(null);

  // Load from cache on mount
  useEffect(() => {
    const cache = localStorage.getItem(CACHE_KEY);
    if (cache !== null) setInput(cache);
  }, []);

  // Store to cache on input change
  useEffect(() => {
    localStorage.setItem(CACHE_KEY, input);
  }, [input]);

  // Render KaTeX output on input change
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !window.renderMathInElement ||
      !outputRef.current
    )
      return;

    const parseErrors: KatexError[] = [];
    outputRef.current.innerHTML = input;
    window.renderMathInElement(outputRef.current, {
      delimiters: [
        { left: "$$", right: "$$", display: true },
        { left: "$", right: "$", display: false },
        { left: "\\(", right: "\\)", display: false },
        { left: "\\[", right: "\\]", display: true },
      ],
      errorCallback: (msg, e) => {
        parseErrors.push({ msg, err: e });
      },
    });
    setErrors(parseErrors);
  }, [input]);

  // Draggable split state (left pane width in px)
  const DEFAULT_LEFT = 400;
  const MIN_LEFT = 120;
  const MAX_LEFT = 900;
  const [leftPx, setLeftPx] = useState<number>(DEFAULT_LEFT);
  const dragging = useRef(false);

  // Drag handlers
  function onMouseDown(_: React.MouseEvent) {
    dragging.current = true;
    document.body.style.cursor = "col-resize";
  }
  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!dragging.current) return;
      const container = document.getElementById("katex-split-container");
      if (!container) return;
      const rect = container.getBoundingClientRect();
      let x = e.clientX - rect.left;
      let px = Math.max(MIN_LEFT, Math.min(MAX_LEFT, x));
      setLeftPx(px);
    }
    function onUp() {
      dragging.current = false;
      document.body.style.cursor = "";
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  return (
    <div
      id="katex-split-container"
      className="w-full h-[70vh] flex flex-row bg-background overflow-hidden"
      style={{ minHeight: 320 }}
    >
      <div
        className="h-full min-w-[80px] max-w-[90vw] overflow-auto flex flex-col"
        style={{ width: leftPx }}
      >
        <textarea
          id="katex-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          autoFocus
          spellCheck={false}
          placeholder="Type text with $LaTeX$ math here..."
          className="w-full h-full resize-none outline-none bg-transparent text-base p-4"
          style={{ minHeight: 0, minWidth: 0, height: "100%" }}
        />
      </div>
      {/* Splitter */}
      <div
        role="separator"
        aria-orientation="vertical"
        tabIndex={0}
        className="w-1 cursor-col-resize bg-muted transition-colors"
        style={{ zIndex: 10 }}
        onMouseDown={onMouseDown}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft")
            setLeftPx((w) => Math.max(MIN_LEFT, w - 16));
          if (e.key === "ArrowRight")
            setLeftPx((w) => Math.min(MAX_LEFT, w + 16));
        }}
        aria-label="Resize input/output panels"
      />
      <div
        className="h-full min-w-[80px] max-w-[90vw] overflow-auto flex flex-col"
        style={{ flex: 1 }}
      >
        <div
          id="katex-output"
          ref={outputRef}
          className="w-full h-full text-base p-4"
          tabIndex={0}
          aria-label="KaTeX output"
          style={{
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            minHeight: 0,
            height: "100%",
          }}
        />
        {errors.length > 0 && (
          <div className="space-y-2 mt-2" aria-live="polite">
            {errors.map((err, i) => (
              <div
                key={i}
                className="font-mono text-destructive bg-transparent text-sm"
              >
                <span>
                  <strong>KaTeX parse error:</strong>{" "}
                  {modifyMessage(err.msg, err.err)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
