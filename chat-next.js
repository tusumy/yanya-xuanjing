/* 砚芽·玄境 · 岛心对话 v21
 * Multiple OpenAI-compatible endpoints, user-triggered GET /models,
 * compact responsive chat, local conversations. No server side secrets.
 */
(() => {
"use strict";
const P="yanya.xuanjing.";
const THREADS=P+"chat-threads.v1",CURRENT=P+"chat-active.v1",LEGACY=P+"chat-preview.v1";
const PROVIDERS=P+"providers.v2",ACTIVE=P+"active-provider.v2";
const OLD_PROVIDER=P+"chat-provider.v1",OLD_KEY=P+"chat-session-key.v1";
const MAX_THREADS=36,MAX_MESSAGES=120,MAX_TEXT=12000,MAX_MODELS=500;
let singleton=null;
const node=(tag,cls="",str)=>{
  const e=document.createElement(tag);
  if(cls)e.className=cls;
  if(str!==undefined)e.textContent=str;
  return e;
};
const btn=(s,fn,cls="")=>{
  const e=node("button",cls,s);
  e.type="button";e.addEventListener("click",fn);return e;
};
const read=(key,fallback)=>{
  try{const t=localStorage.getItem(key);return t===null?fallback:JSON.parse(t)}catch(_){return fallback}
};
const save=(key,data)=>{
  try{localStorage.setItem(key,JSON.stringify(data));return true}catch(_){return false}
};
const keyGet=id=>{try{return sessionStorage.getItem(P+"provider-secret."+id)||""}catch(_){return ""}};
const keySet=(id,s)=>{try{sessionStorage.setItem(P+"provider-secret."+id,s);return true}catch(_){return false}};
const keyDel=id=>{try{sessionStorage.removeItem(P+"provider-secret."+id)}catch(_){}};
const uid=()=>Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,10);
const timestamp=()=>new Date().toISOString();
const message=m=>m&&["user","assistant"].includes(m.role)&&typeof m.content==="string"?
  {role:m.role,content:m.content.slice(0,MAX_TEXT),at:typeof m.at==="string"?m.at:timestamp()}:null;
const thread=t=>{
  if(!t||!Array.isArray(t.messages))return null;
  return {id:typeof t.id==="string"&&t.id.length<100?t.id:uid(),
    title:typeof t.title==="string"?t.title.slice(0,50):"新对话",
    updated:typeof t.updated==="string"?t.updated:timestamp(),
    messages:t.messages.map(message).filter(Boolean).slice(-MAX_MESSAGES)};
};
const provider=x=>x&&typeof x==="object"?{
  id:typeof x.id==="string"&&/^[a-z0-9-]{3,75}$/.test(x.id)?x.id:uid(),
  name:typeof x.name==="string"?x.name.slice(0,50):"新接口",
  url:typeof x.url==="string"?x.url.trim().slice(0,550):"",
  model:typeof x.model==="string"?x.model.slice(0,170):"",
  system:typeof x.system==="string"?x.system.slice(0,12000):"",
  stream:x.stream!==false,
  models:Array.isArray(x.models)?x.models.filter(s=>typeof s==="string").slice(0,MAX_MODELS):[]
}:null;
const endpoint=(raw,kind="chat")=>{
  let u;
  try{u=new URL(raw.trim())}catch(_){throw Error("接口地址格式不正确")}
  const local=["localhost","127.0.0.1","[::1]","::1"].includes(u.hostname);
  if(u.protocol!=="https:"&&!(u.protocol==="http:"&&local))throw Error("接口必须使用 HTTPS（本机 localhost 除外）");
  if(u.username||u.password||u.search||u.hash)throw Error("接口地址不能带账号密码、查询参数或锚点");
  let path=u.pathname.replace(/\/+$/,"");
  path=path.replace(/\/(?:chat\/completions|models)$/,"");
  u.pathname=(path==="/"?"":path)+"/"+(kind==="models"?"models":"chat/completions");
  return u.href;
};
const output=x=>{
  const from=c=>{
    if(typeof c==="string")return c;
    if(!Array.isArray(c))return "";
    return c.map(part=>typeof part==="string"?part:typeof part?.text==="string"?part.text:part?.text?.value||"").join("");
  };
  return from(x?.choices?.[0]?.message?.content)||from(x?.output_text)||from(x?.response)||"";
};
const friendlyError=e=>{
  if(e?.name==="AbortError")return "请求已停止";
  if(e instanceof TypeError)return "浏览器无法连接接口。可能是跨域（CORS）、网址、SSL 证书或网络问题；直接打开接口地址正常，并不代表浏览器允许跨域调用。";
  return String(e?.message||e);
};
function mount(content){
  singleton?.dispose();
  let disposed=false,pending=null,loadingModels=false,drawer="";
  let threads=read(THREADS,[]).map?.(thread).filter(Boolean).slice(0,MAX_THREADS)||[];
  if(!threads.length){
    const prev=read(LEGACY,[]);
    const old=Array.isArray(prev)?prev.filter(x=>typeof x==="string"&&x.trim()):[];
    threads=[{id:uid(),title:old.length?"旧版离线预览":"新对话",updated:timestamp(),
      messages:old.slice(-24).map(x=>({role:"user",content:x.slice(0,MAX_TEXT),at:timestamp()}))}];
  }
  let current=read(CURRENT,threads[0].id);
  if(!threads.some(t=>t.id===current))current=threads[0].id;
  let providers=read(PROVIDERS,null);
  providers=Array.isArray(providers)?providers.map(provider).filter(Boolean).slice(0,40):[];
  if(!providers.length){
    const old=read(OLD_PROVIDER,null);
    providers=[provider({id:"primary",name:"我的接口",url:old?.url||"",model:old?.model||"",
      system:old?.system||"",stream:old?.stream!==false})];
    try{const oldKey=sessionStorage.getItem(OLD_KEY);if(oldKey&&!keyGet("primary"))keySet("primary",oldKey)}catch(_){}
    save(PROVIDERS,providers);
  }
  let active=read(ACTIVE,providers[0].id);
  if(!providers.some(x=>x.id===active))active=providers[0].id;
  const picked=()=>providers.find(x=>x.id===active)||providers[0];
  const selectedThread=()=>threads.find(x=>x.id===current)||threads[0];
  const root=node("div","chat-next");
  const toolbar=node("div","chat-next-toolbar");
  const historyButton=btn("☰",()=>openDrawer("history"),"chat-next-icon");
  historyButton.setAttribute("aria-label","对话历史");
  const providerSelect=node("select","chat-next-provider");
  providerSelect.setAttribute("aria-label","切换接口");
  const modelSelect=node("select","chat-next-model");
  modelSelect.setAttribute("aria-label","切换模型");
  const addButton=btn("＋",()=>newThread(),"chat-next-icon");
  addButton.setAttribute("aria-label","新建对话");
  const settingsButton=btn("⚙",()=>openDrawer("settings"),"chat-next-icon");
  settingsButton.setAttribute("aria-label","管理接口");
  toolbar.append(historyButton,providerSelect,modelSelect,addButton,settingsButton);
  const area=node("div","chat-next-messages");
  area.setAttribute("role","log");
  area.setAttribute("aria-live","polite");
  const status=node("div","chat-next-status");
  status.setAttribute("role","status");
  const compose=node("div","chat-next-composer");
  const input=node("textarea","chat-next-input");
  input.rows=2;input.maxLength=MAX_TEXT;
  input.placeholder="发消息……";
  input.setAttribute("aria-label","聊天输入");
  const actionArea=node("div","chat-next-composer-actions");
  const retryButton=btn("重试",()=>send(true),"chat-next-retry");
  const sendButton=btn("发送",()=>send(false),"chat-next-send");
  const stopButton=btn("停止",()=>pending?.abort(),"chat-next-stop");
  stopButton.hidden=true;
  actionArea.append(retryButton,sendButton,stopButton);
  compose.append(input,actionArea);
  const shade=node("div","chat-next-overlay");
  shade.hidden=true;
  const sheet=node("div","chat-next-sheet");
  const sheetHead=node("div","chat-next-sheet-head");
  const sheetTitle=node("strong","","");
  const closeSheet=btn("×",()=>openDrawer(""),"chat-next-icon");
  closeSheet.setAttribute("aria-label","关闭侧边菜单");
  sheetHead.append(sheetTitle,closeSheet);
  const sheetBody=node("div","chat-next-sheet-body");
  sheet.append(sheetHead,sheetBody);
  shade.append(sheet);
  shade.addEventListener("click",e=>{if(e.target===shade)openDrawer("")});
  root.append(toolbar,area,status,compose,shade);
  content.replaceChildren(root);

  const persist=()=>{
    threads.sort((a,b)=>b.updated.localeCompare(a.updated));
    if(!save(THREADS,threads.slice(0,MAX_THREADS)))setStatus("本机空间不足，聊天未能保存。请导出备份。",true);
    save(CURRENT,current);
  };
  const storeProviders=()=>{save(PROVIDERS,providers);save(ACTIVE,active)};
  const setStatus=(text="",error=false)=>{
    status.textContent=text;
    status.classList.toggle("is-error",error);
    status.hidden=!text;
  };
  const scrollEnd=()=>{area.scrollTop=area.scrollHeight};
  const bubble=(m)=>{
    const box=node("article","chat-next-message "+(m.role==="user"?"mine":"theirs"));
    const content=node("div","chat-next-bubble",m.content);
    box.append(content);
    if(m.role==="assistant"){
      const copy=btn("复制",async()=>{
        try{await navigator.clipboard.writeText(m.content);copy.textContent="已复制"}
        catch(_){copy.textContent="复制失败"}
      },"chat-next-copy");
      box.append(copy);
    }
    area.append(box);return content;
  };
  const renderMessages=()=>{
    area.replaceChildren();
    const t=selectedThread();
    if(!t.messages.length){
      const empty=node("div","chat-next-empty");
      empty.append(node("span","","✧"),node("strong","","岛心有话说"),
        node("p","","选一个接口与模型，开始对话。"));
      area.append(empty);
    }else t.messages.forEach(bubble);
    retryButton.hidden=t.messages.at(-1)?.role!=="user";
    scrollEnd();
  };
  const renderProviders=()=>{
    providerSelect.replaceChildren();
    providers.forEach(x=>{
      const option=node("option","",x.name||"未命名接口");
      option.value=x.id;providerSelect.append(option);
    });
    providerSelect.value=active;
    const p=picked(),models=[...new Set([p.model,...p.models].filter(Boolean))];
    modelSelect.replaceChildren();
    if(!models.length){
      const option=node("option","","选择模型");
      option.value="";modelSelect.append(option);
    }else models.forEach(m=>{
      const option=node("option","",m);option.value=m;modelSelect.append(option);
    });
    modelSelect.value=p.model||"";
    modelSelect.title=p.model||"在接口管理中拉取或填写模型";
  };
  const setBusy=bool=>{
    sendButton.hidden=bool;stopButton.hidden=!bool;
    input.disabled=bool;retryButton.disabled=bool;
    providerSelect.disabled=bool;modelSelect.disabled=bool;
    addButton.disabled=bool;settingsButton.disabled=bool;
  };
  const newThread=()=>{
    if(pending)return;
    const t={id:uid(),title:"新对话",updated:timestamp(),messages:[]};
    threads.unshift(t);if(threads.length>MAX_THREADS)threads.length=MAX_THREADS;
    current=t.id;persist();renderMessages();openDrawer("");input.focus();
  };
  const chooseThread=id=>{
    if(pending)return;
    if(threads.some(x=>x.id===id)){current=id;persist();renderMessages();openDrawer("")}
  };
  const exportHistory=()=>{
    const data={format:"yanya-chat-v1",exportedAt:timestamp(),threads};
    const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob),a=node("a");
    a.href=url;a.download="砚芽-对话-"+timestamp().slice(0,10)+".json";
    document.body.append(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),2000);
    setStatus("已导出本机对话记录，不含密钥。");
  };
  const fileInput=node("input");
  fileInput.type="file";fileInput.accept=".json,application/json";
  fileInput.hidden=true;
  fileInput.addEventListener("change",async()=>{
    const file=fileInput.files?.[0];fileInput.value="";
    if(!file)return;
    if(file.size>2*1024*1024){setStatus("导入文件超过 2 MB。",true);return}
    try{
      const data=JSON.parse(await file.text());
      if(data?.format!=="yanya-chat-v1"||!Array.isArray(data.threads))throw Error("文件格式不正确");
      const list=data.threads.map(thread).filter(Boolean).slice(0,MAX_THREADS);
      if(!list.length)throw Error("没有可导入的对话");
      if(!confirm("导入 "+list.length+" 段对话，并与本机记录合并？"))return;
      const existing=new Set(threads.map(t=>t.id));
      list.forEach(t=>{
        if(existing.has(t.id))t.id=uid();
        existing.add(t.id);threads.push(t);
      });
      threads.sort((a,b)=>b.updated.localeCompare(a.updated));
      threads.length=Math.min(threads.length,MAX_THREADS);
      current=threads[0].id;persist();renderMessages();openDrawer("");
      setStatus("导入成功。");
    }catch(e){setStatus("导入失败："+friendlyError(e),true)}
  });
  const section=(title,contentEl)=>{
    const box=node("div","chat-next-settings-section");
    box.append(node("div","chat-next-section-label",title),contentEl);
    return box;
  };
  const field=(title,value="",placeholder="",type="text")=>{
    const label=node("label","chat-next-field");
    const name=node("span","",title);
    const input=node(type==="textarea"?"textarea":"input","");
    if(type!=="textarea")input.type=type;
    input.value=value||"";input.placeholder=placeholder||"";
    if(type==="textarea")input.rows=3;
    if(type==="password")input.autocomplete="off";
    label.append(name,input);
    return {label,input};
  };
  const openDrawer=kind=>{
    if(pending&&kind==="settings")return;
    drawer=kind;
    shade.hidden=!kind;
    if(!kind)return;
    sheetBody.replaceChildren();
    sheetTitle.textContent=kind==="history"?"对话记录":"接口与模型";
    if(kind==="history")buildHistory();
    if(kind==="settings")buildSettings();
  };
  function buildHistory(){
    const upper=node("div","chat-next-sheet-actions");
    upper.append(btn("＋ 新对话",newThread),btn("导出记录",exportHistory),btn("导入记录",()=>fileInput.click()));
    sheetBody.append(upper,fileInput);
    const list=node("div","chat-next-thread-list");
    threads.sort((a,b)=>b.updated.localeCompare(a.updated));
    threads.forEach(t=>{
      const row=node("div","chat-next-thread"+(t.id===current?" active":""));
      const label=btn(t.title,()=>chooseThread(t.id));
      label.title=t.title;
      const del=btn("删除",()=>{
        if(!confirm("确定删除「"+t.title+"」？此操作无法撤销。"))return;
        threads=threads.filter(x=>x.id!==t.id);
        if(!threads.length)threads=[{id:uid(),title:"新对话",updated:timestamp(),messages:[]}];
        if(current===t.id)current=threads[0].id;
        persist();renderMessages();buildHistoryFresh();
      },"chat-next-delete");
      row.append(label,del);list.append(row);
    });
    sheetBody.append(list);
  }
  const buildHistoryFresh=()=>{if(drawer==="history"){sheetBody.replaceChildren();buildHistory()}};
  function buildSettings(){
    const pick=node("select","chat-next-input-select");
    const fillPick=()=>{
      pick.replaceChildren();
      providers.forEach(p=>{
        const opt=node("option","",p.name||"新接口");opt.value=p.id;pick.append(opt);
      });
      pick.value=active;
    };
    fillPick();
    const topActions=node("div","chat-next-sheet-actions");
    const add=btn("＋ 添加接口",()=>{
      const p=provider({name:"接口 "+(providers.length+1),url:"",model:""});
      providers.push(p);active=p.id;storeProviders();renderProviders();buildSettingsFresh();
    });
    const remove=btn("删除当前接口",()=>{
      if(providers.length<=1){setStatus("至少保留一个接口。");return}
      const p=picked();
      if(!confirm("删除接口「"+p.name+"」？密钥也会从当前会话清除。"))return;
      keyDel(p.id);providers=providers.filter(x=>x.id!==p.id);
      active=providers[0].id;storeProviders();renderProviders();buildSettingsFresh();
    },"chat-next-delete");
    topActions.append(add,remove);
    const p=picked();
    const name=field("接口名称",p.name,"例如：主中转");
    const api=field("接口地址",p.url,"https://example.com/v1","url");
    const secret=field("API Key",keyGet(p.id),"只保存在当前浏览会话","password");
    const model=field("当前模型",p.model,"可手动填写模型 ID");
    const instruction=field("系统提示词",p.system,"角色与回复规则","textarea");
    const stream=node("label","chat-next-checkbox");
    const box=node("input");box.type="checkbox";box.checked=p.stream;
    stream.append(box,node("span","","流式显示"));
    const modelsDropdown=node("select","chat-next-input-select");
    const fillModels=()=>{
      modelsDropdown.replaceChildren();
      const placeholder=node("option","","选择已拉取模型");placeholder.value="";
      modelsDropdown.append(placeholder);
      p.models.forEach(id=>{
        const opt=node("option","",id);opt.value=id;modelsDropdown.append(opt);
      });
      modelsDropdown.value=p.models.includes(model.input.value)?model.input.value:"";
    };
    fillModels();
    modelsDropdown.addEventListener("change",()=>{
      if(modelsDropdown.value)model.input.value=modelsDropdown.value;
    });
    const modelActions=node("div","chat-next-model-actions");
    const pull=btn("拉取模型列表",async()=>{
      // Reading models is user-triggered, uses the unsaved form values.
      if(loadingModels)return;
      let url;
      try{url=endpoint(api.input.value,"models")}catch(e){feedback.textContent=friendlyError(e);return}
      const key=secret.input.value.trim();
      loadingModels=true;pull.disabled=true;
      feedback.textContent="正在获取模型列表……";
      const controller=new AbortController();
      let timeout=null;
      try{
        timeout=setTimeout(()=>controller.abort(),15000);
        const headers={"Accept":"application/json"};
        if(key)headers.Authorization="Bearer "+key;
        const response=await fetch(url,{
          method:"GET",mode:"cors",credentials:"omit",headers,
          signal:controller.signal,cache:"no-store"
        });
        if(!response.ok){
          const body=(await response.text()).slice(0,700);
          let reason=body;
          try{const data=JSON.parse(body);reason=data?.error?.message||data?.message||body}catch(_){}
          throw Error("HTTP "+response.status+"："+reason.slice(0,200));
        }
        const data=await response.json();
        const source=Array.isArray(data?.data)?data.data:
          Array.isArray(data?.models)?data.models:
          Array.isArray(data)?data:[];
        const ids=[...new Set(source.map(x=>
          typeof x==="string"?x:(typeof x?.id==="string"?x.id:"")
        ).filter(Boolean))].slice(0,MAX_MODELS).sort((a,b)=>a.localeCompare(b));
        if(!ids.length)throw Error("接口返回成功，但未找到标准模型列表。可手动填写模型 ID。");
        p.models=ids;
        // User explicitly fetched models; store cached list even before form save.
        storeProviders();fillModels();renderProviders();
        feedback.textContent="已拉取 "+ids.length+" 个模型。选好后点「保存接口」。";
      }catch(e){
        feedback.textContent=friendlyError(e);
      }finally{
        clearTimeout(timeout);loadingModels=false;pull.disabled=false;
      }
    });
    modelActions.append(pull,modelsDropdown);
    const feedback=node("div","chat-next-feedback","");
    const submit=btn("保存接口",()=>{
      if(!name.input.value.trim()){feedback.textContent="接口名称不能为空。";return}
      if(api.input.value.trim()){
        try{endpoint(api.input.value,"chat")}catch(e){feedback.textContent=friendlyError(e);return}
      }
      p.name=name.input.value.trim().slice(0,50);
      p.url=api.input.value.trim();
      p.model=model.input.value.trim().slice(0,170);
      p.system=instruction.input.value.slice(0,12000);
      p.stream=box.checked;
      if(!keySet(p.id,secret.input.value.trim())){
        feedback.textContent="浏览器不允许保存会话 Key；本次发送可能无法授权。";
      }else feedback.textContent="接口已保存。";
      storeProviders();renderProviders();
      openDrawer("");
      setStatus("当前使用："+p.name+(p.model?" / "+p.model:""));
    },"chat-next-primary");
    const note=node("p","chat-next-help",
      "可保存多个 OpenAI 兼容接口并切换。拉取模型调用 GET /models，不会自动发起。浏览器直连第三方中转可能遭遇 CORS；此处无法绕过服务端跨域策略。地址、模型及提示词仅留在本机，Key 默认仅保存在当前浏览会话。");
    const body=node("div","chat-next-settings-form");
    body.append(section("当前接口",pick),topActions,name.label,api.label,
      secret.label,section("模型列表",modelActions),
      model.label,instruction.label,stream,feedback,submit,note);
    sheetBody.append(body);
    pick.addEventListener("change",()=>{
      active=pick.value;storeProviders();renderProviders();buildSettingsFresh();
    });
  }
  const buildSettingsFresh=()=>{if(drawer==="settings"){sheetBody.replaceChildren();buildSettings()}};
  const onProviderChange=()=>{
    if(pending)return;
    active=providerSelect.value;storeProviders();renderProviders();
    setStatus("已切换："+picked().name);
  };
  providerSelect.addEventListener("change",onProviderChange);
  modelSelect.addEventListener("change",()=>{
    if(pending)return;
    const p=picked();
    p.model=modelSelect.value;storeProviders();
    setStatus("当前模型："+p.model);
  });
  const append=(t,role,text)=>{
    t.messages.push({role,content:text.slice(0,MAX_TEXT),at:timestamp()});
    t.messages=t.messages.slice(-MAX_MESSAGES);
    if(role==="user"&&t.title==="新对话")t.title=text.replace(/\s+/g," ").slice(0,24)||"新对话";
    t.updated=timestamp();persist();
  };
  async function send(retry=false){
    if(pending||disposed)return;
    const p=picked(),text=input.value.trim();
    if(!retry&&!text)return;
    if(!p.url||!p.model){
      setStatus("先在「接口与模型」配置接口及模型。",true);
      openDrawer("settings");return;
    }
    let url;
    try{url=endpoint(p.url,"chat")}catch(e){setStatus(friendlyError(e),true);return}
    const t=selectedThread();
    if(retry){
      if(t.messages.at(-1)?.role!=="user")return;
    }else{
      append(t,"user",text);input.value="";
    }
    renderMessages();
    const messages=[
      ...(p.system.trim()?[{role:"system",content:p.system.trim()}]:[]),
      ...t.messages.slice(-40).map(m=>({role:m.role,content:m.content}))
    ];
    const controller=new AbortController();
    pending=controller;setBusy(true);
    setStatus("正在连接 "+p.model+"……");
    let reply="";
    try{
      const headers={"Content-Type":"application/json",
        "Accept":p.stream?"text/event-stream, application/json":"application/json"};
      const key=keyGet(p.id);
      if(key)headers.Authorization="Bearer "+key;
      const response=await fetch(url,{
        method:"POST",mode:"cors",credentials:"omit",cache:"no-store",headers,
        body:JSON.stringify({model:p.model,messages,stream:p.stream}),signal:controller.signal
      });
      if(!response.ok){
        const error=(await response.text()).slice(0,900);
        let detail=error;try{const obj=JSON.parse(error);detail=obj?.error?.message||obj?.message||error}catch(_){}
        throw Error("HTTP "+response.status+"："+detail.slice(0,350));
      }
      const live=bubble({role:"assistant",content:"正在回复……"});
      scrollEnd();
      const type=response.headers.get("content-type")||"";
      if(p.stream&&response.body&&type.includes("text/event-stream")){
        const reader=response.body.getReader(),decoder=new TextDecoder();
        let buffer="",done=false;
        while(!done){
          const value=await reader.read();
          buffer+=decoder.decode(value.value||new Uint8Array(),{stream:!value.done});
          if(value.done)done=true;
          // SSE events are separated by a blank line; keep partial chunks.
          buffer=buffer.replace(/\r\n/g,"\n");
          let at;
          while((at=buffer.indexOf("\n\n"))>=0){
            const event=buffer.slice(0,at);buffer=buffer.slice(at+2);
            const data=event.split("\n").filter(l=>l.startsWith("data:"))
              .map(l=>l.slice(5).trimStart()).join("\n");
            if(data==="[DONE]"){done=true;break}
            if(!data)continue;
            let part;try{part=JSON.parse(data)}catch(_){continue}
            const delta=part?.choices?.[0]?.delta?.content;
            const str=typeof delta==="string"?delta:
              Array.isArray(delta)?delta.map(x=>x?.text||"").join(""):"";
            if(str){
              reply=(reply+str).slice(0,MAX_TEXT);
              live.textContent=reply;scrollEnd();
            }
          }
        }
        try{await reader.cancel()}catch(_){}
      }else{
        const data=await response.json();
        reply=output(data).slice(0,MAX_TEXT);
      }
      if(!reply.trim())throw Error("接口返回为空；确认模型名称、服务商格式和流式选项。");
      if(!disposed){
        append(t,"assistant",reply);renderMessages();setStatus("");
      }
    }catch(e){
      if(disposed)return;
      if(e?.name==="AbortError"){
        if(reply.trim())append(t,"assistant",reply+"\n[已停止生成]");
        setStatus("已停止生成。");
      }else{
        setStatus("发送失败："+friendlyError(e),true);
      }
      renderMessages();
    }finally{
      if(pending===controller)pending=null;
      if(!disposed)setBusy(false);
    }
  }
  input.addEventListener("keydown",e=>{
    if(e.key==="Enter"&&!e.shiftKey&&!e.isComposing){
      e.preventDefault();send();
    }
  });
  const visual=window.visualViewport;
  const adjustViewport=()=>{
    const panel=document.getElementById("panel");
    if(!panel?.classList.contains("is-chat"))return;
    if(visual){
      // Android keyboard may resize only visualViewport, not 100dvh.
      panel.style.height=Math.floor(visual.height)+"px";
      panel.style.top=Math.floor(visual.offsetTop)+"px";
      panel.style.bottom="auto";
    }
  };
  visual?.addEventListener("resize",adjustViewport);
  visual?.addEventListener("scroll",adjustViewport);
  const onFocus=()=>{adjustViewport();requestAnimationFrame(scrollEnd)};
  input.addEventListener("focus",onFocus);
  save(PROVIDERS,providers);
  renderProviders();renderMessages();setStatus("");
  singleton={dispose(){
    disposed=true;pending?.abort();
    visual?.removeEventListener("resize",adjustViewport);
    visual?.removeEventListener("scroll",adjustViewport);
    input.removeEventListener("focus",onFocus);
    const panel=document.getElementById("panel");
    if(panel){panel.style.height="";panel.style.top="";panel.style.bottom="";}
    singleton=null;
  }};
  requestAnimationFrame(adjustViewport);
}
window.YanyaChat={mount,dispose(){singleton?.dispose()}};
})();
