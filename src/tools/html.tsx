import React, { useState, useEffect } from 'react';

const MARKED_URL = 'https://cdn.jsdelivr.net/npm/marked/marked.min.js';

const App = () => {
  const [markdown, setMarkdown] = useState('# Welcome\n\nPaste your markdown here to see it rendered with **Shiki** syntax highlighting.\n\n```javascript\nfunction greet(name) {\n  console.log(`Hello, ${name}!`);\n}\n\ngreet("World");\n```');
  const [html, setHtml] = useState('');
  const [highlighter, setHighlighter] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        if (!window.marked) {
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = MARKED_URL;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
          });
        }

        const shiki = await import('https://esm.sh/shiki@1.0.0');
        const hl = await shiki.getHighlighter({
          themes: ['github-light'],
          langs: ['javascript', 'typescript', 'python', 'html', 'css', 'json', 'markdown', 'shell', 'rust', 'go']
        });
        
        setHighlighter(hl);
        setIsLoading(false);
      } catch (err) {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    const renderMarkdown = async () => {
      if (!window.marked) return;

      const renderer = new window.marked.Renderer();
      
      // Fixed: marked v12+ passes an object to the code renderer
      renderer.code = (args) => {
        const code = typeof args === 'string' ? args : args.text;
        const lang = typeof args === 'string' ? '' : args.lang;

        if (highlighter) {
          try {
            const validLang = highlighter.getLoadedLanguages().includes(lang) ? lang : 'text';
            const highlighted = highlighter.codeToHtml(code, { lang: validLang, theme: 'github-light' });
            return `<div class="shiki-container my-6 rounded-xl border border-gray-200 bg-white overflow-hidden font-mono text-sm">${highlighted}</div>`;
          } catch (e) {
            return `<pre class="p-4 bg-white border border-gray-200 rounded-xl my-6 overflow-auto"><code>${code}</code></pre>`;
          }
        }
        return `<pre class="p-4 bg-white border border-gray-200 rounded-xl my-6 overflow-auto"><code>${code}</code></pre>`;
      };

      const rawHtml = window.marked.parse(markdown, { renderer });
      setHtml(rawHtml);
    };

    renderMarkdown();
  }, [markdown, highlighter]);

  const handlePaste = (e) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text');
    setMarkdown(text);
  };

  return (
    <div 
      className="min-h-screen bg-white text-gray-900 selection:bg-blue-100 outline-none"
      onPaste={handlePaste}
      tabIndex="0"
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Geist+Mono:wght@100..900&display=swap');

        body {
          font-family: 'DM Sans', sans-serif;
          background-color: white;
        }

        .markdown-content h1, 
        .markdown-content h2, 
        .markdown-content h3, 
        .markdown-content h4, 
        .markdown-content h5, 
        .markdown-content h6 {
          font-family: 'Georgia', serif;
          color: #111;
          margin-top: 2.5rem;
          margin-bottom: 1.25rem;
          font-weight: 400;
          line-height: 1.2;
        }

        .markdown-content h1 { font-size: 3rem; margin-top: 0; }
        .markdown-content h2 { font-size: 2.25rem; border-bottom: 1px solid #f3f4f6; padding-bottom: 0.5rem; }
        .markdown-content h3 { font-size: 1.75rem; }

        .markdown-content p {
          line-height: 1.8;
          margin-bottom: 1.5rem;
          color: #374151;
          font-size: 1.1rem;
        }

        .markdown-content blockquote {
          border-left: 3px solid #111;
          padding-left: 2rem;
          font-style: italic;
          color: #4b5563;
          margin: 2.5rem 0;
        }

        .markdown-content ul, .markdown-content ol {
          margin-bottom: 1.5rem;
          padding-left: 1.5rem;
        }

        .markdown-content li { margin-bottom: 0.75rem; line-height: 1.8; color: #374151; }

        .shiki-container pre {
          padding: 1.5rem !important;
          margin: 0 !important;
          background-color: white !important;
          overflow-x: auto;
        }

        .shiki-container code {
          font-family: 'Geist Mono', monospace !important;
          font-size: 0.95rem;
          line-height: 1.7;
        }

        .markdown-content code:not(pre code) {
          font-family: 'Geist Mono', monospace;
          background: #f3f4f6;
          padding: 0.2rem 0.4rem;
          border-radius: 0.25rem;
          font-size: 0.9em;
          color: #111;
        }

        .markdown-content a {
          color: #111;
          text-decoration: underline;
          text-underline-offset: 4px;
          text-decoration-thickness: 1px;
          transition: opacity 0.2s;
        }

        .markdown-content a:hover { opacity: 0.7; }

        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <main className="max-w-3xl mx-auto px-6 py-20 lg:py-32">
        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-gray-400 font-serif italic text-xl">
            Typesetting...
          </div>
        ) : (
          <article 
            className="markdown-content"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )}
      </main>
    </div>
  );
};

export default App;
