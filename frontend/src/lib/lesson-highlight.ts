import type { HighlighterCore } from "@shikijs/core";

/**
 * Languages offered in the lesson code-block inserter (see tinymce-lesson-config).
 * Each is loaded as its own lazy chunk so the highlighter stays small.
 */
const LANGS = [
  "python",
  "javascript",
  "typescript",
  "go",
  "rust",
  "java",
  "cpp",
  "sql",
  "bash",
  "json",
  "html",
  "css"
] as const;

const THEMES = { light: "github-light", dark: "github-dark-default" } as const;

const LANG_ALIASES: Record<string, string> = {
  markup: "html",
  js: "javascript",
  ts: "typescript",
  sh: "bash",
  shell: "bash",
  "c++": "cpp"
};

let highlighterPromise: Promise<HighlighterCore> | null = null;

function getHighlighter(): Promise<HighlighterCore> {
  if (!highlighterPromise) {
    highlighterPromise = (async () => {
      const [
        { createHighlighterCore },
        { createJavaScriptRegexEngine },
        light,
        dark,
        python,
        javascript,
        typescript,
        go,
        rust,
        java,
        cpp,
        sql,
        bash,
        json,
        html,
        css
      ] = await Promise.all([
        import("@shikijs/core"),
        import("@shikijs/engine-javascript"),
        import("@shikijs/themes/github-light"),
        import("@shikijs/themes/github-dark-default"),
        import("@shikijs/langs/python"),
        import("@shikijs/langs/javascript"),
        import("@shikijs/langs/typescript"),
        import("@shikijs/langs/go"),
        import("@shikijs/langs/rust"),
        import("@shikijs/langs/java"),
        import("@shikijs/langs/cpp"),
        import("@shikijs/langs/sql"),
        import("@shikijs/langs/bash"),
        import("@shikijs/langs/json"),
        import("@shikijs/langs/html"),
        import("@shikijs/langs/css")
      ]);

      return createHighlighterCore({
        themes: [light.default, dark.default],
        langs: [python, javascript, typescript, go, rust, java, cpp, sql, bash, json, html, css].map(
          (module) => module.default
        ),
        engine: createJavaScriptRegexEngine({ forgiving: true })
      });
    })();
  }
  return highlighterPromise;
}

const CLASS_LANG = /(?:^|\s)language-([\w+-]+)/;

function resolveLang(rawClass: string): string {
  const match = rawClass.match(CLASS_LANG);
  const raw = (match?.[1] ?? "").toLowerCase();
  const mapped = LANG_ALIASES[raw] ?? raw;
  return (LANGS as readonly string[]).includes(mapped) ? mapped : "text";
}

/**
 * Re-render `<pre>` code blocks in lesson HTML with Shiki syntax highlighting.
 * Returns the original HTML unchanged when there is no code, so the caller can
 * render immediately and swap in the highlighted version once ready.
 */
export async function highlightLessonHtml(html: string): Promise<string> {
  if (typeof window === "undefined" || !html.includes("<pre")) {
    return html;
  }

  const doc = new DOMParser().parseFromString(html, "text/html");
  const blocks = Array.from(doc.querySelectorAll("pre"));
  if (blocks.length === 0) {
    return html;
  }

  const highlighter = await getHighlighter();

  for (const pre of blocks) {
    const code = pre.querySelector("code");
    const langClass = `${pre.getAttribute("class") ?? ""} ${code?.getAttribute("class") ?? ""}`;
    const lang = resolveLang(langClass);
    const text = (code ?? pre).textContent ?? "";

    try {
      const out = highlighter.codeToHtml(text, {
        lang,
        themes: THEMES,
        defaultColor: false
      });
      const template = doc.createElement("template");
      template.innerHTML = out.trim();
      const replacement = template.content.firstChild;
      if (replacement) {
        pre.replaceWith(replacement);
      }
    } catch {
      // Unsupported language or grammar error: keep the original block.
    }
  }

  return doc.body.innerHTML;
}
