/* Streamable HTTP MCP, adapted from old XY runtime; isolated settings. */
(()=>{
'use strict';
const KEY='yanya.xuanjing.mcps.v1',sessions=new Map();let seq=0;
const read=()=>{try{const x=JSON.parse(localStorage.getItem(KEY));return Array.isArray(x)?x.filter(s=>s&&typeof s.id==='string'&&typeof s.url==='string').slice(0,30):[]}catch(_){return []}};
const save=list=>localStorage.setItem(KEY,JSON.stringify(list));
const node=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e};
const key=id=>{try{return sessionStorage.getItem('yanya.xuanjing.mcp-token.'+id)||''}catch(_){return ''}};
const safeURL=raw=>{const u=new URL(raw);if(u.protocol!=='https:'&&!(u.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(u.hostname)))throw Error('MCP 地址须使用 HTTPS');if(u.username||u.password||u.hash)throw Error('地址不能带账号密码或锚点');return u.href};
const abortCheck=signal=>{if(signal?.aborted)throw new DOMException('请求已停止','AbortError')};
async function request(server,method,params,signal){
 abortCheck(signal);const id=++seq,notification=method.startsWith('notifications/'),session=sessions.get(server.id),controller=new AbortController();
 const cancel=()=>controller.abort();signal?.addEventListener('abort',cancel,{once:true});const timer=setTimeout(cancel,60000);
 try{
  const headers={'Content-Type':'application/json',Accept:'application/json, text/event-stream'};
  if(key(server.id))headers.Authorization='Bearer '+key(server.id);
  if(session?.id)headers['Mcp-Session-Id']=session.id;
  if(session?.version)headers['MCP-Protocol-Version']=session.version;
  const response=await fetch(safeURL(server.url),{method:'POST',credentials:'omit',mode:'cors',headers,body:JSON.stringify({jsonrpc:'2.0',...(notification?{}:{id}),method,params}),signal:controller.signal});
  const sid=response.headers.get('Mcp-Session-Id');if(sid)sessions.set(server.id,{...session,id:sid});
  if(!response.ok)throw Error('MCP HTTP '+response.status);
  if(notification){try{await response.body?.cancel()}catch(_){}return null}
  let data;
  if((response.headers.get('content-type')||'').includes('text/event-stream')&&response.body){
   const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='';
   try{while(!data){const chunk=await reader.read();buffer+=decoder.decode(chunk.value||new Uint8Array(),{stream:!chunk.done});buffer=buffer.replace(/\r\n/g,'\n');if(buffer.length>4*1024*1024)throw Error('MCP 数据过大');let at;while((at=buffer.indexOf('\n\n'))>=0){const event=buffer.slice(0,at);buffer=buffer.slice(at+2);const text=event.split('\n').filter(l=>l.startsWith('data:')).map(l=>l.slice(5).trimStart()).join('\n');if(!text)continue;let value;try{value=JSON.parse(text)}catch(_){continue}if(value.id===id)data=value;}if(chunk.done)break;}}finally{await reader.cancel().catch(()=>{})}
  }else{const raw=await response.text();if(/^\s*</.test(raw))throw Error('MCP 地址返回网页，请填写服务端的 /mcp 地址');try{data=JSON.parse(raw)}catch(_){throw Error('MCP 未返回有效 JSON')}}
  if(!data||data.id!==id)throw Error('MCP 没有返回对应请求结果');
  if(data.error)throw Error(data.error.message||'MCP 错误');return data.result;
 }finally{clearTimeout(timer);signal?.removeEventListener('abort',cancel)}
}
async function connect(server,signal){
 sessions.delete(server.id);
 let init;
 try{init=await request(server,'initialize',{protocolVersion:'2025-06-18',capabilities:{},clientInfo:{name:'Yanya Xuanjing',version:'0.24'}},signal)}
 catch(e){if(e.name==='AbortError'||signal?.aborted)throw e;sessions.delete(server.id);init=await request(server,'initialize',{protocolVersion:'2024-11-05',capabilities:{},clientInfo:{name:'Yanya Xuanjing',version:'0.24'}},signal)}
 sessions.set(server.id,{...sessions.get(server.id),version:init?.protocolVersion||'2025-06-18'});
 await request(server,'notifications/initialized',{},signal);
 let tools=[],cursor;
 for(let page=0;page<10;page++){const result=await request(server,'tools/list',cursor?{cursor}:{},signal);tools.push(...(Array.isArray(result?.tools)?result.tools:[]));cursor=result?.nextCursor;if(!cursor)break}
 server.tools=tools.filter(t=>t&&typeof t.name==='string').slice(0,200);server.status='已连接 · '+server.tools.length+' 项';
 const list=read(),at=list.findIndex(s=>s.id===server.id);if(at>=0){list[at]={...list[at],tools:server.tools,status:server.status};save(list)}
 return server.tools;
}
async function callTool(id,name,args,signal){
 const server=read().find(s=>s.id===id);if(!server||!server.enabled)throw Error('MCP 服务未启用');
 if(!sessions.has(id))await connect(server,signal);
 // Do not blindly retry a tools/call: a write may already have succeeded remotely.
 const result=await request(server,'tools/call',{name,arguments:args||{}},signal);
 if(result?.isError)throw Error(result.content?.find(c=>c.type==='text')?.text||'工具返回错误');return result;
}
function tools(){
 const out=[],map={};read().filter(s=>s.enabled).forEach((server,si)=>(server.tools||[]).slice(0,60).forEach((t,ti)=>{const name='mcp_'+si+'_'+ti;out.push({type:'function',function:{name,description:(server.name+' · '+(t.description||t.name)).slice(0,1000),parameters:t.inputSchema||{type:'object',properties:{}}}});map[name]={server,tool:t.name}}));return {out:out.slice(0,100),map};
}
function mount(root){
 const form=node('div');form.className='chat-next-settings-form';root.replaceChildren(form);const status=node('p');status.setAttribute('role','status');
 form.append(node('h3','MCP 外部工具'),node('p','连接后可在聊天中使用工具。每次调用会显示服务、工具与参数，确认后执行。Token 仅保存在当前浏览会话。'));
 const button=(text,fn)=>{const b=node('button',text);b.type='button';b.onclick=fn;return b};
 read().forEach(server=>{
  const card=node('section');card.className='module-card';card.append(node('h3',server.name),node('p',server.url),node('p',server.status||'尚未连接'));
  const details=node('details');details.append(node('summary','工具目录 · '+(server.tools||[]).length));(server.tools||[]).forEach(t=>details.append(node('p',t.name+' — '+(t.description||'').slice(0,180))));card.append(details);
  card.append(button('连接 / 刷新工具',async()=>{status.textContent='连接中……';try{await connect(server);mount(root)}catch(e){status.textContent=e.message}}),button(server.enabled?'停用':'启用',()=>{const list=read();list.find(s=>s.id===server.id).enabled=!server.enabled;save(list);mount(root)}),button('编辑',()=>edit(server)),button('删除',()=>{if(!confirm('删除 MCP「'+server.name+'」？'))return;save(read().filter(s=>s.id!==server.id));sessionStorage.removeItem('yanya.xuanjing.mcp-token.'+server.id);sessions.delete(server.id);mount(root)}));form.append(card);
 });
 function edit(server={}){
  const box=node('section');box.className='module-card';const field=(title,value,type='text')=>{const label=node('label',title);label.className='chat-next-field';const input=node('input');input.type=type;input.value=value||'';label.append(input);box.append(label);return input};
  const name=field('名称',server.name),url=field('MCP URL',server.url,'url'),token=field('Bearer Token',key(server.id),'password');
  box.append(button('保存 MCP',()=>{try{if(!name.value.trim())throw Error('请填写名称');const list=read(),id=server.id||Date.now().toString(36)+Math.random().toString(36).slice(2);const value={id,name:name.value.trim().slice(0,80),url:safeURL(url.value.trim()),enabled:server.enabled!==false,tools:server.url===url.value.trim()?server.tools||[]:[]};const at=list.findIndex(s=>s.id===id);at<0?list.push(value):list.splice(at,1,value);save(list);sessionStorage.setItem('yanya.xuanjing.mcp-token.'+id,token.value.trim());sessions.delete(id);mount(root)}catch(e){status.textContent=e.message}}),button('取消',()=>box.remove()));form.append(box);name.focus();
 }
 form.append(button('添加 MCP',()=>edit()),status);
}
window.YanyaMCP={mount,connect,call:callTool,tools,servers:read};
})();
