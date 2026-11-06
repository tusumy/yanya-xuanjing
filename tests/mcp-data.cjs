const fs=require('fs'),vm=require('vm'),assert=require('assert');
const memory=new Map(),session=new Map();let failKey='',calls=0;
const storage={getItem:k=>memory.has(k)?memory.get(k):null,setItem(k,v){if(k===failKey){failKey='';throw Error('quota')}memory.set(k,v)},removeItem:k=>memory.delete(k)};
const win={},context={window:win,localStorage:storage,sessionStorage:{getItem:k=>session.get(k)},URL,AbortController,DOMException,TextDecoder,Uint8Array,Response,ReadableStream,TextEncoder,setTimeout,clearTimeout,fetch:async(url,opts)=>{
 const body=JSON.parse(opts.body),headers={'Content-Type':'application/json','Mcp-Session-Id':'session'};
 if(body.method==='notifications/initialized')return new Response(null,{status:202});
 if(body.method!=='initialize'){assert.equal(opts.headers['Mcp-Session-Id'],'session');assert.equal(opts.headers['MCP-Protocol-Version'],'2025-06-18')}
 if(body.method==='initialize')return new Response(JSON.stringify({jsonrpc:'2.0',id:body.id,result:{protocolVersion:'2025-06-18'}}),{headers});
 if(body.method==='tools/list')return new Response(JSON.stringify({jsonrpc:'2.0',id:body.id,result:{tools:[{name:'read',inputSchema:{type:'object'}}]}}),{headers});
 assert.equal(body.method,'tools/call');calls++;
 const payload='event: message\ndata: '+JSON.stringify({jsonrpc:'2.0',id:body.id,result:{content:[{type:'text',text:'ok'}]}})+'\n\n';
 const encoder=new TextEncoder();return new Response(new ReadableStream({start(c){c.enqueue(encoder.encode(payload.slice(0,20)));c.enqueue(encoder.encode(payload.slice(20)));/* leave stream open: client must cancel after matching reply */}}),{headers:{'Content-Type':'text/event-stream'}});
}};
vm.createContext(context);vm.runInContext(fs.readFileSync('mcp.js','utf8'),context);vm.runInContext(fs.readFileSync('data-hub.js','utf8'),context);
(async()=>{
 const server={id:'s',name:'test',url:'https://mock.test/mcp',enabled:true};memory.set('yanya.xuanjing.mcps.v1',JSON.stringify([server]));await win.YanyaMCP.connect(server);assert.equal(win.YanyaMCP.tools().out.length,1);const result=await win.YanyaMCP.call('s','read',{});assert.equal(result.content[0].text,'ok');assert.equal(calls,1);
 const abort=new AbortController();abort.abort();await assert.rejects(win.YanyaMCP.call('s','read',{},abort.signal),e=>e.name==='AbortError');assert.equal(calls,1);
 const preview=win.YanyaData.oldPreview({format:'AevrenXYBackup',values:{'xy.chats':JSON.stringify([{id:1,characterId:'role',messages:[{role:'user',text:'hi'},{role:'assistant',text:'hello'}]}]),'xy.characters':JSON.stringify([{id:'role',name:'玄砚',system:'persona'}]),'xy.study.v1':JSON.stringify({byCharacter:{role:{card:{first_mes:'opening'},lore:[{content:'world'}]}}}),'xy.memories':JSON.stringify([{id:2,text:'memory'}]),'xy.endpoints':JSON.stringify([{key:'private-secret'}])}});
 assert.equal(preview.plans.length,3);assert.equal(preview.plans[0].value[0].characterId,'role');assert.equal(preview.plans[1].value.cards[0].world,'world');assert(!JSON.stringify(preview).includes('private-secret'));
 memory.set('yanya.xuanjing.library.v1','{"cards":[]}');failKey='yanya.xuanjing.memories.v1';assert.throws(()=>win.YanyaData.apply([['yanya.xuanjing.library.v1','{"cards":[1]}'],['yanya.xuanjing.memories.v1','[]']]),/quota/);assert.equal(memory.get('yanya.xuanjing.library.v1'),'{"cards":[]}');assert(!memory.has('yanya.xuanjing.memories.v1'));
 console.log('PASS MCP initialize/session/list, partial SSE with open connection, abort without execution, old backup conversion and rollback');
})().catch(e=>{console.error(e);process.exit(1)});
