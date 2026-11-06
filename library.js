/* Local book shelf; deliberately isolated from the original 砚屿 storage. */
(()=>{
'use strict';
const KEY='yanya.xuanjing.library.v1';
const clean=x=>({user:String(x?.user||'').slice(0,80),active:String(x?.active||''),cards:(Array.isArray(x?.cards)?x.cards:[]).slice(0,100).map(c=>({id:String(c.id||Date.now()),name:String(c.name||'新角色').slice(0,80),system:String(c.system||'').slice(0,12000),world:String(c.world||'').slice(0,12000),greeting:String(c.greeting||'').slice(0,12000)}))});
const read=()=>{try{return clean(JSON.parse(localStorage.getItem(KEY)))}catch(_){return clean({})}};
const el=(tag,text)=>{const e=document.createElement(tag);if(text)e.textContent=text;return e};
window.YanyaLibrary={characters:()=>read().cards,characterName(id){const d=read();return d.cards.find(c=>c.id===(id||d.active))?.name||""},context(id){
 const d=read(),c=d.cards.find(c=>c.id===(id||d.active));
 const replace=s=>s.replace(/\{\{user\}\}/g,d.user||'你').replace(/\{\{char\}\}/g,c?.name||'我');
 return {system:replace([d.user?'用户名字：'+d.user:'',c?'角色名字：'+c.name:'',c?.system,c?.world].filter(Boolean).join('\n\n')),greeting:replace(c?.greeting||'')};
},mount(root){
 let d=read();const form=el('div');form.className='chat-next-settings-form';root.replaceChildren(form);
 const status=el('p');status.setAttribute('role','status');
 const persist=()=>{try{localStorage.setItem(KEY,JSON.stringify(d));status.textContent='已保存到本机，新消息会使用当前角色与世界书。';return true}catch(_){status.textContent='保存失败，本机空间不足。';return false}};
 const button=(text,fn)=>{const b=el('button',text);b.type='button';b.onclick=fn;return b};
 const field=(title,value,fn,multi=false)=>{const label=el('label');label.className='chat-next-field';const input=el(multi?'textarea':'input');input.value=value;input.maxLength=multi?12000:80;if(multi)input.rows=5;input.oninput=()=>fn(input.value);label.append(el('span',title),input);form.append(label)};
 field('你的名字 · 用于 {{user}}',d.user,v=>{d.user=v});
 const select=el('select');select.className='chat-next-input-select';const none=el('option','不使用角色');none.value='';select.append(none);
 d.cards.forEach(c=>{const o=el('option',c.name);o.value=c.id;select.append(o)});select.value=d.active;
 select.onchange=()=>{d.active=select.value;if(persist())this.mount(root)};form.append(select);
 form.append(button('添加角色',()=>{d.active=Date.now().toString(36)+Math.random().toString(36).slice(2);d.cards.push({id:d.active,name:'新角色',system:'',world:'',greeting:''});if(persist())this.mount(root)}));
 const c=d.cards.find(c=>c.id===d.active);
 if(c){field('角色名字 · {{char}}',c.name,v=>c.name=v);field('角色设定',c.system,v=>c.system=v,true);field('世界书 · 每次聊天随上下文发送',c.world,v=>c.world=v,true);field('开场白 · 新建对话时使用',c.greeting,v=>c.greeting=v,true);}
 form.append(button('保存书房',()=>{if(persist())this.mount(root)}));
 if(c)form.append(button('删除当前角色',()=>{if(!confirm('确定删除角色「'+c.name+'」？'))return;d.cards=d.cards.filter(x=>x.id!==c.id);d.active='';if(persist())this.mount(root)}));
 form.append(button('导出书房',()=>{const u=URL.createObjectURL(new Blob([JSON.stringify({format:'yanya-library-v1',...d},null,2)],{type:'application/json'}));const a=el('a');a.href=u;a.download='砚芽-书房.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),2000)}));
 const file=el('input');file.type='file';file.accept='.json,application/json';file.hidden=true;
 file.onchange=async()=>{try{const f=file.files[0];if(!f)return;if(f.size>4*1024*1024)throw Error('文件超过 4 MB');const raw=JSON.parse(await f.text());if(raw.format!=='yanya-library-v1'||!Array.isArray(raw.cards))throw Error('不是砚芽书房备份');const next=clean(raw);if(!confirm('将替换书房，共 '+next.cards.length+' 个角色。请先导出当前书房。'))return;d=next;if(persist())this.mount(root)}catch(e){status.textContent='导入失败：'+e.message}finally{file.value=''}};
 form.append(button('导入书房',()=>file.click()),file,el('p','角色与世界书独立保存在本机；切换角色不会删除聊天。开场白用于新建对话，支持 {{user}} 和 {{char}}。'),status);
}};
})();
