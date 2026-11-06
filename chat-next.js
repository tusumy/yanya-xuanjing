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
const message=m=>window.YanyaBranches?window.YanyaBranches.normalize(m):m&&["user","assistant"].includes(m.role)&&typeof m.content==="string"?
  {role:m.role,content:m.content.slice(0,MAX_TEXT),attachments:window.YanyaAttachments?.normalize(m.attachments)||[],at:typeof m.at==="string"?m.at:timestamp()}:null;
const thread=t=>{
  if(!t||!Array.isArray(t.messages))return null;
  return {id:typeof t.id==="string"&&t.id.length<100?t.id:uid(),
    characterId:typeof t.characterId==="string"?t.characterId:"",
    title:typeof t.title==="string"?t.title.slice(0,50):"新对话",
    updated:typeof t.updated==="string"?t.updated:timestamp(),
    calls:Array.isArray(t.calls)?t.calls.filter(c=>c&&typeof c==="object").slice(-100).map(c=>({at:String(c.at||""),duration:Number(c.duration)||0})):[],
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
  if(!path)path="/v1";
  u.pathname=(path==="/"?"":path)+"/"+(kind==="models"?"models":"chat/completions");
  return u.href;
};
const readJSON=async response=>{
  const body=await response.text();
  if(/^\s*</.test(body))throw Error("接口返回了网页，未返回 API 数据。请检查接口地址是否包含 /v1，以及服务是否跳转到登录或错误页。HTTP "+response.status);
  let data;try{data=JSON.parse(body)}catch(_){throw Error("接口未返回有效 JSON。HTTP "+response.status)}
  if(!response.ok)throw Error("HTTP "+response.status+"："+(data?.error?.message||data?.message||"请求失败"));
  return data;
};
const bookContext=(id,messages=[])=>window.YanyaLibrary?.context(id,messages)||{system:"",greeting:""};
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
  let disposed=false,pending=null,loadingModels=false,drawer="",attaching=false;
  let draftAttachments=[];const drafts=new Map();const mediaControllers=new Set();
  const rawThreads=read(THREADS,[]);
  let threads=Array.isArray(rawThreads)?rawThreads.map(thread).filter(Boolean).slice(0,MAX_THREADS):[];
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
  const voiceActions=node("div","chat-next-sheet-actions");
  const roleSelect=node("select","chat-next-input-select");roleSelect.setAttribute("aria-label","当前对话角色");
  const defaultRole=node("option","","使用书房当前角色");defaultRole.value="";roleSelect.append(defaultRole);
  (window.YanyaLibrary?.characters()||[]).forEach(c=>{const o=node("option","",c.name);o.value=c.id;roleSelect.append(o)});
  roleSelect.addEventListener("change",()=>{if(pending||window.YanyaVoice?.isCalling())return;selectedThread().characterId=roleSelect.value;persist();setStatus("已切换本段对话角色。");});
  const callButton=btn("☎ 通话",()=>window.YanyaVoice?.call(voiceAdapter));
  const dictation=btn("🎙 语音输入",()=>window.YanyaVoice?.dictate(text=>{input.value=(input.value+" "+text).trim();input.focus()},setStatus));
  const moreButton=btn("更多",()=>openDrawer("menu"));
  voiceActions.append(roleSelect,callButton,moreButton);
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
  const attachmentsInput=node("input");attachmentsInput.type="file";attachmentsInput.multiple=true;attachmentsInput.hidden=true;
  attachmentsInput.accept="image/jpeg,image/png,image/webp,.txt,.md,.markdown,.json,.csv,.log,.js,.ts,.py,.html,.css,.xml,.yaml,.yml";
  const attachmentTray=node("div","chat-attachment-tray");attachmentTray.hidden=true;
  const renderDraft=()=>{attachmentTray.replaceChildren();attachmentTray.hidden=!draftAttachments.length;window.YanyaAttachments?.render(attachmentTray,draftAttachments,index=>{if(!pending){draftAttachments.splice(index,1);renderDraft()}})};
  const attachButton=btn("＋ 附件",()=>attachmentsInput.click(),"chat-next-attach");
  attachmentsInput.addEventListener("change",async()=>{
    const files=[...(attachmentsInput.files||[])];attachmentsInput.value="";if(!files.length||attaching||pending)return;
    if(files.length+draftAttachments.length>4){setStatus("每条消息最多 4 个附件，其中图片最多 2 张。",true);return}
    const target=current;attaching=true;attachButton.disabled=true;setStatus("正在处理附件……");
    try{const next=[];for(const file of files)next.push(await window.YanyaAttachments.fromFile(file));
      if([...draftAttachments,...next].filter(a=>a.kind==="image").length>2)throw Error("每条消息最多 2 张图片。");
      if(disposed||current!==target)return;draftAttachments.push(...next);renderDraft();setStatus("附件已就绪。图片需要支持视觉的模型；点击附件可预览。");
    }catch(e){if(!disposed)setStatus(e.message,true)}finally{attaching=false;attachButton.disabled=false}
  });
  const saveDraft=()=>drafts.set(current,{text:input.value,attachments:draftAttachments});
  const loadDraft=()=>{const d=drafts.get(current);input.value=d?.text||"";draftAttachments=d?.attachments||[];renderDraft()};
  const stopButton=btn("停止",()=>pending?.abort(),"chat-next-stop");
  stopButton.hidden=true;
  const recordButton=btn("录音",()=>{
    if(pending||attaching||window.YanyaVoice?.isCalling())return;
    const target=current,p=picked();window.YanyaVoice?.stopSpeech();window.YanyaAttachments?.stopAudio();
    window.YanyaNotes?.record({onReady:note=>{if(disposed||current!==target)throw Error("对话已切换，请重新录音");if(draftAttachments.length>=4)throw Error("待发送附件已满");draftAttachments.push(note);renderDraft();},
      transcribe:async(blob,model,signal)=>{const url=endpoint(p.url,"chat").replace(/chat\/completions$/,"audio/transcriptions");const form=new FormData();form.append("file",blob,blob.type.includes("mp4")?"voice.m4a":"voice.webm");form.append("model",model);const headers={Accept:"application/json"};const key=keyGet(p.id);if(key)headers.Authorization="Bearer "+key;const response=await fetch(url,{method:"POST",credentials:"omit",headers,body:form,signal});const data=await readJSON(response);const text=data?.text||data?.transcript;if(typeof text!=="string"||!text.trim())throw Error("接口没有返回转写文字");return text;}});
  },"chat-next-attach");
  actionArea.append(recordButton,attachButton,retryButton,sendButton,stopButton);
  const composeBody=node("div","chat-next-compose-body");composeBody.append(attachmentTray,input,attachmentsInput);compose.append(composeBody,actionArea);
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
  root.append(toolbar,voiceActions,area,status,compose,shade);
  content.replaceChildren(root);

  const persist=()=>{
    threads.sort((a,b)=>b.updated.localeCompare(a.updated));
    const ok=save(THREADS,threads.slice(0,MAX_THREADS));
    if(!ok)setStatus("本机空间不足，聊天未能保存。请导出备份或清理旧记录。",true);
    save(CURRENT,current);return ok;
  };
  const storeProviders=()=>{save(PROVIDERS,providers);save(ACTIVE,active)};
  const setStatus=(text="",error=false)=>{
    status.textContent=text;
    status.classList.toggle("is-error",error);
    status.hidden=!text;
  };
  const scrollEnd=()=>{area.scrollTop=area.scrollHeight};
  const bubble=(m,index)=>{
    const box=node("article","chat-next-message "+(m.role==="user"?"mine":"theirs"));
    const avatar=window.YanyaAssets?.avatar(m.role,window.YanyaLibrary?.characterId(selectedThread().characterId)||selectedThread().characterId||"");
    if(avatar){const img=node("img","chat-next-avatar");img.src=avatar;img.alt=m.role==="user"?"你的头像":"角色头像";img.width=img.height=36;box.append(img);}
    const content=node("div","chat-next-bubble",m.content);
    if(!m.content&&m.attachments?.length)content.hidden=true;
    box.append(content);
    const attached=node("div","chat-message-attachments");window.YanyaAttachments?.render(attached,m.attachments);box.append(attached);
    if(m.role==="assistant"){
      const copy=btn("复制",async()=>{
        try{await navigator.clipboard.writeText(m.content);copy.textContent="已复制"}
        catch(_){copy.textContent="复制失败"}
      },"chat-next-copy");
      box.append(copy,btn("朗读",()=>window.YanyaVoice?.speak(m.content).catch(e=>setStatus(e.message,true)),"chat-next-copy"));
    }
    if(!Number.isInteger(index)){area.append(box);return content;}
    const actions=node("div","chat-next-message-actions");
    const editable=()=>!pending&&!window.YanyaVoice?.isCalling();
    actions.append(btn("编辑",()=>{
      if(!editable())return;
      const text=prompt("编辑消息。已有后续消息会保留；如需重答，请点重新生成。",m.content);
      if(text===null||!text.trim())return;
      m.content=text.slice(0,MAX_TEXT);if(m.variants?.length)m.variants[m.activeVariant||0]={content:m.content,at:m.at,attachments:m.attachments||[]};selectedThread().updated=timestamp();persist();renderMessages();
    }),btn("删除",()=>{
      if(!editable()||!confirm("删除这条消息？"))return;
      selectedThread().messages.splice(index,1);persist();renderMessages();
    }),btn("收藏",()=>{
      try{const key=P+"memories.v1",saved=read(key,[]);const list=Array.isArray(saved)?saved:[];
        if(!list.some(x=>x.text===m.content))list.unshift({id:uid(),text:m.content,type:"聊天收藏",created:timestamp()});
        if(!save(key,list.slice(0,150)))throw Error("本机空间不足");setStatus("已收藏到星阁。");
      }catch(e){setStatus(e.message,true)}
    }));
    actions.append(btn("从这里分支",()=>{if(editable())forkAt(index)}));
    if(m.role==="assistant"){
      const variants=window.YanyaBranches?.variants(m)||[m];
      if(variants.length>1){const active=m.activeVariant||0;const nav=node("div","reply-versions");
        const choose=which=>{if(!editable())return;if(index<selectedThread().messages.length-1){if(!forkAt(index))return;}const t=selectedThread(),old=t.messages[index];t.messages[index]=window.YanyaBranches.choose(old,which);if(!persist())t.messages[index]=old;renderMessages();};
        const prev=btn("‹",()=>choose(active-1));prev.disabled=active===0;prev.setAttribute("aria-label","上一版本");const next=btn("›",()=>choose(active+1));next.disabled=active===variants.length-1;next.setAttribute("aria-label","下一版本");nav.append(prev,node("span","",(active+1)+" / "+variants.length),next);box.append(nav);
      }
      if(index===selectedThread().messages.length-1)actions.append(btn("重新生成",()=>{if(!editable())return;if(variants.length>=12){setStatus("已有 12 个版本，请从这里分支继续。",true);return}send(true,null,{target:m});}));
      const generate=btn("保存语音条",async()=>{if(!editable())return;const t=selectedThread(),text=m.content,version=m.activeVariant;if(!text.trim())return;const controller=new AbortController();mediaControllers.add(controller);generate.disabled=true;try{setStatus("正在生成并保存语音，可能消耗语音服务额度……");const audio=await window.YanyaVoice.generate(text,controller.signal);if(disposed||controller.signal.aborted||!t.messages.includes(m)||m.content!==text||m.activeVariant!==version)return;const rest=(m.attachments||[]).filter(a=>a.kind!=="audio");if(rest.length>=4)throw Error("此消息附件已满");m.attachments=[...rest,audio];if(m.variants?.length)m.variants[m.activeVariant||0]={content:m.content,at:m.at,attachments:m.attachments};const ok=persist();renderMessages();setStatus(ok?"语音已保存，可播放或下载。":"本机空间不足，声音仅保留在当前页面，请先下载。",!ok);}catch(e){if(!disposed)setStatus(e.message,true)}finally{mediaControllers.delete(controller);generate.disabled=false}});actions.append(generate);
    }
    box.append(actions);area.append(box);return content;
  };
  const renderMessages=()=>{
    window.YanyaAttachments?.stopAudio();area.replaceChildren();
    const t=selectedThread();roleSelect.value=t.characterId||"";
    if(!t.messages.length){
      const empty=node("div","chat-next-empty");
      empty.append(node("span","","✧"),node("strong","","岛心有话说"),
        node("p","","选一个接口与模型，开始对话。"));
      area.append(empty);
    }else t.messages.forEach(bubble);
    (t.calls||[]).forEach(c=>area.append(node("div","chat-next-status","☎ 通话记录 · "+Math.floor(c.duration/60)+"分"+c.duration%60+"秒 · "+new Date(c.at).toLocaleString())));
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
    addButton.disabled=bool;settingsButton.disabled=bool;callButton.disabled=bool;dictation.disabled=bool;roleSelect.disabled=bool;attachButton.disabled=bool;recordButton.disabled=bool;
  };
  const forkAt=index=>{
    if(pending||attaching||window.YanyaVoice?.isCalling())return false;
    if(threads.length>=MAX_THREADS){setStatus("对话已达 36 段，请先备份并清理旧记录。",true);return false}
    const oldCurrent=current,t=window.YanyaBranches.fork(selectedThread(),index,uid());saveDraft();threads.unshift(t);current=t.id;
    if(!persist()){threads=threads.filter(x=>x!==t);current=oldCurrent;return false}loadDraft();renderMessages();setStatus("已创建新分支，原对话完整保留。");return true;
  };
  const newThread=()=>{
    if(pending||attaching)return;
    if(threads.length>=MAX_THREADS){setStatus("对话已达 36 段，请先备份并清理旧记录。",true);return}
    saveDraft();
    const t={id:uid(),characterId:roleSelect.value||"",title:"新对话",updated:timestamp(),messages:[]};
    threads.unshift(t);if(threads.length>MAX_THREADS)threads.length=MAX_THREADS;
    const greeting=bookContext(t.characterId).greeting;
    if(greeting)t.messages.push({role:"assistant",content:greeting,at:timestamp()});
    current=t.id;loadDraft();persist();renderMessages();openDrawer("");input.focus();
  };
  const chooseThread=id=>{
    if(pending||attaching)return;
    if(threads.some(x=>x.id===id)){saveDraft();current=id;loadDraft();persist();renderMessages();openDrawer("")}
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
    if(file.size>24*1024*1024){setStatus("导入文件超过 24 MB。",true);return}
    try{
      const data=JSON.parse(await file.text());
      if(data?.format!=="yanya-chat-v1"||!Array.isArray(data.threads))throw Error("文件格式不正确");
      const list=data.threads.map(thread).filter(Boolean).slice(0,MAX_THREADS);
      if(!list.length)throw Error("没有可导入的对话");
      if(!confirm("导入 "+list.length+" 段对话，并与本机记录合并？"))return;
      const previous=threads.slice(),previousCurrent=current;
      if(threads.length+list.length>MAX_THREADS)throw Error("合并后超过 36 段对话，请先导出并删除不需要的记录。");
      const existing=new Set(threads.map(t=>t.id));
      list.forEach(t=>{
        if(existing.has(t.id))t.id=uid();
        existing.add(t.id);threads.push(t);
      });
      threads.sort((a,b)=>b.updated.localeCompare(a.updated));
      threads.length=Math.min(threads.length,MAX_THREADS);
      current=threads[0].id;if(!persist()){threads=previous;current=previousCurrent;renderMessages();return}loadDraft();renderMessages();openDrawer("");
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
    if(drawer==="creation")window.YanyaCreation?.dispose();
    if(drawer==="library")window.YanyaLibrary?.dispose();
    drawer=kind;
    shade.hidden=!kind;
    if(!kind){
      roleSelect.replaceChildren();const option=node("option","","使用书房当前角色");option.value="";roleSelect.append(option);
      const roles=window.YanyaLibrary?.characters()||[];roles.forEach(c=>{const o=node("option","",c.name);o.value=c.id;roleSelect.append(o)});
      const selected=selectedThread().characterId||"";if(selected&&!roles.some(c=>c.id===selected)){const o=node("option","","已移除的角色，请重新选择");o.value=selected;roleSelect.append(o)}roleSelect.value=selected;return;
    }
    sheetBody.replaceChildren();
    sheetTitle.textContent=kind==="history"?"对话记录":"接口与模型";
    if(kind==="history")buildHistory();
    if(kind==="settings")buildSettings();
    if(kind==="menu"){sheetTitle.textContent="聊天工具";const menu=node("div","chat-menu-grid");menu.append(dictation,btn("表情包架",()=>openDrawer("stickers")),btn("语音设置",()=>window.YanyaVoice?.settings()),btn("书房",()=>openDrawer("library")),btn("创作角",()=>openDrawer("creation")),btn("MCP 工具",()=>openDrawer("mcp")),btn("数据备份",()=>openDrawer("data")),btn("外观",()=>openDrawer("theme")));sheetBody.append(menu)}
    if(kind==="library"){sheetTitle.textContent="书房";window.YanyaLibrary?.mount(sheetBody)}
    if(kind==="creation"){sheetTitle.textContent="创作角";window.YanyaCreation?.mount(sheetBody)}
    if(kind==="stickers"){sheetTitle.textContent="表情包架";window.YanyaStickers?.mount(sheetBody,attachment=>{if(pending||window.YanyaVoice?.isCalling())return;if(draftAttachments.length>=4){setStatus("每条消息最多 4 个附件",true);return}draftAttachments.push(attachment);renderDraft();openDrawer("");})}
    if(kind==="theme"){sheetTitle.textContent="外观";window.YanyaTheme?.mount(sheetBody)}
    if(kind==="data"){sheetTitle.textContent="数据备份与旧版迁移";window.YanyaData?.mount(sheetBody)}
    if(kind==="mcp"){sheetTitle.textContent="MCP 外部工具";window.YanyaMCP?.mount(sheetBody)}
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
      const rename=btn("改名",()=>{const title=prompt("对话名字",t.title);if(title?.trim()){t.title=title.trim().slice(0,50);persist();buildHistoryFresh()}});
      row.append(label,rename,del);list.append(row);
    });
    const search=node("input","chat-next-input-select");search.placeholder="搜索对话与消息";search.setAttribute("aria-label","搜索对话");
    search.addEventListener("input",()=>{const q=search.value.toLowerCase();[...list.children].forEach((row,i)=>{const t=threads[i];row.hidden=!(t.title+" "+t.messages.map(m=>m.content).join(" ")).toLowerCase().includes(q)})});
    sheetBody.append(search,list);
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
        const data=await readJSON(response);
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
  const append=(t,role,text,attachments=[])=>{
    const previous=t.messages.slice(),oldUpdated=t.updated,oldTitle=t.title;
    t.messages.push({role,content:text.slice(0,MAX_TEXT),attachments,at:timestamp()});
    t.messages=t.messages.slice(-MAX_MESSAGES);
    if(role==="user"&&t.title==="新对话")t.title=(text||attachments[0]?.name||"新对话").replace(/\s+/g," ").slice(0,24);
    t.updated=timestamp();if(!persist()){t.messages=previous;t.updated=oldUpdated;t.title=oldTitle;return false}return true;
  };
  async function send(retry=false,spokenText=null,regeneration=null){
    if(pending||attaching||disposed||(spokenText===null&&window.YanyaVoice?.isCalling()))return;
    const p=picked(),text=spokenText===null?input.value.trim():spokenText.trim();
    if(!retry&&!text&&!(spokenText===null&&draftAttachments.length))return;
    if(!p.url||!p.model){
      setStatus("先在「接口与模型」配置接口及模型。",true);
      openDrawer("settings");return;
    }
    let url;
    try{url=endpoint(p.url,"chat")}catch(e){setStatus(friendlyError(e),true);return}
    const t=selectedThread();
    if(retry){
      if(regeneration){if(t.messages.at(-1)!==regeneration.target||t.messages.at(-2)?.role!=="user")return;}else if(t.messages.at(-1)?.role!=="user")return;
    }else{
      const attachments=spokenText===null?draftAttachments:[];
      if(!append(t,"user",text,attachments))return;
      if(spokenText===null){input.value="";draftAttachments=[];drafts.delete(current);renderDraft();}
    }
    renderMessages();
    const callState=window.YanyaVoice?.isCalling()?"当前正在语音通话中，请使用自然、适合朗读的口语回复。":t.calls?.length?"最近一次语音通话已挂断，当前为文字聊天。":"";
    const history=regeneration?t.messages.slice(0,-1):t.messages;
    const roleContext=bookContext(t.characterId,history);
    const messages=[
      ...(callState?[{role:"system",content:callState}]:[]),
      ...(!window.YanyaVoice?.isCalling()&&window.YanyaStickers?.catalog()?[{role:"system",content:window.YanyaStickers.catalog()}]:[]),
      ...([p.system.trim(),roleContext.system].filter(Boolean).length?[{role:"system",content:[p.system.trim(),roleContext.system].filter(Boolean).join("\n\n")}]:[]),
      ...history.slice(-40).map(m=>window.YanyaAttachments?.apiMessage(m)||({role:m.role,content:m.content}))
    ];
    const controller=new AbortController();
    pending=controller;setBusy(true);
    setStatus("正在连接 "+p.model+"……");
    let reply="";
    const saveReply=text=>{
      const parsed=window.YanyaStickers?.parse(text)||{content:text,attachments:[]};
      if(regeneration){const index=t.messages.indexOf(regeneration.target);if(index<0)return false;const next=window.YanyaBranches.add(regeneration.target,parsed.content,parsed.attachments);t.messages[index]=next;t.updated=timestamp();return persist();}
      return append(t,"assistant",parsed.content,parsed.attachments);
    };
    try{
      const headers={"Content-Type":"application/json",
        "Accept":p.stream?"text/event-stream, application/json":"application/json"};
      const key=keyGet(p.id);
      if(key)headers.Authorization="Bearer "+key;
      const tools=window.YanyaMCP?.tools()||{out:[],map:{}};
      let response;
      if(tools.out.length){
        for(let round=0;round<5;round++){
          response=await fetch(url,{method:"POST",mode:"cors",credentials:"omit",cache:"no-store",headers,
            body:JSON.stringify({model:p.model,messages,stream:false,tools:tools.out,tool_choice:"auto"}),signal:controller.signal});
          const data=await readJSON(response),msg=data?.choices?.[0]?.message,calls=msg?.tool_calls||[];
          if(!calls.length){response=new Response(JSON.stringify(data),{headers:{"Content-Type":"application/json"}});break}
          if(round===4)throw Error("工具调用已达 4 轮，请继续发送消息。");
          if(calls.length>8)throw Error("单轮工具调用过多，请缩小请求范围。");
          messages.push({role:"assistant",content:msg.content||null,tool_calls:calls});
          for(const call of calls){
            if(controller.signal.aborted)throw new DOMException("请求已停止","AbortError");
            const hit=tools.map[call.function?.name];let result;
            try{
              if(!hit)throw Error("未找到工具");
              const args=JSON.parse(call.function.arguments||"{}");
              if(!confirm("执行 MCP 工具？\n"+hit.server.name+" · "+hit.tool+"\n"+JSON.stringify(args,null,2).slice(0,3500)))throw Error("用户取消了本次工具调用");
              setStatus("正在调用："+hit.server.name+" / "+hit.tool);
              result=await window.YanyaMCP.call(hit.server.id,hit.tool,args,controller.signal);
            }catch(e){if(e.name==="AbortError")throw e;result={isError:true,message:e.message}}
            messages.push({role:"tool",tool_call_id:call.id,content:JSON.stringify(result).slice(0,24000)});
          }
        }
      }else response=await fetch(url,{
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
        const data=await readJSON(response);
        reply=output(data).slice(0,MAX_TEXT);
      }
      if(!reply.trim())throw Error("接口返回为空；确认模型名称、服务商格式和流式选项。");
      if(!disposed){
        if(!saveReply(reply)){if(!regeneration)t.messages.push({role:"assistant",content:reply,at:timestamp()});renderMessages();setStatus("回复已收到但未能保存，刷新前请先复制或导出。",true);return reply}renderMessages();setStatus("");
        return reply;
      }
    }catch(e){
      if(disposed)return;
      if(e?.name==="AbortError"){
        if(reply.trim())saveReply(reply+"\n[已停止生成]");
        setStatus("已停止生成。");
      }else{
        setStatus("发送失败："+friendlyError(e),true);
      }
      renderMessages();
    }finally{
      if(pending===controller)pending=null;
      if(!disposed){setBusy(false);if(window.YanyaVoice?.isCalling())voiceAdapter.lock(true);}
    }
  }
  const voiceAdapter={
    avatar:()=>window.YanyaAssets?.avatar("assistant",window.YanyaLibrary?.characterId(selectedThread().characterId)||"")||"",
    name:()=>window.YanyaLibrary?.characterName(selectedThread().characterId)||picked().name||"角色",
    ready:()=>!pending&&!attaching&&Boolean(picked().url&&picked().model),
    send:text=>send(false,text),
    stop:()=>pending?.abort(),
    record(duration){const t=selectedThread();(t.calls||(t.calls=[])).push({at:timestamp(),duration});t.calls=t.calls.slice(-100);persist();renderMessages()},
    lock(value){recordButton.disabled=value;attachButton.disabled=value;roleSelect.disabled=value;historyButton.disabled=value;providerSelect.disabled=value;modelSelect.disabled=value;addButton.disabled=value;settingsButton.disabled=value;sendButton.disabled=value;dictation.disabled=value;callButton.disabled=value;}
  };
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
    window.YanyaCreation?.dispose();window.YanyaLibrary?.dispose();mediaControllers.forEach(c=>c.abort());window.YanyaNotes?.close();window.YanyaAttachments?.close();window.YanyaVoice?.dispose();disposed=true;pending?.abort();
    visual?.removeEventListener("resize",adjustViewport);
    visual?.removeEventListener("scroll",adjustViewport);
    input.removeEventListener("focus",onFocus);
    const panel=document.getElementById("panel");
    if(panel){panel.style.height="";panel.style.top="";panel.style.bottom="";}
    singleton=null;
  }};
  requestAnimationFrame(adjustViewport);
}
async function complete(system,text,signal,history=[]){
 const providers=read(PROVIDERS,[]),active=read(ACTIVE,"");const p=(Array.isArray(providers)?providers:[]).find(p=>p.id===active)||(Array.isArray(providers)?providers[0]:null);
 if(!p?.url||!p.model)throw Error("请先在岛心配置聊天接口与模型");
 const controller=new AbortController(),cancel=()=>controller.abort();if(signal?.aborted)throw new DOMException("请求已停止","AbortError");signal?.addEventListener("abort",cancel,{once:true});const timer=setTimeout(cancel,60000);
 try{const headers={"Content-Type":"application/json",Accept:"application/json"};const key=keyGet(p.id);if(key)headers.Authorization="Bearer "+key;
 const messages=[{role:"system",content:system},...history.slice(-40).map(m=>({role:m.role,content:m.content})),{role:"user",content:text}];
 const response=await fetch(endpoint(p.url),{method:"POST",credentials:"omit",mode:"cors",cache:"no-store",headers,body:JSON.stringify({model:p.model,messages,stream:false}),signal:controller.signal});const reply=output(await readJSON(response));if(!reply.trim())throw Error("接口未返回正文");return reply.slice(0,MAX_TEXT);
 }finally{clearTimeout(timer);signal?.removeEventListener("abort",cancel)}
}
window.YanyaChat={mount,complete,dispose(){singleton?.dispose()}};
})();
