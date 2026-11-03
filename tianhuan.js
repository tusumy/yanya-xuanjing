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
    role:"group","aria-label":"天环 · 六层可分别拖动旋转",focusable:"true"
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

  // Six concentric components have independent pointer-driven angles.
  // Each has an enlarged invisible stroke hit target; trigram buttons stay
  // above these rings and retain their existing click handlers.
  const ringSpecs=[
    {id:"outer",name:"外盘刻度环",radius:315,speed:6.5},
    {id:"jade",name:"玉环",radius:281,speed:-8.2},
    {id:"middle",name:"星辰铜环",radius:247,speed:7.5},
    {id:"orbitA",name:"外侧斜星轨",radius:242,speed:-5.8},
    {id:"orbitB",name:"内侧斜星轨",radius:215,speed:8.5},
    {id:"inner",name:"中心星盘",radius:155,speed:-9.3}
  ];
  let previousAngles=[];
  try{
    const stored=JSON.parse(localStorage.getItem("yanya.xuanjing.tianhuan.rings.v1"));
    if(Array.isArray(stored))previousAngles=stored;
  }catch(_){}
  const rings=ringSpecs.map((spec,i)=>{
    const group=create("g",{class:"tianhuan-rotor tianhuan-rotor-"+spec.id});
    group.dataset.ring=spec.id;
    group.dataset.title=spec.name;
    return {...spec,group,angle:Number.isFinite(previousAngles[i])?previousAngles[i]:(i%2?11:-14),velocity:0};
  });
  const ringById=Object.fromEntries(rings.map(r=>[r.id,r]));
  const rotorScene=create("g",{class:"tianhuan-rotor-scene"});
  svg.insertBefore(rotorScene,svg.children[1]||null);
  rings.forEach(r=>rotorScene.append(r.group));
  for(const shape of Array.from(svg.children)){
    if(shape===rotorScene||shape.tagName.toLowerCase()==="defs")continue;
    let target=null;
    if(shape.tagName.toLowerCase()==="g"&&shape.getAttribute("class")==="tianhuan-graduations"){
      target=ringById.outer;
    }else if(shape.tagName.toLowerCase()==="circle"&&shape.getAttribute("cx")==="360"&&shape.getAttribute("cy")==="360"){
      const radius=Number(shape.getAttribute("r"));
      target=radius>=290?ringById.outer:
        radius>=270?ringById.jade:
        radius>=220?ringById.middle:
        radius>=99?ringById.inner:null;
    }else if(shape.tagName.toLowerCase()==="ellipse"){
      const radius=Number(shape.getAttribute("rx"));
      target=radius>=235?ringById.orbitA:ringById.orbitB;
    }
    if(target)target.group.append(shape);
  }

  // Sparse engravings give each circular ring a visible direction of motion.
  [[ringById.outer,18,313],[ringById.jade,12,282],
   [ringById.middle,12,249],[ringById.inner,8,158]].forEach(([r,count,rad])=>{
    const glints=create("g",{class:"tianhuan-engraving"});
    for(let n=0;n<count;n++){
      const a=(n+.25)*Math.PI*2/count;
      const rr=rad;
      glints.append(create("circle",{
        cx:(360+Math.sin(a)*rr).toFixed(2),
        cy:(360-Math.cos(a)*rr).toFixed(2),
        r:n%3===0?2.9:1.45,
        fill:n%3===0?"#f2da9e":"#9ed1b2",
        opacity:n%3===0?.94:.68
      }));
    }
    r.group.append(glints);
  });

  // Deliberately asymmetrical engravings make actual motion visible:
  // pure circles look stationary even when transform rotates them.
  const polarPoint=(radius,degrees)=>{
    const a=degrees*Math.PI/180;
    return [360+radius*Math.sin(a),360-radius*Math.cos(a)];
  };
  const arcPath=(radius,start,end)=>{
    const a=polarPoint(radius,start),b=polarPoint(radius,end);
    return "M "+a[0].toFixed(2)+" "+a[1].toFixed(2)+
      " A "+radius+" "+radius+" 0 0 1 "+b[0].toFixed(2)+" "+b[1].toFixed(2);
  };
  rings.forEach((r,index)=>{
    const g=create("g",{class:"tianhuan-rotating-markers"});
    const orbit=r.id.startsWith("orbit");
    const points=orbit?
      [{x:360+r.radius*Math.cos(29*Math.PI/180),
        y:360-r.radius*Math.sin(29*Math.PI/180)}]:
      [polarPoint(r.radius,index*37+18),polarPoint(r.radius,index*37+198)].map(([x,y])=>({x,y}));
    if(!orbit){
      g.append(create("path",{
        d:arcPath(r.radius,index*37+2,index*37+27),
        fill:"none",stroke:"#f0d39c","stroke-width":4,
        "stroke-linecap":"round",opacity:.94
      }));
      g.append(create("path",{
        d:arcPath(r.radius,index*37+178,index*37+186),
        fill:"none",stroke:"#9ddcc1","stroke-width":2.6,
        "stroke-linecap":"round",opacity:.82
      }));
    }else{
      const angle=(r.id==="orbitA"?-29:45)*Math.PI/180;
      const a=r.radius,b=r.id==="orbitA"?92:70;
      const t=(index*71+26)*Math.PI/180;
      const x=a*Math.cos(t),y=b*Math.sin(t);
      points[0]={x:360+x*Math.cos(angle)-y*Math.sin(angle),
        y:360+x*Math.sin(angle)+y*Math.cos(angle)};
    }
    points.forEach(({x,y},i)=>{
      const pt=create("g",{class:"tianhuan-marker"});
      pt.append(create("circle",{cx:x,cy:y,r:i===0?8:5.3,
        fill:"#0f4646",stroke:"#eacb94","stroke-width":i===0?2.2:1.3}));
      pt.append(create("circle",{cx:x,cy:y,r:i===0?3.1:2,
        fill:i===0?"#fce6b4":"#a4dec0"}));
      g.append(pt);
    });
    r.group.append(g);
  });

  rings.forEach(r=>{
    // Transparent hit area is the last item in each rotor so it is easy to grab.
    const hit=r.id.startsWith("orbit")?
      create("ellipse",{
        cx:360,cy:360,
        rx:r.radius,ry:r.id==="orbitA"?92:70,
        transform:"rotate("+(r.id==="orbitA"?-29:45)+" 360 360)",
        fill:"none",stroke:"transparent","stroke-width":r.id==="orbitA"?32:27
      }):
      create("circle",{cx:360,cy:360,r:r.radius,fill:"none",
        stroke:"transparent","stroke-width":r.id==="inner"?28:23});
    hit.setAttribute("class","tianhuan-ring-hit");
    hit.setAttribute("role","slider");
    hit.setAttribute("aria-label",r.name+"，拖动或者用方向键旋转");
    hit.setAttribute("aria-valuemin","0");
    hit.setAttribute("aria-valuemax","359");
    hit.setAttribute("aria-valuenow",String(Math.round((r.angle+360)%360)));
    hit.setAttribute("tabindex","0");
    hit.dataset.ring=r.id;
    r.hit=hit;
    r.group.append(hit);
  });
  const paintRings=()=>{
    for(const r of rings){
      const a=(r.angle%360+360)%360;
      r.group.setAttribute("transform","rotate("+a.toFixed(3)+" 360 360)");
      r.hit.setAttribute("aria-valuenow",String(Math.round(a)%360));
    }
  };
  paintRings();
  const saveRings=()=>{
    try{localStorage.setItem("yanya.xuanjing.tianhuan.rings.v1",JSON.stringify(rings.map(r=>Math.round(r.angle*100)/100)))}catch(_){}
  };

  // The eight pre-heaven trigram badges form their OWN seventh orbit.
  // The mappings and pre-heaven places below intentionally match GUA in
  // ritual-v3.js; keep the characters upright as the orbit moves.
  // Clockwise polar angles: north Kun, NE Zhen, east Li, SE Dui,
  // south Qian, SW Xun, west Kan, NW Gen.
  const bagua=[
    {name:"乾",symbol:"☰",nature:"天",base:180},
    {name:"兑",symbol:"☱",nature:"泽",base:135},
    {name:"离",symbol:"☲",nature:"火",base:90},
    {name:"震",symbol:"☳",nature:"雷",base:45},
    {name:"巽",symbol:"☴",nature:"风",base:225},
    {name:"坎",symbol:"☵",nature:"水",base:270},
    {name:"艮",symbol:"☶",nature:"山",base:315},
    {name:"坤",symbol:"☷",nature:"地",base:0}
  ];
  const baguaKey="yanya.xuanjing.tianhuan.bagua.v1";
  let baguaAngle=0,baguaVelocity=0,baguaPointer=null;
  try{
    const persisted=JSON.parse(localStorage.getItem(baguaKey));
    if(Number.isFinite(persisted))baguaAngle=persisted;
  }catch(_){}
  const persistBagua=()=>{
    try{localStorage.setItem(baguaKey,JSON.stringify(Math.round((((baguaAngle%360)+360)%360)*100)/100))}catch(_){}
  };
  const isBagua=()=>["8","64"].includes(stage.dataset.power) &&
    nodes.querySelectorAll(".ritual-glyph").length===8;
  const paintBagua=()=>{
    if(!isBagua())return;
    const badges=nodes.querySelectorAll(".ritual-glyph");
    const rad=Math.PI/180;
    badges.forEach((b,i)=>{
      const angle=(bagua[i].base+baguaAngle)*rad;
      b.style.left=(50+40*Math.sin(angle))+"%";
      b.style.top=(50-40*Math.cos(angle))+"%";
    });
  };
  const hydrateBagua=()=>{
    if(!isBagua())return;
    nodes.querySelectorAll(".ritual-glyph").forEach((b,i)=>{
      const item=bagua[i];
      b.classList.add("tianhuan-bagua-node");
      b.dataset.baguaIndex=String(i);
      b.setAttribute("aria-label",item.name+"卦 · "+item.nature+"。轻触选卦，拖动旋转八卦外环");
      b.setAttribute("title",item.name+" · "+item.nature);
      // This keeps the actual glyph and readable Hanzi together.
      const han=document.createElement("span");
      han.className="tianhuan-bagua-hanzi";han.textContent=item.name;
      const sign=document.createElement("span");
      sign.className="tianhuan-bagua-sign";sign.textContent=item.symbol;
      b.replaceChildren(han,sign);
    });
    paintBagua();
  };
  const baguaObserver=new MutationObserver(hydrateBagua);
  baguaObserver.observe(nodes,{childList:true});
  hydrateBagua();
  const baguaPointAngle=event=>{
    const r=nodes.getBoundingClientRect();
    return Math.atan2(event.clientY-(r.top+r.height/2),
      event.clientX-(r.left+r.width/2))*180/Math.PI;
  };
  const baguaDelta=(a,b)=>((a-b+540)%360)-180;
  let swallowBaguaClick=false;
  nodes.addEventListener("pointerdown",event=>{
    const badge=event.target.closest(".tianhuan-bagua-node");
    if(!badge||event.isPrimary===false||(event.pointerType==="mouse"&&event.button!==0))return;
    const a=baguaPointAngle(event);
    baguaPointer={id:event.pointerId,target:badge,
      x:event.clientX,y:event.clientY,last:a,time:performance.now(),
      moved:false};
    baguaVelocity=0;
  });
  nodes.addEventListener("pointermove",event=>{
    const p=baguaPointer;
    if(!p||event.pointerId!==p.id)return;
    if(!p.moved){
      if(Math.hypot(event.clientX-p.x,event.clientY-p.y)<7)return;
      p.moved=true;
      stage.classList.add("tianhuan-bagua-dragging");
      try{p.target.setPointerCapture(event.pointerId)}catch(_){}
    }
    const now=performance.now(),angle=baguaPointAngle(event);
    const delta=baguaDelta(angle,p.last),dt=Math.max(10,Math.min(now-p.time,100));
    baguaAngle=(baguaAngle+delta+360)%360;
    baguaVelocity=Math.max(-135,Math.min(135,baguaVelocity*.64+(delta/dt*1000)*.36));
    p.last=angle;p.time=now;
    paintBagua();
    if(event.cancelable)event.preventDefault();
  },{passive:false});
  const endBagua=(event,cancelled=false)=>{
    const p=baguaPointer;
    if(!p||event.pointerId!==p.id)return;
    if(p.moved){
      swallowBaguaClick=true;
      if(cancelled)baguaVelocity=0;
      persistBagua();
    }
    baguaPointer=null;
    stage.classList.remove("tianhuan-bagua-dragging");
    if(p.target.hasPointerCapture?.(event.pointerId)){
      try{p.target.releasePointerCapture(event.pointerId)}catch(_){}
    }
  };
  nodes.addEventListener("pointerup",event=>endBagua(event));
  nodes.addEventListener("pointercancel",event=>endBagua(event,true));
  nodes.addEventListener("lostpointercapture",event=>endBagua(event,true));
  nodes.addEventListener("click",event=>{
    if(!swallowBaguaClick)return;
    swallowBaguaClick=false;
    event.preventDefault();
    event.stopImmediatePropagation();
  },true);
  // Trigram clicks keep triggering the original selected-gua detail.
  // Dragging a badge moves all eight around the shared jade ring.


  let activeRing=null,drag=null,lastFrame=0,raf=0,visible=true,frameAt=0;
  const minmax=(x,l,h)=>Math.max(l,Math.min(h,x));
  const angleAt=e=>{
    const rect=svg.getBoundingClientRect();
    return Math.atan2(e.clientY-(rect.top+rect.height/2),
      e.clientX-(rect.left+rect.width/2))*180/Math.PI;
  };
  const deltaAngle=(a,b)=>((a-b+540)%360)-180;
  // On touch browsers a thin transparent SVG stroke often is NOT hit-testable.
  // Find the closest physical ring from the pointer's actual canvas position;
  // the full SVG becomes the touch surface, without covering trigram buttons.
  const pickRing=e=>{
    const rect=svg.getBoundingClientRect();
    if(!rect.width||!rect.height)return null;
    const x=(e.clientX-rect.left)*720/rect.width-360;
    const y=(e.clientY-rect.top)*720/rect.height-360;
    const radius=Math.hypot(x,y);
    let best=null,distance=Infinity;
    for(const r of rings){
      let d;
      if(r.id.startsWith("orbit")){
        const tilt=(r.id==="orbitA"?-29:45)+r.angle;
        const a=tilt*Math.PI/180,ca=Math.cos(a),sa=Math.sin(a);
        const u=x*ca+y*sa,v=-x*sa+y*ca;
        const major=r.radius,minor=r.id==="orbitA"?92:70;
        const f=(u*u)/(major*major)+(v*v)/(minor*minor)-1;
        const gradient=2*Math.hypot(u/(major*major),v/(minor*minor));
        d=gradient?Math.abs(f)/gradient:Infinity;
      }else{
        d=Math.abs(radius-r.radius);
      }
      if(d<distance){distance=d;best=r;}
    }
    const range=window.matchMedia?.("(pointer: coarse)")?.matches?29:21;
    return distance<=range?best:null;
  };
  const onRingDown=e=>{
    if(e.isPrimary===false||(e.pointerType==="mouse"&&e.button!==0))return;
    const hit=e.target.closest?.(".tianhuan-ring-hit");
    const ring=(hit&&ringById[hit.dataset.ring])||pickRing(e);
    if(!ring)return;
    e.stopPropagation();e.preventDefault();
    activeRing=ring;
    drag={pointer:e.pointerId,prev:angleAt(e),time:performance.now(),moved:false};
    ring.velocity=0;
    stage.classList.add("tianhuan-dragging");
    try{svg.setPointerCapture(e.pointerId)}catch(_){}
  };
  const onRingMove=e=>{
    if(!drag||e.pointerId!==drag.pointer||!activeRing)return;
    e.stopPropagation();e.preventDefault();
    const next=angleAt(e),delta=deltaAngle(next,drag.prev);
    const now=performance.now(),ms=minmax(now-drag.time,10,100);
    if(Math.abs(delta)>.001){
      activeRing.angle=(activeRing.angle+delta+360)%360;
      activeRing.velocity=minmax(activeRing.velocity*.58+(delta/ms*1000)*.42,-130,130);
      drag.moved=true;
      paintRings();
    }
    drag.prev=next;drag.time=now;
  };
  const finishRing=e=>{
    if(!drag||e.pointerId!==drag.pointer)return;
    e.stopPropagation();
    if(svg.hasPointerCapture?.(e.pointerId)){
      try{svg.releasePointerCapture(e.pointerId)}catch(_){}
    }
    activeRing=null;drag=null;
    stage.classList.remove("tianhuan-dragging");
    saveRings();
  };
  svg.addEventListener("pointerdown",onRingDown);
  svg.addEventListener("pointermove",onRingMove,{passive:false});
  svg.addEventListener("pointerup",finishRing);
  svg.addEventListener("pointercancel",finishRing);
  svg.addEventListener("lostpointercapture",finishRing);
  svg.addEventListener("click",e=>{
    if(e.target.closest(".tianhuan-ring-hit")){
      e.preventDefault();e.stopPropagation();
    }
  },true);
  svg.addEventListener("keydown",e=>{
    const hit=e.target.closest(".tianhuan-ring-hit");
    if(!hit||!["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(e.key))return;
    e.preventDefault();e.stopPropagation();
    const r=ringById[hit.dataset.ring];
    if(!r)return;
    r.angle+=["ArrowLeft","ArrowDown"].includes(e.key)?-6:6;
    r.velocity=0;paintRings();saveRings();
  });

  // Gentle independent ring motion, never 60fps layered filter animation.
  // Pauses off-screen, on hidden tabs and for reduced-motion preferences.
  const reduced=window.matchMedia?.("(prefers-reduced-motion: reduce)");
  const saveData=navigator.connection?.saveData;
  const mobile=window.matchMedia?.("(pointer: coarse)");
  const spin=time=>{
    raf=0;
    if(document.hidden||!visible||document.body.dataset.homeView!=="cosmos")return;
    const fps=mobile?.matches?12:24;
    if(time-frameAt>=1000/fps){
      const dt=lastFrame?minmax((time-lastFrame)/1000,0,.12):0;
      lastFrame=time;frameAt=time;
      for(const r of rings){
        if(r===activeRing)continue;
        if(Math.abs(r.velocity)>.12){
          r.angle+=r.velocity*dt;
          r.velocity*=Math.exp(-dt*2.65);
        }else{
          r.velocity=0;
          if(!reduced?.matches&&!saveData)r.angle+=r.speed*dt;
        }
      }
      if(!baguaPointer && isBagua()){
        if(Math.abs(baguaVelocity)>.14){
          baguaAngle=(baguaAngle+baguaVelocity*dt+360)%360;
          baguaVelocity*=Math.exp(-dt*2.8);
        }else{
          baguaVelocity=0;
          if(!reduced?.matches&&!saveData)baguaAngle=(baguaAngle+5.5*dt)%360;
        }
        paintBagua();
      }
      paintRings();
    }
    raf=requestAnimationFrame(spin);
  };
  const startSpin=()=>{
    if(!raf && !document.hidden && visible){
      lastFrame=0;frameAt=0;
      raf=requestAnimationFrame(spin);
    }
  };
  const stopSpin=()=>{if(raf)cancelAnimationFrame(raf);raf=0;lastFrame=0};
  const visibility=new IntersectionObserver(entries=>{
    visible=entries[0]?.isIntersecting!==false;
    if(visible)startSpin();else stopSpin();
  },{threshold:0});
  visibility.observe(stage);
  document.addEventListener("visibilitychange",()=>{
    if(document.hidden){stopSpin();saveRings();persistBagua()}
    else startSpin();
  });
  window.addEventListener("pagehide",()=>{saveRings();persistBagua()});
  // Resume after switching back from the island: IntersectionObserver alone
  // does not reliably fire on every Android WebView display:none transition.
  const viewObserver=new MutationObserver(()=>{
    if(document.body.dataset.homeView==="cosmos")startSpin();
    else stopSpin();
  });
  viewObserver.observe(document.body,{attributes:true,attributeFilter:["data-home-view"]});
  startSpin();



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
