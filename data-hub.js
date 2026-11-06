/* Previewed backup/import; never accesses xy.* storage in the old app. */
(()=>{
'use strict';
const P='yanya.xuanjing.',ROLLBACK=P+'import-rollback.v1';
const ALLOWED=new Set(['avatars.v1','theme.v1','chat-threads.v1','chat-active.v1','providers.v2','active-provider.v2','library.v1','memories.v1','mcps.v1','voice.v1','period-override.v1','home-view.v1','cosmos-level.v1','ritual.level','ritual.sphere.v2','ritual.rotation','tianhuan.rings.v1','chat-preview.v1'].map(k=>P+k));
const node=(t,text)=>{const e=document.createElement(t);if(text!==undefined)e.textContent=text;return e};
const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k))??f}catch(_){return f}};
const collect=()=>Object.fromEntries([...ALLOWED].filter(k=>localStorage.getItem(k)!==null).map(k=>[k,localStorage.getItem(k)]));
const arr=x=>Array.isArray(x)?x:[];
function decode(values,k,f){try{return typeof values[k]==='string'?JSON.parse(values[k]):values[k]??f}catch(_){return f}}
function oldPreview(raw){
 if(raw.format!=='AevrenXYBackup'||!raw.values||typeof raw.values!=='object')throw Error('不是旧砚屿完整备份');
 const values=raw.values,now=new Date().toISOString(),plans=[],notes=[];
 const oldTheme=decode(values,'xy.theme',null);
 if(oldTheme&&window.YanyaTheme)plans.push({label:'旧版外观 · 配色、壁纸与阅读偏好',key:P+'theme.v1',value:window.YanyaTheme.fromXY(oldTheme,decode(values,'xy.bubbleColors',{})),merge:(_,next)=>next});
 const oldChats=arr(decode(values,'xy.chats',[]));
 const chats=oldChats.slice(0,36).map((c,i)=>({id:'xy-'+String(c.id||i),characterId:String(c.characterId||''),title:String(c.title||'旧砚屿对话').slice(0,50),updated:now,messages:arr(c.messages).filter(m=>m&&['assistant','user'].includes(m.role)&&typeof m.text==='string').slice(-120).map(m=>({role:m.role,content:m.text.slice(0,12000),at:typeof m.at==='string'?m.at:typeof m.createdAt==='number'?new Date(m.createdAt).toISOString():now})),calls:arr(c.messages).filter(m=>m?.kind==='call').slice(-100).map(m=>({at:new Date(m.endedAt||Date.now()).toISOString(),duration:Number.isFinite(Number(m.endedAt)-Number(m.startedAt))?Math.max(0,Math.floor((Number(m.endedAt)-Number(m.startedAt))/1000)):0}))}));
 if(chats.length){plans.push({label:'聊天 · '+chats.length+' 段',key:P+'chat-threads.v1',value:chats,merge:(old,next)=>[...arr(old),...next.filter(t=>!arr(old).some(x=>x.id===t.id))].slice(0,36)});notes.push('聊天最多保留 36 段，每段最近 120 条文字，每条最多 12000 字。图片、附件、消息分支、群聊成员及通话完整字幕不在本次迁移范围，原备份仍可保留。')}
 const study=decode(values,'xy.study.v1',{}),characters=arr(decode(values,'xy.characters',[]));
 const cards=characters.slice(0,100).map((c,i)=>{const book=study?.byCharacter?.[c.id]||{},card=book.card||{};return {id:String(c.id||'xy-role-'+i),name:String(c.name||card.name||'旧角色').slice(0,80),system:[c.system,card.enabled===false?'':[card.description,card.personality,card.scenario,card.system_prompt].filter(Boolean).join('\n\n'),book.preset?.enabled?book.preset.content:''].filter(Boolean).join('\n\n').slice(0,12000),world:arr(book.lore).filter(x=>x&&x.enabled!==false).map(x=>x.content||x.text||'').join('\n\n').slice(0,12000),greeting:String(card.first_mes||'').slice(0,12000)}});
 if(cards.length){plans.push({label:'角色与书房 · '+cards.length+' 个',key:P+'library.v1',value:{user:'',active:cards[0].id,cards},merge:(old,next)=>({...next,...old,cards:[...arr(old?.cards),...next.cards.filter(c=>!arr(old?.cards).some(x=>x.id===c.id))].slice(0,100)})});notes.push('书房迁移角色设定、已启用世界书和默认开场白，设定与世界书各最多 12000 字。备选开场、章节、条件触发规则及 HTML 显示规则尚未迁移。')}
 const memories=arr(decode(values,'xy.memories',[])).filter(m=>m&&typeof m.text==='string').slice(0,150).map((m,i)=>({id:'xy-'+String(m.id||i),text:m.text,type:m.tag||'旧版记忆',created:now}));
 if(memories.length)plans.push({label:'星阁记忆 · '+memories.length+' 条',key:P+'memories.v1',value:memories,merge:(old,next)=>[...arr(old),...next.filter(m=>!arr(old).some(x=>x.id===m.id))].slice(0,150)});
 notes.push('合并时以现有数据优先，重复 ID 跳过，超过容量的内容不会导入。API Key、MCP Token、账号登录、云同步设置均不导入。');
 return {plans,notes};
}
function apply(entries){
 for(const [k,v]of entries){if(!ALLOWED.has(k)||typeof v!=="string")throw Error("未允许的存储项");JSON.parse(v)}
 const before=collect();localStorage.setItem(ROLLBACK,JSON.stringify(before));
 try{for(const [k,v]of entries){if(!ALLOWED.has(k))throw Error('未允许的存储项');localStorage.setItem(k,v)}}
 catch(e){for(const [k]of entries)localStorage.removeItem(k);for(const [k]of entries)if(Object.hasOwn(before,k))localStorage.setItem(k,before[k]);throw e}
}
function mount(root){
 const form=node('div');form.className='chat-next-settings-form';root.replaceChildren(form);const status=node('p');status.setAttribute('role','status');
 const button=(text,fn)=>{const b=node('button',text);b.type='button';b.onclick=fn;return b};
 const exportBackup=()=>{const payload={format:'YanyaBackup',version:1,at:new Date().toISOString(),values:collect()};const u=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));const a=node('a');a.href=u;a.download='砚芽-完整备份-'+payload.at.slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),2000);status.textContent='已导出，包含头像；不含会话密钥和导入字体文件。'};
 const preview=node('section');preview.className='module-card';preview.hidden=true;
 const file=node('input');file.type='file';file.accept='.json,application/json';file.hidden=true;
 file.onchange=async()=>{try{const f=file.files?.[0];if(!f)return;if(f.size>24*1024*1024)throw Error('文件超过 24 MB');const raw=JSON.parse(await f.text());preview.replaceChildren();preview.hidden=false;const selections=[];
  if(raw.format==='AevrenXYBackup'){
   const {plans,notes}=oldPreview(raw);preview.append(node('h3','旧砚屿导入预览'));notes.forEach(n=>preview.append(node('p',n)));
   if(!plans.length)throw Error('没有找到支持迁移的数据');
   plans.forEach(plan=>{const label=node('label'),check=node('input');check.type='checkbox';check.checked=true;label.append(check,node('span',plan.label));preview.append(label);selections.push({check,entries:()=>[[plan.key,JSON.stringify(plan.merge(read(plan.key,null),plan.value))]]})});
  }else if(raw.format==='YanyaBackup'&&raw.values&&typeof raw.values==='object'){
   preview.append(node('h3','砚芽备份恢复预览'),node('p','选中的数据项将替换当前同类数据；未选中的数据保留。建议先导出备份。'));
   for(const [key,value]of Object.entries(raw.values)){if(!ALLOWED.has(key)||typeof value!=='string')continue;JSON.parse(value);const label=node('label'),check=node('input');check.type='checkbox';check.checked=true;label.append(check,node('span',key.slice(P.length)));preview.append(label);selections.push({check,entries:()=>[[key,value]]})}
  }else throw Error('不支持的备份格式');
  preview.append(button('确认导入所选内容',()=>{try{const entries=selections.filter(s=>s.check.checked).flatMap(s=>s.entries());if(!entries.length)throw Error('请至少选择一项');if(!confirm('确认导入 '+entries.length+' 项数据？导入完成后将刷新页面。'))return;apply(entries);location.reload()}catch(e){status.textContent='导入失败：'+e.message}}));
 }catch(e){status.textContent='读取失败：'+e.message}finally{file.value=''}};
 form.append(node('h3','数据备份与旧版迁移'),node('p','先导出数据备份，再选择文件查看导入预览。头像包含在备份中；导入字体文件需在外观面板单独导出，JSON 不包含字体文件。所有数据只写入砚芽自己的存储。'),button('导出砚芽完整备份',exportBackup),button('选择砚芽 / 旧砚屿备份',()=>file.click()),button('撤销最近一次导入',()=>{try{const old=read(ROLLBACK,null);if(!old||typeof old!=='object')throw Error('没有可恢复的导入快照');if(!confirm('恢复导入前数据？导入后新写入的内容会被覆盖。'))return;const current=collect();for(const k of ALLOWED){if(Object.hasOwn(old,k))localStorage.setItem(k,old[k]);else localStorage.removeItem(k)}localStorage.setItem(ROLLBACK,JSON.stringify(current));location.reload()}catch(e){status.textContent=e.message}}),file,preview,status);
}
window.YanyaData={mount,oldPreview,apply};
})();
