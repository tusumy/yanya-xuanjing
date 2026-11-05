/* 砚芽 · 玄境 / 岛心对话 Seed 19
   Static-site OpenAI-compatible chat. No server or API secrets in this repository.
   History is stored locally; API key is session-only unless the user manages it
   outside the website. Actual requests happen only after pressing Send.
*/
(() => {
  "use strict";
  const PREFIX="yanya.xuanjing.";
  const THREADS=PREFIX+"chat-threads.v1";
  const CURRENT=PREFIX+"chat-active.v1";
  const CONFIG=PREFIX+"chat-provider.v1";
  const KEY=PREFIX+"chat-session-key.v1";
  const LEGACY=PREFIX+"chat-preview.v1";
  const MAX_THREADS=36,MAX_MESSAGES=120,MAX_TEXT=12000;
  let instance=null;
  const el=(tag,cls,text)=>{
    const n=document.createElement(tag);
    if(cls)n.className=cls;
    if(text!==undefined)n.textContent=text;
    return n;
  };
  const btn=(name,fn,cls)=>{
    const b=el("button",cls||"chat-action",name);
    b.type="button";
    b.addEventListener("click",fn);
    return b;
  };
  const read=(key,defaultValue)=>{
    try{const raw=localStorage.getItem(key);return raw===null?defaultValue:JSON.parse(raw)}
    catch(_){return defaultValue}
  };
  const write=(key,value)=>{
    try{localStorage.setItem(key,JSON.stringify(value));return true}
    catch(_){return false}
  };
  const uid=()=>String(Date.now())+"-"+Math.random().toString(36).slice(2,9);
  const now=()=>new Date().toISOString();
  const cleanText=x=>typeof x==="string"?x.slice(0,MAX_TEXT):"";
  const normalizeMessage=m=>
    m&&["user","assistant"].includes(m.role)&&typeof m.content==="string"?
      {role:m.role,content:cleanText(m.content),at:typeof m.at==="string"?m.at:now()}:null;
  const normalizeThread=t=>{
    if(!t||typeof t!=="object"||!Array.isArray(t.messages))return null;
    const messages=t.messages.map(normalizeMessage).filter(Boolean).slice(-MAX_MESSAGES);
    return {
      id:typeof t.id==="string"&&t.id.length<96?t.id:uid(),
      title:typeof t.title==="string"?t.title.slice(0,50):"新对话",
      updated:typeof t.updated==="string"?t.updated:now(),
      messages
    };
  };
  const textOf=part=>{
    if(typeof part==="string")return part;
    if(Array.isArray(part))return part.map(p=>
      typeof p==="string"?p:
      typeof p?.text==="string"?p.text:
      typeof p?.text?.value==="string"?p.text.value:"").join("");
    return "";
  };
  const replyFromJson=json=>textOf(json?.choices?.[0]?.message?.content)||
    textOf(json?.output_text)||
    textOf(json?.response);
  const loadThreads=()=>{
    const raw=read(THREADS,[]);
    const items=Array.isArray(raw)?raw.map(normalizeThread).filter(Boolean).slice(0,MAX_THREADS):[];
    if(items.length)return items;
    const preview=read(LEGACY,[]);
    if(Array.isArray(preview)&&preview.some(x=>typeof x==="string"&&x.trim())){
      const m=preview.filter(x=>typeof x==="string"&&x.trim()).slice(-24)
        .map(content=>({role:"user",content:cleanText(content),at:now()}));
      return [{id:uid(),title:"旧版离线预览",updated:now(),messages:m}];
    }
    return [{id:uid(),title:"新对话",updated:now(),messages:[]}];
  };
  const urlFor=raw=>{
    let url;
    try{url=new URL(raw.trim())}catch(_){throw Error("接口地址不是有效 URL")}
    const local=["localhost","127.0.0.1","[::1]","::1"].includes(url.hostname);
    if(url.protocol!=="https:"&&!(local&&url.protocol==="http:")){
      throw Error("接口需要 HTTPS；仅本机 localhost 可以使用 HTTP");
    }
    if(url.username||url.password)throw Error("接口地址不能包含用户名或密码");
    if(url.search||url.hash)throw Error("接口地址不要附带查询参数或锚点");
    const path=url.pathname.replace(/\/+$/,"");
    url.pathname=/\/chat\/completions$/.test(path)?path:
      (path==="/"?"":path)+"/chat/completions";
    return url.href;
  };
  function mount(container){
    if(instance)instance.dispose();
    let closed=false,busy=false,controller=null;
    const threads=loadThreads();
    let selected=read(CURRENT,threads[0].id);
    if(!threads.some(t=>t.id===selected))selected=threads[0].id;
    let cfg=read(CONFIG,{url:"",model:"",system:"",stream:true});
    if(!cfg||typeof cfg!=="object")cfg={url:"",model:"",system:"",stream:true};
    cfg={
      url:typeof cfg.url==="string"?cfg.url:"",
      model:typeof cfg.model==="string"?cfg.model:"",
      system:typeof cfg.system==="string"?cfg.system:"",
      stream:cfg.stream!==false
    };
    const keyRead=()=>{try{return sessionStorage.getItem(KEY)||""}catch(_){return ""}};
    const keyWrite=s=>{try{sessionStorage.setItem(KEY,s);return true}catch(_){return false}};
    const root=el("section","real-chat");
    const aside=el("aside","real-chat-sidebar");
    const sideTitle=el("div","real-chat-side-title");
    sideTitle.append(el("strong","","对话书页"));
    const newBtn=btn("＋ 新对话",()=>newChat(),"real-chat-new");
    sideTitle.append(newBtn);
    const threadList=el("div","real-chat-threads");
    const sideTools=el("div","real-chat-side-tools");
    const exportBtn=btn("导出备份",exportHistory);
    const importBtn=btn("导入记录",()=>filePicker.click());
    const filePicker=el("input","real-chat-file");
    filePicker.type="file";
    filePicker.accept=".json,application/json";
    filePicker.hidden=true;
    filePicker.addEventListener("change",importHistory);
    sideTools.append(exportBtn,importBtn,filePicker);
    aside.append(sideTitle,threadList,sideTools);

    const main=el("div","real-chat-main");
    const top=el("div","real-chat-top");
    const title=el("strong","real-chat-name","岛心 · 对话");
    const modelLabel=el("small","real-chat-model","尚未配置模型");
    const topLeft=el("div","real-chat-top-left");
    topLeft.append(title,modelLabel);
    const settingsToggle=btn("接口设置",()=>{
      settingsArea.open=!settingsArea.open;
      if(settingsArea.open)urlInput.focus();
    },"real-chat-setting-button");
    top.append(topLeft,settingsToggle);

    const settingsArea=el("details","real-chat-settings");
    const summary=el("summary","","接入模型 · OpenAI 兼容接口");
    const settingsFields=el("div","real-chat-settings-fields");
    const makeField=(caption,placeholder,type,value)=>{
      const wrap=el("label","real-chat-field");
      wrap.append(el("span","",caption));
      const input=el(type==="textarea"?"textarea":"input","real-chat-input");
      if(type!=="textarea")input.type=type||"text";
      if(placeholder)input.placeholder=placeholder;
      input.value=value||"";
      if(type==="textarea")input.rows=3;
      wrap.append(input);
      return {wrap,input};
    };
    const urlField=makeField("API 地址","https://example.com/v1","url",cfg.url);
    const urlInput=urlField.input;
    const modelField=makeField("模型名称","填写服务商提供的 model ID","text",cfg.model);
    const modelInput=modelField.input;
    const secretField=makeField("API Key（只保存在当前浏览会话）","可留空，适用于不需要 Key 的本地接口","password",keyRead());
    const keyInput=secretField.input;
    keyInput.autocomplete="off";
    const promptField=makeField("系统提示词（可选）","角色设定、语言习惯、回复风格……","textarea",cfg.system);
    const promptInput=promptField.input;
    promptInput.maxLength=12000;
    const streamLine=el("label","real-chat-stream");
    const streamCheck=el("input");
    streamCheck.type="checkbox";
    streamCheck.checked=cfg.stream;
    streamLine.append(streamCheck,el("span","","流式显示回复（接口不支持时可关闭）"));
    const settingActions=el("div","real-chat-setting-actions");
    const saveCfgBtn=btn("保存接口配置",saveSettings,"real-chat-save");
    const settingInfo=el("small","real-chat-security",
      "地址、模型与提示词保存在当前设备；Key 只留在本浏览会话。消息仅在点发送时提交给你填写的服务商。网站不托管代理，不保证第三方接口允许浏览器跨域访问。");
    settingActions.append(saveCfgBtn);
    settingsFields.append(
      urlField.wrap,modelField.wrap,secretField.wrap,
      promptField.wrap,streamLine,settingActions,settingInfo
    );
    settingsArea.append(summary,settingsFields);

    const messages=el("div","real-chat-messages");
    messages.setAttribute("role","log");
    messages.setAttribute("aria-live","polite");
    const status=el("div","real-chat-status");
    status.setAttribute("role","status");
    const composer=el("div","real-chat-compose");
    const input=el("textarea","real-chat-compose-input");
    input.rows=2;input.maxLength=MAX_TEXT;
    input.placeholder="发一条消息……";
    input.setAttribute("aria-label","输入消息");
    const sendBtn=btn("发送",()=>sendMessage(),"real-chat-send");
    const stopBtn=btn("停止",()=>{controller?.abort()},"real-chat-stop");
    stopBtn.hidden=true;
    const retryBtn=btn("重试上一条",()=>sendMessage(true),"real-chat-retry");
    const composerActions=el("div","real-chat-actions");
    composerActions.append(retryBtn,sendBtn,stopBtn);
    composer.append(input,composerActions);
    main.append(top,settingsArea,messages,status,composer);
    root.append(aside,main);
    container.replaceChildren(root);

    function saveAll(){
      threads.sort((a,b)=>String(b.updated).localeCompare(String(a.updated)));
      if(!write(THREADS,threads.slice(0,MAX_THREADS))){
        status.textContent="本机存储空间不足，对话可能无法保存，请先导出备份。";
      }
      write(CURRENT,selected);
    }
    function currentThread(){return threads.find(t=>t.id===selected)||threads[0]}
    function setBusy(value){
      busy=value;
      sendBtn.hidden=value;stopBtn.hidden=!value;
      newBtn.disabled=value;input.disabled=value;
      retryBtn.disabled=value;
      Array.from(threadList.querySelectorAll("button")).forEach(b=>b.disabled=value);
    }
    function renderThreads(){
      threadList.replaceChildren();
      threads.sort((a,b)=>String(b.updated).localeCompare(String(a.updated)));
      for(const t of threads){
        const item=el("div","real-chat-thread"+(t.id===selected?" is-current":""));
        const name=btn(t.title||"新对话",()=>{
          if(busy)return;
          selected=t.id;
          write(CURRENT,selected);
          renderThreads();renderMessages();
        },"real-chat-thread-name");
        name.title=t.title;
        const remove=btn("×",()=>{
          if(busy)return;
          if(!window.confirm("删除这段本机对话？删除后无法撤销。"))return;
          const index=threads.findIndex(v=>v.id===t.id);
          if(index>=0)threads.splice(index,1);
          if(!threads.length)threads.push({id:uid(),title:"新对话",updated:now(),messages:[]});
          if(selected===t.id)selected=threads[0].id;
          saveAll();renderThreads();renderMessages();
        },"real-chat-thread-remove");
        remove.setAttribute("aria-label","删除对话："+t.title);
        item.append(name,remove);
        threadList.append(item);
      }
    }
    function makeBubble(role,text,pending=false){
      const row=el("article","real-chat-message "+(role==="user"?"is-user":"is-assistant"));
      const who=el("div","real-chat-who",role==="user"?"我":"玄境");
      const body=el("div","real-chat-bubble",text);
      row.append(who,body);
      if(!pending&&role==="assistant"){
        const copy=btn("复制",()=>{
          navigator.clipboard?.writeText(text).then(()=>{
            copy.textContent="已复制";
          }).catch(()=>{
            copy.textContent="复制失败";
          });
        },"real-chat-copy");
        row.append(copy);
      }
      messages.append(row);
      return body;
    }
    const scrollEnd=()=>{messages.scrollTop=messages.scrollHeight};
    function renderMessages(){
      messages.replaceChildren();
      const t=currentThread();
      title.textContent=t.title==="新对话"?"岛心 · 对话":t.title;
      if(!t.messages.length){
        const empty=el("div","real-chat-empty");
        empty.append(el("div","real-chat-empty-icon","✧"),
          el("strong","","一盏灯，一段对话"),
          el("p","","对话只保存在这台设备。填好兼容接口和模型，再发第一句话。"));
        messages.append(empty);
      }else{
        for(const m of t.messages)makeBubble(m.role,m.content);
      }
      scrollEnd();
      retryBtn.hidden=!t.messages.length||t.messages[t.messages.length-1].role!=="user";
    }
    function syncModelLabel(){
      modelLabel.textContent=cfg.url&&cfg.model?
        (cfg.model+" · 浏览器直连"):"尚未配置模型 · 点击接口设置";
      if(!cfg.url||!cfg.model)settingsArea.open=true;
    }
    function saveSettings(){
      const url=urlInput.value.trim(),model=modelInput.value.trim();
      if(url){
        try{urlFor(url)}catch(e){status.textContent=String(e.message||e);urlInput.focus();return}
      }
      cfg={url,model,system:promptInput.value.slice(0,12000),
        stream:streamCheck.checked};
      if(!write(CONFIG,cfg))status.textContent="配置未能写入本机，请检查存储权限。";
      else status.textContent="配置已保存在本机，Key 只保存在当前浏览会话。";
      if(!keyWrite(keyInput.value.trim())){
        status.textContent="当前浏览器禁止会话存储，Key 未能保存。";
      }
      syncModelLabel();
      if(url&&model)settingsArea.open=false;
    }
    function newChat(){
      if(busy)return;
      const t={id:uid(),title:"新对话",updated:now(),messages:[]};
      threads.unshift(t);
      if(threads.length>MAX_THREADS)threads.pop();
      selected=t.id;saveAll();renderThreads();renderMessages();
      status.textContent="已创建新对话。";
      input.focus();
    }
    function exportHistory(){
      const data={format:"yanya-chat-v1",exportedAt:now(),threads};
      const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
      const href=URL.createObjectURL(blob);
      const link=document.createElement("a");
      link.href=href;link.download="砚芽-对话备份-"+new Date().toISOString().slice(0,10)+".json";
      document.body.append(link);link.click();link.remove();
      setTimeout(()=>URL.revokeObjectURL(href),2000);
      status.textContent="对话备份已导出（不含 API Key）。";
    }
    async function importHistory(){
      const file=filePicker.files?.[0];
      filePicker.value="";
      if(!file)return;
      if(busy){status.textContent="请先停止生成，再导入。";return}
      if(file.size>2*1024*1024){status.textContent="文件超过 2 MB，未导入。";return}
      try{
        const raw=JSON.parse(await file.text());
        if(raw?.format!=="yanya-chat-v1"||!Array.isArray(raw.threads))
          throw Error("不是砚芽对话备份 JSON");
        const incoming=raw.threads.map(normalizeThread).filter(Boolean).slice(0,MAX_THREADS);
        if(!incoming.length)throw Error("备份里没有可用会话");
        if(!window.confirm("导入 "+incoming.length+" 段对话？会与现有记录合并。"))return;
        const ids=new Set(threads.map(t=>t.id));
        for(const item of incoming){
          if(ids.has(item.id))item.id=uid();
          threads.push(item);ids.add(item.id);
        }
        threads.sort((a,b)=>String(b.updated).localeCompare(String(a.updated)));
        threads.splice(MAX_THREADS);
        selected=incoming[0].id;
        saveAll();renderThreads();renderMessages();
        status.textContent="已导入 "+incoming.length+" 段对话。";
      }catch(e){status.textContent="导入失败："+String(e.message||e)}
    }
    function pushMessage(t,role,text){
      t.messages.push({role,content:cleanText(text),at:now()});
      t.messages=t.messages.slice(-MAX_MESSAGES);
      if(role==="user"&&t.title==="新对话"){
        t.title=text.trim().replace(/\s+/g," ").slice(0,22)||"新对话";
      }
      t.updated=now();
      saveAll();
    }
    async function sendMessage(retry=false){
      if(busy||closed)return;
      const content=input.value.trim();
      if(!retry&&!content)return;
      if(!cfg.url||!cfg.model){
        status.textContent="先在「接口设置」填写 API 地址和模型名称。";
        settingsArea.open=true;return;
      }
      let target;
      try{target=urlFor(cfg.url)}catch(e){
        status.textContent=String(e.message||e);
        settingsArea.open=true;return;
      }
      const t=currentThread();
      if(retry){
        if(t.messages.at(-1)?.role!=="user"){status.textContent="没有可重试的上一条。";return}
      }else{
        pushMessage(t,"user",content);
        input.value="";
      }
      renderThreads();renderMessages();
      status.textContent="正在连接 "+cfg.model+"……";
      const base=cfg.system.trim()?[{role:"system",content:cfg.system.trim()}]:[];
      const chatMessages=base.concat(t.messages.slice(-40).map(m=>({
        role:m.role,content:m.content
      })));
      const request=new AbortController();
      controller=request;
      setBusy(true);
      let answer="",bubble=null,stopped=false;
      try{
        const headers={"Content-Type":"application/json","Accept":cfg.stream?
          "text/event-stream, application/json":"application/json"};
        const secret=keyRead();
        if(secret)headers.Authorization="Bearer "+secret;
        const response=await fetch(target,{
          method:"POST",mode:"cors",credentials:"omit",cache:"no-store",
          headers,body:JSON.stringify({
            model:cfg.model,messages:chatMessages,stream:cfg.stream
          }),signal:request.signal
        });
        if(!response.ok){
          const body=(await response.text()).slice(0,1200);
          let detail=body;
          try{const parsed=JSON.parse(body);detail=parsed?.error?.message||parsed?.message||body}catch(_){}
          throw Error("HTTP "+response.status+"："+detail.slice(0,330));
        }
        bubble=makeBubble("assistant","正在生成……",true);
        scrollEnd();
        const type=response.headers.get("content-type")||"";
        if(cfg.stream&&response.body&&type.includes("text/event-stream")){
          const reader=response.body.getReader();
          const decoder=new TextDecoder();
          let buffer="",done=false;
          while(!done){
            const packet=await reader.read();
            done=packet.done;
            buffer+=decoder.decode(packet.value||new Uint8Array(),{stream:!done});
            const lines=buffer.split(/\r?\n/);
            buffer=lines.pop()||"";
            for(const line of lines){
              if(!line.startsWith("data:"))continue;
              const data=line.slice(5).trim();
              if(data==="[DONE]"){done=true;break}
              if(!data)continue;
              let item;
              try{item=JSON.parse(data)}catch(_){continue}
              const delta=textOf(item?.choices?.[0]?.delta?.content);
              if(delta){
                answer+=delta;
                if(answer.length>MAX_TEXT*2)answer=answer.slice(0,MAX_TEXT*2);
                bubble.textContent=answer;scrollEnd();
              }
            }
          }
          try{await reader.cancel()}catch(_){}
        }else{
          const json=await response.json();
          answer=replyFromJson(json);
        }
        if(!answer.trim())throw Error("接口没有返回可显示的文本，请检查模型和接口格式");
        if(!closed){
          pushMessage(t,"assistant",answer);
          renderMessages();renderThreads();
          status.textContent="已收到回复，记录保存在本机。";
        }
      }catch(e){
        stopped=e?.name==="AbortError";
        if(!closed){
          if(stopped){
            if(answer.trim())pushMessage(t,"assistant",answer+" \n[已停止生成]");
            status.textContent="已停止生成。"+(answer?"已保留收到的部分内容。":"");
          }else{
            status.textContent="请求失败："+String(e.message||e)+
              (e instanceof TypeError?"。可能是接口跨域（CORS）或网络连接失败。":"");
          }
          renderMessages();renderThreads();
        }
      }finally{
        if(controller===request)controller=null;
        if(!closed)setBusy(false);
      }
    }
    input.addEventListener("keydown",e=>{
      if(e.key==="Enter"&&!e.shiftKey&&!e.isComposing){
        e.preventDefault();sendMessage();
      }
    });
    cfg.url=urlInput.value;
    renderThreads();renderMessages();syncModelLabel();
    if(!write(THREADS,threads))status.textContent="浏览器存储不可用，对话可能无法保存。";
    instance={
      dispose(){
        closed=true;
        controller?.abort();
        controller=null;
        instance=null;
      }
    };
  }
  window.YanyaChat={
    mount,
    dispose(){instance?.dispose()}
  };
})();
