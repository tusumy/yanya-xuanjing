/* One owner for all appearance state and tokens. No xy.* storage access. */
(()=>{
'use strict';
const KEY='yanya.xuanjing.theme.v1';
const PRESETS={apple:{name:'青苹果',accent:'#59844a',light:'#f2f8ed',dark:'#101e14',user:'#d9ebc8'},mist:{name:'雾薄荷',accent:'#3b8075',light:'#edf7f3',dark:'#10201e',user:'#cfe9df'},rose:{name:'樱雾',accent:'#a26982',light:'#fcf2f5',dark:'#24181f',user:'#f0dbe4'},ink:{name:'青墨',accent:'#5d736a',light:'#eef3f0',dark:'#141d19',user:'#dce6df'}};
const DEFAULT={version:1,preset:'apple',mode:'system',colors:{light:{},dark:{}},wallpaper:'',wallpaperScope:'chat',wallpaperDim:0.2,wallpaperPosition:'center',wallpaperScroll:true,glass:true,skin:'round',font:'system',fontSize:15,gap:16,lineHeight:1.85,motion:'system'};
const num=(v,min,max,fallback)=>Number.isFinite(Number(v))?Math.min(max,Math.max(min,Number(v))):fallback;
const color=v=>typeof v==='string'&&/^#[a-f0-9]{6}$/i.test(v)?v.toLowerCase():'';
const pick=(v,items,fallback)=>items.includes(v)?v:fallback;
function imageURL(raw){if(!raw)return '';if(typeof raw!=='string'||raw.length>1800000)throw Error('壁纸过大，请换一张较小图片');if(/^data:image\/(?:jpeg|png|webp);base64,[a-z0-9+/=]+$/i.test(raw))return raw;const u=new URL(raw);if(u.protocol!=='https:'||u.username||u.password)throw Error('壁纸仅支持 HTTPS 图片或本地相册图片');return u.href}
function normalize(raw={}){
 const x=raw&&typeof raw==='object'?raw:{};const colors={light:{},dark:{}};
 for(const mode of ['light','dark'])for(const k of ['accent','background','user','assistant'])if(color(x.colors?.[mode]?.[k]))colors[mode][k]=color(x.colors[mode][k]);
 return {version:1,preset:pick(x.preset,Object.keys(PRESETS),'apple'),mode:pick(x.mode,['light','dark','system'],'system'),colors,wallpaper:imageURL(x.wallpaper||''),wallpaperScope:pick(x.wallpaperScope,['chat','page'],'chat'),wallpaperDim:num(x.wallpaperDim,0,0.85,0.2),wallpaperPosition:pick(x.wallpaperPosition,['center','top','bottom'],'center'),wallpaperScroll:x.wallpaperScroll!==false,glass:x.glass!==false,skin:pick(x.skin,['round','square','outline'],'round'),font:pick(x.font,['system','serif'],'system'),fontSize:num(x.fontSize,12,23,15),gap:num(x.gap,8,36,16),lineHeight:num(x.lineHeight,1.4,2.3,1.85),motion:pick(x.motion,['system','reduced'],'system')};
}
function read(){try{return normalize(JSON.parse(localStorage.getItem(KEY)))}catch(_){return normalize(DEFAULT)}}
let state=read(),activeSettings=null;
const media=window.matchMedia?.('(prefers-color-scheme: dark)');
const resolved=()=>state.mode==='system'?(media?.matches?'dark':'light'):state.mode;
const mix=(a,b,t)=>{const parts=c=>[1,3,5].map(i=>parseInt(c.slice(i,i+2),16));const aa=parts(a),bb=parts(b);return '#'+aa.map((v,i)=>Math.round(v*(1-t)+bb[i]*t).toString(16).padStart(2,'0')).join('')};
const rgba=(hex,alpha)=>'rgba('+[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)).join(',')+','+alpha+')';
function textFor(hex){const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);const l=rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;return (l+.05)/.05>=1.05/(l+.05)?'#101b14':'#f7fbf6'}
function tokens(config=state,mode=resolved()){
 const p=PRESETS[config.preset],dark=mode==='dark',custom=config.colors[mode];
 const background=custom.background||(dark?p.dark:p.light),accent=custom.accent||(dark?mix(p.accent,'#eaf6e5',.55):p.accent),surface=dark?mix(background,'#ffffff',.065):mix(background,'#ffffff',.78);
 const user=custom.user||(dark?mix(background,p.accent,.38):p.user),assistant=custom.assistant||(dark?mix(background,'#ffffff',.1):'#ffffff');
 return {background,accent,surface,user,assistant,ink:textFor(background),muted:dark?'#a8b8ae':'#52665a',line:rgba(dark?'#d7eedc':'#254d34',dark?.2:.22),userText:textFor(user),assistantText:textFor(assistant),error:dark?'#ffb5aa':'#9d332e'};
}
function apply(){
 const mode=resolved(),t=tokens(),root=document.documentElement;root.dataset.theme=state.preset;root.dataset.themeMode=mode;root.dataset.themeGlass=state.glass?'1':'0';root.dataset.bubbleSkin=state.skin;root.dataset.themeMotion=state.motion;root.dataset.wallpaperScope=state.wallpaperScope;root.dataset.wallpaperScroll=state.wallpaperScroll?'1':'0';root.style.colorScheme=mode;
 const css={'--yn-bg':t.background,'--yn-surface':t.surface,'--yn-ink':t.ink,'--yn-muted':t.muted,'--yn-accent':t.accent,'--yn-accent-on':textFor(t.accent),'--yn-line':t.line,'--yn-user':state.glass?rgba(t.user,.78):t.user,'--yn-assistant':state.glass?rgba(t.assistant,.83):t.assistant,'--yn-user-text':t.userText,'--yn-assistant-text':t.assistantText,'--yn-error':t.error,'--yn-glass':state.glass?rgba(t.surface,.86):t.surface,'--yn-wallpaper':state.wallpaper?'url('+JSON.stringify(state.wallpaper)+')':'none','--yn-wallpaper-dim':rgba(t.background,state.wallpaperDim),'--yn-wallpaper-position':state.wallpaperPosition,'--yn-font':state.font==='serif'?'"Noto Serif SC","Songti SC",serif':'system-ui,"PingFang SC","Microsoft YaHei",sans-serif','--yn-font-size':state.fontSize+'px','--yn-gap':state.gap+'px','--yn-line-height':String(state.lineHeight),'--page':t.background,'--ink':t.ink,'--muted':t.muted,'--muted-2':t.muted,'--outline':t.line,'--line':t.line,'--lime':t.accent,'--mint':t.accent,'--glass':state.glass?rgba(t.surface,.86):t.surface,'--glass-heavy':t.surface};
 for(const [k,v]of Object.entries(css))root.style.setProperty(k,v);
 if(document.body)document.body.dataset.period=mode==='dark'?'night':'day';
 const meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.content=t.background;
 window.dispatchEvent(new CustomEvent('yanya-theme-change',{detail:{period:mode==='dark'?'night':'day'}}));
}
function set(patch){const next=normalize({...state,...patch});localStorage.setItem(KEY,JSON.stringify(next));state=next;apply()}
function fromXY(old,bubbles={}){
 const mode=pick(old?.mode,['light','dark','system'],'system'),palette={mint:'mist',cream:'apple',dusk:'rose',night:'ink'};
 const preset=PRESETS[old?.preset]?old.preset:palette[old?.preset]||'apple';const side=mode==='dark'?'dark':'light';const colors={light:{},dark:{}};
 for(const [key,value]of Object.entries({background:old?.bgColor,accent:old?.accent,user:bubbles.userBubble||old?.userBubble,assistant:bubbles.assistantBubble||old?.assistantBubble}))if(color(value))colors[side][key]=color(value);
 let wallpaper='';try{wallpaper=imageURL(old?.bgImage||'')}catch(_){}
 return normalize({preset,mode,colors,wallpaper,wallpaperDim:old?.overlay,glass:old?.bubbleGlass,skin:old?.bubbleSkin==='comic'?'outline':'round',font:old?.fontFamily,fontSize:15*num(old?.fontScale,.8,1.5,1),gap:old?.bubbleGap});
}
async function localImage(file){
 if(!/^image\/(jpeg|png|webp)$/.test(file.type)||file.size>10*1024*1024)throw Error('请选择 10 MB 内的 JPG、PNG 或 WebP 图片');
 const url=URL.createObjectURL(file);try{const img=new Image();img.src=url;await img.decode();const scale=Math.min(1,1600/Math.max(img.width,img.height)),canvas=document.createElement('canvas');canvas.width=Math.round(img.width*scale);canvas.height=Math.round(img.height*scale);canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);return imageURL(canvas.toDataURL('image/jpeg',.82))}finally{URL.revokeObjectURL(url)}
}
function mount(root){
 const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n};const form=el('div');form.className='theme-settings';root.replaceChildren(form);activeSettings={root,form};const status=el('p');status.setAttribute('role','status');status.className='theme-status';
 const commit=patch=>{try{set(patch);status.textContent='外观已保存';return true}catch(e){status.textContent='保存失败：'+e.message;return false}};
 const button=(text,fn)=>{const b=el('button',text);b.type='button';b.onclick=fn;return b};
 const section=(title)=>{const s=el('section');s.className='theme-section';s.append(el('h3',title));form.append(s);return s};
 const select=(host,label,key,options)=>{const row=el('label');row.className='theme-field';row.append(el('span',label));const input=el('select');options.forEach(([v,t])=>{const o=el('option',t);o.value=v;input.append(o)});input.value=String(state[key]);input.onchange=()=>{if(commit({[key]:input.value}))mount(root)};row.append(input);host.append(row)};
 const range=(host,label,key,min,max,step,unit)=>{const row=el('label');row.className='theme-field';const text=el('span',label+' · '+state[key]+unit),input=el('input');input.type='range';Object.assign(input,{min,max,step,value:state[key]});input.oninput=()=>text.textContent=label+' · '+input.value+unit;input.onchange=()=>commit({[key]:Number(input.value)});row.append(text,input);host.append(row)};
 const appearance=section('配色与明暗');select(appearance,'显示模式','mode',[['system','跟随系统'],['light','浅色'],['dark','深色']]);
 const presets=el('div');presets.className='theme-presets';Object.entries(PRESETS).forEach(([id,p])=>{const b=button(p.name,()=>{if(commit({preset:id,colors:{light:{},dark:{}}}))mount(root)});b.setAttribute('aria-pressed',String(state.preset===id));b.style.setProperty('--swatch',p.accent);presets.append(b)});appearance.append(presets,el('p','换配色保留壁纸、字体和气泡形状。浅色与深色的自定义颜色分别保存。'));
 const preview=section('即时预览');const box=el('div');box.className='theme-preview';const a=el('div','我在这儿，慢慢说。'),u=el('div','今天也想和你待一会儿。');a.className='theme-preview-assistant';u.className='theme-preview-user';box.append(a,u);preview.append(box);
 const details=el('details');details.append(el('summary','自定义当前'+(resolved()==='dark'?'深色':'浅色')+'颜色'));appearance.append(details);
 const t=tokens();[['accent','强调色'],['background','背景色'],['user','你的气泡'],['assistant','角色气泡']].forEach(([key,label])=>{const row=el('label');row.className='theme-color';const input=el('input');input.type='color';input.value=state.colors[resolved()][key]||t[key];input.setAttribute('aria-label',label);input.onchange=()=>{const colors=JSON.parse(JSON.stringify(state.colors));colors[resolved()][key]=input.value;commit({colors})};row.append(el('span',label),input);details.append(row)});
 const wallpaper=section('壁纸');select(wallpaper,'使用位置','wallpaperScope',[['chat','聊天背景'],['page','全局背景']]);select(wallpaper,'图片对齐','wallpaperPosition',[['center','居中'],['top','靠上'],['bottom','靠下']]);
 const scroll=el('label');scroll.className='theme-check';const check=el('input');check.type='checkbox';check.checked=state.wallpaperScroll;check.onchange=()=>commit({wallpaperScroll:check.checked});scroll.append(check,el('span','聊天壁纸随消息滚动'));wallpaper.append(scroll);
 const url=el('input');url.type='url';url.placeholder='HTTPS 图片地址';url.setAttribute('aria-label','壁纸图片网址');url.value=state.wallpaper.startsWith('https:')?state.wallpaper:'';wallpaper.append(url,button('使用图片网址',()=>commit({wallpaper:url.value.trim()})));
 const upload=el('input');upload.type='file';upload.accept='image/jpeg,image/png,image/webp';upload.hidden=true;upload.onchange=async()=>{const file=upload.files?.[0];upload.value='';if(!file)return;status.textContent='正在压缩图片……';try{const image=await localImage(file);commit({wallpaper:image})}catch(e){status.textContent=e.message}};wallpaper.append(button('从相册选择',()=>upload.click()),button('清除壁纸',()=>{if(commit({wallpaper:''}))url.value=''}),upload,el('p',state.wallpaper?'已设置壁纸':'尚未设置壁纸'));range(wallpaper,'背景遮罩','wallpaperDim',0,.85,.05,'');
 const chat=section('气泡与阅读');select(chat,'气泡形状','skin',[['round','圆润'],['square','简洁方角'],['outline','线框']]);const glass=el('label');glass.className='theme-check';const g=el('input');g.type='checkbox';g.checked=state.glass;g.onchange=()=>commit({glass:g.checked});glass.append(g,el('span','磨砂玻璃'));chat.append(glass);select(chat,'聊天字体','font',[['system','系统字体'],['serif','衬线 · 书页感']]);range(chat,'聊天字号','fontSize',12,23,1,'px');range(chat,'消息间距','gap',8,36,1,'px');range(chat,'行距','lineHeight',1.4,2.3,.05,'');select(chat,'动画','motion',[['system','跟随系统'],['reduced','减少动画']]);
 const data=section('主题备份');const file=el('input');file.type='file';file.accept='.json,application/json';file.hidden=true;file.onchange=async()=>{try{const f=file.files?.[0];if(!f)return;if(f.size>3*1024*1024)throw Error('主题文件超过 3 MB');const raw=JSON.parse(await f.text());let next;if(raw.format==='YanyaTheme')next=normalize(raw.theme);else if(raw.format==='AevrenXYBackup'){const decode=k=>typeof raw.values?.[k]==='string'?JSON.parse(raw.values[k]):raw.values?.[k]||{};next=fromXY(decode('xy.theme'),decode('xy.bubbleColors'))}else throw Error('不支持的主题文件');if(!confirm('应用文件中的主题？当前外观将被替换，聊天和角色保留。'))return;if(commit(next))mount(root)}catch(e){status.textContent='读取失败：'+e.message}finally{file.value=''}};
 data.append(button('导出主题',()=>{const u=URL.createObjectURL(new Blob([JSON.stringify({format:'YanyaTheme',version:1,theme:state},null,2)],{type:'application/json'}));const a=el('a');a.href=u;a.download='砚芽-主题.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),2000)}),button('导入主题 / 旧砚屿备份',()=>file.click()),button('恢复默认外观',()=>{if(confirm('恢复青苹果默认外观并清除壁纸？聊天与角色不受影响。')&&commit(DEFAULT))mount(root)}),file,el('p','旧版仅迁移配色、壁纸、字号、间距和玻璃偏好；小熊、小猫装饰及旧版叠加样式不迁入。'));
 form.append(status);
}
window.YanyaTheme={mount,apply,set,normalize,tokens,textFor,fromXY,get:()=>JSON.parse(JSON.stringify(state)),togglePeriod(){set({mode:resolved()==='dark'?'light':'dark'});if(activeSettings?.form.isConnected)mount(activeSettings.root)}};
media?.addEventListener?.('change',()=>{if(state.mode==='system'){apply();if(activeSettings?.form.isConnected)mount(activeSettings.root)}});
window.addEventListener?.('storage',e=>{if(e.key===KEY){state=read();apply();if(activeSettings?.form.isConnected)mount(activeSettings.root)}});
apply();
})();
