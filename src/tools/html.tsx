import { useEffect, useMemo, useRef, useState } from "react";
import hljs from "highlight.js";
import { marked } from "marked";

import "highlight.js/styles/github-dark-dimmed.min.css";
import "@/styles/markdown-viewer.css";

marked.setOptions({
  gfm: true,
  breaks: true,
});

const initialContent = `
# Ready to Render

This page is a **canvas**. There are no buttons, no inputs, and no distractions.

### How to use
Simply copy markdown from anywhere and **paste it right here** (Ctrl+V / Cmd+V).

The page will instantly clear and render your content.

***

*Waiting for input...*
`;

function renderMarkdown(markdown: string): string {
  try {
    const result = marked.parse(markdown);
    if (typeof result === "string") return result;
    return "<p style=\"color:red\">Error parsing markdown. Please try again.</p>";
  } catch {
    return "<p style=\"color:red\">Error parsing markdown. Please try again.</p>";
  }
}

export default function HtmlTool() {
  const [markdown, setMarkdown] = useState<string>(initialContent);
  const previewRef = useRef<HTMLDivElement | null>(null);

  const html = useMemo(() => renderMarkdown(markdown), [markdown]);

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      event.preventDefault();
      const pastedData = event.clipboardData?.getData("text") ?? "";
      if (pastedData) setMarkdown(pastedData);
    };

    document.addEventListener("paste", onPaste);
    return () => {
      document.removeEventListener("paste", onPaste);
    };
  }, []);

  useEffect(() => {
    const preview = previewRef.current;
    if (!preview) return;

    preview.querySelectorAll("pre code").forEach((block) => {
      hljs.highlightElement(block as HTMLElement);
    });
  }, [html]);

  return (
    <div className="markdown-viewer">
      <div
        ref={previewRef}
        className="markdown-body"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
