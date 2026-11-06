/* Voice/call flow adapted from aevren-xy call-core and voice-core.
 * Browser-only adapter; no legacy storage or Android bridge dependencies. */
(()=>{
'use strict';
const KEY='yanya.xuanjing.voice.v1',Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
let call=null,recognition=null,speaking=null,settingsUI=null,dictating=false;
const node=(tag,text)=>{const e=document.createElement(tag);if(text)e.textContent=text;return e};
const button=(text,fn)=>{const b=node('button',text);b.type='button';b.onclick=fn;return b};
const load=()=>{try{return JSON.parse(localStorage.getItem(KEY))||{}}catch(_){return {}}};
const format=n=>String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');
function stopListening(){const r=recognition;recognition=null;if(r){r.onend=null;r.onresult=null;r.onerror=null;try{r.abort()}catch(_){}}}
function stopSpeech(){const s=speaking;speaking=null;window.speechSynthesis?.cancel();s?.finish();}
function speak(text){
 stopSpeech();
 if(!window.speechSynthesis||!window.SpeechSynthesisUtterance)return Promise.reject(Error('设备没有系统朗读引擎，可继续看字幕。'));
 stopListening();
 return new Promise((resolve,reject)=>{
  const config=load(),u=new SpeechSynthesisUtterance(text);u.lang=config.lang||'zh-CN';u.rate=Number(config.rate)||0.9;
  const voice=window.speechSynthesis.getVoices().find(v=>v.voiceURI===config.voice);if(voice)u.voice=voice;
  let timer;const finish=error=>{clearTimeout(timer);if(speaking?.utter===u)speaking=null;error?reject(error):resolve()};
  speaking={utter:u,finish};u.onend=()=>finish();u.onerror=e=>finish(Error('朗读失败：'+e.error));
  timer=setTimeout(()=>{if(speaking?.utter===u){window.speechSynthesis.cancel();finish(Error('朗读超时，请检查系统语音引擎。'))}},180000);
  window.speechSynthesis.speak(u);
 });
}
function settings(){
 if(settingsUI)return;
 const config=load(),overlay=node('div');overlay.className='yanya-voice-overlay';settingsUI=overlay;
 const panel=node('section');panel.className='yanya-voice-card';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label','语音设置');
 const previous=document.activeElement,close=()=>{overlay.remove();settingsUI=null;previous?.focus()};
 const field=(title,input)=>{const label=node('label',title);label.append(input);panel.append(label)};
 const lang=node('select');[['zh-CN','普通话'],['zh-HK','粤语'],['en-US','English']].forEach(([value,text])=>{const o=node('option',text);o.value=value;lang.append(o)});lang.value=config.lang||'zh-CN';field('识别与朗读语言',lang);
 const voice=node('select');const fill=()=>{voice.replaceChildren();const o=node('option','系统默认');o.value='';voice.append(o);window.speechSynthesis?.getVoices().forEach(v=>{const o=node('option',v.name+' · '+v.lang);o.value=v.voiceURI;voice.append(o)});voice.value=config.voice||''};fill();window.speechSynthesis?.addEventListener('voiceschanged',fill);
 field('系统声音',voice);
 const rate=node('input');rate.type='range';rate.min='0.5';rate.max='1.5';rate.step='0.1';rate.value=config.rate||0.9;field('朗读速度',rate);
 panel.append(node('p','当前使用设备系统语音。麦克风识别是否可用取决于浏览器和设备；部分系统识别服务会联网。这里不调用付费语音接口。'));
 const cleanup=()=>{window.speechSynthesis?.removeEventListener('voiceschanged',fill);close()};
 panel.append(button('保存',()=>{try{localStorage.setItem(KEY,JSON.stringify({lang:lang.value,voice:voice.value,rate:Number(rate.value)}));cleanup()}catch(_){panel.append(node('p','保存失败，本机存储不可用。'))}}),button('关闭',cleanup));overlay.append(panel);document.body.append(overlay);panel.querySelector('select').focus();
}
function dictate(done,status){
 if(call||dictating){status('请先结束当前语音。',true);return}
 if(!Recognition){status('当前浏览器不支持语音识别。可尝试系统键盘的麦克风输入。',true);return}
 stopSpeech();dictating=true;const r=new Recognition();recognition=r;r.lang=load().lang||'zh-CN';r.interimResults=false;
 const timer=setTimeout(()=>{if(recognition===r){stopListening();dictating=false;status('语音输入超时，请重试。',true)}},20000);
 r.onresult=e=>{const text=e.results[0]?.[0]?.transcript;if(text)done(text)};
 r.onerror=e=>status('语音输入失败：'+e.error,true);
 r.onend=()=>{clearTimeout(timer);if(recognition===r)recognition=null;dictating=false};
 try{r.start();status('正在听，请说话……')}catch(e){clearTimeout(timer);recognition=null;dictating=false;status(e.message,true)}
}
function hangup(){
 const c=call;if(!c)return;
 call=null;clearInterval(c.timer);clearTimeout(c.restart);stopListening();stopSpeech();c.adapter.stop();
 const duration=Math.floor((Date.now()-c.started)/1000);c.adapter.record(duration);c.adapter.lock(false);c.overlay.remove();c.previous?.focus();
}
function startCall(adapter){
 if(call)return;
 if(dictating)return;
 if(!adapter.ready()){alert('请先配置聊天接口和模型，并等待当前回复结束。');return}
 stopSpeech();stopListening();
 const overlay=node('div');overlay.className='yanya-voice-overlay';const panel=node('section');panel.className='yanya-voice-card';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label','与'+adapter.name()+'通话');
 const title=node('h2','与'+adapter.name()+'通话'),status=node('p','已接通'),time=node('div','00:00'),log=node('div');log.className='yanya-voice-transcript';log.setAttribute('role','log');log.setAttribute('aria-live','polite');
 const input=node('input');input.placeholder='也可以输入通话内容';input.setAttribute('aria-label','通话内容');input.maxLength=12000;
 const c={adapter,overlay,started:Date.now(),busy:false,auto:false,muted:false,previous:document.activeElement};call=c;
 const add=(who,text)=>{const line=node('p');line.append(node('b',who+'：'),node('span',text));log.append(line);log.scrollTop=log.scrollHeight};
 const schedule=()=>{clearTimeout(c.restart);if(call===c&&c.auto&&!c.busy&&!c.muted)c.restart=setTimeout(listen,500)};
 const send=async text=>{
  text=text.trim();if(!text||c.busy||call!==c)return;
  c.busy=true;stopListening();add('你',text);status.textContent='正在等待回复……';input.disabled=true;
  try{const reply=await adapter.send(text);if(call!==c)return;if(!reply)throw Error('没有收到回复，请检查聊天界面的错误提示。');add(adapter.name(),reply);status.textContent='正在朗读……';await speak(reply)}
  catch(e){if(call===c)status.textContent=e.message}
  finally{c.busy=false;if(call===c){input.disabled=false;if(!status.textContent.includes('失败')&&!status.textContent.includes('没有')&&!status.textContent.includes('超时'))status.textContent='已接通 · 请继续';schedule()}}
 };
 function listen(){
  if(call!==c||c.busy||c.muted||recognition)return;
  if(!Recognition){status.textContent='浏览器不支持语音识别，可用文字输入。';return}
  const r=new Recognition();recognition=r;r.lang=load().lang||'zh-CN';r.continuous=false;r.interimResults=true;
  r.onstart=()=>status.textContent='正在听……';
  r.onresult=e=>{if(call!==c||recognition!==r)return;let final='',partial='';for(let i=e.resultIndex;i<e.results.length;i++){if(e.results[i].isFinal)final+=e.results[i][0].transcript;else partial+=e.results[i][0].transcript}if(partial)status.textContent='听到：'+partial;if(final.trim())send(final)};
  r.onerror=e=>{if(call!==c)return;if(e.error!=='no-speech'&&e.error!=='aborted'){c.auto=false;automatic.textContent='开启自动识别';status.textContent='识别失败：'+e.error+'，可输入文字或重试。'}};
  r.onend=()=>{if(recognition===r)recognition=null;schedule()};
  try{r.start()}catch(e){recognition=null;c.auto=false;status.textContent='麦克风启动失败：'+e.message}
 }
 const automatic=button('开启自动识别',()=>{c.auto=!c.auto;automatic.textContent=c.auto?'关闭自动识别':'开启自动识别';if(c.auto)listen();else stopListening()});
 const mic=button('说话',()=>{if(recognition){recognition.stop()}else listen()});
 const mute=button('静音麦克风',()=>{c.muted=!c.muted;mute.textContent=c.muted?'取消静音':'静音麦克风';if(c.muted){stopListening();status.textContent='麦克风已静音'}else schedule()});
 const sendBtn=button('发送',()=>{if(!c.busy&&input.value.trim()){const text=input.value;input.value='';send(text)}});input.onkeydown=e=>{if(e.key==='Enter'&&!e.isComposing){e.preventDefault();sendBtn.click()}};
 const actions=node('div');actions.className='yanya-voice-actions';actions.append(mic,automatic,mute,button('停止朗读',()=>stopSpeech()),button('挂断',hangup));
 if(!Recognition){mic.disabled=true;automatic.disabled=true;status.textContent='已接通 · 当前浏览器不支持识别，请输入文字。'}
 panel.append(title,status,time,log,input,sendBtn,actions);overlay.append(panel);document.body.append(overlay);adapter.lock(true);actions.lastChild.focus();c.timer=setInterval(()=>{time.textContent=format(Math.floor((Date.now()-c.started)/1000))},500);
}
window.YanyaVoice={speak,stopSpeech,dictate,settings,call:startCall,hangup,dispose(){hangup();stopListening();stopSpeech();dictating=false},isCalling:()=>Boolean(call)};
window.addEventListener('pagehide',()=>{hangup();stopListening();stopSpeech()});
})();
