/**
 * Specimen text for the Typography page and `/fonts`: one coherent sample in each language, taken
 * from the "Build a Claude Code docs expert" session the product screenshots use. Both languages
 * render regardless of the chrome language — CJK legibility is judged in every theme.
 *
 * The package's fixtures (W0e) carry the canonical specimens; they are read through a glob so the
 * gallery also builds before the fixtures land, and the built-in pair below is the fallback.
 */
export interface Specimen {
  heading: string;
  paragraph: string;
  short: string;
  code: string;
}

const BUILT_IN: Readonly<Record<"en" | "zh", Specimen>> = {
  en: {
    heading: "Build a Claude Code docs expert",
    paragraph:
      "The Agent cloned the docs, indexed 412 Markdown files with BM25 and answered with clickable citations. Tokens in 18,240 · out 2,310 · 1.9 s.",
    short: "Workspace ready — 3 tool calls, 0 errors",
    code: "const hits = bm25(query, corpus).slice(0, 5);",
  },
  zh: {
    heading: "构建 Claude Code 文档专家",
    paragraph:
      "Agent 克隆了文档仓库，用 BM25 为 412 个 Markdown 文件建立索引，并以可点击的引用作答。输入 Token 18,240 · 输出 2,310 · 耗时 1.9 秒。",
    short: "Workspace 已就绪——3 次工具调用，0 个错误",
    code: "const hits = bm25(query, corpus).slice(0, 5); // 取前五条",
  },
};

interface FixtureSpecimens {
  heading: string;
  paragraph: string;
  ui: string;
  code: string;
}

const fixtureModules = import.meta.glob<{
  FIXTURES?: Readonly<Record<"en" | "zh", { specimens?: FixtureSpecimens }>>;
}>("../../../ui/src/fixtures/index.ts", { eager: true });

function fromFixtures(lang: "en" | "zh"): Specimen {
  const specimens = Object.values(fixtureModules)[0]?.FIXTURES?.[lang]?.specimens;
  if (!specimens) return BUILT_IN[lang];
  return {
    heading: specimens.heading,
    paragraph: specimens.paragraph,
    short: specimens.ui,
    code: specimens.code,
  };
}

export const SPECIMENS: Readonly<Record<"en" | "zh", Specimen>> = {
  en: fromFixtures("en"),
  zh: fromFixtures("zh"),
};
