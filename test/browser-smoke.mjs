import { spawn } from 'node:child_process';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';

const base = process.env.MRSS_BASE_URL || 'http://127.0.0.1:18081';
const outputDir = process.env.MRSS_OUTPUT_DIR || os.tmpdir();
const username = process.env.MRSS_USERNAME || 'john.doe';
const password = process.env.MRSS_PASSWORD || 'moqui';
const profile = await mkdtemp(path.join(os.tmpdir(), 'mrss-chrome-'));
const browser = spawn(process.env.MRSS_CHROMIUM || '/usr/bin/chromium', ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank'], {stdio: ['ignore','ignore','pipe']});
let ws;
try {
 const endpoint = await new Promise((resolve,reject) => {
  let text='';
  const timer=setTimeout(()=>reject(Error('Chromium startup timeout')),30000);
  browser.stderr.on('data',chunk=>{text+=chunk;const m=text.match(/DevTools listening on (ws:\/\/[^\s]+)/);if(m){clearTimeout(timer);resolve(m[1]);}});
  browser.on('exit',code=>{clearTimeout(timer);reject(Error('Chromium exit '+code));});
 });
 ws = new WebSocket(endpoint);
 await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true});});
 let seq=0;const pending=new Map(), listeners=[];let session;
 const exceptions=[];
 ws.addEventListener('message',event=>{
  const msg=JSON.parse(event.data);
  if(msg.id){const cb=pending.get(msg.id);if(cb){pending.delete(msg.id);msg.error?cb.reject(Error(JSON.stringify(msg.error))):cb.resolve(msg.result);}}
  else {if(msg.method==='Runtime.exceptionThrown') exceptions.push(msg.params.exceptionDetails.text+': '+JSON.stringify(msg.params.exceptionDetails.exception));for(const fn of [...listeners])fn(msg);}
 });
 const send=(method,params={},sid=session)=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params,...(sid?{sessionId:sid}:{})}));});
 const wait=method=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>{listeners.splice(listeners.indexOf(fn),1);reject(Error('Event timeout: '+method));},30000);const fn=msg=>{if(msg.method===method&&msg.sessionId===session){clearTimeout(timer);listeners.splice(listeners.indexOf(fn),1);resolve(msg.params);}};listeners.push(fn);});
 const {targetId}=await send('Target.createTarget',{url:'about:blank'},null);
 ({sessionId:session}=await send('Target.attachToTarget',{targetId,flatten:true},null));
 await send('Page.enable'); await send('Runtime.enable');
 const evaluate=async expression=>{const out=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(out.exceptionDetails)throw Error(JSON.stringify(out.exceptionDetails));return out.result.value;};
 const go=async url=>{const loaded=wait('Page.loadEventFired');await send('Page.navigate',{url:base+url});await loaded;return evaluate('document.body.innerText');};
 await go('/Login');
 let loaded=wait('Page.loadEventFired');
 await evaluate(`(()=>{const f=document.getElementById('login_form');f.username.value=${JSON.stringify(username)};f.password.value=${JSON.stringify(password)};f.requestSubmit();return true})()`);
 await loaded;
 const results=[];
 for(const [url,text] of [
  ['/apps/SimpleScreens/Customer/FindCustomer?pseudoId=CustJqp','Joe'],
  ['/apps/SimpleScreens/Order/OrderDetail?orderId=55401','Picker Bot 2000'],
  ['/apps/SimpleScreens/Accounting/Invoice/EditInvoice?invoiceId=55400','Payment Sent'],
  ['/apps/SimpleScreens/Accounting/Payment/EditPayment?paymentId=55400','Delivered'],
  ['/apps/my/User/Account','Change Password']
 ]){
  const body=await go(url);assert.ok(body.includes(text),url+': expected '+text+'; got '+body.slice(0,400));assert.ok(!/Error rendering section|Exception in render/.test(body),url+' render error');results.push({url,expected:text,passed:true});
 }
 const body=await go('/apps/SimpleScreens/Order/PrintOrder.html-print?orderId=55400');
 assert.ok(body.includes('23,795.00'),body.slice(0,500));
 assert.ok(await evaluate('document.querySelectorAll("svg rect").length > 0'),'Real barcode SVG bars required');
 const pdf=await send('Page.printToPDF',{printBackground:true,preferCSSPageSize:true});
 await writeFile(path.join(outputDir,'mrss-order-smoke.pdf'),Buffer.from(pdf.data,'base64'));
 const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});
 await writeFile(path.join(outputDir,'mrss-order-smoke.png'),Buffer.from(shot.data,'base64'));
 results.push({url:'PrintOrder.html-print',passed:true,pdf:path.join(outputDir,'mrss-order-smoke.pdf'),barcode:true});
 await writeFile(path.join(outputDir,'mrss-browser-results.json'),JSON.stringify({results,exceptions},null,2));
 console.log(JSON.stringify({results,exceptions},null,2));
 assert.equal(exceptions.length,0,'Browser JS exceptions');
} finally {
 if(ws)ws.close();browser.kill('SIGTERM');
 await new Promise(resolve=>browser.exitCode!==null?resolve():browser.once('exit',resolve));
 await rm(profile,{recursive:true,force:true}).catch(error => console.warn('Temporary Chromium profile cleanup:',error.code));
}
