import puppeteer from 'puppeteer-core';
const BASE='http://127.0.0.1:8788';
let ok=0,bad=0; const t=(n,c,x='')=>{c?(ok++,console.log('  ok   '+n)):(bad++,console.log('  FAIL '+n+(x?' — '+x:'')));};
// สร้างข้อมูลของตัวเอง: หนึ่งรายทำจบพร้อมตัวเลขการเงิน อีกหนึ่งรายทำไม่จบ
const save=(body)=>fetch(BASE+'/api/assessments',{method:'POST',
  headers:{'Content-Type':'application/json',Origin:BASE},body:JSON.stringify(body)});
const SID='uidetail-'+Date.now();
await save({sessionKey:SID,name:'ต่อ ทดสอบ',shop:'ร้านมีตัวเลขครบ',contact:'081-234-5678',
  email:`uid${Date.now()}@example.com`,shopType:'buffet',branches:'2',age:'2-5 ปี',province:'นครราชสีมา',mode:'deep',consent:true});
await save({sessionKey:SID,completed:true,total:64,tier:'WARM',typeName:'The Craftsman · ของดีมีคนรัก',
  scores:{D1:60,D2:58,D3:71,D4:64,D5:67},answers:[1,2,3],intent:['need_supplier'],
  financial:{revenue:875000,cogs:320000,labor:180000,rent:90000,other:88000,days:26,
    estimated:false,primePct:57.1,netPct:22.0,foodPct:36.6,rev:875000,net:197000}});
await save({sessionKey:'uipartial-'+Date.now(),name:'คนทำไม่จบ',shop:'ร้านออกกลางคัน',
  contact:'089-000-1111',shopType:'drinks',mode:'deep',consent:true});

const b=await puppeteer.launch({executablePath:process.env.CHROME_PATH||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox','--disable-gpu']});
const p=await b.newPage(); await p.setViewport({width:1400,height:1000});
const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
p.on('console',m=>{if(m.type()==='error'&&!m.text().includes('Failed to load resource'))errs.push(m.text());});

await p.goto(BASE+'/admin',{waitUntil:'networkidle0'});
await p.type('#pw','local-admin-pass'); await p.click('#go');
await p.waitForSelector('table',{timeout:10000});

t('แถวตารางกดได้ (cursor เป็นมือ)',
  await p.$eval('tbody tr',e=>getComputedStyle(e).cursor==='pointer'));

// หาแถวที่ทำจบ (มีคะแนน) แล้วกด
await p.evaluate(()=>{
  const tr=[...document.querySelectorAll('tbody tr')].find(r=>r.textContent.includes('ร้านมีตัวเลขครบ'));
  tr.click();
});
await p.waitForSelector('.sheet .sheet-head',{timeout:8000});
t('เปิดแผงรายละเอียดได้', await p.$('.sheet')!==null);

const txt=await p.$eval('.sheet',e=>e.textContent);
t('มีหัวข้อติดต่อ',txt.includes('ติดต่อ'));
t('มีผลประเมิน',txt.includes('ผลประเมิน'));
t('มีคะแนน 5 มิติ', await p.$$eval('.dimrow',r=>r.length)===5, await p.$$eval('.dimrow',r=>r.length)+' แถว');
t('มีบล็อกข้อมูลร้าน',txt.includes('ข้อมูลร้าน'));
// HOT/WARM/NURTURE ไม่บอกคนที่นั่งไล่โทรว่าต้องทำอะไร จึงแสดงเป็นคำสั่งงานภาษาไทย
t('ป้ายระดับเป็นภาษาไทย',/ติดต่อก่อน|ติดตามต่อ|ยังไม่พร้อม/.test(txt),txt.match(/HOT|WARM|NURTURE/)?.[0]||'');
t('ไม่เหลือรหัสอังกฤษให้คนอ่านเดา',!/HOT|WARM|NURTURE/.test(txt));
t('รหัสเดิมยังดูได้จาก tooltip',
  await p.$eval('.sheet .tier',e=>['HOT','WARM','NURTURE'].includes(e.getAttribute('title'))).catch(()=>false));
t('ในตารางก็เป็นภาษาไทย',
  await p.$eval('tbody',e=>/ติดต่อก่อน|ติดตามต่อ|ยังไม่พร้อม/.test(e.textContent)&&!/\bHOT\b|\bWARM\b|\bNURTURE\b/.test(e.textContent)));
t('แผงรายละเอียดบอกจังหวัด',txt.includes('นครราชสีมา'));
t('ในตารางก็เห็นจังหวัดโดยไม่ต้องเปิดแผง',
  await p.$eval('tbody',e=>e.textContent.includes('นครราชสีมา')));
t('มีตัวเลขการเงินเป็นบาท',/฿[\d,]+/.test(txt),txt.match(/฿[\d,]+/g)?.slice(0,3).join(' '));
t('มี Prime cost',txt.includes('Prime cost'));
t('เบอร์โทรกดโทรออกได้', await p.$eval('.sheet',e=>!!e.querySelector('a[href^="tel:"]')));
t('อีเมลกดส่งเมลได้', await p.$eval('.sheet',e=>!!e.querySelector('a[href^="mailto:"]')));
await p.screenshot({path:new URL('./screenshot-detail.png',import.meta.url).pathname});

// ปิดด้วย Esc
await p.keyboard.press('Escape');
await new Promise(r=>setTimeout(r,400));
t('กด Esc แล้วปิด', await p.$('.sheet')===null);

// เปิดแถวที่ทำไม่จบ
const partial=await p.evaluate(()=>{
  const tr=[...document.querySelectorAll('tbody tr')].find(r=>r.textContent.includes('ร้านออกกลางคัน'));
  if(!tr) return false; tr.click(); return true;});
if(partial){
  await p.waitForSelector('.sheet .sheet-head',{timeout:8000});
  const s=await p.$eval('.sheet',e=>e.textContent);
  t('แถวที่ทำไม่จบก็เปิดดูได้',true);
  t('บอกว่ายังไม่มีคะแนน',s.includes('ทำไม่จบ')||s.includes('ไม่มีคะแนน'),s.slice(0,60));
  await p.screenshot({path:new URL('./screenshot-detail-partial.png',import.meta.url).pathname});
}else t('หาแถวทำไม่จบไม่เจอ',false);

t('ไม่มี JS error',errs.length===0,errs.slice(0,2).join(' | '));
console.log(`\n${ok} ผ่าน · ${bad} ไม่ผ่าน`);
await b.close(); process.exit(bad?1:0);
