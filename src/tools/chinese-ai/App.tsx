import React, { useEffect, useRef, useState } from "react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import * as z from "zod";
import { convertToModelMessages, streamObject } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
const SYSTEM_PROMPT = `You are asked to describe sentences given some data. For each sentence (i.e., ending with a period, exclamation mark, or question mark), make it a JSON object. Return an object with a "sentences" key which corresponds to a list of those sentence objects. In each sentence object, include the definition and a list of characters (referred to as words). Each word should contain the character and pinyin. (Character should ALWAYS be just one character.) If the word is punctuation, put the punctuation mark in the character field and leave the pinyin field empty. Pinyin should also be lowercase. There should generally be only one question/exclamation mark or period per sentence -- one line does not necessarily equal on sentence.

If only words are provided in data, not full sentences, generate example sentences using these words. This is for Chinese beginners so try to only use words from common Chinese (i.e., from Integrated Chinese Part 1 Level 1) for the example sentences. Specific instructions may also be provided for the example sentences, which you should honor.`;

// Zod schema that mirrors the required output
const SentenceSchema = z.object({
  sentences: z.array(
    z.object({
      def: z.string(),
      words: z.array(
        z.object({
          character: z.string(),
          pinyin: z.string(),
        }),
      ),
    }),
  ),
});

export type SentenceOutput = z.infer<typeof SentenceSchema>;

export function App() {
  const [text, setText] = useState<string>("");
  const [files, setFiles] = useState<
    Array<{ name: string; type: string; contents: string }>
  >([]);
  const [streamingResult, setStreamingResult] = useState<SentenceOutput | null>(
    null,
  );
  const [isStreaming, setIsStreaming] = useState(false);
  const [geminiKey, setGeminiKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("gemini_api_key");
    if (saved) setGeminiKey(saved);
  }, []);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      setFiles([
        { name: f.name, type: f.type, contents: String(reader.result ?? "") },
      ]);
    };
    reader.readAsText(f);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      setFiles([
        { name: f.name, type: f.type, contents: String(reader.result ?? "") },
      ]);
    };
    // If image, read as data URL; otherwise read as text
    if (f.type.startsWith("image/")) reader.readAsDataURL(f);
    else reader.readAsText(f);
  }

  function handlePaste(e: React.ClipboardEvent<HTMLDivElement>) {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith("image/")) {
        const blob = item.getAsFile();
        if (!blob) continue;
        const reader = new FileReader();
        reader.onload = () => {
          setFiles([
            {
              name: blob.name || "pasted-image",
              type: blob.type,
              contents: String(reader.result ?? ""),
            },
          ]);
        };
        reader.readAsDataURL(blob);
        e.preventDefault();
        return;
      }
      if (item.type === "text/plain") {
        item.getAsString((s) => setText((prev) => prev + s));
      }
    }
  }

  async function handleSubmit() {
    setStreamingResult(null);
    setError(null);
    setIsStreaming(true);
    try {
      const google = createGoogleGenerativeAI({
        apiKey: geminiKey ?? undefined,
      });
      const stream = streamObject({
        model: google("gemini-2.5-flash"),
        system: SYSTEM_PROMPT,
        prompt: [
          {
            role: "user" as const,
            content: [
              ...files.map((f) => ({
                type: "file" as const,
                mediaType: f.type,
                filename: f.name,
                data: f.contents,
              })),
              {
                type: "text" as const,
                text,
              },
            ],
          },
        ],
        schema: SentenceSchema,
      });
      for await (const partial of stream.partialObjectStream) {
        console.log(partial);
        if (SentenceSchema.safeParse(partial).success) {
          setStreamingResult(partial as SentenceOutput);
        }
      }
    } catch {
    } finally {
      setIsStreaming(false);
    }
  }

  function parseLocally(
    input: string,
    filesList: typeof files,
  ): SentenceOutput {
    const raw = (input || "").trim();
    if (!raw && filesList.length) {
      // If only a file (like image) was provided, return a placeholder
      return {
        sentences: [
          {
            def: "(file input)",
            words: [{ character: "📄", pinyin: "" }],
          },
        ],
      };
    }
    // Split sentences by punctuation . ? ! (keep punctuation as its own token)
    const parts: Array<string> = raw
      .split(/(?<=[。．.!？?])/)
      .map((s) => s.trim())
      .filter(Boolean);

    const sentences = parts.map((s) => {
      const words = Array.from(s).map((ch) => {
        if (/[。．.!？?]/.test(ch)) return { character: ch, pinyin: "" };
        return { character: ch, pinyin: "" };
      });
      return { def: s, words };
    });

    return { sentences };
  }

  function saveKey() {
    if (geminiKey) localStorage.setItem("gemini_api_key", geminiKey);
  }

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="flex items-start gap-6">
        <div className="w-1/2">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Input</h2>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Gemini API key (optional)"
                value={geminiKey ?? ""}
                onChange={(e) => setGeminiKey(e.target.value)}
                onBlur={saveKey}
                className="w-64"
              />
            </div>
          </div>

          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onPaste={handlePaste}
            className="h-64 w-full rounded border p-2"
          >
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type or paste Chinese text here, or drop a file / paste an image"
              className="h-full resize-none"
            />
          </div>

          <div className="mt-3">
            <input ref={fileRef} type="file" onChange={handleFile} />
          </div>

          {files.length > 0 && (
            <div className="mt-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-medium text-sm">Files</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFiles([])}
                >
                  Clear Files
                </Button>
              </div>
              <ul className="space-y-2">
                {files.map((f, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-3 border rounded p-2 bg-muted"
                  >
                    <span className="text-xs font-mono">{f.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {f.type}
                    </span>
                    {f.type.startsWith("image/") ? (
                      <img
                        src={f.contents}
                        alt={f.name}
                        className="h-8 w-8 object-contain rounded border"
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                        {f.contents.slice(0, 40)}
                        {f.contents.length > 40 ? "…" : ""}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-4">
            <Button onClick={handleSubmit} disabled={isStreaming}>
              {isStreaming ? "Parsing…" : "Parse"}
            </Button>
            {error ? (
              <div className="mt-2 text-sm text-red-600">{error}</div>
            ) : null}
          </div>
        </div>

        <div className="w-px bg-border" />

        <div className="w-1/2">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Output</h2>
            <div>
              <Button
                variant="outline"
                onClick={() => {
                  if (!streamingResult) return;
                  navigator.clipboard.writeText(
                    JSON.stringify(streamingResult, null, 2),
                  );
                }}
              >
                Copy JSON
              </Button>
            </div>
          </div>

          <div className="h-96 overflow-auto rounded border p-3">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  <th className="border-b p-2 text-left">Definition</th>
                  <th className="border-b p-2 text-left">
                    Words (Character / Pinyin)
                  </th>
                </tr>
              </thead>
              <tbody>
                {streamingResult ? (
                  streamingResult.sentences.map((sentence, i) => (
                    <tr key={i}>
                      <td className="border-b p-2 align-top w-1/2">
                        {sentence.def}
                      </td>
                      <td className="border-b p-2 align-top">
                        <div className="flex flex-wrap gap-2">
                          {sentence.words.map((word, j) => (
                            <span
                              key={j}
                              className="inline-block px-2 py-1 rounded bg-muted"
                              title={word.pinyin}
                            >
                              <span className="font-bold">
                                {word.character}
                              </span>
                              {word.pinyin && (
                                <span className="ml-1 text-xs text-muted-foreground">
                                  ({word.pinyin})
                                </span>
                              )}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : isStreaming ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i}>
                      <td className="border-b p-2">
                        <div className="h-4 w-3/4 bg-gray-200 animate-pulse rounded" />
                      </td>
                      <td className="border-b p-2">
                        <div className="flex gap-2">
                          {Array.from({ length: 5 }).map((_, j) => (
                            <div
                              key={j}
                              className="h-4 w-8 bg-gray-200 animate-pulse rounded"
                            />
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={2}
                      className="text-muted-foreground text-center p-4"
                    >
                      No result yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
