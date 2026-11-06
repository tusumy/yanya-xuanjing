(()=>{
'use strict';
let active=null;
const el=(t,text)=>{const n=document.createElement(t);if(text!==undefined)n.textContent=text;return n};
async function fromBlob(blob,name='语音',duration=0,transcript=''){
 if(!blob||blob.size>650000||!/^audio\/(webm|ogg|mp4|mpeg|wav|x-wav)/i.test(blob.type))throw Error('语音格式不支持或超过 650 KB，请缩短后重试');
 const normalized=new Blob([blob],{type:blob.type.split(';')[0]});const data=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(Error('语音读取失败'));r.readAsDataURL(normalized)});
 return {kind:'audio',name:name.slice(0,120),data,duration:Math.max(0,Math.round(duration)),text:transcript.slice(0,8000)};
}
function close(){const a=active;if(!a)return;active=null;a.cancelled=true;clearInterval(a.timer);clearTimeout(a.limit);a.controller?.abort();if(a.recorder?.state==='recording'){a.recorder.onstop=null;a.recorder.stop()}a.stream?.getTracks().forEach(t=>t.stop());a.audio?.pause();if(a.url)URL.revokeObjectURL(a.url);a.overlay.remove();a.previous?.focus()}
function record({onReady,transcribe}){
 if(active)return;
 const overlay=el('div');overlay.className='yanya-voice-overlay';const panel=el('section');panel.className='yanya-voice-card';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label','录制语音条');
 const a={overlay,previous:document.activeElement,chunks:[],started:0,blob:null,cancelled:false};active=a;
 const status=el('p','最长录音 60 秒。停止后可以试听、转写或补充文字，再放入待发送区。'),time=el('strong','00:00'),audio=el('audio');audio.controls=true;audio.hidden=true;a.audio=audio;
 const transcript=el('textarea');transcript.rows=3;transcript.maxLength=8000;transcript.placeholder='转写或补充这段语音的文字';transcript.setAttribute('aria-label','语音转写文字');
 const button=(text,fn)=>{const b=el('button',text);b.type='button';b.onclick=fn;return b};
 const finish=async()=>{clearInterval(a.timer);clearTimeout(a.limit);a.stream?.getTracks().forEach(t=>t.stop());if(active!==a||a.cancelled)return;try{a.blob=new Blob(a.chunks,{type:a.recorder.mimeType||'audio/webm'});if(a.blob.size>650000)throw Error('录音超过 650 KB，请缩短后重录');if(!a.blob.size)throw Error('没有录到声音，请检查麦克风');a.duration=(Date.now()-a.started)/1000;a.url=URL.createObjectURL(a.blob);audio.src=a.url;audio.hidden=false;start.disabled=false;stop.disabled=true;add.disabled=false;stt.disabled=false;status.textContent='录音完成。模型通过转写文字理解语音，未转写时只会收到语音占位说明。'}catch(e){status.textContent=e.message;start.disabled=false}};
 const start=button('开始录音',async()=>{if(a.recorder?.state==='recording')return;start.disabled=true;add.disabled=true;stt.disabled=true;try{if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder)throw Error('当前浏览器不支持录音，请使用语音输入');const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true}});if(active!==a||a.cancelled){stream.getTracks().forEach(t=>t.stop());return}a.stream=stream;audio.pause();if(a.url)URL.revokeObjectURL(a.url);audio.hidden=true;a.blob=null;a.chunks=[];const mime=['audio/webm;codecs=opus','audio/mp4','audio/ogg;codecs=opus'].find(m=>MediaRecorder.isTypeSupported(m));a.recorder=new MediaRecorder(stream,{...(mime?{mimeType:mime}:{}),audioBitsPerSecond:24000});a.recorder.ondataavailable=e=>{if(e.data.size)a.chunks.push(e.data)};a.recorder.onstop=finish;a.recorder.onerror=()=>{clearInterval(a.timer);clearTimeout(a.limit);status.textContent='录音失败，请重试';a.stream?.getTracks().forEach(t=>t.stop());start.disabled=false;stop.disabled=true};a.started=Date.now();a.recorder.start(250);stop.disabled=false;status.textContent='正在录音……';a.timer=setInterval(()=>{const seconds=Math.floor((Date.now()-a.started)/1000);time.textContent=String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0')},500);a.limit=setTimeout(()=>{if(a.recorder.state==='recording')a.recorder.stop()},60000)}catch(e){a.stream?.getTracks().forEach(t=>t.stop());status.textContent=e.message;start.disabled=false}});
 const stop=button('停止录音',()=>{if(a.recorder?.state==='recording')a.recorder.stop()});stop.disabled=true;
 const model=el('input');model.value='whisper-1';model.setAttribute('aria-label','转写模型');model.placeholder='转写模型，例如 whisper-1';
 const stt=button('使用当前接口转写',async()=>{if(!a.blob)return;stt.disabled=true;start.disabled=true;add.disabled=true;const controller=new AbortController();a.controller=controller;const timeout=setTimeout(()=>controller.abort(),45000);try{status.textContent='正在转写，可能消耗接口额度……';const text=await transcribe(a.blob,model.value.trim()||'whisper-1',controller.signal);if(active!==a)return;transcript.value=text.slice(0,8000);status.textContent='转写完成，可修改文字后发送'}catch(e){if(active===a)status.textContent='转写失败：'+e.message}finally{clearTimeout(timeout);if(active===a){stt.disabled=false;start.disabled=false;add.disabled=false}}});stt.disabled=true;
 const add=button('放入待发送区',async()=>{if(!a.blob)return;add.disabled=true;try{const note=await fromBlob(a.blob,'语音消息',a.duration,transcript.value);if(active!==a)return;await onReady(note);close()}catch(e){status.textContent=e.message;add.disabled=false}});add.disabled=true;
 panel.append(el('h2','录一条语音'),status,time,start,stop,audio,transcript,model,stt,add,button('取消',close));overlay.append(panel);document.body.append(overlay);start.focus();
}
window.YanyaNotes={fromBlob,record,close,isOpen:()=>Boolean(active)};
})();
