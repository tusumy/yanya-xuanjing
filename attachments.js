/* Portable, bounded attachments; messages and their JSON backups own the data. */
(()=>{
'use strict';
const MAX_IMAGE=260000,MAX_TEXT=8000;const players=new Set();
const stopAudio=()=>{players.forEach(p=>p.pause());players.clear()};
function normalize(input){let images=0;return (Array.isArray(input)?input:[]).slice(0,4).map(x=>{
 if(!x||typeof x!=='object')return null;const name=String(x.name||'附件').slice(0,120);
 if(x.kind==='image'&&images<2&&typeof x.data==='string'&&x.data.length<=MAX_IMAGE&&/^data:image\/(?:jpeg|png|webp);base64,[a-z0-9+/=]+$/i.test(x.data)){images++;return {kind:'image',name,data:x.data};}
 if(x.kind==='sticker'&&typeof x.data==='string'&&x.data.length<=180000&&/^data:image\/(?:jpeg|png|webp|gif);base64,[a-z0-9+/=]+$/i.test(x.data))return {kind:'sticker',name,data:x.data};
 if(x.kind==='audio'&&typeof x.data==='string'&&x.data.length<=900000&&/^data:audio\/(?:webm|ogg|mp4|mpeg|wav|x-wav);base64,[a-z0-9+/=]+$/i.test(x.data))return {kind:'audio',name,data:x.data,text:String(x.text||'').slice(0,MAX_TEXT),duration:Math.max(0,Math.min(600,Number(x.duration)||0))};
 if(x.kind==='text'&&typeof x.text==='string'&&x.text.length<=MAX_TEXT)return {kind:'text',name,text:x.text};return null;
 }).filter(Boolean)}
async function fromFile(file,options={}){
 const maxImage=Math.min(MAX_IMAGE,Number(options.maxImage)||MAX_IMAGE);
 if(!file||file.size>10*1024*1024)throw Error('附件须小于 10 MB');
 if(/^image\/(jpeg|png|webp)$/.test(file.type)){
  const url=URL.createObjectURL(file);try{
   const img=new Image();img.src=url;await img.decode();const canvas=document.createElement('canvas');
   let edge=1200,data='';
   for(let attempt=0;attempt<5;attempt++){const scale=Math.min(1,edge/Math.max(img.width,img.height));canvas.width=Math.max(1,Math.round(img.width*scale));canvas.height=Math.max(1,Math.round(img.height*scale));const ctx=canvas.getContext('2d');if(!ctx)throw Error('浏览器无法处理图片');if(!options.preserveAlpha){ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);}ctx.drawImage(img,0,0,canvas.width,canvas.height);data=canvas.toDataURL(options.preserveAlpha?'image/webp':'image/jpeg',Math.max(.5,.82-attempt*.07));if(data.length<=maxImage)break;edge=Math.round(edge*.8)}
   if(data.length>maxImage)throw Error('图片压缩后仍然过大，请裁剪后重试');
   return {kind:'image',name:file.name.slice(0,120),data};
  }finally{URL.revokeObjectURL(url)}
 }
 if(!/\.(txt|md|markdown|json|csv|log|js|ts|py|html|css|xml|ya?ml)$/i.test(file.name))throw Error('支持 JPG、PNG、WebP 图片和 TXT、Markdown、JSON、CSV、代码等文本文件；暂不支持 PDF、Word 或压缩包');
 if(file.size>128*1024)throw Error('文本文件须小于 128 KB');
 const text=await file.text();if(text.includes('\u0000'))throw Error('文件包含二进制内容，不能作为文本发送');if(text.length>MAX_TEXT)throw Error('文本附件超过 8000 字，请拆分后发送');
 return {kind:'text',name:file.name.slice(0,120),text};
}
function apiMessage(m){
 const attachments=normalize(m.attachments);if(!attachments.length)return {role:m.role,content:m.content};
 const text=[m.content,...attachments.filter(a=>a.kind==='sticker').map(a=>'[表情：'+a.name+']'),...attachments.filter(a=>a.kind==='audio'&&!(m.role==='assistant'&&m.content)).map(a=>a.text?'[语音转写：'+a.name+']\n'+a.text:'[语音消息未转写：模型未收到可理解的音频，请勿声称已听到内容]'),...attachments.filter(a=>a.kind==='text').map(a=>'[文本附件：'+a.name+']\n'+a.text+'\n[附件结束]')].filter(Boolean).join('\n\n');
 const images=attachments.filter(a=>a.kind==='image');return {role:m.role,content:images.length?[{type:'text',text:text||'请查看图片。'},...images.map(a=>({type:'image_url',image_url:{url:a.data}}))]:text};
}
let viewer=null;
function closeViewer(){viewer?.remove();viewer=null}
function view(a){
 closeViewer();const previous=document.activeElement,overlay=document.createElement('div');viewer=overlay;overlay.className='attachment-viewer';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label',a.name);
 const close=document.createElement('button');close.type='button';close.textContent='关闭';close.onclick=()=>{closeViewer();previous?.focus()};const title=document.createElement('strong');title.textContent=a.name;overlay.append(close,title);
 if(a.kind==='image'||a.kind==='sticker'){const img=document.createElement('img');img.src=a.data;img.alt=a.name;overlay.append(img)}else{const pre=document.createElement('pre');pre.textContent=a.text;overlay.append(pre)}
 overlay.onkeydown=e=>{if(e.key==='Escape')close.click()};overlay.onclick=e=>{if(e.target===overlay)close.click()};document.body.append(overlay);close.focus();
}
function render(host,attachments,remove){
 normalize(attachments).forEach((a,index)=>{const card=document.createElement('div');card.className='chat-attachment';
 if(a.kind==='audio'){
  const audio=document.createElement('audio');audio.controls=true;audio.preload='none';audio.src=a.data;players.add(audio);audio.onplay=()=>{players.forEach(p=>{if(p!==audio)p.pause()});window.YanyaVoice?.stopSpeech()};
  const label=document.createElement('span');label.textContent=a.name+(a.duration?' · '+a.duration+'秒':'');
  const hold=document.createElement('button');hold.type='button';hold.className='audio-hold';hold.textContent='按住播放';
  const pause=()=>audio.pause();hold.onpointerdown=e=>{hold.setPointerCapture?.(e.pointerId);audio.play().catch(()=>{})};hold.oncontextmenu=e=>e.preventDefault();hold.onpointerup=pause;hold.onpointercancel=pause;hold.onlostpointercapture=pause;hold.onkeydown=e=>{if([' ','Enter'].includes(e.key)){e.preventDefault();audio.play().catch(()=>{})}};hold.onkeyup=pause;
  const download=document.createElement('a');download.textContent='下载语音';download.href=a.data;download.download=a.name+'.'+(a.data.startsWith('data:audio/mp4')?'m4a':a.data.split('/')[1].split(';')[0]);
  card.append(label,audio,hold,download);if(a.text){const transcript=document.createElement('details'),summary=document.createElement('summary'),text=document.createElement('p');summary.textContent='转写文字';text.textContent=a.text;transcript.append(summary,text);card.append(transcript)}
  if(remove){const b=document.createElement('button');b.type='button';b.textContent='移除';b.onclick=()=>{pause();players.delete(audio);remove(index)};card.append(b)}host.append(card);return;
 }
 const preview=document.createElement('button');preview.type='button';preview.className='chat-attachment-open';preview.setAttribute('aria-label','预览附件：'+a.name);preview.onclick=()=>view(a);
 if(a.kind==='image'||a.kind==='sticker'){const img=document.createElement('img');img.src=a.data;img.alt=a.name;img.loading='lazy';preview.append(img)}
 const name=document.createElement('span');name.textContent=(a.kind==='text'?'▤ ':'')+a.name;preview.append(name);card.append(preview);
 if(remove){const b=document.createElement('button');b.type='button';b.textContent='移除';b.onclick=()=>remove(index);card.append(b)}host.append(card)});
}
window.YanyaAttachments={normalize,fromFile,apiMessage,render,stopAudio,close(){closeViewer();stopAudio()}};
})();
