/* 砚芽 · 玄境 / 天环 Seed 13
 * Implements the chosen "天环" ring-and-orrery visual design. Retains
 * the existing real trigram/hexagram engine and feature-panel navigation.
 * No external assets, random divination, WebGL or continuous mobile GPU loop.
 */
(() => {
  "use strict";
  const root=document.getElementById("cosmosMount");
  const stage=document.getElementById("ritualStage");
  if(!root||!stage)return;
  const section=root.querySelector(".ritual");
  const geometry=stage.querySelector("#ritualGeometry");
  const nodes=stage.querySelector("#ritualNodes");
  const core=stage.querySelector("#ritualCore");
  if(!section||!geometry||!nodes||!core)return;
  // The retired test globe should not override the user's chosen second design,
  // even on devices that once saved globe mode in localStorage.
  const previousGlobe=document.getElementById("ritualDepthToggle");
  if(previousGlobe?.getAttribute("aria-pressed")==="true")previousGlobe.click();

  root.classList.add("tianhuan-active");
  section.classList.add("tianhuan-layout");

  const eyebrow=section.querySelector(".ritual-eyebrow");
  if(eyebrow)eyebrow.textContent="YANYA / THE CELESTIAL RINGS";
  const title=section.querySelector(".ritual-title");
  if(title)title.textContent="天环 · 以天为度";
  const subtitle=section.querySelector(".ritual-subtitle");
  if(subtitle)subtitle.textContent="以心为境 · 观象而行";

  // Replace heavy glossy orb with small, finely engraved leaf motif.
  core.innerHTML='<svg class="tianhuan-core-emblem" viewBox="0 0 80 80" aria-hidden="true">'+
    '<circle cx="40" cy="40" r="34" fill="none" stroke="currentColor" stroke-opacity=".29" stroke-width="1"/>'+
    '<path d="M40 63V27M40 48C19 47 18 29 20 23c12 0 23 7 20 25zM40 43c22 1 25-15 23-25-13 1-24 9-23 25z" fill="none" stroke="currentColor" stroke-width="2.9" stroke-linejoin="round" stroke-linecap="round"/>'+
    '<path d="M29 32c3 5 7 7 11 10M51 29c-4 5-8 8-11 12M32 63h16" fill="none" stroke="currentColor" stroke-width="1.2" stroke-opacity=".7" stroke-linecap="round"/>'+
    '<circle cx="40" cy="19" r="2" fill="currentColor"/>'+
    '</svg><span class="tianhuan-core-caption">一念</span>';
  core.setAttribute("aria-label","推演下一道天环");

  // Hand-authored vector instrument: bronze rim, jade inlays, tilted orbits,
  // graduations and pendant. The existing rune buttons remain fully interactive.
  const ns="http://www.w3.org/2000/svg";
  const create=(tag,attrs={})=>{
    const el=document.createElementNS(ns,tag);
    for(const [k,v] of Object.entries(attrs))el.setAttribute(k,String(v));
    return el;
  };
  const svg=create("svg",{
    class:"tianhuan-instrument",viewBox:"0 0 720 720",
    "aria-hidden":"true",focusable:"false"
  });
  svg.innerHTML=
    '<defs>'+
      '<linearGradient id="thBronze" x1="0%" y1="0%" x2="100%" y2="100%">'+
        '<stop offset="0%" stop-color="#f2dba7"/><stop offset="25%" stop-color="#9a7550"/>'+
        '<stop offset="55%" stop-color="#d1b584"/><stop offset="78%" stop-color="#6d583f"/><stop offset="100%" stop-color="#e8cfa2"/>'+
      '</linearGradient>'+
      '<linearGradient id="thJade" x1="0%" y1="0%" x2="100%" y2="100%">'+
        '<stop offset="0%" stop-color="#bbdfc4" stop-opacity=".84"/>'+
        '<stop offset="44%" stop-color="#4b9b8d" stop-opacity=".72"/>'+
        '<stop offset="100%" stop-color="#204f54" stop-opacity=".87"/>'+
      '</linearGradient>'+
      '<linearGradient id="thOrb" x1="0%" y1="0%" x2="100%" y2="100%">'+
        '<stop offset="0%" stop-color="#f5dfa6"/><stop offset="45%" stop-color="#6aaea2"/>'+
        '<stop offset="100%" stop-color="#c2b17d"/>'+
      '</linearGradient>'+
    '</defs>'+
    '<circle cx="360" cy="360" r="309" stroke="#122d30" stroke-width="27" fill="none" stroke-opacity=".78"/>'+
    '<circle cx="360" cy="360" r="315" stroke="url(#thBronze)" stroke-width="6.5" fill="none"/>'+
    '<circle cx="360" cy="360" r="302" stroke="#d6b87d" stroke-width="1" stroke-opacity=".65" fill="none"/>'+
    '<circle cx="360" cy="360" r="295" stroke="url(#thJade)" stroke-width="10" fill="none" stroke-opacity=".68"/>'+
    '<circle cx="360" cy="360" r="284" stroke="#d5bf8b" stroke-width="1.3" fill="none" stroke-opacity=".56"/>'+
    '<circle cx="360" cy="360" r="258" stroke="url(#thBronze)" stroke-width="5" fill="none" stroke-opacity=".9"/>'+
    '<circle cx="360" cy="360" r="251" stroke="#c9bf98" stroke-width="1" fill="none" stroke-opacity=".43"/>'+
    '<circle cx="360" cy="360" r="228" stroke="#99d5c0" stroke-width="1.5" fill="none" stroke-opacity=".47"/>'+
    '<circle cx="360" cy="360" r="160" stroke="#c8bb8e" stroke-width="1.2" fill="none" stroke-opacity=".57"/>'+
    '<ellipse cx="360" cy="360" rx="242" ry="92" transform="rotate(-29 360 360)" fill="none" stroke="#0d3035" stroke-width="21" stroke-opacity=".75"/>'+
    '<ellipse cx="360" cy="360" rx="242" ry="92" transform="rotate(-29 360 360)" fill="none" stroke="url(#thJade)" stroke-width="15" stroke-opacity=".78"/>'+
    '<ellipse cx="360" cy="360" rx="242" ry="92" transform="rotate(-29 360 360)" fill="none" stroke="#f7e3ad" stroke-width="1.6" stroke-opacity=".82"/>'+
    '<ellipse cx="360" cy="360" rx="215" ry="70" transform="rotate(45 360 360)" fill="none" stroke="url(#thBronze)" stroke-width="4.8" stroke-opacity=".87"/>'+
    '<ellipse cx="360" cy="360" rx="216" ry="71" transform="rotate(45 360 360)" fill="none" stroke="#a2d9c4" stroke-width="1.1" stroke-opacity=".7"/>'+
    '<circle cx="360" cy="360" r="115" stroke="url(#thBronze)" stroke-width="3" fill="none" stroke-opacity=".7"/>'+
    '<circle cx="360" cy="360" r="105" stroke="#9ed5b4" stroke-width="1" fill="none" stroke-opacity=".45"/>'+
    '<path d="M360 9v98M360 614v95" stroke="url(#thBronze)" stroke-width="2.4" stroke-opacity=".9"/>'+
    '<circle cx="360" cy="39" r="7" fill="url(#thOrb)"/>'+
    '<circle cx="360" cy="79" r="4.7" fill="#cde3cb"/>'+
    '<circle cx="360" cy="670" r="5.2" fill="url(#thOrb)"/>'+
    '<path d="M346 693l14 16 14-16-14-16z" fill="none" stroke="#d9bc84" stroke-width="2"/>'+
    '<circle cx="190" cy="500" r="5.5" fill="url(#thOrb)"/>'+
    '<circle cx="550" cy="219" r="6.8" fill="url(#thOrb)"/>';
  const marks=create("g",{class:"tianhuan-graduations"});
  for(let i=0;i<96;i++){
    const a=i*Math.PI*2/96;
    const r1=i%8===0?289:296;
    const r2=i%8===0?307:303;
    marks.append(create("line",{
      x1:360+Math.sin(a)*r1,y1:360-Math.cos(a)*r1,
      x2:360+Math.sin(a)*r2,y2:360-Math.cos(a)*r2,
      stroke:i%8===0?"#f4dca6":"#b59a6c",
      "stroke-width":i%8===0?2:0.75,
      opacity:i%8===0?.94:.51
    }));
  }
  svg.append(marks);
  stage.insertBefore(svg,nodes);

  // A quiet, credible date banner: no fake divination or fabricated lunar date.
  const nav=section.querySelector(".ritual-navigation");
  const daily=document.createElement("div");
  daily.className="tianhuan-daily";
  const date=new Intl.DateTimeFormat("zh-CN",{
    year:"numeric",month:"2-digit",day:"2-digit"
  }).format(new Date());
  const label=document.createElement("span");
  label.className="tianhuan-day-label";
  label.textContent="◈ 今日 · "+date;
  const note=document.createElement("span");
  note.className="tianhuan-day-note";
  note.textContent="天行有常 · 万象有序";
  daily.append(label,note);
  if(nav)nav.before(daily);
  else stage.after(daily);

  const cards=document.createElement("section");
  cards.className="tianhuan-features";
  cards.setAttribute("aria-label","玄境主要入口");
  const data=[
    {name:"星图流转",sub:"珍藏故事与星光",gate:"stars",icon:"✦",art:"stars"},
    {name:"一支灵签",sub:"一签问心，观照当下",gate:"oracle",icon:"❀",art:"oracle"},
    {name:"天机推演",sub:"四柱排盘与卦象",gate:"workshop",icon:"◎",art:"workshop"},
    {name:"典籍书房",sub:"角色、书页与世界",gate:"library",icon:"▤",art:"library"}
  ];
  data.forEach(item=>{
    const b=document.createElement("button");
    b.type="button";
    b.className="tianhuan-card tianhuan-card-"+item.art;
    b.setAttribute("aria-label","进入"+item.name);
    const illustration=document.createElement("span");
    illustration.className="tianhuan-card-art";
    illustration.setAttribute("aria-hidden","true");
    illustration.textContent=item.icon;
    const text=document.createElement("span");
    text.className="tianhuan-card-copy";
    const strong=document.createElement("strong");strong.textContent=item.name;
    const small=document.createElement("small");small.textContent=item.sub;
    text.append(strong,small);b.append(illustration,text);
    b.addEventListener("click",()=>{
      document.querySelector('.dock [data-location="'+item.gate+'"]')?.click();
    });
    cards.append(b);
  });
  const bottom=section.querySelector(".ritual-bottom");
  if(bottom)bottom.before(cards);else section.append(cards);

  // Keep existing seven-stage progression, all eight clickable trigrams, and
  // actual 64-hexagram details; this file only changes presentation.
  root.dataset.tianhuan="seed13";
})();
