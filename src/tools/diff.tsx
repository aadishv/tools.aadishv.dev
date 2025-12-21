import { useState } from "react";
import { calcSlices } from "fast-myers-diff";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

function App() {
  const [originalText, setOriginalText] = useState("");
  const [currentText, setCurrentText] = useState("");
  const [isFrozen, setIsFrozen] = useState(false);
  const [diffMode, setDiffMode] = useState<"character" | "line">("character");

  const freezeText = () => {
    setOriginalText(currentText);
    setIsFrozen(true);
  };

  const unfreeze = () => {
    setIsFrozen(false);
    setOriginalText("");
  };

  // Split the text based on diffMode
  const splitText = (text: string) => {
    if (diffMode === "character") {
      return text.split("");
    }
    return text.split("\n");
  };

  const computeDiff = () => {
    if (!isFrozen || originalText === currentText) {
      return [{ type: 0, text: currentText }];
    }

    const originalSegments = splitText(originalText);
    const currentSegments = splitText(currentText);

    const slices = Array.from(
      calcSlices(originalSegments, currentSegments),
    ).map(([type, slice]) => ({
      type,
      text: diffMode === "character" ? slice.join("") : slice.join("\n"),
    }));

    return slices;
  };

  const renderDiff = () => {
    const diffResults = computeDiff();

    if (!isFrozen) {
      return (
        <div className="font-mono text-sm whitespace-pre-wrap p-4 border rounded-md">
          {currentText}
        </div>
      );
    }

    return (
      <div className="font-mono text-sm whitespace-pre-wrap p-4 border rounded-md">
        {diffResults.map((segment, index) => {
          let className = "";
          if (segment.type === -1) {
            className = "bg-red-100 line-through text-red-700";
          } else if (segment.type === 1) {
            className = "bg-green-100 text-green-700";
          }
          return (
            <span key={index} className={className}>
              {segment.text}
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <div className="container mx-auto p-6 max-w-3xl">
      <h1 className="text-3xl font-bold mb-6 text-center">Live Diff Tool</h1>

      <div className="mb-4 flex justify-between items-center">
        <div className="space-x-2">
          <Button
            variant={isFrozen ? "outline" : "default"}
            onClick={isFrozen ? unfreeze : freezeText}
          >
            {isFrozen ? "Unfreeze" : "Freeze Text"}
          </Button>
        </div>

        <Tabs
          value={diffMode}
          onValueChange={(value) => setDiffMode(value as "character" | "line")}
          className="w-auto"
        >
          <TabsList>
            <TabsTrigger value="character">Character Diff</TabsTrigger>
            <TabsTrigger value="line">Line Diff</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="space-y-4">
        <Textarea
          value={currentText}
          onChange={(e) => setCurrentText(e.target.value)}
          placeholder="Type some text here and then click 'Freeze Text' to start diffing..."
          className="min-h-[200px] font-mono"
        />

        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-2">
            {isFrozen ? "Diff Result" : "Preview"}
          </h2>
          {renderDiff()}
        </div>

        {isFrozen && (
          <div className="mt-4 text-sm text-gray-500">
            <div className="flex items-center space-x-2">
              <span className="inline-block w-4 h-4 bg-red-100 border border-red-700"></span>
              <span>Removed from original</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="inline-block w-4 h-4 bg-green-100 border border-green-700"></span>
              <span>Added in current text</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
