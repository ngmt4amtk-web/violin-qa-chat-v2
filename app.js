const DATA = window.VIOLIN_QA_DATA;

const SPEAKERS = {
  "相談室": {
    key: "system",
    avatar: "assets/avatars/violinist.png",
  },
  "バイオリニスト": {
    key: "violinist",
    avatar: "assets/avatars/violinist.png",
  },
  "研究マニア": {
    key: "researcher",
    avatar: "assets/avatars/researcher.png",
  },
  "身体専門家": {
    key: "body",
    avatar: "assets/avatars/body.png",
  },
};

const PROBLEM_GROUPS = [
  {
    id: "body",
    label: "構えると体がつらい",
    detail: "姿勢、肩、首、痛み、疲れ",
    chapters: [1, 13],
  },
  {
    id: "bow",
    label: "弓や右手がうまくいかない",
    detail: "ボーイング、音色、スピッカート",
    chapters: [2, 3, 8],
  },
  {
    id: "left",
    label: "音程や左手で困っている",
    detail: "指、シフト、ビブラート",
    chapters: [4, 5, 6],
  },
  {
    id: "music",
    label: "曲になると崩れる",
    detail: "速いパッセージ、読譜、リズム、表現",
    chapters: [7, 9, 10],
  },
  {
    id: "practice",
    label: "練習や本番がしんどい",
    detail: "続かない、あがる、暗譜、先生との関係",
    chapters: [11, 12, 14],
  },
  {
    id: "gear",
    label: "合奏や道具で迷っている",
    detail: "アンサンブル、楽器、弓、調弦、環境",
    chapters: [15, 16],
  },
];

const SPEAKER_ORDER = ["バイオリニスト", "研究マニア", "身体専門家"];
const HARD_WORDS = [
  ["骨盤前傾", "骨盤が前に傾き、腰が反りやすい状態"],
  ["反り腰", "腰の後ろ側が強く反っている状態"],
  ["胸椎", "背中の上のほうの背骨"],
  ["頭部前方位", "頭が体より前に出ている姿勢"],
  ["後頭下筋群", "頭の後ろの付け根で、頭を支える小さい筋肉群"],
  ["ペルビックティルト", "寝たまま骨盤を丸めたり戻したりする体操"],
  ["上方回旋", "腕を上げる時に肩甲骨が上向きに回る動き"],
  ["挙上", "肩をすくめるように上へ持ち上げる動き"],
  ["固有受容感覚", "見なくても体の位置や力加減が分かる感覚"],
  ["外的焦点", "体の中ではなく、音や弓の道筋など外側の結果を見ること"],
  ["内的焦点", "指や腕など体の部位そのものを意識すること"],
  ["純正律", "和音が濁りにくいように合わせる音程の取り方"],
  ["ピタゴラス", "旋律が進む力を出しやすい音程の取り方"],
  ["平均律", "ピアノのように全調で使いやすく均等に割った音程"],
  ["弓圧", "弓が弦にかかる重さ"],
  ["弓速", "弓を動かす速さ"],
  ["接触点", "弓が弦に触れている場所"],
];

const PLAIN_REWRITES = [
  [/フォームアップ/gu, "準備運動"],
  [/意識で監視する/gu, "意識して見張る"],
  [/監視する/gu, "見張る"],
  [/監視/gu, "見張ること"],
  [/可動域/gu, "動かせる範囲"],
  [/組み込む/gu, "入れる"],
  [/長続き/gu, "続けやすく"],
  [/無理なく/gu, "体に負担をかけず"],
  [/真っ直ぐ/gu, "まっすぐ"],
  [/連動/gu, "つながり"],
  [/習得/gu, "身につけること"],
  [/改善/gu, "良くすること"],
];

const els = {
  body: document.body,
  chatBody: document.getElementById("chatBody"),
  chapterStrip: document.getElementById("chapterStrip"),
  questionList: document.getElementById("questionList"),
  questionCount: document.getElementById("questionCount"),
  searchInput: document.getElementById("searchInput"),
  roomTitle: document.getElementById("roomTitle"),
  roomSub: document.getElementById("roomSub"),
  menuButton: document.getElementById("menuButton"),
  drawerBackdrop: document.getElementById("drawerBackdrop"),
};

const state = {
  chapter: "all",
  tier: "all",
  search: "",
  activeQuestion: null,
  sending: false,
  lastAnswer: null,
};

function init() {
  if (!DATA || !Array.isArray(DATA.questions)) {
    addMessage("相談室", "データを読み込めませんでした。", { kind: "system" });
    return;
  }

  renderChapters();
  bindEvents();
  renderQuestionList();
  startConversation();

  const params = new URLSearchParams(window.location.search);
  const deepLinkId = params.get("q")?.toUpperCase();
  if (deepLinkId && DATA.questions.some((q) => q.id === deepLinkId)) {
    openQuestion(DATA.questions.find((q) => q.id === deepLinkId), { fromDeepLink: true });
    if (params.get("view") === "clarify") {
      const speakerParam = params.get("speaker");
      const speaker = SPEAKER_ORDER.includes(speakerParam) ? speakerParam : SPEAKER_ORDER[0];
      showClarification(state.activeQuestion, speaker, answerTurns(state.activeQuestion, speaker));
    } else if (params.get("view") === "answer") {
      const speakerParam = params.get("speaker");
      if (speakerParam === "all") {
        startAllSpeakers(state.activeQuestion);
      } else if (SPEAKER_ORDER.includes(speakerParam)) {
        showSpeakerAnswer(state.activeQuestion, speakerParam, { mode: "single" });
      } else {
        askAnswerTarget(state.activeQuestion);
      }
    }
  }
}

function bindEvents() {
  els.searchInput.addEventListener("input", (event) => {
    state.search = event.target.value.trim();
    renderQuestionList();
  });

  document.querySelectorAll(".filter-chip").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".filter-chip").forEach((chip) => chip.classList.remove("active"));
      button.classList.add("active");
      state.tier = button.dataset.tier;
      renderQuestionList();
    });
  });

  els.menuButton.addEventListener("click", () => {
    els.body.classList.add("drawer-open");
  });

  els.drawerBackdrop.addEventListener("click", () => {
    els.body.classList.remove("drawer-open");
  });
}

function renderChapters() {
  const allButton = document.createElement("button");
  allButton.className = "chapter-tab active";
  allButton.type = "button";
  allButton.textContent = "全体";
  allButton.addEventListener("click", () => chooseChapterFilter("all"));
  els.chapterStrip.append(allButton);

  PROBLEM_GROUPS.forEach((group) => {
    const button = document.createElement("button");
    button.className = "chapter-tab";
    button.type = "button";
    button.textContent = group.label;
    button.addEventListener("click", () => chooseProblemFilter(group.id));
    els.chapterStrip.append(button);
  });
}

function chooseProblemFilter(groupId) {
  const group = PROBLEM_GROUPS.find((item) => item.id === groupId);
  state.chapter = groupId;
  document.querySelectorAll(".chapter-tab").forEach((button, index) => {
    button.classList.toggle("active", index > 0 && PROBLEM_GROUPS[index - 1].id === groupId);
  });
  renderQuestionList();
}

function chooseChapterFilter(chapter) {
  state.chapter = chapter;
  document.querySelectorAll(".chapter-tab").forEach((button, index) => {
    button.classList.toggle("active", chapter === "all" && index === 0);
  });
  renderQuestionList();
}

function getFilteredQuestions() {
  const query = normalize(state.search);
  return DATA.questions.filter((q) => {
    const group = PROBLEM_GROUPS.find((item) => item.id === state.chapter);
    const chapterMatch = state.chapter === "all" || group?.chapters.includes(q.chapter);
    const tierMatch = state.tier === "all" || q.tier === Number(state.tier);
    if (!chapterMatch || !tierMatch) return false;
    if (!query) return true;

    const haystack = normalize([
      q.id,
      q.title,
      makeChoiceTitle(q),
      makeAskText(q),
      q.discussion.map((turn) => `${turn.speaker} ${turn.text}`).join(" "),
      q.prescription.join(" "),
    ].join(" "));
    return haystack.includes(query);
  });
}

function renderQuestionList() {
  const questions = getFilteredQuestions();
  els.questionCount.textContent = `${questions.length}件`;
  els.questionList.innerHTML = "";

  if (questions.length === 0) {
    els.questionList.innerHTML = `<div class="empty-state">近い悩みが見つかりません。</div>`;
    return;
  }

  const frag = document.createDocumentFragment();
  questions.forEach((q) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `question-card ${state.activeQuestion?.id === q.id ? "active" : ""}`;
    button.innerHTML = `
      <div class="meta"><span>${escapeHtml(groupLabelForQuestion(q))}</span><span>${tierLabel(q.tier)}</span></div>
      <div class="title">${escapeHtml(makeChoiceTitle(q))}</div>
      <div class="persona">${escapeHtml(shorten(makeAskText(q), 72))}</div>
    `;
    button.addEventListener("click", () => openQuestion(q));
    frag.append(button);
  });

  els.questionList.append(frag);
}

function startConversation() {
  state.activeQuestion = null;
  els.chatBody.innerHTML = "";
  els.roomTitle.textContent = "バイオリンQ&A相談室";
  els.roomSub.textContent = "あなたの悩みに近いものを選びます";
  addMessage("相談室", "悩みはどれ？\n近いものを選んでください。ぴったりじゃなくて大丈夫です。", { kind: "system" });
  addChoiceMessage("相談室", "まず大きく分けると、どれに近いですか？", PROBLEM_GROUPS.map((group) => ({
    label: group.label,
    detail: group.detail,
    action: () => chooseProblem(group),
  })));
}

function chooseProblem(group) {
  addUserMessage(group.label);
  chooseProblemFilter(group.id);
  addMessage("相談室", "では、もう少し具体的にはどれに近いですか？", { kind: "system" });
  showQuestionChoices(group, 0);
}

function showQuestionChoices(group, page) {
  const questions = DATA.questions.filter((q) => group.chapters.includes(q.chapter));
  const pageSize = 8;
  const start = page * pageSize;
  const slice = questions.slice(start, start + pageSize);
  const choices = slice.map((q) => ({
    label: makeChoiceTitle(q),
    detail: shorten(makeAskText(q), 54),
    action: () => openQuestion(q),
  }));

  if (start + pageSize < questions.length) {
    choices.push({
      label: "もっと見る",
      detail: "この悩みの候補を続けて見る",
      action: () => showQuestionChoices(group, page + 1),
    });
  }
  if (page > 0) {
    choices.push({
      label: "前に戻る",
      detail: "前の候補を見る",
      action: () => showQuestionChoices(group, page - 1),
    });
  }
  choices.push({
    label: "最初から選び直す",
    detail: "悩みの大分類に戻る",
    action: () => startConversation(),
  });

  addChoiceMessage("相談室", "この中なら、どれが一番近いですか？", choices);
}

function openQuestion(question, options = {}) {
  state.activeQuestion = question;
  localStorage.setItem("violin-qa-last-id", question.id);
  els.body.classList.remove("drawer-open");
  chooseProblemFilter(groupForQuestion(question).id);
  renderQuestionList();
  els.roomTitle.textContent = makeChoiceTitle(question);
  els.roomSub.textContent = groupLabelForQuestion(question);

  if (!options.fromDeepLink) addUserMessage(makeChoiceTitle(question));
  addUserMessage(makeAskText(question));

  addMessage("相談室", makePlainLead(question), { kind: "system" });
  addChoiceMessage("相談室", "ここからどうしますか？", [
    {
      label: "くわしく聞く",
      detail: "誰に聞くか選ぶ",
      action: () => askAnswerTarget(question),
    },
    {
      label: "今週やることだけ知りたい",
      detail: "具体的な練習メニューだけ見る",
      action: () => showPrescription(question),
    },
    {
      label: "出典を見る",
      detail: "元になった本や資料を見る",
      action: () => showSources(question),
    },
    {
      label: "別の悩みを選ぶ",
      detail: "最初の質問に戻る",
      action: () => startConversation(),
    },
  ]);
}

function askAnswerTarget(question) {
  addUserMessage("くわしく聞きたい");
  addChoiceMessage("相談室", "誰に聞きますか？\n全員を選ぶと、1人ずつ順番に聞けます。", [
    {
      label: "全員に聞く",
      detail: "バイオリニスト、研究マニア、身体専門家の順",
      action: () => startAllSpeakers(question),
    },
    ...SPEAKER_ORDER.map((speaker) => ({
      label: `${speaker}に聞く`,
      detail: speakerDetail(speaker),
      action: () => showSpeakerAnswer(question, speaker, { mode: "single" }),
    })),
  ]);
}

function startAllSpeakers(question) {
  addUserMessage("全員に聞く");
  showSpeakerAnswer(question, SPEAKER_ORDER[0], { mode: "all", index: 0, silentUser: true });
}

async function showSpeakerAnswer(question, speaker, context = {}) {
  if (state.sending) return;
  if (!context.silentUser) addUserMessage(`${speaker}に聞く`);
  const turns = answerTurns(question, speaker);
  if (!turns.length) {
    addMessage("相談室", `${speaker}の回答はこの相談にはありません。`, { kind: "system" });
    showAfterSpeakerChoices(question, speaker, turns, context);
    return;
  }

  state.lastAnswer = { question, speaker, turns, context };
  addMessage("相談室", `${speaker}の返事を送ります。読みやすいように少しずつ出します。`, { kind: "system" });
  const messages = [];
  turns.forEach((turn) => {
    splitText(turn.text, 72).forEach((part, index) => {
      messages.push({ speaker: turn.speaker, text: part, options: { showName: index === 0 } });
    });
  });
  await sendPacedMessages(messages);
  maybeShowScoreAsset(question);
  showAfterSpeakerChoices(question, speaker, turns, context);
}

function showAfterSpeakerChoices(question, speaker, turns, context = {}) {
  const nextSpeaker = context.mode === "all"
    ? SPEAKER_ORDER[context.index + 1]
    : nextSpeakerAfter(speaker);

  const choices = [];
  if (nextSpeaker) {
    choices.push({
      label: `次の${nextSpeaker}に聞く`,
      detail: speakerDetail(nextSpeaker),
      action: () => showSpeakerAnswer(question, nextSpeaker, {
        mode: context.mode || "single",
        index: SPEAKER_ORDER.indexOf(nextSpeaker),
      }),
    });
  }
  choices.push(
    {
      label: "よくわからない",
      detail: "今の返事を、情報を削らずに噛み砕く",
      action: () => showClarification(question, speaker, turns),
    },
    {
      label: "わかった",
      detail: "ここで止める",
      action: () => markUnderstood(question),
    },
    {
      label: "他の質問をする",
      detail: "悩みはどれ？に戻る",
      action: () => startConversation(),
    },
  );
  addChoiceMessage("相談室", "返事はここまでです。次はどうしますか？", choices);
}

function showPrescription(question) {
  addUserMessage("今週やることだけ知りたい");
  addMessage("相談室", "まずやることだけに絞ります。全部を一度にやらなくて大丈夫です。", { kind: "system" });
  question.prescription.forEach((item, index) => {
    addMessage("身体専門家", `${index + 1}. ${removeDenseParentheses(item)}`, { kind: "prescription", showName: index === 0 });
  });
  maybeShowScoreAsset(question);
  showAfterAnswerChoices(question);
}

function showSources(question) {
  addUserMessage("出典を見たい");
  const text = question.sources.length
    ? question.sources.map((source, index) => `${index + 1}. ${source}`).join("\n\n")
    : "出典情報は未登録です。";
  splitText(text, 180).forEach((part, index) => {
    addMessage("相談室", part, { kind: "sources", showName: index === 0 });
  });
  showAfterAnswerChoices(question);
}

function showAfterAnswerChoices(question) {
  addChoiceMessage("相談室", "次はどうしますか？", [
    {
      label: "今週やること",
      detail: "処方箋だけ見る",
      action: () => showPrescription(question),
    },
    {
      label: "出典",
      detail: "元資料を見る",
      action: () => showSources(question),
    },
    {
      label: "近い悩みをもう一度選ぶ",
      detail: groupLabelForQuestion(question),
      action: () => chooseProblem(groupForQuestion(question)),
    },
    {
      label: "最初から選ぶ",
      detail: "悩みはどれ？に戻る",
      action: () => startConversation(),
    },
  ]);
}

async function showClarification(question, speaker, turns) {
  if (state.sending) return;
  addUserMessage("よくわからない");
  if (!turns.length) {
    addMessage("相談室", `${speaker}の返事がないので、別の人を選んでください。`, { kind: "system" });
    askAnswerTarget(question);
    return;
  }
  const text = turns.map((turn) => turn.text).join(" ");
  const glossary = glossaryFor(text);
  const messages = [
    {
      speaker: "相談室",
      text: "読み方を変えます。情報は削らず、結論、理由、やること、条件の順に並べ直します。",
      options: { kind: "system" },
    },
    {
      speaker: "相談室",
      text: `一番効く一本はこれです。\n${coreSentence(text)}`,
      options: { kind: "system" },
    },
    {
      speaker: "相談室",
      text: clarificationMap(text),
      options: { kind: "system" },
    },
  ];

  if (glossary.length) {
    messages.push({
      speaker: "相談室",
      text: `先に言葉の足場を置きます。\n${glossary.map(([term, plain]) => `${term}: ${plain}`).join("\n")}`,
      options: { kind: "system" },
    });
  }

  messages.push({
    speaker: "相談室",
    text: "細かい条件も落とさず、1文ずつほどきます。",
    options: { kind: "system" },
  });

  splitForClarification(text).forEach((sentence, index) => {
    messages.push({
      speaker: "相談室",
      text: `${index + 1}. ${sentenceLabel(sentence)}: ${simplifySentence(sentence)}`,
      options: { kind: "system" },
    });
  });

  await sendPacedMessages(messages);
  addChoiceMessage("相談室", "これでどうですか？", [
    {
      label: "わかった",
      detail: "ここで止める",
      action: () => markUnderstood(question),
    },
    {
      label: `${speaker}の原文をもう一度読む`,
      detail: "同じ人の返事に戻る",
      action: () => showSpeakerAnswer(question, speaker, { mode: "single" }),
    },
    {
      label: "他の質問をする",
      detail: "悩みはどれ？に戻る",
      action: () => startConversation(),
    },
  ]);
}

function markUnderstood(question) {
  addUserMessage("わかった");
  addChoiceMessage("相談室", "OKです。必要なら、ここから選べます。", [
    {
      label: "今週やることを見る",
      detail: "処方箋だけ確認する",
      action: () => showPrescription(question),
    },
    {
      label: "他の質問をする",
      detail: "悩みはどれ？に戻る",
      action: () => startConversation(),
    },
  ]);
}

function addMessage(speaker, text, options = {}) {
  const info = SPEAKERS[speaker] || SPEAKERS["相談室"];
  const row = document.createElement("div");
  row.className = "message-row";
  const kind = options.kind || info.key;
  const name = options.showName === false ? "" : `<div class="speaker">${escapeHtml(speaker)}</div>`;
  row.innerHTML = `
    <img class="avatar" src="${info.avatar}" alt="">
    <div class="message-stack">
      ${name}
      <div class="bubble ${kind}">${escapeHtml(text)}</div>
    </div>
  `;
  els.chatBody.append(row);
  scrollToBottom();
  return row;
}

function addChoiceMessage(speaker, text, choices) {
  const row = addMessage(speaker, text, { kind: "system" });
  const stack = row.querySelector(".message-stack");
  const grid = document.createElement("div");
  grid.className = "choice-grid";
  choices.forEach((choice) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "choice-button";
    button.innerHTML = `<strong>${escapeHtml(choice.label)}</strong>${choice.detail ? `<small>${escapeHtml(choice.detail)}</small>` : ""}`;
    button.addEventListener("click", () => {
      grid.querySelectorAll("button").forEach((item) => item.disabled = true);
      button.classList.add("chosen");
      choice.action();
    });
    grid.append(button);
  });
  stack.append(grid);
  scrollToBottom();
}

async function sendPacedMessages(messages) {
  state.sending = true;
  for (const item of messages) {
    showTyping(item.speaker);
    await wait(messageDelay(item.text));
    removeTyping();
    addMessage(item.speaker, item.text, item.options || {});
  }
  state.sending = false;
}

function showTyping(speaker) {
  removeTyping();
  const info = SPEAKERS[speaker] || SPEAKERS["相談室"];
  const row = document.createElement("div");
  row.className = "message-row typing-row";
  row.innerHTML = `
    <img class="avatar" src="${info.avatar}" alt="">
    <div class="message-stack">
      <div class="bubble typing"><i></i><i></i><i></i></div>
    </div>
  `;
  els.chatBody.append(row);
  scrollToBottom();
}

function removeTyping() {
  els.chatBody.querySelectorAll(".typing-row").forEach((node) => node.remove());
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function messageDelay(text) {
  const length = String(text || "").length;
  return Math.max(520, Math.min(1250, 420 + length * 8));
}

function addUserMessage(text) {
  const row = document.createElement("div");
  row.className = "message-row user";
  row.innerHTML = `<div class="bubble user">${escapeHtml(text)}</div>`;
  els.chatBody.append(row);
  scrollToBottom();
}

function maybeShowScoreAsset(question) {
  if (!question.assetPath) return;
  if (els.chatBody.querySelector(`[data-asset-id="${question.id}"]`)) return;
  const info = SPEAKERS["相談室"];
  const row = document.createElement("div");
  row.className = "message-row";
  row.dataset.assetId = question.id;
  row.innerHTML = `
    <img class="avatar" src="${info.avatar}" alt="">
    <div class="message-stack">
      <div class="speaker">相談室</div>
      <div class="bubble image-bubble">
        <img src="${escapeAttribute(question.assetPath)}" alt="">
        <div class="caption">${escapeHtml(question.score_caption || "関連図版")}</div>
      </div>
    </div>
  `;
  els.chatBody.append(row);
  scrollToBottom();
}

function speakerDetail(speaker) {
  if (speaker === "バイオリニスト") return "現場でどう直すか";
  if (speaker === "研究マニア") return "理由、データ、仕組み";
  if (speaker === "身体専門家") return "体の使い方、具体的な動き";
  return "";
}

function nextSpeakerAfter(speaker) {
  const index = SPEAKER_ORDER.indexOf(speaker);
  return index >= 0 ? SPEAKER_ORDER[index + 1] : null;
}

function answerTurns(question, speaker) {
  return question.discussion.filter((turn) => turn.speaker === speaker);
}

function glossaryFor(text) {
  return HARD_WORDS.filter(([term]) => text.includes(term)).slice(0, 6);
}

function coreSentence(text) {
  const sentences = splitForClarification(text);
  return sentences.find((sentence) => /まず|つまり|原因|大事|今日|必要|してください/u.test(sentence)) || sentences[0] || "";
}

function clarificationMap(text) {
  const sentences = splitForClarification(text);
  const conclusion = coreSentence(text);
  const reason = sentences.find((sentence) => /理由|原因|ので|から|ため/u.test(sentence)) || conclusion;
  const action = sentences.find((sentence) => /してください|やる|練習|置き|戻|見る|組み込/u.test(sentence)) || conclusion;
  const condition = sentences.find((sentence) => /ただし|目安|週間|毎日|無理|できれば|範囲/u.test(sentence)) || "";
  return [
    "全体地図です。",
    `1. 結論: ${shorten(simplifySentence(conclusion), 62)}`,
    `2. 理由: ${shorten(simplifySentence(reason), 62)}`,
    `3. やること: ${shorten(simplifySentence(action), 62)}`,
    condition ? `4. 条件: ${shorten(simplifySentence(condition), 62)}` : "4. 条件: ここでは大きな例外や目安は出ていません。",
  ].join("\n");
}

function sentenceLabel(sentence) {
  if (/ただし|目安|週間|毎日|無理|できれば|範囲/u.test(sentence)) return "条件";
  if (/理由|原因|ので|から|ため/u.test(sentence)) return "理由";
  if (/してください|やる|練習|置き|戻|見る|組み込|意識/u.test(sentence)) return "やること";
  if (/まず|つまり|要は|大事|必要/u.test(sentence)) return "結論";
  return "説明";
}

function splitForClarification(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .match(/[^。！？!?]+[。！？!?]?/g)
    ?.map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 18) || [];
}

function simplifySentence(sentence) {
  let result = sentence;
  HARD_WORDS.forEach(([term, plain]) => {
    result = result.replaceAll(term, `${term}（${plain}）`);
  });
  PLAIN_REWRITES.forEach(([pattern, replacement]) => {
    result = result.replace(pattern, replacement);
  });
  return result
    .replace(/ということです。?$/u, "という意味です。")
    .replace(/というわけです。?$/u, "という流れです。")
    .replace(/必要があります/u, "必要です")
    .replace(/考えてください/u, "考えると分かりやすいです")
    .trim();
}

function makeChoiceTitle(question) {
  return question.title
    .replace(/された$/u, "される")
    .replace(/しんどい$/u, "つらい")
    .replace(/\?$/u, "")
    .trim();
}

function makeAskText(question) {
  const cleaned = sanitizeQuestion(question.question);
  return `これで困っています。\n${cleaned}`;
}

function makePlainLead(question) {
  const first = removeDenseParentheses(question.prescription[0] || "");
  if (!first) return "まずは状況を分けて考えます。今すぐ全部を直そうとせず、できるところから見ます。";
  return `まず短く言うと、最初に見るのはここです。\n${first}`;
}

function sanitizeQuestion(text) {
  return String(text || "")
    .replace(/[A-Z]\.?[A-Z]?\.?さん（[^）]+）/gu, "")
    .replace(/\d+歳の息子/gu, "子ども")
    .replace(/\d+歳の娘/gu, "子ども")
    .replace(/\d+歳[、,]/gu, "")
    .replace(/\d+代[、,]/gu, "")
    .replace(/バイオリン歴[^\s、。]+[、,]?/gu, "")
    .replace(/レッスン歴[^\s、。]+[、,]?/gu, "")
    .replace(/再入門して[^\s、。]+[、,]?/gu, "")
    .replace(/\s+/gu, " ")
    .trim();
}

function removeDenseParentheses(text) {
  return String(text || "")
    .replace(/（[^）]{1,26}）/gu, "")
    .replace(/\([^)]{1,26}\)/gu, "")
    .replace(/\s+/gu, " ")
    .trim();
}

function splitText(text, maxLength) {
  const normalized = String(text || "").replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return [normalized];
  const sentences = normalized.match(/[^。！？!?]+[。！？!?]?/g) || [normalized];
  const chunks = [];
  let current = "";
  sentences.forEach((sentence) => {
    const next = current ? `${current}${sentence}` : sentence;
    if (next.length <= maxLength) {
      current = next;
      return;
    }
    if (current) chunks.push(current);
    if (sentence.length <= maxLength) {
      current = sentence;
      return;
    }
    for (let i = 0; i < sentence.length; i += maxLength) chunks.push(sentence.slice(i, i + maxLength));
    current = "";
  });
  if (current) chunks.push(current);
  const compact = chunks.filter(Boolean);
  if (compact.length > 1 && compact[compact.length - 1].length <= 8) {
    compact[compact.length - 2] = `${compact[compact.length - 2]}${compact.pop()}`;
  }
  return compact;
}

function groupForQuestion(question) {
  return PROBLEM_GROUPS.find((group) => group.chapters.includes(question.chapter)) || PROBLEM_GROUPS[0];
}

function groupLabelForQuestion(question) {
  return groupForQuestion(question).label;
}

function shorten(text, limit) {
  const value = String(text || "").replace(/\s+/g, " ").trim();
  return value.length > limit ? `${value.slice(0, limit)}...` : value;
}

function scrollToBottom() {
  requestAnimationFrame(() => {
    els.chatBody.scrollTop = els.chatBody.scrollHeight;
  });
}

function tierLabel(tier) {
  if (tier === 1) return "軽め";
  if (tier === 2) return "標準";
  if (tier === 3) return "深め";
  return "未分類";
}

function normalize(text) {
  return String(text || "").toLowerCase().normalize("NFKC");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}

init();
