/* 砚芽 · 玄境 Seed 01 — dependency-free local-first interactive prototype */
(() => {
  "use strict";

  const PREFIX = "yanya.xuanjing.";
  const MEMORY_KEY = PREFIX + "memories.v1";
  const CHAT_KEY = PREFIX + "chat-preview.v1";
  const PERIOD_KEY = PREFIX + "period-override.v1";
  const LOCATIONS = {
    heart: { title: "岛心 · 对话", kicker: "LIVE CHAT / LOCAL FIRST" },
    stars: { title: "星阁", kicker: "CONSTELLATION OF MEMORIES" },
    oracle: { title: "签庭", kicker: "THE ORACLE GARDEN" },
    library: { title: "藏书楼", kicker: "LIBRARY OF WORLDS" },
    workshop: { title: "天机台", kicker: "ARCANE WORKSHOP" },
    creation:{title:"创作角",kicker:"STORY ATELIER"},
    theme: {title:"外观",kicker:"APPEARANCE"},
    garden: { title: "灵圃", kicker: "A GARDEN IN GROWTH" }
  };
  const SIGNS = [
    { name: "初芽", mark: "❀", text: "今日宜从小处开始。微光落在叶尖，便是新的生长。", hint: "不必把每一种可能都安排妥当。" },
    { name: "望星", mark: "✧", text: "长夜无须匆忙。抬头时，那颗星已经在。", hint: "给心里惦记的事留一点位置。" },
    { name: "听潮", mark: "≈", text: "潮来潮往，自有节律。你也可以慢一点。", hint: "今天适合重新审视自己的步调。" },
    { name: "知月", mark: "☾", text: "月有盈亏，并不妨碍它清亮。", hint: "允许一段故事保留未完成的模样。" },
    { name: "花信", mark: "✿", text: "一封风中的花信，终于抵达枝头。", hint: "可向重要的人说一句平常的话。" },
    { name: "归舟", mark: "◇", text: "走过山海，终会找到愿意停靠的岸。", hint: "去看看那些已经被你珍藏的东西。" },
    { name: "青灯", mark: "✳", text: "灯还亮着，书页未合。好的答案也许正在路上。", hint: "留意一个不起眼的小发现。" },
    { name: "星河", mark: "✶", text: "星群看似遥远，细线一连，便成了图。", hint: "试着把零散的灵感连在一起。" }
  ];

  const $ = (selector, root = document) => root.querySelector(selector);
  const panel = $("#panel");
  const scrim = $("#panelScrim");
  const content = $("#panelContent");
  const closeButton = $("#panelClose");
  let currentLocation = null;
  let previousFocus = null;

  const safeRead = (key, fallback) => {
    try {
      const text = localStorage.getItem(key);
      return text === null ? fallback : JSON.parse(text);
    } catch (_) { return fallback; }
  };
  const safeWrite = (key, value) => {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (_) { return false; }
  };
  const dayKey = (date = new Date()) => {
    return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
  };
  const memories = () => {
    const list = safeRead(MEMORY_KEY, []);
    return Array.isArray(list) ? list.filter(x => x && typeof x.text === "string") : [];
  };
  const chatHistory = () => {
    const list = safeRead(CHAT_KEY, []);
    return Array.isArray(list) ? list.filter(x => typeof x === "string") : [];
  };
  function addMemory(text, type = "手记", id = "") {
    const list = memories();
    const item = { id: id || String(Date.now()) + "." + Math.random().toString(36).slice(2, 7), text, type, created: new Date().toISOString() };
    if (!list.some(x => x.id === item.id)) list.unshift(item);
    if (safeWrite(MEMORY_KEY, list.slice(0, 150))) return true;
    return false;
  }
  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function card(title, description) {
    const box = element("article", "module-card");
    box.append(element("h3", "", title), element("p", "", description));
    return box;
  }
  function lead(text) { return element("p", "section-lead", text); }
  function button(text, click, secondary = false) {
    const node = element("button", secondary ? "secondary-button" : "primary-button", text);
    node.type = "button";
    node.addEventListener("click", click);
    return node;
  }
  function dateLabel() {
    const date = new Date();
    $("#localDate").textContent = new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric", weekday: "long" }).format(date);
  }
  function preferredPeriod() {
    const override = safeRead(PERIOD_KEY, null);
    if (override === "day" || override === "night") return override;
    const hour = new Date().getHours();
    return (hour >= 6 && hour < 18) ? "day" : "night";
  }
  function applyPeriod(period) {
    document.body.dataset.period = period;
    $("#periodToggle").textContent = period === "day" ? "☼" : "☾";
    $("#periodToggle").setAttribute("aria-label", period === "day" ? "当前白昼，切换月夜" : "当前月夜，切换白昼");
    $("#periodLabel").textContent = period === "day" ? "白昼 · 灵圃见晴" : "今夜 · 星海微明";
  }
  $("#periodToggle").addEventListener("click", () => {
    if(window.YanyaTheme){window.YanyaTheme.togglePeriod();return}
    const next = document.body.dataset.period === "day" ? "night" : "day";
    safeWrite(PERIOD_KEY, next);
    applyPeriod(next);
  });
  applyPeriod(window.YanyaTheme?document.body.dataset.period:preferredPeriod());
  window.addEventListener("yanya-theme-change",e=>applyPeriod(e.detail.period));
  $("#creationOpen")?.addEventListener("click",()=>openPanel("creation"));
  $("#themeOpen")?.addEventListener("click",()=>openPanel("theme"));
  dateLabel();

  function renderHeart() {
    if(window.YanyaChat && typeof window.YanyaChat.mount==="function"){
      window.YanyaChat.mount(content);
    }else{
      content.append(lead("对话功能没有载入。请刷新页面后重试。"));
    }
  }

  function renderMemories() {
    content.replaceChildren();
    content.append(lead("每一段主动珍藏的句子，都是星阁里的一点微光。当前只存在此设备的浏览器存储中。"));
    const form = element("section", "module-card");
    form.append(element("h3", "", "点亮一颗星"));
    const textarea = element("textarea", "field");
    textarea.placeholder = "把想记住的一句话写在这里…";
    textarea.setAttribute("aria-label", "写下新的星阁记忆");
    textarea.maxLength = 3000;
    const row = element("div", "row-inline");
    const status = element("span", "save-status");
    row.append(button("珍藏这段话", () => {
      const text = textarea.value.trim();
      if (!text) { status.textContent = "先写一点内容。"; return; }
      if (!addMemory(text)) { status.textContent = "存储失败，请检查浏览器设置。"; return; }
      textarea.value = "";
      renderMemories();
    }), status);
    form.append(textarea, row);
    content.append(form);
    const saved = memories();
    const list = element("section", "");
    const header = element("div", "row-inline");
    header.append(element("h3", "", "珍藏的星光 · " + saved.length));
    list.append(header);
    if (!saved.length) {
      const empty = element("div", "empty-state");
      empty.append(element("span", "empty-icon", "✧"), element("span", "", "星阁还很安静。\n第一颗星，等你亲自点亮。"));
      list.append(empty);
    } else {
      saved.forEach(entry => {
        const item = element("article", "memory-card");
        item.append(element("strong", "", entry.text));
        const when = new Date(entry.created);
        const date = Number.isNaN(when.getTime()) ? "" : when.toLocaleDateString("zh-CN");
        item.append(element("small", "", entry.type + " · " + date));
        item.append(button("移除这颗星", () => {
          const updated = memories().filter(x => x.id !== entry.id);
          if (safeWrite(MEMORY_KEY, updated)) renderMemories();
        }, true));
        list.append(item);
      });
    }
    content.append(list);
  }

  function dailySign() {
    const key = dayKey();
    let code = 7;
    for (const ch of key) code = (code * 31 + ch.charCodeAt(0)) >>> 0;
    return SIGNS[code % SIGNS.length];
  }
  function renderOracle() {
    content.append(lead("签庭里同时收藏东方签意与西式星象。第一颗种子先做每日一签；塔罗牌阵与月相观测会在后续加入。"));
    const sign = dailySign();
    const glyph = element("div", "oracle-sigil", sign.mark);
    const title = element("div", "oracle-result", sign.name);
    const description = element("p", "oracle-text", sign.text);
    const hint = element("p", "oracle-text", sign.hint);
    const row = element("div", "row-inline");
    const id = "oracle." + dayKey();
    const result = element("span", "save-status");
    row.append(button("收进星阁", () => {
      if (addMemory(sign.name + "｜" + sign.text + "\n" + sign.hint, "今日灵签", id)) result.textContent = "已经珍藏。";
      else result.textContent = "本机存储不可用。";
    }), result);
    content.append(glyph, title, description, hint, row);
    content.append(element("p", "minor-note", "同一天呈现同一张签，第二天自然换签。仅作仪式感与自我表达，不用于现实决策预测。"));
  }

  function renderLibrary() {
    window.YanyaLibrary.mount(content);
    content.append(button("打开创作角",()=>openPanel("creation")));
  }

  function renderWorkshop() {
    if (window.YanyaBaZi && typeof window.YanyaBaZi.mount === "function") {
      window.YanyaBaZi.mount(content);
    } else {
      content.append(card("四柱命盘", "排盘页面未载入，请刷新网页后重试。"));
    }
    const expand = element("details", "tianji-bridge");
    expand.append(element("summary", "", "其他术式 · 开发中"));
    expand.append(card("星匣 · 模型管理", "后续增加 Provider 配置、密钥安全存储与连通性测试。"));
    const mcpBox=element("div","module-card");window.YanyaMCP?.mount(mcpBox);expand.append(mcpBox);
    expand.append(card("观星镜 · 多模态", "后续整合生图、视觉模型、语音与附件。"));
    content.append(expand);
    const dataBox=element("div","module-card");window.YanyaData?.mount(dataBox);content.append(dataBox);
  }
  function renderGarden() {
    const count = memories().length;
    const stage = count >= 20 ? "花木繁盛" : count >= 8 ? "枝叶舒展" : count >= 3 ? "新叶初展" : "砚芽初生";
    content.append(lead("灵圃先从真实、可解释的变化开始。每一点主动收藏，都会留下可追溯的生长痕迹。"));
    const box = element("div", "module-card");
    box.append(element("div", "oracle-sigil", count >= 8 ? "❀" : count >= 3 ? "✿" : "❋"));
    box.append(element("h3", "", stage), element("p", "", "当前本机已珍藏 " + count + " 段记忆。"));
    const row = element("div", "row-inline");
    row.append(button("去星阁添一颗星", () => openPanel("stars")));
    box.append(row);
    content.append(box);
    content.append(card("即将落地的季节", "节气、晨昏、花木、萤火、雨雾会影响岛景，但都提供动画和性能控制。"));
    content.append(card("不绑架人的成长", "不会用强制连续签到或惩罚机制逼迫使用。成长来自真实的收藏与纪念。"));
  }

  function openPanel(id) {
    const location = LOCATIONS[id];
    if (!location) return;
    if (!currentLocation) previousFocus = document.activeElement;
    if(currentLocation==="creation")window.YanyaCreation?.dispose();
    if(currentLocation==="library")window.YanyaLibrary?.dispose();
    if(currentLocation==="heart" && id!=="heart")window.YanyaChat?.dispose?.();
    currentLocation = id;
    panel.classList.toggle("is-chat",id==="heart");
    $("#panelTitle").textContent = location.title;
    $("#panelKicker").textContent = location.kicker;
    content.replaceChildren();
    switch (id) {
      case "heart": renderHeart(); break;
      case "stars": renderMemories(); break;
      case "oracle": renderOracle(); break;
      case "library": renderLibrary(); break;
      case "workshop": renderWorkshop(); break;
      case "garden": renderGarden(); break;
      case "creation":window.YanyaCreation?.mount(content);break;
      case "theme":window.YanyaTheme?.mount(content);break;
    }
    scrim.hidden = false;
    panel.classList.add("is-open");
    panel.setAttribute("aria-hidden", "false");
    document.body.classList.add("panel-open");
    closeButton.focus();
  }
  function closePanel() {
    if (!currentLocation) return;
    if(currentLocation==="heart")window.YanyaChat?.dispose?.();
    if(currentLocation==="creation")window.YanyaCreation?.dispose();
    if(currentLocation==="library")window.YanyaLibrary?.dispose();
    currentLocation = null;
    panel.classList.remove("is-open","is-chat");
    panel.setAttribute("aria-hidden", "true");
    scrim.hidden = true;
    document.body.classList.remove("panel-open");
    if (previousFocus && previousFocus.isConnected) previousFocus.focus();
    previousFocus = null;
  }
  document.querySelectorAll("[data-location]").forEach(node => {
    node.addEventListener("click", () => openPanel(node.dataset.location));
  });
  closeButton.addEventListener("click", closePanel);
  scrim.addEventListener("click", closePanel);
  document.addEventListener("keydown", event => {
    if (!currentLocation) return;
    if (event.key === "Escape") { event.preventDefault(); closePanel(); return; }
    if (event.key !== "Tab") return;
    const controls = Array.from(panel.querySelectorAll("button:not([disabled]),textarea:not([disabled]),input:not([disabled]),a[href],select:not([disabled])")).filter(el => el.getClientRects().length > 0);
    if (!controls.length) { event.preventDefault(); panel.focus(); return; }
    if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls[controls.length - 1].focus(); }
    else if (!event.shiftKey && document.activeElement === controls[controls.length - 1]) { event.preventDefault(); controls[0].focus(); }
  });
})();
