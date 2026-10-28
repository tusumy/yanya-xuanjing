/* 砚芽 · 玄球
 * Real 3D sphere projection drawn on a single 2D canvas. No WebGL, filters,
 * external assets, continuously transforming DOM layers, or personal data.
 * The back half dims, the front half brightens, and latitude/longitude
 * rotate around BOTH the horizontal and vertical axes.
 */
(() => {
  "use strict";
  const PI=Math.PI, TAU=PI*2;
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const runes=["☰","☱","☲","☳","☴","☵","☶","☷"];
  const names=["乾 · 天","兑 · 泽","离 · 火","震 · 雷","巽 · 风","坎 · 水","艮 · 山","坤 · 地"];
  const latitudes=[-70,-47,-24,0,24,47,70].map(v=>v*PI/180);
  const meridians=Array.from({length:12},(_,i)=>i*TAU/12);
  const deg=PI/180;
  function mount(stage,config){
    const canvas=document.createElement("canvas");
    canvas.className="ritual-sphere-canvas";
    canvas.tabIndex=0;
    canvas.setAttribute("role","img");
    canvas.setAttribute("aria-label","旋转的玄境天球。手指或鼠标拖动可改变方向；方向键也可旋转。点击球面卦符可选卦。");
    // Place directly above the old disc, below the accessible central button.
    const heart=stage.querySelector(".ritual-heart");
    stage.insertBefore(canvas,heart);
    const ctx=canvas.getContext("2d",{alpha:true,desynchronized:false});
    if(!ctx){canvas.remove();return null;}
    const media=typeof matchMedia==="function"?matchMedia("(prefers-reduced-motion: reduce)"):null;
    const coarse=typeof matchMedia==="function"?matchMedia("(pointer: coarse)"):null;
    const dots=Array.from({length:44},(_,i)=>{
      const a=i*2.399963229728653, z=1-2*(i+.5)/44,r=Math.sqrt(1-z*z);
      return [Math.cos(a)*r,z,Math.sin(a)*r,(i%5===0)?1.8:1.15];
    });
    const state={
      yaw:.52,pitch:.24,vy:0,vp:0,
      active:false,visible:true,frame:0,last:0,drawAt:0,
      size:0,ratio:1,down:null,targets:[],moved:false
    };
    const getColor=()=>document.body.dataset.period==="day"?
      {body:"#d4ebd3",edge:"rgba(43,118,84,.7)",behind:"rgba(42,111,85,.17)",
       grid:"rgba(48,134,91,.72)",bright:"#3d956d",light:"#f4ffdd",
       glyph:"#235a44",star:"rgba(46,140,86,.66)",shadow:"rgba(67,131,86,.18)"}:
      {body:"#0e3235",edge:"rgba(171,240,191,.78)",behind:"rgba(127,198,164,.17)",
       grid:"rgba(116,216,168,.66)",bright:"#bdf4b4",light:"#f2ffe0",
       glyph:"#d1f7ce",star:"rgba(201,248,197,.8)",shadow:"rgba(0,12,23,.43)"};
    // Rotate an actual 3D point. Camera looks from positive z.
    function project(x,y,z){
      const cy=Math.cos(state.yaw),sy=Math.sin(state.yaw);
      const ax=x*cy+z*sy, az=-x*sy+z*cy;
      const cp=Math.cos(state.pitch),sp=Math.sin(state.pitch);
      return [ax,y*cp-az*sp,y*sp+az*cp];
    }
    const spherePt=(lat,lon)=>project(
      Math.cos(lat)*Math.sin(lon),Math.sin(lat),Math.cos(lat)*Math.cos(lon));
    function drawCurve(getPoint,palette,r,cx,cy,frontColor,backColor,frontWidth=1){
      // Draw back and front halves separately, so the globe actually occludes itself.
      for(const front of [false,true]){
        ctx.beginPath();let started=false;
        for(let i=0;i<=120;i++){
          const p=getPoint(i/120),isFront=p[2]>=0;
          if(isFront!==front){started=false;continue;}
          const x=cx+r*p[0],y=cy-r*p[1];
          if(!started){ctx.moveTo(x,y);started=true;}else ctx.lineTo(x,y);
        }
        ctx.strokeStyle=front?frontColor:backColor;
        ctx.lineWidth=front?frontWidth:.75;
        ctx.stroke();
      }
    }
    function draw(){
      if(!state.active||!state.size)return;
      const s=state.size;
      const w=s*state.ratio;
      if(canvas.width!==Math.round(w)){
        canvas.width=Math.round(w);
        canvas.height=Math.round(w);
      }
      ctx.setTransform(state.ratio,0,0,state.ratio,0,0);
      ctx.clearRect(0,0,s,s);
      const c=s*.5,r=s*.398,theme=getColor();

      // An actual spherical mass, its light source offset to upper left.
      const shade=ctx.createRadialGradient(c-r*.32,c-r*.42,r*.06,c,c,r*1.12);
      if(document.body.dataset.period==="day"){
        shade.addColorStop(0,"rgba(251,255,234,.98)");
        shade.addColorStop(.4,"rgba(213,241,210,.90)");
        shade.addColorStop(.83,"rgba(117,180,146,.71)");
        shade.addColorStop(1,"rgba(34,102,84,.69)");
      }else{
        shade.addColorStop(0,"rgba(79,151,130,.56)");
        shade.addColorStop(.35,"rgba(19,75,73,.82)");
        shade.addColorStop(.83,"rgba(7,39,48,.93)");
        shade.addColorStop(1,"rgba(2,19,33,.95)");
      }
      ctx.beginPath();ctx.arc(c,c,r,0,TAU);ctx.fillStyle=shade;ctx.fill();
      ctx.save();ctx.beginPath();ctx.arc(c,c,r-.4,0,TAU);ctx.clip();

      // Meridians and parallels bend and disappear behind the horizon.
      latitudes.forEach((lat,i)=>drawCurve(t=>spherePt(lat,t*TAU),theme,r,c,c,
        i===3?theme.bright:theme.grid,theme.behind,i===3?1.7:1.0));
      meridians.forEach((lon,i)=>drawCurve(t=>spherePt(-PI/2+t*PI,lon),theme,r,c,c,
        i%3===0?theme.bright:theme.grid,theme.behind,i%3===0?1.25:.82));

      // Two tilted celestial orbits really rotate in depth around the sphere.
      const slant=[.42,-.68];
      slant.forEach((tilt,i)=>{
        drawCurve(t=>{
          const a=t*TAU,xx=Math.cos(a),zz=Math.sin(a), yy=Math.sin(a)*Math.sin(tilt);
          return project(xx*Math.cos(tilt),yy,zz*Math.cos(tilt));
        },theme,r*.99,c,c,theme.bright,theme.behind,i===0?2.1:1.2);
      });

      // Light points sit on the rotating surface, behind points correctly subdued.
      for(const dot of dots){
        const p=project(dot[0],dot[1],dot[2]);
        if(p[2]<-.25)continue;
        ctx.globalAlpha=clamp(.36+.64*p[2],.12,1);
        ctx.beginPath();ctx.arc(c+r*p[0],c-r*p[1],dot[3],0,TAU);
        ctx.fillStyle=theme.star;ctx.fill();
      }
      ctx.globalAlpha=1;
      ctx.restore();

      // Specular limb and bevel (not an animated blur/compositor layer).
      ctx.beginPath();ctx.arc(c,c,r,0,TAU);
      ctx.strokeStyle=theme.edge;ctx.lineWidth=2.1;ctx.stroke();
      ctx.beginPath();ctx.arc(c-r*.04,c-r*.05,r*.91,PI*1.14,PI*1.84);
      ctx.strokeStyle=theme.light;ctx.globalAlpha=.27;ctx.lineWidth=1.6;ctx.stroke();
      ctx.globalAlpha=1;

      // Trigrams float on geographic positions, not on a flat eight-point ring.
      state.targets=[];
      if(config.getLevel()===8||config.getLevel()===64){
        for(let i=0;i<8;i++){
          const lat=((i%2===0?28:-28)+(i===0?5:0))*deg;
          const p=spherePt(lat,i*TAU/8);
          if(p[2]<=.12)continue; // occluded by the sphere
          const x=c+r*p[0],y=c-r*p[1],size=clamp(s*.059*(.78+.23*p[2]),14,29);
          state.targets.push({x,y,r:Math.max(21,size*.91),i,z:p[2]});
          ctx.beginPath();ctx.arc(x,y,size*.75,0,TAU);
          ctx.fillStyle=document.body.dataset.period==="day"?"rgba(245,255,221,.78)":"rgba(10,53,52,.83)";
          ctx.fill();
          ctx.strokeStyle=i===config.getSelected()?theme.bright:theme.grid;
          ctx.lineWidth=i===config.getSelected()?2:1;
          ctx.stroke();
          ctx.fillStyle=theme.glyph;
          ctx.font="500 "+size+"px 'Segoe UI Symbol','Noto Sans Symbols 2',serif";
          ctx.textAlign="center";ctx.textBaseline="middle";
          ctx.fillText(runes[i],x,y+.8);
        }
      }else{
        // Other stages show a few illuminated coordinates, never fake trigrams.
        const n=Math.min(config.getLevel(),32);
        for(let i=0;i<n;i++){
          const lat=(-.6+1.2*((i*.618)%1)),lon=i*TAU/n;
          const p=spherePt(lat,lon);
          if(p[2]<.04)continue;
          ctx.beginPath();ctx.arc(c+r*p[0],c-r*p[1],i===config.getChosen()?3.8:2.1,0,TAU);
          ctx.fillStyle=i===config.getChosen()?theme.light:theme.bright;ctx.fill();
        }
      }
    }
    function size(){
      const r=canvas.getBoundingClientRect();
      const length=Math.round(r.width);
      if(length<=0)return;
      state.size=length;state.ratio=Math.min(window.devicePixelRatio||1,1.5);
      draw();
    }
    function loop(time){
      state.frame=0;
      if(!state.active||!state.visible||document.hidden)return;
      const fps=coarse&&coarse.matches?22:30;
      if(time-state.drawAt<1000/fps){state.frame=requestAnimationFrame(loop);return;}
      const dt=state.last?clamp((time-state.last)/1000,0,.08):0;
      state.last=time;state.drawAt=time;
      if(!state.down && !(media&&media.matches) && !(navigator.connection&&navigator.connection.saveData)){
        if(Math.abs(state.vy)>.01||Math.abs(state.vp)>.01){
          state.yaw+=state.vy*dt;state.pitch=clamp(state.pitch+state.vp*dt,-1.18,1.18);
          state.vy*=Math.exp(-dt*2.3);state.vp*=Math.exp(-dt*2.6);
        }else{
          state.vy=0;state.vp=0;state.yaw+=dt*.22;
        }
      }
      draw();
      state.frame=requestAnimationFrame(loop);
    }
    function schedule(){
      if(!state.active||!state.visible||document.hidden||state.frame)return;
      state.last=0;state.drawAt=0;state.frame=requestAnimationFrame(loop);
    }
    function setActive(v){
      state.active=Boolean(v);
      canvas.hidden=!state.active;
      if(state.frame){cancelAnimationFrame(state.frame);state.frame=0;}
      if(state.active){size();schedule();}
    }
    function down(e){
      if(!state.active||e.isPrimary===false||(e.pointerType==="mouse"&&e.button!==0))return;
      e.stopPropagation();
      state.down={id:e.pointerId,x:e.clientX,y:e.clientY,px:e.clientX,py:e.clientY,at:performance.now()};
      state.moved=false;state.vy=0;state.vp=0;
      canvas.setPointerCapture?.(e.pointerId);
    }
    function move(e){
      const prev=state.down;
      if(!prev||prev.id!==e.pointerId)return;
      e.stopPropagation();
      const deltaX=e.clientX-prev.px,deltaY=e.clientY-prev.py;
      if(Math.hypot(e.clientX-prev.x,e.clientY-prev.y)>5)state.moved=true;
      const now=performance.now(),dt=clamp((now-prev.at)/1000,.012,.1);
      const speed=.0085;
      state.yaw+=deltaX*speed;
      state.pitch=clamp(state.pitch-deltaY*speed,-1.18,1.18);
      state.vy=clamp(deltaX*speed/dt,-2.8,2.8);
      state.vp=clamp(-deltaY*speed/dt,-2.4,2.4);
      Object.assign(prev,{px:e.clientX,py:e.clientY,at:now});
      draw();
      if(e.cancelable)e.preventDefault();
    }
    function up(e){
      if(!state.down||state.down.id!==e.pointerId)return;
      e.stopPropagation();
      if(!state.moved){
        const b=canvas.getBoundingClientRect();
        const x=e.clientX-b.left,y=e.clientY-b.top;
        let hit=null;
        for(const target of state.targets){
          const d=Math.hypot(target.x-x,target.y-y);
          if(d<target.r && (!hit||d<hit.distance)){hit={...target,distance:d};}
        }
        if(hit)config.onSelectGua(hit.i);
      }
      state.down=null;state.moved=false;
      if(canvas.hasPointerCapture?.(e.pointerId))canvas.releasePointerCapture(e.pointerId);
      draw();
    }
    canvas.addEventListener("pointerdown",down);
    canvas.addEventListener("pointermove",move,{passive:false});
    canvas.addEventListener("pointerup",up);
    canvas.addEventListener("pointercancel",e=>{
      if(state.down?.id===e.pointerId){state.down=null;state.vy=0;state.vp=0;}
    });
    canvas.addEventListener("click",e=>e.stopPropagation());
    canvas.addEventListener("keydown",e=>{
      if(!state.active)return;
      const moves={ArrowLeft:[-.18,0],ArrowRight:[.18,0],
        ArrowUp:[0,.16],ArrowDown:[0,-.16]};
      if(!moves[e.key])return;
      e.preventDefault();state.yaw+=moves[e.key][0];
      state.pitch=clamp(state.pitch+moves[e.key][1],-1.18,1.18);
      draw();
    });
    const observer=typeof ResizeObserver==="function"?new ResizeObserver(size):null;
    observer?.observe(stage);
    window.addEventListener("resize",size,{passive:true});
    const io=typeof IntersectionObserver==="function"?new IntersectionObserver(records=>{
      state.visible=records[0]?.isIntersecting!==false;
      if(state.visible)schedule();
      else if(state.frame){cancelAnimationFrame(state.frame);state.frame=0;}
    },{threshold:0}):null;
    io?.observe(stage);
    document.addEventListener("visibilitychange",()=>{
      if(document.hidden&&state.frame){cancelAnimationFrame(state.frame);state.frame=0;}
      else if(!document.hidden)schedule();
    });
    const themeObserver=typeof MutationObserver==="function"?new MutationObserver(draw):null;
    themeObserver?.observe(document.body,{attributes:true,attributeFilter:["data-period"]});
    return {setActive,refresh:draw,canvas};
  }
  window.YanyaSphere={mount};
})();