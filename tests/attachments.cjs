const fs=require('fs'),vm=require('vm'),assert=require('assert');
const window={},ctx={window,Uint8Array,Error,URL};vm.createContext(ctx);vm.runInContext(fs.readFileSync('attachments.js','utf8'),ctx);const a=window.YanyaAttachments;
(async()=>{
 const image={kind:'image',name:'photo.jpg',data:'data:image/jpeg;base64,YWJj'},text={kind:'text',name:'note.md',text:'hello <script>'};
 assert.equal(a.normalize([image,image,image]).length,2);assert.equal(a.normalize([{kind:'image',data:'javascript:alert(1)'}]).length,0);assert.equal(a.normalize([{kind:'image',data:'data:image/svg+xml;base64,YWJj'}]).length,0);assert.equal(a.normalize([{kind:'text',text:'a'.repeat(8001)}]).length,0);
 let message=a.apiMessage({role:'user',content:'read',attachments:[image,text]});assert.equal(message.content[0].type,'text');assert(message.content[0].text.includes('note.md'));assert.equal(message.content[1].image_url.url,image.data);
 message=a.apiMessage({role:'user',content:'read',attachments:[text]});assert.equal(typeof message.content,'string');assert(message.content.includes('hello <script>'));
 const imported=JSON.parse(JSON.stringify({role:'user',content:'read',attachments:[image,text]}));assert.equal(a.normalize(imported.attachments).length,2);
 const file=await a.fromFile({name:'note.md',size:20,type:'text/markdown',text:async()=>'file text'});assert.equal(file.text,'file text');
 await assert.rejects(a.fromFile({name:'bad.pdf',size:5,type:'application/pdf'}),/PDF/);await assert.rejects(a.fromFile({name:'huge.txt',size:5,type:'text/plain',text:async()=>'x'.repeat(8001)}),/8000/);await assert.rejects(a.fromFile({name:'binary.txt',size:5,type:'text/plain',text:async()=>'\0'}),/二进制/);
 console.log('PASS attachment limits, unsafe image rejection, vision/text payloads, JSON roundtrip and text file validation');
})().catch(e=>{console.error(e);process.exit(1)});
