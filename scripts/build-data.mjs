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
      const question = {
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
      };
      question.app = buildAppContent(question);
      questions.push(question);
    }
  }

  return questions.sort((a, b) => a.id.localeCompare(b.id, "ja"));
}

function buildAppContent(question) {
  const discussion = question.discussion.map((turn) => ({
    speaker: turn.speaker,
    text: rewriteAnswerForApp(turn.text),
  }));
  return {
    title: rewriteTitleForApp(question.title),
    question: rewriteQuestionForApp(question.question),
    profile: summarizePersonaForApp(question.persona),
    discussion,
    prescription: question.prescription.map((item) => rewritePrescriptionForApp(item)),
    speaker_answers: buildSpeakerAnswers(discussion),
  };
}

function buildSpeakerAnswers(discussion) {
  return discussion.reduce((answers, turn) => {
    answers[turn.speaker] = answers[turn.speaker]
      ? `${answers[turn.speaker]}\n\n${turn.text}`
      : turn.text;
    return answers;
  }, {});
}

function summarizePersonaForApp(persona) {
  if (!persona) return "";

  const childMatch = persona.match(/^(.+?)[（(]([^）)]+)[）)]の(母|父|保護者)$/u);
  if (childMatch) {
    return `相談の前提: ${childMatch[2]}の子どもについて、${childMatch[3]}からの相談。`;
  }

  const namedMatch = persona.match(/^[^（(]+[（(]([^）)]+)[）)]$/u);
  const summary = (namedMatch ? namedMatch[1] : persona)
    .replace(/^[A-Z]\.?[A-Z]?\.?さん/u, "")
    .replace(/^[A-Z]\.?[A-Z]?\.?/u, "")
    .replace(/^さん/u, "")
    .replace(/\s+/gu, " ")
    .trim();

  return summary ? `相談の前提: ${summary}。` : "";
}

function rewriteTitleForApp(title) {
  const base = String(title || "")
    .replace(/骨盤前傾と反り腰を同時に指摘された/u, "骨盤が前に傾き、腰が反ると言われた");
  return applyPlainRewrites(base)
    .replace(/骨盤前傾/u, "骨盤が前に傾く")
    .replace(/反り腰/u, "腰が反る")
    .replace(/要不要論争/u, "必要かどうか")
    .replace(/謎/gu, "理由が分からない")
    .replace(/霧/gu, "何をすればいいか分からない")
    .replace(/迷子/gu, "分からなくなる")
    .replace(/頭打ち/gu, "伸び悩んでいる")
    .replace(/壁/gu, "できない状態")
    .replace(/空回り/gu, "演奏がまとまらない")
    .replace(/ふにゃふにゃ/gu, "安定しない")
    .replace(/キーキー/gu, "きつい音")
    .replace(/ガリガリ/gu, "荒い音")
    .replace(/ブツッ/gu, "途中で切れる")
    .trim();
}

function rewritePrescriptionForApp(text) {
  return applyPlainRewrites(text)
    .replace(/前傾型/gu, "骨盤が前に傾くタイプ")
    .replace(/後傾型/gu, "骨盤が後ろに倒れるタイプ")
    .replace(/\s+/gu, " ")
    .trim();
}

function rewriteQuestionForApp(questionText) {
  const base = String(questionText || "")
    .replace(/「骨盤が前傾気味」/gu, "「骨盤が前に傾いている」")
    .replace(/「反り腰で楽器を押し込んでる」/gu, "「腰が反って胸が前に出るせいで、バイオリンを体に押しつけるような構えになっている」")
    .replace(/反り腰で楽器を押し込んでる/gu, "腰が反って胸が前に出るせいで、バイオリンを体に押しつけるような構えになっている")
  return applyPlainRewrites(base)
    .replace(/突っ立っている/gu, "普通に立っている")
    .replace(/頭打ち/gu, "伸び悩み")
    .replace(/迷子/gu, "分からなくなる")
    .replace(/霧/gu, "何をすればいいか分からない状態")
    .replace(/空回り/gu, "頑張っても演奏がまとまらない状態")
    .replace(/壁/gu, "できない状態")
    .trim();
}

function rewriteAnswerForApp(text) {
  return applyPlainRewrites(text)
    .replace(/[A-Z]\.?[A-Z]?\.?さん/gu, "あなた")
    .replace(/[A-Z]\.?[A-Z]?\.?ちゃん/gu, "お子さん")
    .replace(/[A-Z]\.?[A-Z]?\.?くん/gu, "お子さん")
    .replace(/3人の話をまとめると、/gu, "ここで大事なのは、")
    .replace(/3人の話をまとめます。/gu, "ここで整理します。")
    .replace(/3人の話をつなげると、/gu, "ここで大事なのは、")
    .replace(/3人の話をつなぐと、/gu, "ここで大事なのは、")
    .replace(/3人の話を合わせると、/gu, "ここで大事なのは、")
    .replace(/3人の話を重ねると、/gu, "ここで大事なのは、")
    .replace(/3人の話に矛盾はありません。/gu, "ここでの要点は矛盾していません。")
    .replace(/3人の話をまとめる前に、/gu, "最後に、")
    .replace(/3人の話をまとめる前に/u, "最後に")
    .replace(/3人の話は/gu, "ここで大事な考え方は")
    .replace(/次の2人の話す/gu, "このあとの確認で出てくる")
    .replace(/次の2人の話で、/gu, "")
    .replace(/研究マニアの角度・圧力の話と、身体専門家の検査・練習法、どちらも矛盾なく同時に成り立ちます。/gu, "角度・圧力の話と、体の検査・練習法は、どちらも同時に成り立ちます。")
    .replace(/バイオリニストの話/gu, "演奏現場の見方")
    .replace(/研究マニアの話/gu, "仕組みの見方")
    .replace(/身体専門家の話/gu, "体の使い方の見方")
    .replace(/研究マニアと身体専門家の話をまとめると、/gu, "ここで大事なのは、")
    .replace(/研究マニアと身体専門家が具体的に説明してくれます。/gu, "順番に見ると整理できます。")
    .replace(/このあと順番に見ると整理できます。/gu, "順番に見ると整理できます。")
    .replace(/^バイオリニストの慎重さに完全に同意します。そのうえで、/u, "まず、")
    .replace(/^バイオリニストの慎重さに同意します。そのうえで、/u, "まず、")
    .replace(/^研究マニアと身体専門家が並べた数字は、/u, "")
    .replace(/^数字が示す通り、/u, "まず押さえたいのは、")
    .replace(/^身体専門家の説明を受けて、/u, "")
    .replace(/^研究マニアの説明を受けて、/u, "")
    .replace(/^先ほどの話を踏まえると、/u, "")
    .replace(/^先ほどの/u, "")
    .replace(/先ほど触れた/gu, "ここで言う")
    .replace(/先ほど紹介した/gu, "ここで使う")
    .replace(/先ほどの/gu, "この")
    .replace(/上で出た/gu, "ここで大事な")
    .replace(/前に出た/gu, "ここで大事な")
    .replace(/同意します。/gu, "大事な見方です。")
    .replace(/\s+/gu, " ")
    .trim();
}

function applyPlainRewrites(text) {
  return String(text || "")
    .replace(/骨盤前傾/gu, "骨盤が前に傾くこと")
    .replace(/反り腰/gu, "腰が反ること")
    .replace(/弓\(弦との接触点\)/gu, "弓が弦に触れている場所")
    .replace(/弓（弦との接触点）/gu, "弓が弦に触れている場所")
    .replace(/フォームアップ/gu, "準備運動")
    .replace(/可動域/gu, "動かせる範囲")
    .replace(/固有受容感覚/gu, "体の位置や力加減を感じる感覚")
    .replace(/外的焦点/gu, "音や弓の道筋など、体の外側の結果を見る意識")
    .replace(/内的焦点/gu, "指や腕など、体の部位そのものを見る意識")
    .replace(/頭部前方位/gu, "頭が体より前に出た姿勢")
    .replace(/胸椎/gu, "背中の上のほうの背骨")
    .replace(/挙上/gu, "上へ持ち上がること")
    .replace(/上方回旋/gu, "肩甲骨が上向きに回る動き")
    .replace(/ペルビックティルト/gu, "寝たまま骨盤を丸めたり戻したりする体操")
    .replace(/弓圧/gu, "弓が弦にかかる重さ")
    .replace(/弓速/gu, "弓を動かす速さ")
    .replace(/接触点/gu, "弓と弦が触れる場所");
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
