import { useState, useEffect, useRef, useCallback, useMemo } from "react";

// Define rainbow colors outside the component for stability.
const RAINBOW_COLORS = [
  "#FF0000",
  "#FF7F00",
  "#FFFF00",
  "#00FF00",
  "#0000FF",
  "#4B0082",
  "#8B00FF",
]; // Red, Orange, Yellow, Green, Blue, Indigo, Violet

// Cache for style objects to ensure referential equality for unchanged styles.
// This is key for "fine-grained" updates, allowing React to skip DOM manipulations
// if the style object instance itself hasn't changed.
const styleCache: { [key: string]: React.CSSProperties } = {
  // Pre-populate a common default style object.
  "default-style-inherit": { color: "inherit" },
};

const getCharacterStyle = (char: string) => {
  const lowerChar = char.toLowerCase();

  if (lowerChar >= "a" && lowerChar <= "z") {
    const charCode = lowerChar.charCodeAt(0) - "a".charCodeAt(0);
    const color = RAINBOW_COLORS[charCode % RAINBOW_COLORS.length];
    const styleKey = `char-${lowerChar}-${color}`; // Unique key for this specific character and color

    if (!styleCache[styleKey]) {
      styleCache[styleKey] = { color: color };
    }
    return styleCache[styleKey];
  }

  // For all non-alphabetic characters (spaces, punctuation, newlines, etc.),
  // return the shared default style object.
  return styleCache["default-style-inherit"];
};

function App() {
  const [text, setText] = useState("");
  // Stores an array of style objects, one for each character in `text`.
  const [charStyles, setCharStyles] = useState<React.CSSProperties[]>([]);
  const editorRef = useRef<HTMLDivElement>(null);
  // Ref to track IME composition state to prevent updates during composition.
  const isComposing = useRef(false);

  /**
   * This function is called when the editor's content changes.
   * It takes the current text and returns an array of CSS style objects,
   * one for each character.
   * @param {string} currentText - The current text content of the editor.
   * @returns {Array<object>} An array of style objects.
   */
  const calculateStylesForText = useCallback((currentText: string) => {
    return currentText.split("").map((char) => getCharacterStyle(char));
  }, []); // `getCharacterStyle` is stable due to its external definition and cache.

  // Effect hook to recalculate styles whenever the `text` state changes.
  useEffect(() => {
    const newStyles = calculateStylesForText(text);
    setCharStyles(newStyles);
    // The "fine-grained manner" of applying styles is achieved by React's reconciliation.
    // When `charStyles` updates, the `editorContent` is re-calculated.
    // React then diffs the new list of <span> elements with the old one.
    // Because `getCharacterStyle` returns memoized (cached) style objects,
    // if a character's style hasn't actually changed (i.e., it receives the same
    // style object instance), React can optimize DOM updates for that specific span's style.
  }, [text, calculateStylesForText]);

  // Handles the input event from the contentEditable div.
  const handleInput = (event: React.FormEvent<HTMLDivElement>) => {
    // If currently in IME composition (e.g., typing Chinese, Japanese, Korean),
    // don't update the text state until composition is complete.
    if (isComposing.current) {
      return;
    }
    // Use `textContent` to get the raw text, stripping any previous HTML (like our spans).
    const newText = event.currentTarget.textContent || "";
    setText(newText);

    // Prevent the default contentEditable behavior by clearing the content
    // Our styled spans will be the only content shown
    event.currentTarget.innerHTML = "";
  };

  // Handler for IME composition start.
  const handleCompositionStart = () => {
    isComposing.current = true;
  };

  // Handler for IME composition end.
  const handleCompositionEnd = (
    event: React.CompositionEvent<HTMLDivElement>,
  ) => {
    isComposing.current = false;
    // Update text state with the composed text.
    const newText = event.currentTarget.textContent || "";
    setText(newText);

    // Prevent the default contentEditable behavior by clearing the content
    // Our styled spans will be the only content shown
    event.currentTarget.innerHTML = "";
  };

  // Memoized generation of the editor's content (styled spans).
  // This ensures the expensive mapping only happens if `text` or `charStyles` change.
  const editorContent = useMemo(() => {
    return text.split("").map((char, index) => {
      // Fallback to a fresh style calculation if `charStyles` is somehow out of sync.
      const style = charStyles[index] || getCharacterStyle(char);
      return (
        <span key={index} style={style}>
          {char}
        </span>
      );
    });
  }, [text, charStyles]);

  // Effect to preserve cursor position when content updates
  useEffect(() => {
    if (!editorRef.current || isComposing.current) return;

    // Only restore cursor if we have actual content and the element is focused
    if (text.length > 0 && document.activeElement === editorRef.current) {
      requestAnimationFrame(() => {
        if (editorRef.current) {
          // Set cursor to end of content
          const range = document.createRange();
          const selection = window.getSelection();
          if (selection) {
            range.selectNodeContents(editorRef.current);
            range.collapse(false);
            selection.removeAllRanges();
            selection.addRange(range);
          }
        }
      });
    }
  }, [text]);

  return (
    <div
      ref={editorRef}
      contentEditable={true}
      suppressContentEditableWarning={true} // Required for controlled contentEditable components in React.
      onInput={handleInput}
      onCompositionStart={handleCompositionStart} // Handle IME start
      onCompositionEnd={handleCompositionEnd} // Handle IME end
      role="textbox" // ARIA role for accessibility.
      aria-multiline="true"
      aria-label="Accessible Text Editor"
      style={{
        border: "1px solid #ccc",
        padding: "10px",
        minHeight: "100px",
        fontFamily: "monospace", // Ensures characters are roughly same width.
        whiteSpace: "pre-wrap", // Preserves spaces and newlines from the text.
        outline: "none", // Optional: Removes default browser focus outline.
      }}
    >
      {editorContent}
    </div>
  );
}

export default App;
