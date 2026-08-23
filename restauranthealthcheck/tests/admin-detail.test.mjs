const BASE='http://127.0.0.1:8788';
let ok=0,bad=0; const t=(n,c,x='')=>{c?(ok++,console.log('  ok   '+n)):(bad++,console.log('  FAIL '+n+(x?' — '+x:'')));};

// ชุดนี้สร้างข้อมูลของตัวเอง ไม่พึ่งว่าชุดก่อนหน้าทิ้งอะไรไว้
// (ถ้าพึ่ง พอสลับลำดับชุดทดสอบก็พังทันที)
const save=(body)=>fetch(BASE+'/api/assessments',{method:'POST',
  headers:{'Content-Type':'application/json',Origin:BASE},body:JSON.stringify(body)});
const SID='detail-'+Date.now();
await save({sessionKey:SID,name:'ต่อ ทดสอบ',shop:'ร้านทดสอบรายละเอียด',contact:'081-234-5678',
  email:`detail${Date.now()}@example.com`,shopType:'buffet',branches:'2',age:'2-5 ปี',
  mode:'deep',consent:true});
await save({sessionKey:SID,completed:true,total:64,tier:'WARM',typeName:'The Craftsman · ของดีมีคนรัก',
  scores:{D1:60,D2:58,D3:71,D4:64,D5:67},answers:[1,2,3,4,5],
  intent:['need_supplier','need_capital'],
  financial:{revenue:875000,cogs:320000,labor:180000,rent:90000,other:88000,days:26,
    covers:null,avgBill:250,estimated:false,primePct:57.1,netPct:22.0,foodPct:36.6,
    rev:875000,net:197000}});

const login=await fetch(BASE+'/api/admin/login',{method:'POST',
  headers:{'Content-Type':'application/json',Origin:BASE},
  body:JSON.stringify({password:'local-admin-pass'})});
const raw=login.headers.get('set-cookie');
if(!raw){console.error('เข้าหลังบ้านไม่ได้:',login.status,await login.text());process.exit(1);}
const cookie=raw.split(';')[0];
const H={Cookie:cookie,Origin:BASE};

const leads=(await (await fetch(BASE+'/api/admin/leads?q=ร้านทดสอบรายละเอียด',{headers:H})).json()).leads;
const done=leads.find(l=>l.completed);
t('เจอ lead ที่ชุดนี้สร้างไว้',!!done);

// สิทธิ์
let r=await fetch(BASE+'/api/admin/lead?id='+done.id,{headers:{Origin:BASE}});
t('ไม่ล็อกอินเปิดดูไม่ได้',r.status===401);
r=await fetch(BASE+'/api/admin/lead',{headers:H});
t('ไม่ส่ง id → 400',r.status===400);
r=await fetch(BASE+'/api/admin/lead?id=ไม่มีจริง',{headers:H});
t('id มั่ว → 404',r.status===404);

r=await fetch(BASE+'/api/admin/lead?id='+done.id,{headers:H});
const d=(await r.json()).lead;
t('ดึงรายละเอียดได้',r.status===200&&!!d);
t('มีข้อมูลติดต่อครบ',!!d.name&&!!d.contact,JSON.stringify({n:d.name,c:d.contact}));
t('มีคะแนน 5 มิติ',d.scores&&['D1','D2','D3','D4','D5'].every(k=>d.scores[k]!=null));
t('มีคำตอบรายข้อ',Array.isArray(d.answers)&&d.answers.length>0,`${d.answers?.length} ข้อ`);
t('มีสิ่งที่สนใจ',Array.isArray(d.intent)&&d.intent.includes('need_supplier'),JSON.stringify(d.intent));
t('มีเวลายินยอม PDPA',!!d.consentAt);
t('มีเวลาที่ส่งเมลผล',!!d.resultEmailedAt);

console.log('\n  — ข้อมูลการเงินแบบใหม่ —');
const f=d.financial;
t('มีข้อมูลการเงิน',!!f,JSON.stringify(f||{}).slice(0,80));
t('เก็บยอดขายเป็นตัวเลขบาท',f&&typeof f.revenue==='number',`revenue=${f?.revenue}`);
t('เก็บต้นทุนอาหารเป็นบาท',f&&typeof f.cogs==='number',`cogs=${f?.cogs}`);
t('เก็บค่าแรงเป็นบาท',f&&typeof f.labor==='number',`labor=${f?.labor}`);
t('เก็บค่าเช่าเป็นบาท',f&&typeof f.rent==='number',`rent=${f?.rent}`);
t('ยังเก็บ % สรุปไว้เหมือนเดิม',f&&f.primePct!=null&&f.netPct!=null,`prime=${f?.primePct} net=${f?.netPct}`);
t('มีธงบอกว่าเป็นค่าประมาณหรือตัวเลขจริง',f&&typeof f.estimated==='boolean',`estimated=${f?.estimated}`);

console.log('\n  — ลบลีด —');
{
  const del=(id,opts={})=>fetch(`${BASE}/api/admin/lead?id=${encodeURIComponent(id)}`,
    {method:'DELETE',headers:{Origin:opts.origin||BASE,...(opts.noCookie?{}:{Cookie:cookie})}});

  // ห้ามใครที่ไม่ได้ล็อกอินหลังบ้านลบข้อมูลของลูกค้าได้เด็ดขาด
  t('ไม่ได้ล็อกอินหลังบ้าน ลบไม่ได้',(await del(d.id,{noCookie:true})).status===401);
  // และห้ามเว็บอื่นยิงข้ามมาลบผ่านเบราว์เซอร์ของแอดมินที่ล็อกอินค้างอยู่
  t('ยิงข้ามเว็บมาลบไม่ได้',(await del(d.id,{origin:'https://evil.example'})).status===403);
  t('ไม่ระบุ id ตอบ 400',(await fetch(BASE+'/api/admin/lead',{method:'DELETE',
    headers:{Origin:BASE,Cookie:cookie}})).status===400);
  t('id ที่ไม่มีจริง ตอบ 404',(await del('ไม่มีจริงแน่นอน')).status===404);

  // ลบแล้วต้องหายจริง ทั้งจากรายละเอียดและจากรายการ
  const before=await (await fetch(`${BASE}/api/admin/leads?q=${encodeURIComponent('ร้านทดสอบรายละเอียด')}`,
    {headers:{Cookie:cookie,Origin:BASE}})).json();
  t('ก่อนลบ ยังหาเจอในรายการ',(before.leads||[]).some(x=>x.id===d.id));

  const res=await del(d.id);
  const body=await res.json();
  t('ลบสำเร็จ',res.status===200&&body.ok===true,JSON.stringify(body));
  t('บอกกลับมาว่าลบร้านไหนไป',body.shop==='ร้านทดสอบรายละเอียด',body.shop);
  t('เปิดรายละเอียดอีกครั้งไม่เจอแล้ว',
    (await fetch(`${BASE}/api/admin/lead?id=${d.id}`,{headers:{Cookie:cookie,Origin:BASE}})).status===404);
  const after=await (await fetch(`${BASE}/api/admin/leads?q=${encodeURIComponent('ร้านทดสอบรายละเอียด')}`,
    {headers:{Cookie:cookie,Origin:BASE}})).json();
  t('หายจากรายการแล้ว',!(after.leads||[]).some(x=>x.id===d.id));
  t('ลบซ้ำอีกครั้งตอบ 404 ไม่ใช่พัง',(await del(d.id)).status===404);
}

console.log(`\n${ok} ผ่าน · ${bad} ไม่ผ่าน`);
process.exit(bad?1:0);
