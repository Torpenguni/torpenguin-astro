import { ACCESS_CODE } from './access.mjs';
// Regression: when the mail provider is unreachable, the user's work must
// still be saved, and the account flows must still answer normally.
const BASE='http://127.0.0.1:8788';
// The interesting assertions only hold while the mail provider is unreachable.
const mailUp=await fetch('http://127.0.0.1:8025/emails',{method:'POST',body:'{}'})
  .then(()=>true).catch(()=>false);
console.log(mailUp?'(mail catcher กำลังทำงาน — ข้ามข้อที่ต้องให้เมลล่ม)':'(mail catcher ปิดอยู่ — ทดสอบกรณีเมลล่มได้เต็ม)');
let pass=0,failed=0;
const t=(n,c,x='')=>{c?(pass++,console.log('  ok   '+n)):(failed++,console.log('  FAIL '+n+(x?' — '+x:'')));};
const call=async(p,b)=>{if(b&&p.startsWith('/api/assessments'))b={accessCode:ACCESS_CODE,...b};
  const r=await fetch(BASE+p,{method:b?'POST':'GET',
  headers:{Origin:BASE,...(b?{'Content-Type':'application/json'}:{})},body:b?JSON.stringify(b):undefined});
  let d=null;try{d=await r.json()}catch{} return {status:r.status,data:d};};

console.log('\n— ผู้ให้บริการอีเมลล่ม (mail catcher ปิดอยู่) —');
const sid='outage-'+Date.now(), email=`outage${Date.now()}@example.com`;
let r=await call('/api/assessments',{sessionKey:sid,email,name:'ต่อ',shop:'ร้านทดสอบ',
  contact:'0812345678',shopType:'buffet',mode:'deep',consent:true});
t('บันทึกตอนลงทะเบียนได้',r.status===200,`got ${r.status}`);

r=await call('/api/assessments',{sessionKey:sid,completed:true,total:64,tier:'WARM',
  typeName:'ทดสอบ',scores:{D1:60,D2:64,D3:70,D4:62,D5:66}});
t('บันทึกตอนทำจบได้ ทั้งที่ส่งเมลไม่ได้',r.status===200,`got ${r.status} ${JSON.stringify(r.data)}`);

r=await call('/api/auth/signup',{email:`s${Date.now()}@example.com`,password:'test-password-1'});
t('สมัครใช้งานยังตอบปกติ',r.status===200,`got ${r.status}`);

r=await call('/api/auth/forgot',{email});
t('ลืมรหัสผ่านยังตอบปกติ',r.status===200,`got ${r.status}`);

// ปุ่ม "ให้ทีม CP ติดต่อกลับ" ยิงเมลแจ้งทีมด้วย ถ้าเมลล่มแล้วปุ่มพัง เจ้าของร้าน
// จะเห็นข้อความผิดพลาดทั้งที่คำขอของเขาถูกบันทึกไปแล้ว — เสียลีดเพราะเรื่องที่
// ไม่เกี่ยวกับเขาเลย
r=await call('/api/contact-request',{sessionKey:sid});
t('กดขอให้ติดต่อกลับได้ ทั้งที่ส่งเมลแจ้งทีมไม่ได้',r.status===200&&r.data&&r.data.ok===true,
  `got ${r.status} ${JSON.stringify(r.data)}`);
{
  const chk=await call(`/api/admin/leads?q=${encodeURIComponent('ร้านทดสอบ')}`);
  // ไม่ได้ล็อกอินหลังบ้านจึงอ่านไม่ได้ แค่ยืนยันว่า endpoint ไม่พังไปด้วย
  t('หลังบ้านยังตอบปกติระหว่างเมลล่ม',chk.status===401,`got ${chk.status}`);
}

console.log('\n— เมลค้างไว้ให้ส่งใหม่ได้ —');
const admin=await fetch(BASE+'/api/admin/login',{method:'POST',
  headers:{'Content-Type':'application/json',Origin:BASE},body:JSON.stringify({password:'local-admin-pass'})});
const cookie=admin.headers.get('set-cookie').split(';')[0];
const leads=await (await fetch(BASE+'/api/admin/leads?q='+encodeURIComponent(email),
  {headers:{Cookie:cookie,Origin:BASE}})).json();
const lead=leads.leads.find(l=>l.email===email);
t('lead ถูกเก็บครบ',!!lead&&lead.total===64,JSON.stringify(lead||{}).slice(0,120));
if(!mailUp) t('ยังไม่ถูกมาร์กว่าส่งเมลแล้ว → ส่งใหม่ได้',lead&&lead.resultEmailed===false);
else t('ส่งเมลได้ตามปกติเมื่อผู้ให้บริการกลับมา',lead&&lead.resultEmailed===true);

console.log(`\n${pass} passed, ${failed} failed`);
process.exit(failed?1:0);
