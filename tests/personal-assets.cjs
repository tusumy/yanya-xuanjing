const fs=require('fs'),vm=require('vm'),assert=require('assert');
const records=new Map(),saved=new Map();let failWrite=false,faces=new Set();
const database={transaction(name,mode){const tx={};const request=fn=>{const r={};setTimeout(()=>{try{if(mode==='readwrite'&&failWrite)throw Error('quota');r.result=fn();r.onsuccess?.();tx.oncomplete?.()}catch(e){tx.error=e;tx.onabort?.()}},0);return r};tx.objectStore=()=>({getAll:()=>request(()=>[...records.values()]),get:id=>request(()=>records.get(id)),put:record=>request(()=>{records.set(record.id,record);return record.id}),delete:id=>request(()=>records.delete(id))});return tx}};
const indexedDB={open(){const req={};setTimeout(()=>{req.result=database;req.onsuccess()},0);return req}};
const context={window:{indexedDB,FontFace:function(){}},indexedDB,document:{fonts:{add:f=>faces.add(f),delete:f=>faces.delete(f)}},FontFace:class{constructor(name,data){this.name=name;this.data=data}async load(){return this}},localStorage:{getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)},Uint8Array,Date,Math,Error};vm.createContext(context);vm.runInContext(fs.readFileSync('personal-assets.js','utf8'),context);const assets=context.window.YanyaAssets;
const bytes=new Uint8Array(16);bytes.set([0,1,0,0]);const file={name:'myfont.ttf',arrayBuffer:async()=>bytes.buffer};
(async()=>{
 assert.throws(()=>assets.validateFont('bad.js',bytes.buffer),/支持/);assert.throws(()=>assets.validateFont('bad.ttf',new Uint8Array(16).buffer),/格式/);
 const font=await assets.importFont(file);assert.equal(records.size,1);assert.equal(faces.size,1);assert((await assets.activate(font.id)).includes(font.id));
 assert.equal((await assets.fonts())[0].name,'myfont.ttf');await assets.removeFont(font.id);assert.equal(records.size,0);assert.equal(faces.size,0);await assert.rejects(assets.activate(font.id),/找不到/);
 failWrite=true;await assert.rejects(assets.importFont(file),/quota/);assert.equal(faces.size,0);assert.equal(records.size,0);
 saved.set('yanya.xuanjing.avatars.v1',JSON.stringify({user:'data:image/jpeg;base64,YWJj','character:role':'data:image/png;base64,YWJj','character:bad':'javascript:alert(1)'}));assert.equal(assets.avatar('user',''),'data:image/jpeg;base64,YWJj');assert.equal(assets.avatar('assistant','role'),'data:image/png;base64,YWJj');assert.equal(assets.avatar('assistant','bad'),'');
 console.log('PASS imported font validation, persistence, activation/deletion, write failure cleanup, separate and validated avatar lookup');
})().catch(e=>{console.error(e);process.exit(1)});
