/* 砚芽 · 玄境 / 玄盘 v0.3 — deliberate, mobile-first, no dependencies */
(() => {
  "use strict";
  const root = document.getElementById("cosmosMount");
  if (!root || !document.querySelector(".world")) return;

  const KEY = "yanya.xuanjing.";
  const STAGES = [1, 2, 4, 8, 16, 32, 64];
  const STAGE_NAMES = ["太极","两仪","四象","八卦","四爻","五爻","重卦"];
  // Bottom-to-top yao order. Pre-heaven trigram positions: north Kun, south Qian.
  const GUA = [
    {char:"☰",name:"乾",nature:"天",bits:"111",angle:180,gate:"workshop",desc:"天行健，万象由此生"},
    {char:"☱",name:"兑",nature:"泽",bits:"110",angle:135,gate:"oracle",desc:"泽水相悦，灵签藏于此"},
    {char:"☲",name:"离",nature:"火",bits:"101",angle:90,gate:"heart",desc:"长明灯下，与你相谈"},
    {char:"☳",name:"震",nature:"雷",bits:"100",angle:45,gate:"garden",desc:"惊雷醒木，第一枝新芽"},
    {char:"☴",name:"巽",nature:"风",bits:"011",angle:225,gate:"library",desc:"风过书卷，故事未完"},
    {char:"☵",name:"坎",nature:"水",bits:"010",angle:270,gate:"stars",desc:"星光落水，旧事成河"},
    {char:"☶",name:"艮",nature:"山",bits:"001",angle:315,gate:"library",desc:"重山藏卷，万象收于一阁"},
    {char:"☷",name:"坤",nature:"地",bits:"000",angle:0,gate:"garden",desc:"地载万物，生生不息"}
  ];
  const GATE = {heart:"岛心",stars:"星阁",oracle:"签庭",library:"藏书楼",workshop:"天机台",garden:"灵圃"};
  // Wen (King Wen) hexagram number and name, rows lower trigram, columns upper trigram.
  const HEX = [
    [[1,"乾"],[43,"夬"],[14,"大有"],[34,"大壮"],[9,"小畜"],[5,"需"],[26,"大畜"],[11,"泰"]],
    [[10,"履"],[58,"兑"],[38,"睽"],[54,"归妹"],[61,"中孚"],[60,"节"],[41,"损"],[19,"临"]],
    [[13,"同人"],[49,"革"],[30,"离"],[55,"丰"],[37,"家人"],[63,"既济"],[22,"贲"],[36,"明夷"]],
    [[25,"无妄"],[17,"随"],[21,"噬嗑"],[51,"震"],[42,"益"],[3,"屯"],[27,"颐"],[24,"复"]],
    [[44,"姤"],[28,"大过"],[50,"鼎"],[32,"恒"],[57,"巽"],[48,"井"],[18,"蛊"],[46,"升"]],
    [[6,"讼"],[47,"困"],[64,"未济"],[40,"解"],[59,"涣"],[29,"坎"],[4,"蒙"],[7,"师"]],
    [[33,"遁"],[31,"咸"],[56,"旅"],[62,"小过"],[53,"渐"],[39,"蹇"],[52,"艮"],[15,"谦"]],
    [[12,"否"],[45,"萃"],[35,"晋"],[16,"豫"],[20,"观"],[8,"比"],[23,"剥"],[2,"坤"]]
  ];
  const read = (key, fallback) => {
    try { const x=JSON.parse(localStorage.getItem(KEY+key));return x===null?fallback:x; } catch {return fallback;}
  };
  const save = (key,val) => {try{localStorage.setItem(KEY+key,JSON.stringify(val));}catch{}};
  const storedLevel=read("ritual.level",8);
  const state={level:STAGES.includes(storedLevel)?storedLevel:8,
    chosen:0,trigram:0,upper:0,lower:0,view:read("home-view.v1","cosmos")==="island"?"island":"cosmos"};
  const NS="http://www.w3.org/2000/svg";
  const make=(tag,cls,txt) => {
    const n=document.createElement(tag); if(cls)n.className=cls;if(txt!==undefined)n.textContent=txt;return n;
  };
  const button=(txt,cls,cb)=>{const n=make("button",cls,txt);n.type="button";n.addEventListener("click",cb);return n;};
  const node=(tag,attrs={})=>{const x=document.createElementNS(NS,tag);Object.entries(attrs).forEach(([k,v])=>x.setAttribute(k,String(v)));return x;};
  const polar=(angle,r)=>{const a=angle*Math.PI/180;return{x:50+r*Math.sin(a),y:50-r*Math.cos(a)};};

  root.innerHTML =
    '<section class="ritual" aria-label="砚芽玄境太极衍化交互首页">'+
      '<div class="ritual-top"><span class="ritual-eyebrow">YANYA / THE AWAKENING</span>'+
      '<span class="ritual-top-mark" aria-hidden="true">✧ · ◈ · ✧</span></div>'+
      '<div class="ritual-heading"><span class="ritual-title">万象，归于一念。</span>'+
      '<span class="ritual-subtitle">天地未语，星轨先行。</span></div>'+
      '<div class="ritual-stage" id="ritualStage">'+
        '<div class="ritual-aurora" aria-hidden="true"></div>'+
        '<div class="ritual-stardust" id="ritualStardust" aria-hidden="true"></div>'+
        '<div class="ritual-compass" aria-hidden="true"><span>✦</span><span>✧</span><span>✦</span><span>✧</span></div>'+
        '<svg id="ritualGeometry" class="ritual-geometry" viewBox="0 0 720 720" aria-hidden="true"></svg>'+
        '<div id="ritualNodes" class="ritual-nodes"></div>'+
        '<div class="ritual-heart">'+
          '<div class="ritual-heart-halo"></div>'+
          '<button type="button" id="ritualCore" class="ritual-core" aria-label="触碰太极，推演下一层">'+
            '<svg class="ritual-taiji" viewBox="0 0 100 100" aria-hidden="true">'+
              '<circle cx="50" cy="50" r="48" fill="#e6f8d4"/>'+
              '<path d="M50 2 A48 48 0 0 1 50 98 A24 24 0 0 1 50 50 A24 24 0 0 0 50 2 Z" fill="#103d35"/>'+
              '<circle cx="50" cy="26" r="6.4" fill="#e6f8d4"/>'+
              '<circle cx="50" cy="74" r="6.4" fill="#103d35"/>'+
              '<circle cx="50" cy="50" r="48" fill="none" stroke="#f4fbdc" stroke-width="1" stroke-opacity=".6"/>'+
            '</svg>'+
            '<span class="ritual-core-invite">触 · 生</span>'+
          '</button>'+
        '</div>'+
        '<div class="ritual-north" aria-hidden="true">N · 00</div>'+
        '<div class="ritual-south" aria-hidden="true">S · 180</div>'+
      '</div>'+
      '<div class="ritual-navigation" aria-label="衍化进度">'+
        '<button type="button" class="ritual-nav-arrow" id="ritualPrev" aria-label="退回上一层">↶</button>'+
        '<div id="ritualProgress" class="ritual-progress" role="group" aria-label="选择衍化层级"></div>'+
        '<button type="button" class="ritual-nav-arrow" id="ritualNext" aria-label="演进到下一层">↷</button>'+
      '</div>'+
      '<div class="ritual-stage-caption" id="ritualStageCaption" aria-live="polite"></div>'+
      '<div id="ritualDetail" class="ritual-detail" aria-live="polite"></div>'+
      '<div class="ritual-bottom"><span>✧ &nbsp;山海有灵 · 万物有序</span><span>YANYA / 03</span></div>'+
    '</section>';

  const stage=document.getElementById("ritualStage");
  const geometry=document.getElementById("ritualGeometry");
  const spots=document.getElementById("ritualNodes");
  const progress=document.getElementById("ritualProgress");
  const detail=document.getElementById("ritualDetail");
  const caption=document.getElementById("ritualStageCaption");
  const core=document.getElementById("ritualCore");

  // Independent mechanical ring. Rune taps still select; dragging them rotates instead.
  const motionPref = typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  const initialRotation = Number(read("ritual.rotation", -10));
  const dial = {
    angle: Number.isFinite(initialRotation) ? initialRotation : -10,
    pointerId: null, startX: 0, startY: 0,
    lastAngle: 0, lastTime: 0, lastFrame: 0,
    dragging: false, suppressClick: false,
    velocity: 0, inertia: 0
  };
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  const angleDifference=(a,b)=>((a-b+540)%360)-180;
  const centerAngle=(event)=>{
    const r=stage.getBoundingClientRect();
    return Math.atan2(event.clientY-(r.top+r.height/2),
      event.clientX-(r.left+r.width/2))*180/Math.PI;
  };
  const paintDial=()=>stage.style.setProperty("--ritual-rotation",dial.angle+"deg");
  const persistDial=()=>save("ritual.rotation",Math.round(dial.angle*100)/100);
  // Android/phone browsers may flash black compositor tiles when multiple large
  // transparent SVG/filter layers repaint continuously. Keep the touch dial,
  // but do not animate it automatically on compact/coarse-pointer screens.
  const mobileSafe = typeof window.matchMedia === "function" &&
    (window.matchMedia("(max-width: 760px)").matches ||
      window.matchMedia("(hover: none) and (pointer: coarse)").matches);
  if (mobileSafe) {
    root.classList.add("ritual-mobile-safe");
    document.body.classList.add("ritual-safe-render");
  }
  const noAutoMotion=()=>mobileSafe || root.classList.contains("ritual-low-motion") ||
    Boolean(motionPref && motionPref.matches);
  paintDial();

  stage.addEventListener("pointerdown",event=>{
    if(event.isPrimary===false)return;
    if(event.pointerType==="mouse"&&event.button!==0)return;
    if(event.target.closest && event.target.closest("#ritualCore"))return;
    dial.pointerId=event.pointerId;
    dial.startX=event.clientX;dial.startY=event.clientY;
    dial.lastAngle=centerAngle(event);dial.lastTime=performance.now();
    dial.velocity=0;dial.inertia=0;
    dial.dragging=false;dial.suppressClick=false;
  });

  stage.addEventListener("pointermove",event=>{
    if(dial.pointerId!==event.pointerId)return;
    if(!dial.dragging){
      if(Math.hypot(event.clientX-dial.startX,event.clientY-dial.startY)<7)return;
      dial.dragging=true;
      stage.classList.add("is-dragging");
      if(stage.setPointerCapture){
        try{stage.setPointerCapture(event.pointerId);}catch(_){}
      }
    }
    const now=performance.now();
    const angle=centerAngle(event);
    const delta=angleDifference(angle,dial.lastAngle);
    const elapsed=clamp(now-dial.lastTime,8,100);
    dial.angle=(dial.angle+delta+360)%360;
    dial.velocity=clamp(dial.velocity*.65+(delta/elapsed*1000)*.35,-240,240);
    dial.lastAngle=angle;dial.lastTime=now;
    paintDial();
    if(event.cancelable)event.preventDefault();
  },{passive:false});

  const finishDial=(event,cancelled=false)=>{
    if(event.pointerId!==dial.pointerId)return;
    const rotated=dial.dragging;
    dial.pointerId=null;
    dial.dragging=false;
    stage.classList.remove("is-dragging");
    if(rotated){
      dial.suppressClick=true;
      dial.inertia=cancelled||noAutoMotion()?0:clamp(dial.velocity,-180,180);
      persistDial();
    }
    if(stage.hasPointerCapture&&stage.hasPointerCapture(event.pointerId)){
      try{stage.releasePointerCapture(event.pointerId);}catch(_){}
    }
  };
  stage.addEventListener("pointerup",event=>finishDial(event));
  stage.addEventListener("pointercancel",event=>finishDial(event,true));
  stage.addEventListener("lostpointercapture",event=>finishDial(event,true));
  stage.addEventListener("click",event=>{
    if(!dial.suppressClick)return;
    dial.suppressClick=false;
    event.preventDefault();event.stopImmediatePropagation();
  },true);

  // Momentum slows into a calm self-turning orbit; no full-scene rotation.
  const animateDial=(timestamp)=>{
    const elapsed=dial.lastFrame?clamp(timestamp-dial.lastFrame,0,55):0;
    dial.lastFrame=timestamp;
    if(dial.pointerId===null && state.view==="cosmos" && !document.hidden && !noAutoMotion()){
      if(Math.abs(dial.inertia)>.3){
        dial.angle=(dial.angle+dial.inertia*elapsed/1000+360)%360;
        dial.inertia*=Math.exp(-elapsed/680);
      }else{
        dial.inertia=0;
        dial.angle=(dial.angle+1.2*elapsed/1000+360)%360;
      }
      paintDial();
    }
    requestAnimationFrame(animateDial);
  };
  document.addEventListener("visibilitychange",()=>{
    dial.lastFrame=0;
    if(document.hidden)persistDial();
  });
  window.addEventListener("pagehide",persistDial);


  // Scene switch is a corner control, not a row of instructional tabs.
  const topbar=document.querySelector(".topbar-actions");
  const modeButton=button("◈ 浮岛","ritual-mode-toggle",()=>switchView(state.view==="cosmos"?"island":"cosmos"));
  modeButton.setAttribute("aria-label","在玄盘和浮岛景观之间切换");
  if(topbar)topbar.insertBefore(modeButton,topbar.firstChild);
  function switchView(view) {
    state.view=view;
    document.body.dataset.homeView=view;
    modeButton.textContent=view==="cosmos"?"◈ 浮岛":"✧ 玄盘";
    modeButton.setAttribute("aria-pressed",String(view==="island"));
    save("home-view.v1",view);
    const prev= document.querySelector(".below-scene .scene-status strong");
    const sub = document.querySelector(".below-scene .scene-status small");
    if(prev)prev.textContent=view==="cosmos"?"玄境初开":"砚芽初生";
    if(sub)sub.textContent=view==="cosmos"?"每一念，都有回响。":"岛上的第一盏灯，已经亮了。";
  }
  switchView(state.view);

  // Small seeded star field: no bitmap, animation loops or network requests.
  const stars=document.getElementById("ritualStardust");
  let seed=17093;
  const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<64;i++){
    const s=make("span","ritual-star"+(i%11===0?" ritual-star-bright":""));
    s.style.left=(random()*100).toFixed(2)+"%";
    s.style.top=(random()*100).toFixed(2)+"%";
    s.style.setProperty("--twinkle-delay",(random()*6).toFixed(2)+"s");
    s.style.setProperty("--twinkle-size",(i%11===0?3.3:1.6)+"px");
    stars.append(s);
  }

  function ringGeometry(){
    geometry.replaceChildren();
    const defs=node("defs");
    const grad=node("radialGradient",{id:"ritualCenterGlow"});
    grad.append(node("stop",{offset:"0%", "stop-color":"#b7f6af","stop-opacity":".14"}),
      node("stop",{offset:"65%","stop-color":"#4dbea3","stop-opacity":".04"}),
      node("stop",{offset:"100%","stop-color":"#4dbea3","stop-opacity":"0"}));
    defs.append(grad);geometry.append(defs);
    geometry.append(node("circle",{cx:360,cy:360,r:320,fill:"url(#ritualCenterGlow)"}));
    for(const [r,type] of [[346,"outer"],[330,"broken"],[316,"outer"],[300,"fine"],[270,"broken"],[238,"outer"],[205,"fine"],[170,"broken"]]){
      geometry.append(node("circle",{cx:360,cy:360,r,class:"ritual-ring ritual-ring-"+type}));
    }
    // A fine eight-point flower lattice and western astrolabe accents.
    for(let i=0;i<8;i++){
      const a=i*Math.PI/4;
      const x=360+292*Math.sin(a),y=360-292*Math.cos(a);
      const x2=360+343*Math.sin(a),y2=360-343*Math.cos(a);
      geometry.append(node("line",{x1:x,y1:y,x2,y2,class:"ritual-octave"}));
      geometry.append(node("circle",{cx:x,cy:y,r:i%2===0?2.4:1.6,class:"ritual-lodestar"}));
    }
    for(let i=0;i<64;i++){
      const a=i*2*Math.PI/64;
      const x=360+(i%8===0?331:337)*Math.sin(a),y=360-(i%8===0?331:337)*Math.cos(a);
      const xx=360+(i%8===0?352:344)*Math.sin(a),yy=360-(i%8===0?352:344)*Math.cos(a);
      geometry.append(node("line",{x1:x,y1:y,x2:xx,y2:yy,class:"ritual-mark"+(i%8===0?" ritual-mark-strong":"")}));
    }
    // The number of emergent rays follows 1/2/4/8/16/32/64.
    const level=state.level;
    for(let i=0;i<level;i++){
      const angle=(i+.5)*2*Math.PI/level;
      const r1=level<=8?249:257;
      const r2=level<=8?266:267;
      const x1=360+r1*Math.sin(angle),y1=360-r1*Math.cos(angle);
      const x2=360+r2*Math.sin(angle),y2=360-r2*Math.cos(angle);
      geometry.append(node("line",{x1,y1,x2,y2,class:"ritual-emergent"}));
    }
    geometry.append(node("path",{d:"M140 360 A220 220 0 0 1 580 360",class:"ritual-arch"}));
    geometry.append(node("path",{d:"M145 360 A215 215 0 0 0 575 360",class:"ritual-arch ritual-arch-secondary"}));
  }
  function yao(bits){
    const wrap=make("span","ritual-yao");wrap.setAttribute("aria-label",bits.split("").map(x=>x==="1"?"阳":"阴").join("、"));
    for(const v of bits.split("").reverse()){
      const line=make("span","ritual-yao-line"+(v==="0"?" is-yin":""));
      line.append(make("i"),...(v==="0"?[make("i")]:[]));
      wrap.append(line);
    }
    return wrap;
  }
  function position(angle,r){const p=polar(angle,r);return {left:p.x+"%",top:p.y+"%"};}
  function runeNode(symbol,angle,label,handler,active){
    const b=button(symbol,"ritual-glyph"+(active?" is-active":""),handler);
    b.setAttribute("aria-label",label);
    b.setAttribute("title",label);
    b.setAttribute("aria-pressed",String(!!active));
    const xy=position(angle,40);
    b.style.left=xy.left;b.style.top=xy.top;
    spots.append(b);return b;
  }
  function selectGua(index){
    state.trigram=index;state.lower=index;
    draw();
  }
  function nodes(){
    spots.replaceChildren();
    if(state.level===2){
      runeNode("⚋",270,"阴",()=>{state.chosen=0;draw();},state.chosen===0);
      runeNode("⚊",90,"阳",()=>{state.chosen=1;draw();},state.chosen===1);
    } else if(state.level===4){
      [["⚋⚋","太阴",0],["⚋⚊","少阳",90],["⚊⚊","太阳",180],["⚊⚋","少阴",270]].forEach((x,i)=>{
        runeNode(x[0],x[2],x[1],()=>{state.chosen=i;draw();},state.chosen===i);
      });
    } else if(state.level===8 || state.level===64){
      GUA.forEach((g,i)=>runeNode(g.char,g.angle,g.name+" · "+g.nature,()=>selectGua(i),state.trigram===i));
    } else if(state.level===16 || state.level===32){
      // These intermediary levels are binary patterns, not invented traditional trigrams.
      for(let i=0;i<state.level;i++){
        const a=i*360/state.level;
        const dot=button("","ritual-ember"+(i===state.chosen?" is-active":""),()=>{state.chosen=i;draw();});
        dot.setAttribute("aria-label","第"+(i+1)+"种组合");
        const xy=position(a,40);dot.style.left=xy.left;dot.style.top=xy.top;
        spots.append(dot);
      }
    }
  }
  function selectLevel(level){
    if(!STAGES.includes(level))return;
    state.level=level;state.chosen=0;
    save("ritual.level",level);
    core.classList.remove("ritual-awaken");
    // Restart ripple without resetting unrelated app state.
    void core.offsetWidth;core.classList.add("ritual-awaken");
    draw();
  }
  function shift(step){
    const i=STAGES.indexOf(state.level);
    selectLevel(STAGES[(i+step+STAGES.length)%STAGES.length]);
  }
  function nav(){
    progress.replaceChildren();
    STAGES.forEach((n,i)=>{
      const b=button("","ritual-dot"+(n===state.level?" is-active":""),()=>selectLevel(n));
      b.setAttribute("aria-label","查看"+STAGE_NAMES[i]+"（"+n+"种组合）");
      b.setAttribute("title",STAGE_NAMES[i]);
      b.setAttribute("aria-current",n===state.level?"step":"false");
      progress.append(b);
    });
    caption.textContent="第 "+String(STAGES.indexOf(state.level)+1).padStart(2,"0")+" 道 · "+String(state.level).padStart(2,"0")+" 象";
    stage.dataset.power=String(state.level);
  }
  const goTo=(key)=>{
    const b=document.querySelector('.dock [data-location="'+key+'"]');
    if(b)b.click();
  };
  function openButton(key){
    const b=button("入 "+GATE[key]+"  ↗","ritual-entry",()=>goTo(key));
    return b;
  }
  function renderDetail(){
    detail.replaceChildren();
    if(state.level===8){
      const g=GUA[state.trigram];
      const left=make("div","ritual-description");
      const cap=make("span","ritual-detail-kicker","OBSERVE / "+g.nature);
      const heading=make("strong","ritual-detail-title",g.char+"  "+g.name+" · "+g.nature);
      const desc=make("p","",g.desc);
      left.append(cap,heading,desc);
      detail.append(left,openButton(g.gate));
    } else if(state.level===64) {
      const info=HEX[state.lower][state.upper], u=GUA[state.upper],l=GUA[state.lower];
      const infoWrap=make("div","ritual-description");
      const tag=make("span","ritual-detail-kicker","THE SIXTY-FOUR");
      const line=make("div","ritual-hex-top");
      line.append(make("span","ritual-hex-unicode",String.fromCodePoint(0x4DC0+info[0]-1)));
      const right=make("div");
      right.append(make("strong","ritual-detail-title",info[1]+" · 第"+info[0]+"卦"),
        make("p","",u.name+"上 · "+l.name+"下"));
      line.append(right,yao(l.bits+u.bits));
      infoWrap.append(tag,line);
      const selectors=make("div","ritual-selectors");
      [["上卦","upper"],["下卦","lower"]].forEach(([label,key])=>{
        const wrap=make("label","ritual-select-label",label);
        const select=make("select","ritual-select");
        GUA.forEach((g,i)=>{
          const opt=make("option","",g.char+" "+g.name+" · "+g.nature);
          opt.value=String(i);select.append(opt);
        });
        select.value=String(state[key]);
        select.addEventListener("change",()=>{
          state[key]=Number(select.value);
          if(key==="lower")state.trigram=state.lower;
          draw();
        });
        wrap.append(select);selectors.append(wrap);
      });
      detail.append(infoWrap,selectors);
    } else {
      const words=({
        1:["混沌初开","无始无终，一念为引。"],
        2:["阴阳初判","一明一晦，万象初分。"],
        4:["光影交错","四象相生，起落有序。"],
        16:["枝分十六","阴阳交织，四爻成纹。"],
        32:["星列三十二","五爻入盘，星辰愈密。"]
      })[state.level];
      const info=make("div","ritual-description");
      info.append(make("span","ritual-detail-kicker","THE UNFOLDING"),
        make("strong","ritual-detail-title",words[0]),
        make("p","",words[1]));
      if(state.level===2){
        info.append(yao(state.chosen===0?"0":"1"));
      }else if(state.level===4){
        info.append(yao(["00","01","11","10"][state.chosen]));
      }else if(state.level>=16){
        info.append(yao(state.chosen.toString(2).padStart(Math.log2(state.level),"0")));
        info.append(make("small","ritual-pattern-label",String(state.chosen+1).padStart(2,"0")+" / "+state.level));
      }
      detail.append(info,button("继续衍化  ↗","ritual-entry",()=>shift(1)));
    }
  }
  function draw(){
    ringGeometry();nodes();nav();renderDetail();
  }
  document.getElementById("ritualPrev").addEventListener("click",()=>shift(-1));
  document.getElementById("ritualNext").addEventListener("click",()=>shift(1));
  core.addEventListener("click",()=>shift(1));
  // The ring now rotates by drag. Stage progression stays on the central Taiji and arrows.
  if(navigator.connection && navigator.connection.saveData)root.classList.add("ritual-low-motion");
  draw();
  // Manual pointer drag always works; avoid a permanent 60fps animation on phones.
  if (!mobileSafe && !noAutoMotion()) requestAnimationFrame(animateDial);
})();