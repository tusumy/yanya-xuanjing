/* 砚芽 · 天机台 / 本地四柱排盘（lunar-javascript v1.7.7）。
 * 天秩 MCP 仅可在 ChatGPT 中访问；此页面不声称直接调用它。
 * 不保存出生信息、不上传出生信息。 */
(() => {
  "use strict";
  const ELEMENTS=["木","火","土","金","水"];
  const STEMS={甲:"木",乙:"木",丙:"火",丁:"火",戊:"土",己:"土",庚:"金",辛:"金",壬:"水",癸:"水"};
  const BRANCHES={子:"水",丑:"土",寅:"木",卯:"木",辰:"土",巳:"火",午:"火",未:"土",申:"金",酉:"金",戌:"土",亥:"水"};
  const PILLAR_KEYS=[["年柱","getYear","getYearShiShenGan","getYearNaYin"],["月柱","getMonth","getMonthShiShenGan","getMonthNaYin"],["日柱","getDay",null,"getDayNaYin"],["时柱","getTime","getTimeShiShenGan","getTimeNaYin"]];
  const create=(tag,cls,txt)=>{
    const n=document.createElement(tag);
    if(cls)n.className=cls;
    if(txt!==undefined)n.textContent=String(txt);
    return n;
  };
  const wrap=(tag,cls,...children)=>{
    const n=create(tag,cls);
    children.filter(Boolean).forEach(x=>n.append(x));
    return n;
  };
  const fmt=(n)=>String(n).padStart(2,"0");
  const makeInput=(type,cls,values={})=>{
    const el=create("input",cls);
    el.type=type;
    Object.entries(values).forEach(([key,val])=>{el[key]=val;});
    return el;
  };
  const label=(name,field)=>wrap("label","tianji-label",create("span","",name),field);
  const textLine=(name,value)=>wrap("div","tianji-meta-line",create("span","",name),create("strong","",value));
  function validate(ymd,hms){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(ymd)||!/^\d{2}:\d{2}$/.test(hms))throw Error("请填完整的公历日期和时间。");
    const [y,m,d]=ymd.split("-").map(Number);
    const [h,minute]=hms.split(":").map(Number);
    if(y<1900||y>2100||h>23||minute>59||m<1||m>12||d<1||d>31)throw Error("请输入 1900—2100 年之间的有效日期。");
    const check=new Date(Date.UTC(y,m-1,d));
    if(check.getUTCFullYear()!==y||check.getUTCMonth()!==m-1||check.getUTCDate()!==d)throw Error("公历日期不存在，请重新输入。");
    return {y,m,d,h,minute};
  }
  function calculate(birth,clock,year){
    if(typeof window.Solar==="undefined")throw Error("历法库未载入，请检查网络后刷新页面。");
    const t=validate(birth,clock);
    const n=Number(year);
    if(!Number.isInteger(n)||n<1900||n>2100)throw Error("流年须在 1900—2100 年之间。");
    // 创建公历日期而不是 JS Date，避免浏览器时区悄悄改变用户输入的钟表时间。
    const lunar=window.Solar.fromYmdHms(t.y,t.m,t.d,t.h,t.minute,0).getLunar();
    const eight=lunar.getEightChar();
    const pillars=PILLAR_KEYS.map(([name,getter,ten,nayin])=>{
      const gz=eight[getter]();
      if(typeof gz!=="string"||gz.length!==2)throw Error("四柱历法数据不完整。");
      return {name,gz,stem:gz[0],branch:gz[1],
        ten:ten?eight[ten]():"日主",nayin:eight[nayin]()};
    });
    const elements=Object.fromEntries(ELEMENTS.map(k=>[k,0]));
    for(const p of pillars){elements[STEMS[p.stem]]++;elements[BRANCHES[p.branch]]++;}
    const cycle=window.Solar.fromYmdHms(n,6,15,12,0,0).getLunar().getYearInGanZhiExact();
    return {pillars,elements,cycle,year:n,dayMaster:pillars[2].stem,
      dayElement:STEMS[pillars[2].stem],birth,clock};
  }
  function renderChart(target,data){
    target.replaceChildren();
    const section=wrap("section","tianji-chart",
      wrap("div","tianji-section-head",create("span","tianji-overline","THE FOUR PILLARS"),create("strong","","生辰四柱")));
    const grid=create("div","tianji-pillars");
    data.pillars.forEach(p=>{
      const cell=wrap("article","tianji-pillar",
        create("small","",p.name),
        create("span","tianji-stem",p.stem),
        create("span","tianji-branch",p.branch),
        create("em","",p.ten),
        create("small","tianji-nayin",p.nayin));
      grid.append(cell);
    });
    section.append(grid);
    section.append(wrap("p","tianji-daymaster",
      create("span","","日主"),
      create("strong","",data.dayMaster+" · "+data.dayElement),
      create("span","","根据输入的出生地当地钟表时间，未作真太阳时修正。")));
    target.append(section);

    const five=wrap("section","tianji-card",
      wrap("div","tianji-section-head",create("span","tianji-overline","FIVE ELEMENTS"),create("strong","","五行分布")));
    ELEMENTS.forEach(key=>{
      const count=data.elements[key];
      const row=wrap("div","tianji-element-row",
        create("span","tianji-element-name",key),
        wrap("div","tianji-element-track",wrap("span","tianji-element-fill tianji-el-"+key)),
        create("strong","",count+" / 8"));
      row.querySelector(".tianji-element-fill").style.width=(count/8*100)+"%";
      five.append(row);
    });
    five.append(create("p","tianji-explain","按四柱天干及地支本气各计一次，共八项；不是天秩的五行力量评分，也不能直接据此断定喜忌。"));
    target.append(five);

    const annual=wrap("section","tianji-card",
      wrap("div","tianji-section-head",create("span","tianji-overline","YEARLY CYCLE"),create("strong","","流年干支")),
      wrap("div","tianji-flow",
        create("strong","",data.cycle),create("span","",data.year+" 年 · 以立春为岁首")));
    annual.append(create("p","tianji-explain","这里是实际计算的流年干支；天秩的流年评分需要另外调用天秩服务，不会凭空生成。"));
    target.append(annual);
  }
  function renderImported(target,json){
    target.replaceChildren();
    let data;
    try{data=JSON.parse(json);}catch(_){throw Error("这段不是有效 JSON。请粘贴天秩工具返回的完整 JSON。");}
    if(data && data.result && typeof data.result==="object")data=data.result;
    if(!data||typeof data!=="object"||!(data.chart||data.bazi||data.year||data.strength))throw Error("没有识别到天秩的排盘、分析或流年结构。");
    const section=wrap("section","tianji-card",
      wrap("div","tianji-section-head",create("span","tianji-overline","TIANZHI / IMPORTED"),create("strong","","天秩结果")));
    const row=(name,value)=>{
      if(value===undefined||value===null||value==="")return;
      section.append(textLine(name,String(value)));
    };
    row("四柱",data.chart?.bazi||data.bazi);
    row("日主",data.chart?.day_master);
    row("旺衰",data.strength?.label);
    row("格局",data.pattern?.name);
    row("用神",data.yongshen?.yong);
    row("喜神",data.yongshen?.xi);
    row("忌神",data.yongshen?.ji);
    row("2026 等指定流年",data.year?.ganzhi);
    if(data.year?.score!==undefined)row("天秩流年分",data.year.score+"/100");
    if(data.element_power && typeof data.element_power==="object"){
      section.append(create("p","tianji-explain","五行力量："+ELEMENTS.map(k=>k+" "+(data.element_power[k]??"—")).join(" · ")));
    }
    section.append(create("p","tianji-explain","仅显示你手动导入的天秩数据；这是 ChatGPT 工具的结果，不是网页实时查询。"));
    target.append(section);
  }
  function mount(container){
    if(!container)return;
    container.append(create("p","section-lead","把生辰交给星盘。四柱、五行、流年干支在浏览器本地计算；天秩的进阶解析可以另外导入。"));
    const root=create("section","tianji");
    const heading=wrap("div","tianji-heading",create("span","tianji-seal","✦"),wrap("div","",create("span","tianji-overline","ASTROLABE / 八字"),create("h3","","四柱命盘")));
    const badge=create("span","tianji-badge","本地计算");
    heading.append(badge);
    const form=create("form","tianji-form");
    const date=makeInput("date","tianji-input",{min:"1900-01-01",max:"2100-12-31",required:true});
    const time=makeInput("time","tianji-input",{value:"12:00",required:true});
    const year=makeInput("number","tianji-input",{min:"1900",max:"2100",step:"1",value:String(new Date().getFullYear()),required:true});
    const inputs=wrap("div","tianji-fields",
      label("出生公历",date),label("出生时间",time),label("查看流年",year));
    const row=create("div","tianji-actions");
    const run=create("button","primary-button","开始排盘");
    run.type="submit";
    const demo=create("button","secondary-button","试排示例");
    demo.type="button";
    row.append(run,demo);
    const note=create("p","tianji-hint","出生资料仅用于本页即时计算，不保存、不上传。输入出生地的当地民用时间，尚不支持经度真太阳时校正。");
    const status=create("p","tianji-status");
    status.setAttribute("role","status");
    const result=create("div","tianji-output");
    form.append(inputs,row,note,status);
    root.append(heading,form,result);
    form.addEventListener("submit",event=>{
      event.preventDefault();
      status.textContent="";status.className="tianji-status";
      try{
        const outcome=calculate(date.value,time.value,year.value);
        renderChart(result,outcome);
        status.textContent="四柱排盘完成 · lunar-javascript 1.7.7";
      }catch(error){
        result.replaceChildren();
        status.className="tianji-status tianji-error";
        status.textContent=error instanceof Error?error.message:"排盘失败，请稍后重试。";
      }
    });
    demo.addEventListener("click",()=>{
      date.value="2000-01-01";time.value="12:00";year.value="2026";
      form.requestSubmit();
      status.textContent="示例资料：2000-01-01 12:00 · 2026 流年；不代表你的出生资料。";
    });
    const bridge=create("details","tianji-bridge");
    const summary=create("summary","","天秩 · 进阶分析（结果导入）");
    bridge.append(summary,create("p","tianji-hint","天秩 MCP 目前只在 ChatGPT 中可用，没有公开网页调用地址。可复制请求在聊天里调用，再将返回的 JSON 粘贴到这里。"));
    const bridgeButtons=create("div","tianji-actions");
    const request=create("button","secondary-button","复制天秩请求");
    request.type="button";
    const importButton=create("button","secondary-button","读取导入结果");
    importButton.type="button";
    bridgeButtons.append(request,importButton);
    const json=create("textarea","tianji-import");
    json.rows=5;
    json.placeholder="粘贴天秩的 bazi_analysis 或 bazi_year 完整 JSON…";
    json.setAttribute("aria-label","天秩 JSON 结果");
    const importStatus=create("p","tianji-status");
    importStatus.setAttribute("role","status");
    const imported=create("div","tianji-output");
    bridge.append(bridgeButtons,json,importStatus,imported);
    request.addEventListener("click",async()=>{
      if(!date.value){importStatus.textContent="先填写出生公历，再复制请求。";return;}
      const prompt="请使用已连接的「天秩」工具，依据公历 "+date.value+" "+time.value+"（出生地当地钟表时间），不启用真太阳时校正，执行 bazi_analysis，并对 "+year.value+" 年的流年干支执行 bazi_year。请给我完整 JSON 返回结果，供砚芽天机台导入。";
      try{
        if(!navigator.clipboard?.writeText)throw Error("clipboard unavailable");
        await navigator.clipboard.writeText(prompt);
        importStatus.textContent="请求已复制，可粘贴到 ChatGPT 里调用天秩。";
      }catch(_){importStatus.textContent="当前浏览器不能复制，请使用 HTTPS 打开页面再试。";}
    });
    importButton.addEventListener("click",()=>{
      try{renderImported(imported,json.value.trim());importStatus.textContent="已读取导入结果（仅当前页面）。";}
      catch(e){imported.replaceChildren();importStatus.textContent=e.message;}
    });
    root.append(bridge);
    container.append(root);
  }
  window.YanyaBaZi={mount};
})();