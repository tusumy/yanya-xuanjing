/* Reply variants plus explicit conversation forks; no discarded continuations. */
(()=>{
'use strict';
const LIMIT=12;
const attachments=x=>window.YanyaAttachments?.normalize(x)||[];
const variant=x=>({content:String(x?.content||'').slice(0,12000),at:typeof x?.at==='string'?x.at:new Date().toISOString(),attachments:attachments(x?.attachments)});
function normalize(m){if(!m||!['user','assistant'].includes(m.role)||typeof m.content!=='string')return null;const result={role:m.role,...variant(m)};if(m.role==='assistant'&&Array.isArray(m.variants)&&m.variants.length){result.variants=m.variants.slice(0,LIMIT).map(variant);result.activeVariant=Math.max(0,Math.min(result.variants.length-1,Math.floor(Number(m.activeVariant)||0)));Object.assign(result,result.variants[result.activeVariant])}return result}
function variants(m){return Array.isArray(m.variants)&&m.variants.length?m.variants.map(variant):[variant(m)]}
function add(m,content,extra=[]){const all=variants(m);if(all.length>=LIMIT)throw Error('这条回复已有 12 个版本，请从这里新建分支后继续');all.push(variant({content,attachments:extra}));return {...m,...all.at(-1),variants:all,activeVariant:all.length-1}}
function choose(m,index){const all=variants(m);if(!Number.isInteger(index)||index<0||index>=all.length)throw Error('回复版本不存在');return {...m,...all[index],variants:all,activeVariant:index}}
function fork(t,index,id){if(!Number.isInteger(index)||index<0||index>=t.messages.length)throw Error('分支位置不正确');return {id,title:(t.title+' · 分支').slice(0,50),characterId:t.characterId||'',updated:new Date().toISOString(),calls:[],messages:JSON.parse(JSON.stringify(t.messages.slice(0,index+1)))}}
window.YanyaBranches={normalize,variants,add,choose,fork,LIMIT};
})();
