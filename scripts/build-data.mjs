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

// 書籍原文はいじらない。アプリ表示上どうしても直したい箇所だけ、ここに
// [質問ID][フィールド] = [[検索文字列, 置換文字列], ...] の形で個別指定する。
// フィールド: title / question / discussion (全ターン) / prescription (全項目) / score_caption / sources (整形後)
// 本文（誤字・矛盾等）の修正は overrides-content.json（軍団監査 2026-07-10 の裁定結果）から読み込む。
const CONTENT_OVERRIDES_PATH = path.join(__dirname, "overrides-content.json");
const contentOverrides = existsSync(CONTENT_OVERRIDES_PATH)
  ? JSON.parse(readFileSync(CONTENT_OVERRIDES_PATH, "utf8"))
  : {};

// 出典の生徒実名の匿名化・キャプション/出典の個別修正
const MANUAL_OVERRIDES = {
  Q007: {
    sources: [["／Ib抑制の知見はあるが外からの軽い接触での反射誘発は断定しない", ""]],
  },
  Q017: {
    sources: [["肘グルグル5秒テスト", "肘グルグルテスト"]],
  },
  Q021: {
    sources: [["肘グルグル5秒テスト", "肘グルグルテスト"]],
  },
  Q097: {
    sources: [["（10回中10〜11回成功し", "（10〜11回中10回成功し"]],
  },
  Q011: {
    sources: [[
      "【書籍】回旋筋腱板=ローテーターカフを「ボウイング筋」と呼ぶ・／腕を切り離すとおよそ5kgの重さ",
      "【書籍】ヴァイオリンを弾くための身体の作り方・使い方〔柏木真樹〕（回旋筋腱板=ローテーターカフを「ボウイング筋」と呼ぶ／腕を切り離すとおよそ5kgの重さ）",
    ]],
  },
  Q014: {
    sources: [["【書籍】実測系の一冊（弓が弦を押す力は弱奏で弓自体の重さ=約60g前後）", ""]],
  },
  Q043: {
    sources: [["立ち位置調整、書道の半紙とリハーサル用紙の例え。紙の吸い込み方の比喩", "立ち位置調整。紙の吸い込み方（薄い半紙と厚い和紙）の比喩"]],
  },
  Q059: {
    sources: [["ベルカント・グループレッスンの実況", "グループレッスンの実況"]],
  },
  Q095: {
    sources: [["50歳・60代から始めても", "50代・60代から始めても"]],
  },
  Q109: {
    sources: [[
      "【書籍】前腕の回転軸は小指とほぼ一直線上にあるが、多くは親指・人差し指・中指のラインを軸だと誤解して尺骨側を回そうとし、これが腱炎につながることがある",
      "【書籍】ヴァイオリニストならだれでも知っておきたい「からだ」のこと ジェニファー・ジョンソン（前腕の回転軸は小指とほぼ一直線上にあるが、多くは親指・人差し指・中指のラインを軸だと誤解して尺骨側を回そうとし、これが腱炎につながることがある）",
    ]],
  },
  Q113: {
    sources: [["高度な技術を持つバイオリン奏者20名対象・ の3条件比較。具体的な優劣は本リサーチでは確認できず断定しない", "高度な技術を持つバイオリン奏者20名対象の3条件比較"]],
  },
  Q129: {
    sources: [["【書籍（海外）】「Thoughts On Heifetz: His Playing And His Reputation」フォーラムスレッド", "【フォーラム】「Thoughts On Heifetz: His Playing And His Reputation」スレッド"]],
  },
  Q143: {
    sources: [["McNamara&Maitra 2019", "Macnamara & Maitra 2019"]],
  },
  Q167: {
    sources: [
      ["類推。発話者不明瞭のため一般化して援用）", "類推）"],
      ["考え方を、Case43の順序転換の理由づけとして著者が補記", "考え方"],
    ],
  },
  Q044: {
    sources: [["塩原奈緒さん", "ある奏者"]],
  },
  Q051: {
    sources: [["かなは届きすぎて行き過ぎちゃってる", "届きすぎて行き過ぎちゃってる"]],
  },
  Q068: {
    sources: [["小谷亮平君", "セヴシックOp.8を練習中の生徒"]],
  },
  Q092: {
    sources: [["廣田真希ちゃん10歳・スメタナ", "10歳の生徒・スメタナ"]],
  },
  Q140: {
    sources: [["自嘲→先生の具体的フォロー、看病・介護と体調確認の運用", "自嘲に対する先生の具体的フォローと、通いが不規則な生徒への体調確認の運用"]],
  },
  Q072: {
    score_caption: [["u08_sevcik_op8_shift_p3.png・u09_yost_shift_p2.pngと合わせ、", ""]],
  },
  Q074: {
    score_caption: [["u10_dounis_demanche_p1・p2.pngと合わせ、", ""]],
  },
  Q106: {
    score_caption: [["（半音1-2指・2-3指トリル準備、p2も参照）。定番のクロイツェル42の練習曲第32番は本書アセット未収録", "（半音1-2指・2-3指トリル準備）"]],
  },
  Q064: {
    score_caption: [["figures/flesch_3octave.png（狭さの総合演習）・figures/shrink_map.svg（第1=18mm→第7=9mmの実寸）と併用", "フレッシュ3オクターブ・スケール（狭さの総合演習）・半音幅実寸マップ（第1=18mm→第7=9mm）と併用"]],
  },
  Q065: {
    score_caption: [["u14_sitt_bk4_no61_p1.png（第6ポジション）と合わせ", "Sitt Op.32 第4巻61番（第6ポジション）と合わせ"]],
  },
  Q066: {
    score_caption: [["yost_shifting.png（Yost Exercises for Change of Position・1本指ゴースト移動）と合わせ", "Yost: Exercises for Change of Position（1本指ゴースト移動）と合わせ"]],
  },
  Q067: {
    score_caption: [["figures/dounis_op12.png（démanché・到着音を先に確認してから移動する練習）と併用", "Dounis Op.12（démanché・到着音を先に確認してから移動する練習）と併用"]],
  },
  Q071: {
    score_caption: [["sevcik_op8.png(隣接ポジション間シフトの純粋反復)と併用", "Ševčík Op.8（隣接ポジション間シフトの純粋反復）と併用"]],
  },
  Q091: {
    score_caption: [["Dont Op.37 No.1続き", "Dont Op.37 No.1（後半部分）"]],
  },
  Q104: {
    sources: [["石井圭さん・", "ある講師の事例・"]],
    score_caption: [[
      "参考: u13_sevcik_op1bk4_oct_p1.png（オクターブ重音・全24調）——ポジションが上がるほど指の間隔が狭くなる本問の確認に使える。まだ重音に慣れないうちはtrott_1.png（Trott『旋律的重音』第1巻冒頭、第1〜8番は必ず片方が開放弦）から入るとよい。1ヶ月後の通し確認にはu19_sitt_bk5_no1_p1.png（Sitt Op.32 Bk.5 No.1、3度・6度・オクターブの重音総合エチュード）が使える",
      "参考: Ševčík Op.1 第4巻（オクターブ重音・全24調）——ポジションが上がるほど指の間隔が狭くなることの確認に使える。まだ重音に慣れないうちはTrott『旋律的重音』第1巻冒頭（第1〜8番は必ず片方が開放弦）から入るとよい。1ヶ月後の通し確認にはSitt Op.32 第5巻 No.1（3度・6度・オクターブの重音総合エチュード）が使える",
    ]],
  },
};

// contentOverrides と MANUAL_OVERRIDES を統合（同一Q・同一フィールドは連結）
const OVERRIDES = {};
for (const source of [contentOverrides, MANUAL_OVERRIDES]) {
  for (const [qid, fields] of Object.entries(source)) {
    OVERRIDES[qid] = OVERRIDES[qid] || {};
    for (const [field, rules] of Object.entries(fields)) {
      OVERRIDES[qid][field] = [...(OVERRIDES[qid][field] || []), ...rules];
    }
  }
}

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
      // 原文フィールドは配信データに含めない（アプリが使うのは app.* のみ。容量半減）
      questions.push({
        id: raw.id,
        chapter: raw.chapter,
        chapter_title: chapters.find((chapter) => chapter.id === raw.chapter)?.title || "",
        score_caption: applyOverrides(String(raw.score_caption || ""), raw.id, "score_caption") || null,
        assetPath,
        sources: formatSources(raw.sources)
          .map((entry) => applyOverrides(entry, raw.id, "sources"))
          .filter(Boolean),
        tier: raw.tier,
        app: buildAppContent(raw),
      });
    }
  }

  return questions.sort((a, b) => a.id.localeCompare(b.id, "ja"));
}

// 相談者情報を分解する。
// 「N.A.ちゃん（8歳…）の母」→ 子どもの相談（本文中の子ども名は「お子さん」へ）
// 「M.K.さん（38歳…）」→ 本人の相談（本文中の本人名は「あなた」へ）
// 括弧の入れ子（Q192）やひらがな名・「のお母さん」型（Q142/Q145）にも対応する。
function parsePersona(persona) {
  const text = String(persona || "").trim();
  if (!text) return { profile: "", replacements: [] };

  const open = text.search(/[（(]/u);
  const close = text.lastIndexOf("）") >= 0 ? text.lastIndexOf("）") : text.lastIndexOf(")");
  if (open < 0 || close < open) {
    return { profile: `相談の前提: ${text}。`, replacements: [] };
  }

  const name = text.slice(0, open).trim();
  const detail = text.slice(open + 1, close).trim();
  const tail = text.slice(close + 1).trim();

  const parentSuffix = /^の?(お?母(?:さん|親)?|お?父(?:さん|親)?|保護者|祖母|祖父)$/u;

  const tailParent = tail.match(parentSuffix);
  if (tail !== "" && tailParent) {
    return {
      profile: `相談の前提: ${detail}の子どもについて、${tailParent[1]}からの相談。`,
      replacements: namePatterns(name).map((pattern) => [pattern, "お子さん"]),
    };
  }

  // 「S.A.くんの母（息子は4歳…）」のように括弧の前に続柄が来る形式
  const nameParent = name.match(/^(.+?(?:さん|ちゃん|くん|君))の(お?母(?:さん|親)?|お?父(?:さん|親)?|保護者|祖母|祖父)$/u);
  if (tail === "" && nameParent) {
    return {
      profile: `相談の前提: ${detail}。${nameParent[2]}からの相談。`,
      replacements: namePatterns(nameParent[1]).map((pattern) => [pattern, "お子さん"]),
    };
  }

  if (tail === "") {
    return {
      profile: `相談の前提: ${detail}。`,
      replacements: namePatterns(name).map((pattern) => [pattern, "あなた"]),
    };
  }

  return { profile: `相談の前提: ${text}。`, replacements: [] };
}

// 「M.K.さん」→ /M\.?K\.?(さん|ちゃん|くん|君)/ のように、ドット表記ゆれと
// 敬称ゆれの両方を吸収する正規表現を作る。ひらがな等の名前はそのまま一致させる。
function namePatterns(name) {
  const trimmed = String(name || "").trim();
  if (!trimmed) return [];

  const initialsMatch = trimmed.match(/^([A-Z](?:\.?[A-Z])*)\.?\s*(さん|ちゃん|くん|君)$/u);
  if (initialsMatch) {
    const letters = initialsMatch[1].replace(/\./gu, "").split("");
    const body = letters.map((letter) => `${letter}\\.?`).join("");
    const patterns = [new RegExp(`(?<![A-Za-z0-9.])${body}\\s*(?:さん|ちゃん|くん|君)`, "gu")];
    if (letters.length > 1) {
      // 「M.K.さん」を本文中で「Mさん」と略す表記にも対応（英単語の一部は除外）
      patterns.push(new RegExp(`(?<![A-Za-z.])${letters[0]}\\.?(?:さん|ちゃん|くん|君)`, "gu"));
    }
    return patterns;
  }

  return [new RegExp(trimmed.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "gu")];
}

function anonymize(text, replacements) {
  let result = String(text || "");
  for (const [pattern, to] of replacements) {
    result = result.replace(pattern, to);
  }
  return result;
}

function applyOverrides(text, id, field) {
  const rules = OVERRIDES[id]?.[field];
  if (!rules) return text;
  let result = text;
  for (const [from, to] of rules) {
    result = result.replaceAll(from, to);
  }
  return result;
}

// 出典の内部ファイル名を、読者向けのラベルに変換する（.md が省かれた表記にも対応）。
const SOURCE_LABELS = [
  [/^(?:research\/)?books_ja(?:\.md)?\b/u, "書籍"],
  [/^(?:research\/)?books_en(?:\.md)?\b/u, "書籍（海外）"],
  [/^(?:research\/)?youtube_[a-z_]+(?:\.md)?\b/u, "YouTube講座"],
  [/^(?:research\/)?(?:papers_local|web_papers_[a-z_]+)(?:\.md)?\b/u, "研究論文"],
  [/^(?:research\/)?research_reports(?:\.md)?\b/u, "リサーチまとめ"],
  [/^(?:research\/)?trouble_map(?:\.md)?\b/u, "悩み事例マップ"],
  [/^(?:research\/)?students_[A-Z](?:\.md)?\b/u, "教室の生徒事例（匿名）"],
  [/^(?:research\/)?compete_[a-z0-9_]+(?:\.md)?\b/u, "演奏事例研究"],
  [/^(?:research\/)?assets_inventory(?:\.md)?\b/u, "楽譜・図版資料"],
  [/^(?:research\/)?2026-05-30_バイオリン身体メソッド集(?:\.md)?/u, "身体メソッド集"],
  [/^(?:research\/)?2026-05-30_バイオリン悩み図鑑(?:\.md)?/u, "悩み図鑑"],
  [/^_source_lessons(?:\.md)?\b/u, "レッスン記録"],
  [/^バイオリン×山内流レポート(?:\.md)?/u, "身体メソッド研究"],
];

function formatSource(source, inheritLabel = null) {
  let text = String(source || "").trim();
  if (!text) return null;

  let label = inheritLabel || "資料";
  for (const [pattern, name] of SOURCE_LABELS) {
    if (pattern.test(text)) {
      label = name;
      text = text.replace(pattern, "").trim();
      break;
    }
  }

  text = text
    // 併記された内部ファイル名も除去（「students_C.md／students_B.md B-02」など）
    .replace(/(?:[A-Za-z0-9_\-]+\/)*[A-Za-z0-9_×\-ぁ-んァ-ヶー々一-龯]+\.(?:md|png|svg|jpg|json)/gu, "")
    // 内部リサーチメモのタイムスタンプ接頭辞（2026-03-04_08-00_ など）
    .replace(/\b20\d{2}-\d{2}-\d{2}_\d{2}-\d{2}(?:_|関連)?/gu, "")
    // ディレクトリだけの残骸（plan/ assets/figures/ など。r/violinist等の1文字ヘッドは残す）
    .replace(/(?<![A-Za-z0-9])[A-Za-z0-9_\-]{2,}(?:\/[A-Za-z0-9_\-]*)+\/?/gu, "")
    // 書籍前提の言い回しをアプリ向けに直す
    .replace(/本書research\/内/gu, "このQ&A集の資料")
    .replace(/本書/gu, "このQ&A集")
    // 編集用メモの漏出を除去
    .replace(/[、。・]?\s*実名は出さない/gu, "")
    .replace(/章タグ\d+[、,]?\s*/gu, "")
    .replace(/[、,]?\s*enrich素材として統合/gu, "")
    .replace(/相互参照先。?\s*/gu, "")
    .replace(/自著相互参照:?\s*/gu, "")
    .replace(/・?匿名化(?=）|$)/gu, "")
    .replace(/吸収価値トップ\d+\s*/gu, "")
    .replace(/吸収価値\d+/gu, "")
    .replace(/#\d+\s*/gu, "")
    .replace(/\b\d節\s*/gu, "")
    .replace(/[・、]?\d+(?:-\d+)?行/gu, "")
    .replace(/セクション[A-Z]\s*/gu, "")
    .replace(/[、。]?\s*ch\d+(?=）)/gu, "")
    .replace(/著者設計の補筆/gu, "教室側の補足")
    .replace(/著者設計:?\s*/gu, "教室側の補足: ")
    .replace(/第(\d+)章下書き/gu, "第$1章")
    .replace(/^S:\s*/u, "")
    .replace(/\b1[a-z0-9]{6}\b[,、]?\s*/gu, "")
    // 内部資料の行番号・整理番号（L1123-1125 / L93,L2068 / C68 / P08・P10 / B-02 / ｜章11 など）
    // ※音名・弦名（A/D/E/G+数字）とQ番号は正当なデータなので除去対象から外す
    .replace(/\bL\d+(?:\s*[-–,，・]\s*L?\d+)*\b/gu, "")
    .replace(/(?:[A-Z]-?\d*表[・、]?)+(?=（)/gu, "")
    .replace(/(?<![A-Za-z0-9.=])[BCFHIJKMNOPRSTUVWXYZ]-?\d+(?:・[A-Z]?\d+)*(?![°度\d])/gu, "")
    .replace(/^[A-Z](?=\s*（)/u, "")
    .replace(/[｜|]\s*章\d+(?:\.\d+)?/gu, "")
    .replace(/同\s*章\d+該当箇所/gu, "同")
    .replace(/総合知\d+(?:\.\d+)?(?:-\d+(?:\.\d+)?)?/gu, "総合知")
    // 番号除去で残った孤児記号の掃除
    .replace(/（\s*[,，、・]+\s*/gu, "（")
    .replace(/\s*[,，、・]+\s*）/gu, "）")
    .replace(/（\s*）|\(\s*\)/gu, "")
    .replace(/[,，、]+\s*[／/]/gu, "／")
    .replace(/[／/]\s*:\s*/gu, "／")
    .replace(/[／/]\s*[,，、]+/gu, "／")
    .replace(/[,，、]\s*[,，、]+/gu, "、")
    .replace(/\s*[,，]\s*\d+\s*$/u, "")
    .replace(/^[／/・:：\s]+/u, "")
    .replace(/[／/\s]+$/u, "")
    .replace(/\s+/gu, " ")
    .trim();

  // 残りが丸括弧1つに包まれているだけなら中身を出す
  const wrapped = text.match(/^（(.+)）$/u);
  if (wrapped && !wrapped[1].includes("（")) text = wrapped[1];

  if (!text) return null;
  return `【${label}】${text}`;
}

function formatSources(sources) {
  const seen = new Set();
  const formatted = [];
  let previousLabel = null;
  for (const source of sources || []) {
    // 「同 L155（…）」型の相対参照は直前の出典のラベルを引き継ぐ
    const inheritLabel = /^同/u.test(String(source || "").trim()) ? previousLabel : null;
    const entry = formatSource(source, inheritLabel);
    if (entry) {
      previousLabel = entry.match(/^【([^】]+)】/u)?.[1] || previousLabel;
      if (!seen.has(entry)) {
        seen.add(entry);
        formatted.push(entry);
      }
    }
  }
  return mergeSources(formatted);
}

// 同じ出典（書名・資料名が同一）の複数引用を1行にまとめる。
// 見出しの切れ目は「ラベル【…】より後の最初の丸括弧」（ラベル内の（海外）等を誤って切らない）
function mergeSources(entries) {
  const order = [];
  const notesByHead = new Map();
  for (const entry of entries) {
    const labelEnd = entry.indexOf("】") + 1;
    const parenIndex = entry.indexOf("（", labelEnd);
    const head = (parenIndex >= 0 ? entry.slice(0, parenIndex) : entry).trim();
    const tail = parenIndex >= 0 ? entry.slice(parenIndex).trim() : "";
    if (!notesByHead.has(head)) {
      notesByHead.set(head, []);
      order.push(head);
    }
    if (tail) notesByHead.get(head).push(tail);
  }
  return order.map((head) => {
    const notes = notesByHead.get(head).join("／");
    return notes ? `${head}${notes}` : head;
  });
}

// 相談文は一人称で書かれているため、名前は置換でなく自己紹介ごと除去する。
function scrubQuestion(text) {
  return String(text || "")
    .replace(/[A-Z](?:\.[A-Z])*\.?(?:さん|ちゃん|くん|君)[（(][^）)]*[）)]/gu, "")
    .replace(/\s+/gu, " ")
    .trim();
}

function buildAppContent(question) {
  const { profile, replacements } = parsePersona(question.persona);
  const discussion = question.discussion.map((turn) => ({
    speaker: turn.speaker,
    // 冒頭の呼びかけ「K.Mさん、」は置換すると「あなた、」と不自然になるため除去する
    text: applyOverrides(
      anonymize(turn.text, replacements).replace(/^(?:あなた|お子さん)、\s*/u, ""),
      question.id,
      "discussion"
    ),
  }));
  return {
    title: applyOverrides(String(question.title || "").trim(), question.id, "title"),
    question: applyOverrides(scrubQuestion(question.question), question.id, "question"),
    profile,
    discussion,
    prescription: question.prescription.map((item) =>
      applyOverrides(anonymize(item, replacements), question.id, "prescription")
    ),
  };
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
