const DATA = window.VIOLIN_QA_DATA;

const SPEAKERS = {
  "相談者": {
    key: "questioner",
    avatar: "assets/avatars/questioner.png",
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
  "相談室": {
    key: "system",
    avatar: "assets/avatars/violinist.png",
  },
};

const els = {
  body: document.body,
  chatBody: document.getElementById("chatBody"),
  quickReplies: document.getElementById("quickReplies"),
  replyStatus: document.getElementById("replyStatus"),
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
  queueToken: 0,
};

function init() {
  if (!DATA || !Array.isArray(DATA.questions)) {
    els.chatBody.innerHTML = "";
    addMessage("相談室", "データを読み込めませんでした。data/questions.js を再生成してください。", { kind: "system" });
    return;
  }

  renderChapters();
  bindEvents();
  renderQuestionList();
  resetConversation();

  const params = new URLSearchParams(window.location.search);
  const deepLinkId = params.get("q");
  if (deepLinkId && DATA.questions.some((q) => q.id === deepLinkId.toUpperCase())) {
    const question = selectQuestion(deepLinkId.toUpperCase());
    if (params.get("view") === "answer") {
      renderFullDiscussion(question);
      showAfterQuestionActions(question);
    }
    return;
  }

  const lastId = localStorage.getItem("violin-qa-last-id");
  if (lastId && DATA.questions.some((q) => q.id === lastId)) {
    setQuickReplies([
      reply(`前回の相談 ${lastId} を開く`, () => selectQuestion(lastId), "primary"),
      reply("章から選ぶ", () => showChapterChoices()),
      reply("ランダム相談", () => pickRandomQuestion()),
    ]);
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
  allButton.textContent = "全章";
  allButton.addEventListener("click", () => chooseChapterFilter("all"));
  els.chapterStrip.append(allButton);

  DATA.chapters.forEach((chapter) => {
    const button = document.createElement("button");
    button.className = "chapter-tab";
    button.type = "button";
    button.textContent = `第${chapter.id}章`;
    button.title = chapter.title;
    button.addEventListener("click", () => chooseChapterFilter(String(chapter.id)));
    els.chapterStrip.append(button);
  });
}

function chooseChapterFilter(chapter) {
  state.chapter = chapter;
  document.querySelectorAll(".chapter-tab").forEach((button, index) => {
    const isAll = chapter === "all" && index === 0;
    const matches = index > 0 && DATA.chapters[index - 1].id === Number(chapter);
    button.classList.toggle("active", isAll || matches);
  });
  renderQuestionList();
}

function getFilteredQuestions() {
  const query = normalize(state.search);
  return DATA.questions.filter((q) => {
    const chapterMatch = state.chapter === "all" || q.chapter === Number(state.chapter);
    const tierMatch = state.tier === "all" || q.tier === Number(state.tier);
    if (!chapterMatch || !tierMatch) return false;
    if (!query) return true;

    const haystack = normalize([
      q.id,
      q.title,
      q.persona,
      q.question,
      q.discussion.map((turn) => `${turn.speaker} ${turn.text}`).join(" "),
      q.prescription.join(" "),
      q.sources.join(" "),
    ].join(" "));
    return haystack.includes(query);
  });
}

function renderQuestionList() {
  const questions = getFilteredQuestions();
  els.questionCount.textContent = `${questions.length}件`;
  els.questionList.innerHTML = "";

  if (questions.length === 0) {
    els.questionList.innerHTML = `<div class="empty-state">該当する相談がありません。</div>`;
    return;
  }

  const frag = document.createDocumentFragment();
  questions.forEach((q) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `question-card ${state.activeQuestion?.id === q.id ? "active" : ""}`;
    button.innerHTML = `
      <div class="meta"><span>${escapeHtml(q.id)}</span><span>${escapeHtml(getChapterTitle(q.chapter))}</span><span>${tierLabel(q.tier)}</span></div>
      <div class="title">${escapeHtml(q.title)}</div>
      <div class="persona">${escapeHtml(q.persona)}</div>
    `;
    button.addEventListener("click", () => selectQuestion(q.id));
    frag.append(button);
  });

  els.questionList.append(frag);
}

function resetConversation() {
  state.queueToken += 1;
  state.activeQuestion = null;
  els.chatBody.innerHTML = "";
  els.roomTitle.textContent = "バイオリンQ&A相談室";
  els.roomSub.textContent = "3人の専門家が順番に答えます";
  addDatePill("今日");
  addMessage("相談室", "相談したい章を選んでください。章から入っても、左の一覧や検索から直接選んでも大丈夫です。", { kind: "system" });
  showChapterChoices();
}

function showChapterChoices() {
  const replies = DATA.chapters.map((chapter) => reply(`第${chapter.id}章 ${chapter.title}`, () => chooseChapterInChat(chapter.id)));
  replies.unshift(reply("ランダム相談", () => pickRandomQuestion(), "primary"));
  setQuickReplies(replies);
  els.replyStatus.textContent = "章を選んでください";
}

function chooseChapterInChat(chapterId) {
  const chapter = DATA.chapters.find((item) => item.id === chapterId);
  addUserMessage(`第${chapter.id}章 ${chapter.title}`);
  chooseChapterFilter(String(chapterId));
  addMessage("相談室", "この章の相談を選んでください。", { kind: "system" });
  const questions = DATA.questions.filter((q) => q.chapter === chapterId);
  setQuickReplies(questions.map((q) => reply(`${q.id} ${q.title}`, () => selectQuestion(q.id))));
  els.replyStatus.textContent = `${questions.length}件から選べます`;
}

function selectQuestion(id) {
  const question = DATA.questions.find((q) => q.id === id);
  if (!question) return null;

  state.queueToken += 1;
  state.activeQuestion = question;
  localStorage.setItem("violin-qa-last-id", question.id);
  els.body.classList.remove("drawer-open");
  chooseChapterFilter(String(question.chapter));
  renderQuestionList();
  els.roomTitle.textContent = `${question.id} ${question.title}`;
  els.roomSub.textContent = getChapterTitle(question.chapter);

  addUserMessage(`${question.id}を相談する`);
  addMessage("相談者", `${question.persona}\n\n${question.question}`, { kind: "question" });

  const replies = [
    reply("3人の回答を読む", () => showDiscussion(question), "primary"),
    reply("処方箋を見る", () => showPrescription(question), "warn"),
    reply("出典を見る", () => showSources(question)),
    reply("別の相談", () => resetConversation()),
  ];
  setQuickReplies(replies);
  els.replyStatus.textContent = "読みたい内容を選んでください";
  return question;
}

function showDiscussion(question) {
  addUserMessage("3人の回答を読む");
  setQuickReplies([reply("一気に表示", () => flushQueue(), "primary")]);
  els.replyStatus.textContent = "回答を表示しています";

  const token = ++state.queueToken;
  const queue = [];
  question.discussion.forEach((turn) => {
    splitText(turn.text, 118).forEach((part, index) => {
      queue.push({
        speaker: turn.speaker,
        text: part,
        showName: index === 0,
      });
    });
  });
  playQueue(queue, token, () => {
    if (token !== state.queueToken) return;
    showAfterQuestionActions(question);
  });
}

function showPrescription(question) {
  addUserMessage("処方箋を見る");
  state.queueToken += 1;
  question.prescription.forEach((item, index) => {
    addMessage("身体専門家", `${index + 1}. ${item}`, { kind: "prescription", showName: index === 0 });
  });
  maybeShowScoreAsset(question);
  showAfterQuestionActions(question);
}

function showSources(question) {
  addUserMessage("出典を見る");
  state.queueToken += 1;
  const text = question.sources.length
    ? question.sources.map((source, index) => `${index + 1}. ${source}`).join("\n\n")
    : "出典情報は未登録です。";
  splitText(text, 240).forEach((part, index) => {
    addMessage("相談室", part, { kind: "sources", showName: index === 0 });
  });
  showAfterQuestionActions(question);
}

function maybeShowScoreAsset(question) {
  if (!question.assetPath) return;
  if (els.chatBody.querySelector(`[data-asset-id="${question.id}"]`)) return;
  const caption = question.score_caption || "関連図版";
  addImageMessage("相談室", question.assetPath, caption, question.id);
}

function showAfterQuestionActions(question) {
  setQuickReplies([
    reply("処方箋", () => showPrescription(question), "warn"),
    reply("出典", () => showSources(question)),
    reply("この章の別相談", () => chooseChapterInChat(question.chapter)),
    reply("ランダム相談", () => pickRandomQuestion()),
    reply("最初に戻る", () => resetConversation()),
  ]);
  els.replyStatus.textContent = "次の操作を選べます";
}

function pickRandomQuestion() {
  const pool = getFilteredQuestions();
  const questions = pool.length ? pool : DATA.questions;
  const question = questions[Math.floor(Math.random() * questions.length)];
  addUserMessage("ランダム相談");
  selectQuestion(question.id);
}

function playQueue(queue, token, done) {
  if (!queue.length) {
    done();
    return;
  }

  showTyping(token);
  const next = () => {
    if (token !== state.queueToken) return;
    removeTyping();
    const item = queue.shift();
    addMessage(item.speaker, item.text, { showName: item.showName });
    if (!queue.length) {
      done();
      return;
    }
    showTyping(token);
    window.setTimeout(next, Math.min(520, 160 + item.text.length * 2));
  };
  window.setTimeout(next, 360);
}

function flushQueue() {
  state.queueToken += 1;
  removeTyping();
  if (!state.activeQuestion) return;
  const question = state.activeQuestion;
  renderFullDiscussion(question);
  showAfterQuestionActions(question);
}

function renderFullDiscussion(question) {
  question.discussion.forEach((turn) => {
    splitText(turn.text, 118).forEach((part, index) => {
      addMessage(turn.speaker, part, { showName: index === 0 });
    });
  });
  maybeShowScoreAsset(question);
}

function addDatePill(text) {
  const div = document.createElement("div");
  div.className = "date-pill";
  div.textContent = text;
  els.chatBody.append(div);
}

function addUserMessage(text) {
  const row = document.createElement("div");
  row.className = "message-row user";
  row.innerHTML = `<div class="bubble user">${escapeHtml(text)}</div>`;
  els.chatBody.append(row);
  scrollToBottom();
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
}

function addImageMessage(speaker, src, caption, assetId = "") {
  const info = SPEAKERS[speaker] || SPEAKERS["相談室"];
  const row = document.createElement("div");
  row.className = "message-row";
  if (assetId) row.dataset.assetId = assetId;
  row.innerHTML = `
    <img class="avatar" src="${info.avatar}" alt="">
    <div class="message-stack">
      <div class="speaker">${escapeHtml(speaker)}</div>
      <div class="bubble image-bubble">
        <img src="${escapeAttribute(src)}" alt="">
        <div class="caption">${escapeHtml(caption)}</div>
      </div>
    </div>
  `;
  els.chatBody.append(row);
  scrollToBottom();
}

function showTyping(token) {
  removeTyping();
  if (token !== state.queueToken) return;
  const row = document.createElement("div");
  row.className = "message-row typing-row";
  row.innerHTML = `
    <img class="avatar" src="assets/avatars/violinist.png" alt="">
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

function setQuickReplies(replies) {
  els.quickReplies.innerHTML = "";
  const frag = document.createDocumentFragment();
  replies.forEach((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `quick-chip ${item.variant || ""}`.trim();
    button.textContent = item.label;
    button.addEventListener("click", item.handler);
    frag.append(button);
  });
  els.quickReplies.append(frag);
}

function reply(label, handler, variant = "") {
  return { label, handler, variant };
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
    for (let i = 0; i < sentence.length; i += maxLength) {
      chunks.push(sentence.slice(i, i + maxLength));
    }
    current = "";
  });

  if (current) chunks.push(current);
  return chunks.filter(Boolean);
}

function scrollToBottom() {
  requestAnimationFrame(() => {
    els.chatBody.scrollTop = els.chatBody.scrollHeight;
  });
}

function getChapterTitle(chapterId) {
  const chapter = DATA.chapters.find((item) => item.id === chapterId);
  return chapter ? chapter.title : `第${chapterId}章`;
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
