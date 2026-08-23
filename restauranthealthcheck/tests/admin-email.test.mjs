import fs from 'node:fs';
const BASE='http://127.0.0.1:8788';
let pass=0, failed=0;
const t=(n,c,x='')=>{c?(pass++,console.log('  ok   '+n)):(failed++,console.log('  FAIL '+n+(x?' — '+x:'')));};
const mail=()=>{try{return JSON.parse(fs.readFileSync(new URL('./mailbox.json', import.meta.url),'utf8'))}catch{return[]}};
const lastTo=(to)=>[...mail()].reverse().find(m=>m.to===to);

async function call(p,{method='GET',body,cookie,raw=false}={}){
  const res=await fetch(BASE+p,{method,redirect:'manual',
    headers:{Origin:BASE,...(body?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})},
    body:body?JSON.stringify(body):undefined});
  if(raw){const b=Buffer.from(await res.arrayBuffer());
    return {status:res.status,text:b.toString('utf8'),bytes:b,headers:res.headers};}
  let data=null; try{data=await res.json()}catch{}
  const sc=res.headers.get('set-cookie');
  return {status:res.status,data,cookie:sc?sc.split(';')[0]:null,headers:res.headers};
}

console.log('\n— เมลสรุปผลหลังทำแบบประเมินเสร็จ —');
const EMAIL=`res${Date.now()}@example.com`;
const sid='s-'+Date.now();
let r=await call('/api/assessments',{method:'POST',body:{sessionKey:sid,email:EMAIL,name:'ต่อ',
  shop:'ร้านชาบูหัวมุม',contact:'0812345678',shopType:'buffet',province:'สุราษฎร์ธานี',mode:'deep',consent:true}});
t('partial save ok',r.status===200);
t('no result mail yet (ยังทำไม่จบ)', !lastTo(EMAIL));

r=await call('/api/assessments',{method:'POST',body:{sessionKey:sid,completed:true,total:72,
  typeCode:'TSMG',typeName:'The Operator · รันด้วยระบบ',tier:'HOT',
  scores:{D1:70,D2:64,D3:80,D4:71,D5:75}}});
t('completion save ok',r.status===200);
let m=lastTo(EMAIL);
t('result email sent',!!m);
t('subject shows the score',/72\/100/.test(m?.subject||''),m?.subject);
t('shop name in body',/ร้านชาบูหัวมุม/.test(m?.text||''));
t('all five dimensions listed',['ตัวเจ้าของ','สุขภาพการเงิน','แบรนด์','ระบบ','ความพร้อมขยาย']
  .every(k=>(m?.text||'').includes(k)));
t('has html and text',!!m?.html&&!!m?.text);

const count=mail().filter(x=>x.to===EMAIL).length;
await call('/api/assessments',{method:'POST',body:{sessionKey:sid,completed:true,total:72,
  scores:{D1:70,D2:64,D3:80,D4:71,D5:75}}});
t('saving again does not re-send', mail().filter(x=>x.to===EMAIL).length===count);

console.log('\n— หลังบ้าน —');
r=await call('/api/admin/leads');
t('leads locked without login',r.status===401);
r=await call('/api/admin/export',{raw:true});
t('export locked without login',r.status===401);

r=await call('/api/admin/login',{method:'POST',body:{password:'wrong'}});
t('wrong admin password rejected',r.status===401);

r=await call('/api/admin/login',{method:'POST',body:{password:'local-admin-pass'}});
t('correct admin password accepted',r.status===200,JSON.stringify(r.data));
const admin=r.cookie;
t('admin cookie set',/^rhc_admin=/.test(admin||''));

r=await call('/api/admin/leads',{cookie:admin});
t('leads listed',r.status===200&&Array.isArray(r.data?.leads));
t('รายการลีดพกจังหวัดมาด้วย',(r.data.leads||[]).some(l=>l.province==='สุราษฎร์ธานี'));
t('มีลิสต์จังหวัดไว้ทำตัวกรอง',(r.data.provinces||[]).includes('สุราษฎร์ธานี'),JSON.stringify(r.data.provinces));
{const f=await call('/api/admin/leads?province='+encodeURIComponent('สุราษฎร์ธานี'),{cookie:admin});
 t('กรองตามจังหวัดได้',f.status===200&&(f.data.leads||[]).length>0&&(f.data.leads||[]).every(l=>l.province==='สุราษฎร์ธานี'));
 const g=await call('/api/admin/leads?province='+encodeURIComponent('แม่ฮ่องสอน'),{cookie:admin});
 t('กรองจังหวัดที่ไม่มีลีดได้ผลว่าง',g.status===200&&(g.data.leads||[]).length===0);}
t('stats present',r.data?.stats?.total>0,JSON.stringify(r.data?.stats));
t('completion count > 0',r.data?.stats?.completed>0);
t('HOT counted',r.data?.stats?.hot>0);
t('shop type list present',Array.isArray(r.data?.shopTypes)&&r.data.shopTypes.includes('buffet'));
const found=r.data.leads.find(l=>l.email===EMAIL);
t('our lead is in the list',!!found);
t('lead carries score + tier',found?.total===72&&found?.tier==='HOT');
t('lead flagged as emailed',found?.resultEmailed===true);

console.log('\n— ตัวกรอง —');
r=await call('/api/admin/leads?tier=HOT',{cookie:admin});
t('tier filter returns only HOT',r.data.leads.every(l=>l.tier==='HOT'));
r=await call('/api/admin/leads?q=ชาบูหัวมุม',{cookie:admin});
t('thai search works',r.data.leads.some(l=>l.email===EMAIL),JSON.stringify(r.data.total));
r=await call('/api/admin/leads?status=partial',{cookie:admin});
t('partial filter excludes finished ones',r.data.leads.every(l=>!l.completed));
r=await call('/api/admin/leads?tier=NOPE',{cookie:admin});
t('bogus tier is ignored, not an error',r.status===200);

// SQLite ปฏิเสธ LIKE pattern ที่ยาวเกิน 50 ไบต์ ภาษาไทยตัวละ 3 ไบต์
// ชื่อร้านไทยแค่ ~17 ตัวอักษรก็เกินแล้ว เคยทำให้หลังบ้าน 500 ทั้งหน้า
const longThai='ร้านทดสอบชื่อยาวมากจนเกินขีดจำกัดของฐานข้อมูลแน่นอนเลยครับ';
r=await call('/api/admin/leads?q='+encodeURIComponent(longThai),{cookie:admin});
t('ค้นหาชื่อไทยยาว ๆ ไม่ทำให้พัง',r.status===200,`got ${r.status}`);
r=await call('/api/admin/export?q='+encodeURIComponent(longThai),{cookie:admin,raw:true});
t('export CSV ด้วยคำค้นยาว ๆ ก็ไม่พัง',r.status===200,`got ${r.status}`);

console.log('\n— CSV —');
r=await call('/api/admin/export',{cookie:admin,raw:true});
t('csv returns 200',r.status===200);
t('is a download',/attachment; filename="leads-/.test(r.headers.get('content-disposition')||''));
t('utf-8 content type',/charset=utf-8/.test(r.headers.get('content-type')||''));
t('starts with BOM (Excel ภาษาไทยไม่เพี้ยน)',r.bytes[0]===0xEF&&r.bytes[1]===0xBB&&r.bytes[2]===0xBF);
t('declares the separator for Excel',r.text.replace(/^\uFEFF/,'').startsWith('sep=,'));
t('thai headers present',/ชื่อร้าน/.test(r.text)&&/คะแนนรวม/.test(r.text));
// ทีม CP แบ่งพื้นที่กันดูแล จังหวัดจึงต้องติดไปกับไฟล์ที่เอาไปแบ่งงานกันจริง
t('CSV มีคอลัมน์จังหวัด',/จังหวัด/.test(r.text));
// ไฟล์นี้ทีมขายเปิดอ่านเอง ไม่ใช่ระบบอ่าน รหัส HOT/WARM/NURTURE จึงต้องแปลแล้ว
t('CSV แปลระดับความสำคัญเป็นไทย',/ความสำคัญ/.test(r.text)&&/ติดต่อก่อน/.test(r.text));
t('CSV ไม่เหลือรหัสอังกฤษ',!/\bHOT\b|\bWARM\b|\bNURTURE\b/.test(r.text));
t('CSV มีจังหวัดของแถวเรา',r.text.includes('สุราษฎร์ธานี'));
t('our row is in the csv',r.text.includes('ร้านชาบูหัวมุม')&&r.text.includes(EMAIL));
t('dimension columns exported',/70/.test(r.text)&&/64/.test(r.text));
const csvRows=r.text.trim().split('\r\n');
t('csv is crlf-delimited',csvRows.length>2);

r=await call('/api/admin/export?tier=NURTURE',{cookie:admin,raw:true});
t('csv respects the filter',!r.text.includes('ร้านชาบูหัวมุม'));

console.log('\n— ออกจากระบบหลังบ้าน —');
r=await call('/api/admin/logout',{method:'POST',cookie:admin,body:{}});
t('admin logout ok',r.status===200);
r=await call('/api/admin/leads',{cookie:admin});
t('admin session dead after logout',r.status===401);

console.log('\n— หน้าเว็บ —');
for (const [p,needle] of [['/privacy','นโยบายความเป็นส่วนตัว'],['/admin','หลังบ้าน'],['/account','เข้าสู่ระบบ']]) {
  const res=await fetch(BASE+p); const html=await res.text();
  t(`${p} serves`,res.status===200&&html.includes(needle));
}
const idx=await (await fetch(BASE+'/')).text();
t('privacy link is on the consent line',idx.includes('href="/privacy"'));
t('no prototype alert left',!idx.includes("alert('Prototype"));

console.log(`\n${pass} passed, ${failed} failed`);
process.exit(failed?1:0);
