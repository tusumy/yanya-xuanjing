/* 砚芽 · 玄境 | 太极衍化阵：独立于原版浮岛和对话逻辑的首页层。 */
(() => {
  "use strict";
  const root = document.getElementById("cosmosMount");
  const originalIsland = document.querySelector(".world");
  if (!root || !originalIsland) return;

  const NS = "http://www.w3.org/2000/svg";
  const PREFIX = "yanya.xuanjing.";
  const LEVELS = [
    { n: 1, name: "太极", note: "一念未分，万象未起" },
    { n: 2, name: "两仪", note: "阴阳初分，天地有序" },
    { n: 4, name: "四象", note: "阴阳交互，四象成形" },
    { n: 8, name: "八卦", note: "八象成环，山海有门" },
    { n: 16, name: "十六", note: "四爻推演，枝叶初繁" },
    { n: 32, name: "三十二", note: "五爻推演，星轨渐密" },
    { n: 64, name: "六十四", note: "上下八卦相重，六十四卦" }
  ];
  // 位序从下爻到上爻，1 为阳，0 为阴；方位以普通地图“北上南下”呈现先天八卦。
  const TRIGRAMS = [
    { id:"qian", char:"☰", name:"乾", nature:"天", bits:"111", desc:"刚健，自强，生生不息", gate:"workshop", angle:180 },
    { id:"dui",  char:"☱", name:"兑", nature:"泽", bits:"110", desc:"和悦，交流，水光相映", gate:"oracle", angle:135 },
    { id:"li",   char:"☲", name:"离", nature:"火", bits:"101", desc:"明亮，照见，灯火不息", gate:"heart", angle:90 },
    { id:"zhen", char:"☳", name:"震", nature:"雷", bits:"100", desc:"萌动，初发，万物苏醒", gate:"garden", angle:45 },
    { id:"xun",  char:"☴", name:"巽", nature:"风", bits:"011", desc:"柔入，流转，风过书页", gate:"library", angle:225 },
    { id:"kan",  char:"☵", name:"坎", nature:"水", bits:"010", desc:"流动，深思，星光映水", gate:"stars", angle:270 },
    { id:"gen",  char:"☶", name:"艮", nature:"山", bits:"001", desc:"止静，收藏，山中藏书", gate:"library", angle:315 },
    { id:"kun",  char:"☷", name:"坤", nature:"地", bits:"000", desc:"承载，包容，养育新芽", gate:"garden", angle:0 }
  ];
  const PORTAL_NAMES = { heart:"岛心", stars:"星阁", oracle:"签庭", library:"藏书楼", workshop:"天机台", garden:"灵圃" };
  // 行：下卦，列：上卦；先后次序为乾兑离震巽坎艮坤。编号采用文王卦序。
  const WEN = [
    [[1,"乾"],[43,"夬"],[14,"大有"],[34,"大壮"],[9,"小畜"],[5,"需"],[26,"大畜"],[11,"泰"]],
    [[10,"履"],[58,"兑"],[38,"睽"],[54,"归妹"],[61,"中孚"],[60,"节"],[41,"损"],[19,"临"]],
    [[13,"同人"],[49,"革"],[30,"离"],[55,"丰"],[37,"家人"],[63,"既济"],[22,"贲"],[36,"明夷"]],
    [[25,"无妄"],[17,"随"],[21,"噬嗑"],[51,"震"],[42,"益"],[3,"屯"],[27,"颐"],[24,"复"]],
    [[44,"姤"],[28,"大过"],[50,"鼎"],[32,"恒"],[57,"巽"],[48,"井"],[18,"蛊"],[46,"升"]],
    [[6,"讼"],[47,"困"],[64,"未济"],[40,"解"],[59,"涣"],[29,"坎"],[4,"蒙"],[7,"师"]],
    [[33,"遁"],[31,"咸"],[56,"旅"],[62,"小过"],[53,"渐"],[39,"蹇"],[52,"艮"],[15,"谦"]],
    [[12,"否"],[45,"萃"],[35,"晋"],[16,"豫"],[20,"观"],[8,"比"],[23,"剥"],[2,"坤"]]
  ];
  const TWO = [
    { name:"阴", bits:"0", meaning:"柔静，向内收藏", angle:270 },
    { name:"阳", bits:"1", meaning:"生发，向外舒展", angle:90 }
  ];
  const FOUR = [
    { name:"太阴", bits:"00", meaning:"两阴相承", angle:0 },
    { name:"少阳", bits:"01", meaning:"下阴上阳", angle:90 },
    { name:"太阳", bits:"11", meaning:"两阳相继", angle:180 },
    { name:"少阴", bits:"10", meaning:"下阳上阴", angle:270 }
  ];

  const read = (key, fallback) => {
    try { const data = JSON.parse(localStorage.getItem(PREFIX+key)); return data ?? fallback; }
    catch (_) { return fallback; }
  };
  const save = (key, value) => {
    try { localStorage.setItem(PREFIX+key, JSON.stringify(value)); } catch (_) {}
  };
  const el = (tag, className, label) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (label !== undefined) node.textContent = label;
    return node;
  };
  const svg = (tag, attrs) => {
    const node = document.createElementNS(NS, tag);
    for (const [key,value] of Object.entries(attrs || {})) node.setAttribute(key, String(value));
    return node;
  };
  const btn = (text, cb, className) => {
    const node = el("button", className || "", text);
    node.type = "button"; node.addEventListener("click",cb);
    return node;
  };
  const polar = (angle, distance) => {
    const rad = angle*Math.PI/180;
    return { x:50+distance*Math.sin(rad), y:50-distance*Math.cos(rad) };
  };

  const previous = read("cosmos-level.v1", 8);
  const state = {
    level: LEVELS.some(x=>x.n===previous) ? previous : 8,
    trigram: "qian",
    chosen: 0,
    upper: 0,
    lower: 0,
    view: read("home-view.v1", "cosmos") === "island" ? "island" : "cosmos"
  };

  const switcher = el("div","home-switch");
  switcher.setAttribute("role","group");
  switcher.setAttribute("aria-label","首页景观");
  const diagramButton = btn("✦ 衍化阵图",()=>showView("cosmos"),"home-switch-button");
  const islandButton = btn("❀ 浮岛旧景",()=>showView("island"),"home-switch-button");
  switcher.append(diagramButton,islandButton);
  const metadata = document.querySelector(".intro-meta");
  metadata?.insertAdjacentElement("afterend", switcher);

  const shell = el("section","cosmos");
  shell.setAttribute("aria-label","太极衍化阵");
  const heading = el("div","cosmos-heading");
  const headingEyebrow = el("span","cosmos-small-caps","AN ATLAS OF CHANGING THINGS");
  const title = el("strong","cosmos-heading-title","太极衍化 · 万象归岛");
  const subtitle = el("p","cosmos-heading-subtitle","一念生阴阳，一盘开山海。轻触层级，见天地徐徐展开。");
  heading.append(headingEyebrow,title,subtitle);
  const levels = el("div","cosmos-levels");
  levels.setAttribute("role","group");
  levels.setAttribute("aria-label","衍化层数");
  const orbit = el("div","cosmos-orbit");
  orbit.setAttribute("aria-label","太极八卦星盘");
  const geometry = svg("svg",{class:"cosmos-geometry",viewBox:"0 0 600 600","aria-hidden":"true"});
  const glowing = el("div","cosmos-orbit-glow");
  const nodes = el("div","cosmos-nodes");
  const center = el("div","cosmos-center");
  const core = btn("",()=>setLevel(LEVELS[(LEVELS.findIndex(x=>x.n===state.level)+1)%LEVELS.length].n),"cosmos-core");
  core.setAttribute("title","点击太极，推演下一层");
  core.setAttribute("aria-label","点击太极，推演下一层");
  const taiji = svg("svg",{class:"cosmos-taiji",viewBox:"0 0 100 100","aria-hidden":"true"});
  taiji.append(
    svg("circle",{cx:50,cy:50,r:48,fill:"#d9eacb"}),
    svg("path",{d:"M50 2 A48 48 0 0 1 50 98 A24 24 0 0 1 50 50 A24 24 0 0 0 50 2 Z",fill:"#1b493b"}),
    svg("circle",{cx:50,cy:26,r:6,fill:"#1b493b"}),
    svg("circle",{cx:50,cy:74,r:6,fill:"#d9eacb"}),
    svg("circle",{cx:50,cy:50,r:48,fill:"none",stroke:"#ecf4ce","stroke-width":1.5,"stroke-opacity":.55})
  );
  const centerTitle = el("span","cosmos-center-title","太极");
  const centerHint = el("span","cosmos-center-hint","触碰 · 推演");
  core.append(taiji, centerTitle, centerHint);
  center.append(core);
  orbit.append(glowing, geometry, nodes, center);
  const detail = el("section","cosmos-detail");
  detail.setAttribute("aria-live","polite");
  const footnote = el("p","cosmos-footnote","从太极至八卦是经典表述；十六、三十二为阴阳爻的组合推演；六十四为上下三爻卦相重。阵图仅供探索与观赏。");
  shell.append(heading,levels,orbit,detail,footnote);
  root.append(shell);

  function showView(view) {
    state.view = view;
    document.body.dataset.homeView = view;
    diagramButton.setAttribute("aria-pressed",String(view==="cosmos"));
    islandButton.setAttribute("aria-pressed",String(view==="island"));
    save("home-view.v1",view);
    const status = document.querySelector(".below-scene .scene-status strong");
    const caption = document.querySelector(".below-scene .scene-status small");
    const prompt = document.querySelector(".scene-prompt");
    if (status) status.textContent = view==="cosmos" ? "天地初开" : "砚芽初生";
    if (caption) caption.textContent = view==="cosmos" ? "八卦在山海之间，等你唤醒。" : "岛上的第一盏灯，已经亮了。";
    if (prompt) prompt.textContent = view==="cosmos" ? "点击星盘中的卦象，探索不同的秘境" : "触碰岛上的星标，开启一处秘境";
  }

  function makeGeometry() {
    geometry.replaceChildren();
    for (const r of [118,159,216,262,287]) {
      geometry.append(svg("circle",{cx:300,cy:300,r,class:"cosmos-ring"+(r===262?" cosmos-ring-main":"")}));
    }
    geometry.append(svg("circle",{cx:300,cy:300,r:297,class:"cosmos-ring-faint"}));
    for(let i=0;i<8;i++) {
      const angle=i*Math.PI/4;
      const x1=300+224*Math.sin(angle), y1=300-224*Math.cos(angle);
      const x2=300+257*Math.sin(angle), y2=300-257*Math.cos(angle);
      geometry.append(svg("line",{x1,y1,x2,y2,class:"cosmos-ray"}));
    }
    for(let i=0;i<state.level;i++) {
      const angle=2*Math.PI*i/state.level;
      const inner= state.level<=8 ? 273 : 277;
      const x1=300+inner*Math.sin(angle), y1=300-inner*Math.cos(angle);
      const x2=300+290*Math.sin(angle), y2=300-290*Math.cos(angle);
      geometry.append(svg("line",{x1,y1,x2,y2,class:"cosmos-tick"+(i%8===0?" cosmos-tick-strong":"")}));
    }
    for (const angle of [22.5,112.5,202.5,292.5]) {
      const rad=angle*Math.PI/180;
      geometry.append(svg("circle",{cx:300+245*Math.sin(rad),cy:300-245*Math.cos(rad),r:2,class:"cosmos-starpoint"}));
    }
  }

  function lineGlyph(bits, className="cosmos-lines") {
    const wrap = el("div",className);
    wrap.setAttribute("aria-label",bits.split("").map(b=>b==="1"?"阳":"阴").join("、")+"，自下而上");
    for(const bit of bits.split("").reverse()) {
      const row=el("div","cosmos-line"+(bit==="0"?" is-yin":""));
      row.append(el("span",""), ...(bit==="0"?[el("span","")]:[]));
      wrap.append(row);
    }
    return wrap;
  }

  function addNode(label, sublabel, angle, kind, onClick, active=false) {
    const node=btn(" ",onClick,"cosmos-node cosmos-node-"+kind+(active?" is-active":""));
    node.replaceChildren(el("span","cosmos-node-symbol",label),el("span","cosmos-node-label",sublabel));
    node.setAttribute("aria-label",label+" "+sublabel);
    node.setAttribute("aria-pressed",String(active));
    const p=polar(angle,39.4);
    node.style.left=p.x+"%";
    node.style.top=p.y+"%";
    nodes.append(node);
  }

  function renderNodes() {
    nodes.replaceChildren();
    if(state.level===2) {
      TWO.forEach(item=>addNode(item.bits==="0"?"⚋":"⚊",item.name,item.angle,"minimal",()=>{state.chosen=Number(item.bits);render();}, state.chosen===Number(item.bits)));
    } else if(state.level===4) {
      FOUR.forEach((item,i)=>addNode(item.bits.replaceAll("0","⚋").replaceAll("1","⚊"),item.name,item.angle,"minimal",()=>{state.chosen=i;render();},state.chosen===i));
    } else if(state.level>=8) {
      TRIGRAMS.forEach((t,i)=>{
        addNode(t.char,t.name+" · "+t.nature,t.angle,"trigram",()=>{
          state.trigram=t.id;
          if(state.level===64) state.lower=i;
          render();
        },state.trigram===t.id);
      });
    }
  }

  function portalButton(name, gate) {
    return btn("进入"+name+" ↗",()=>{
      const link = document.querySelector('.dock [data-location="'+gate+'"]');
      link?.click();
    },"cosmos-portal");
  }

  function renderDetail() {
    detail.replaceChildren();
    const info = LEVELS.find(x=>x.n===state.level);
    const titleRow = el("div","cosmos-detail-title");
    titleRow.append(el("span","cosmos-stage-index",String(state.level).padStart(2,"0")),el("h2","",info.name),el("span","cosmos-stage-desc",info.note));
    detail.append(titleRow);

    if(state.level===1) {
      const row=el("div","cosmos-detail-content");
      row.append(el("p","", "混沌未分，一圆为始。触碰中央太极，向下一层推演。"), btn("生两仪 →",()=>setLevel(2),"cosmos-portal"));
      detail.append(row);
    } else if(state.level===2) {
      const item=TWO[state.chosen % 2];
      const row=el("div","cosmos-detail-content");
      row.append(lineGlyph(item.bits),el("p","",item.name+" · "+item.meaning),btn("衍四象 →",()=>setLevel(4),"cosmos-portal"));
      detail.append(row);
    } else if(state.level===4) {
      const item=FOUR[state.chosen % 4];
      const row=el("div","cosmos-detail-content");
      row.append(lineGlyph(item.bits),el("p","",item.name+" · "+item.meaning),btn("化八卦 →",()=>setLevel(8),"cosmos-portal"));
      detail.append(row);
    } else if(state.level===8) {
      const t=TRIGRAMS.find(x=>x.id===state.trigram)||TRIGRAMS[0];
      const row=el("div","cosmos-detail-content");
      row.append(lineGlyph(t.bits),el("p","",t.char+" "+t.name+"为"+t.nature+" · "+t.desc),portalButton(PORTAL_NAMES[t.gate],t.gate));
      detail.append(row);
      detail.append(el("p","cosmos-detail-note","八卦环按先天八卦方位摆放（页面上方为北），各卦通向的岛屿功能是砚芽的创意设计。"));
    } else if(state.level===16||state.level===32) {
      const n=state.level;
      const bits=state.chosen.toString(2).padStart(Math.log2(n),"0");
      const controls=el("div","cosmos-detail-content");
      controls.append(lineGlyph(bits));
      const navigator=el("div","cosmos-choose");
      navigator.append(btn("‹",()=>{state.chosen=(state.chosen+n-1)%n;render();},"cosmos-step-button"),el("span","cosmos-choose-count",String(state.chosen+1).padStart(2,"0")+" / "+n),btn("›",()=>{state.chosen=(state.chosen+1)%n;render();},"cosmos-step-button"));
      controls.append(navigator,el("p","", (n===16?"四爻":"五爻")+"组合 · "+bits.replaceAll("0","阴").replaceAll("1","阳")+"（从下至上）"));
      detail.append(controls);
      detail.append(el("p","cosmos-detail-note","这是阴阳二分的中间推演层，并非给这些组合虚构传统独立卦名。"));
    } else if(state.level===64) {
      const chooser=el("div","cosmos-hex-selectors");
      for(const [role,key] of [["上卦","upper"],["下卦","lower"]]) {
        const label=el("label","cosmos-select-label",role);
        const select=el("select","cosmos-select");
        TRIGRAMS.forEach((t,i)=>{
          const option=el("option","",t.char+" "+t.name+" · "+t.nature);
          option.value=String(i);
          select.append(option);
        });
        select.value=String(state[key]);
        select.addEventListener("change",()=>{
          state[key]=Number(select.value);
          if(key==="lower")state.trigram=TRIGRAMS[state.lower].id;
          render();
        });
        label.append(select);
        chooser.append(label);
      }
      const chosen=WEN[state.lower][state.upper];
      const bottom=TRIGRAMS[state.lower];
      const upper=TRIGRAMS[state.upper];
      const row=el("div","cosmos-detail-content cosmos-hex-content");
      row.append(el("span","cosmos-hex-glyph",String.fromCodePoint(0x4DC0+chosen[0]-1)));
      const hexinfo=el("div","cosmos-hex-summary");
      hexinfo.append(el("strong","",chosen[1]+" · 第"+chosen[0]+"卦"),el("small","",upper.char+upper.name+"上 · "+bottom.char+bottom.name+"下"));
      row.append(hexinfo, lineGlyph(bottom.bits+upper.bits));
      detail.append(row,chooser);
      detail.append(el("p","cosmos-detail-note","上下三爻相叠共 8 × 8 = 64 卦，名称和编号取通行的文王卦序，左侧卦符与右侧六爻一一对应。"));
    }
  }

  function setLevel(level) {
    const index = LEVELS.findIndex(x=>x.n===level);
    if(index===-1) return;
    state.level=level;
    state.chosen=0;
    save("cosmos-level.v1",level);
    render();
  }

  function render() {
    const item=LEVELS.find(x=>x.n===state.level);
    levels.replaceChildren();
    for(const stage of LEVELS) {
      const button=btn("",()=>setLevel(stage.n),"cosmos-level-button");
      button.append(el("small","",String(stage.n).padStart(2,"0")),el("span","",stage.name));
      button.setAttribute("aria-pressed",String(stage.n===state.level));
      button.setAttribute("aria-label",stage.name+"，"+stage.n+"种阴阳组合");
      levels.append(button);
    }
    heading.querySelector(".cosmos-heading-title").textContent="太极衍化 · "+item.name;
    orbit.dataset.level=String(state.level);
    centerTitle.textContent=item.name;
    makeGeometry();
    renderNodes();
    renderDetail();
  }

  showView(state.view);
  render();
})();
