import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const sourceRoot = "/Users/ngmt.mtk/qa300-book-2026";
const chaptersRoot = path.join(sourceRoot, "chapters_v2");
const outputPath = path.join(projectRoot, "data", "questions.js");
const assetOutputDir = path.join(projectRoot, "assets", "source");

const chapters = [
  { id: 1, title: "構えと姿勢" },
  { id: 2, title: "右手①ボーイング基礎" },
  { id: 3, title: "右手②音色・鳴らし方" },
  { id: 4, title: "左手①音程・指使い" },
  { id: 5, title: "左手②ポジション移動・シフト" },
  { id: 6, title: "左手③ビブラート" },
  { id: 7, title: "速いパッセージ・跳躍・脱力" },
  { id: 8, title: "高度な弓技" },
  { id: 9, title: "読譜・リズム・暗譜" },
  { id: 10, title: "表現・音楽性" },
  { id: 11, title: "練習法・停滞・モチベーション" },
  { id: 12, title: "本番・あがり・人前で弾く" },
  { id: 13, title: "痛み・故障・身体の悩み" },
  { id: 14, title: "教室・学び方・練習環境" },
  { id: 15, title: "アンサンブル・ジャンルを広げる" },
  { id: 16, title: "楽器・弓・機材・調弦・環境" },
];

function readQuestions() {
  const dirs = readdirSync(chaptersRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^ch\d+$/u.test(entry.name))
    .map((entry) => path.join(chaptersRoot, entry.name))
    .sort();

  const questions = [];
  for (const dir of dirs) {
    const files = readdirSync(dir)
      .filter((name) => /^q\d+\.json$/u.test(name))
      .sort();

    for (const file of files) {
      const fullPath = path.join(dir, file);
      const raw = JSON.parse(readFileSync(fullPath, "utf8"));
      const assetPath = copyQuestionAsset(raw.score_asset);
      questions.push({
        id: raw.id,
        chapter: raw.chapter,
        chapter_title: chapters.find((chapter) => chapter.id === raw.chapter)?.title || "",
        title: raw.title,
        persona: raw.persona,
        question: raw.question,
        discussion: raw.discussion,
        prescription: raw.prescription,
        score_asset: raw.score_asset,
        score_caption: raw.score_caption,
        assetPath,
        sources: raw.sources,
        tier: raw.tier,
      });
    }
  }

  return questions.sort((a, b) => a.id.localeCompare(b.id, "ja"));
}

function copyQuestionAsset(assetName) {
  if (!assetName) return null;

  const candidates = assetName.includes("/")
    ? [path.join(sourceRoot, "assets", assetName)]
    : [
        path.join(sourceRoot, "assets", "scores", assetName),
        path.join(sourceRoot, "assets", "figures", assetName),
      ];

  const source = candidates.find((candidate) => existsSync(candidate));
  if (!source) return null;

  mkdirSync(assetOutputDir, { recursive: true });
  const safeName = assetName.replace(/[\\/]/gu, "__");
  const destination = path.join(assetOutputDir, safeName);
  copyFileSync(source, destination);
  return `assets/source/${safeName}`;
}

const questions = readQuestions();
const payload = {
  source: {
    path: "qa300-book-2026/chapters_v2",
    generated_at: new Date().toISOString(),
    count: questions.length,
  },
  chapters,
  questions,
};

mkdirSync(path.dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `window.VIOLIN_QA_DATA = ${JSON.stringify(payload, null, 2)};\n`, "utf8");
console.log(`Wrote ${questions.length} questions to ${outputPath}`);
