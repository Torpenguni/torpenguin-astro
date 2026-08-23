import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const B='http://127.0.0.1:8788', EMAIL=`c3${Date.now()}@penguinx.co`, PW='a-good-long-password-55';
const br=await puppeteer.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage'],
  executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const p=await br.newPage(); await p.setViewport({width:390,height:844,deviceScaleFactor:3});
const vis=()=>p.$eval('.screen.active',e=>e.id);
const click=async f=>{const h=await p.evaluateHandle(x=>[...document.querySelectorAll('[onclick]')].find(e=>e.getAttribute('onclick').includes(x)&&e.offsetParent!==null),f);await h.asElement().click();};
await p.goto(B+'/account?mode=signup',{waitUntil:'networkidle0'});
await p.type('#email',EMAIL);await p.type('#password',PW);await p.type('#password2',PW);await p.click('#go');
await p.waitForFunction(()=>document.getElementById('msg').className.includes('ok'),{timeout:15000});
const mail=JSON.parse(fs.readFileSync('tests/mailbox.json','utf8'));
await p.goto((mail.filter(m=>(m.to||'').includes(EMAIL)).pop().text.match(/http:\/\/\S*\/api\/auth\/verify\?token=\S+/)||[])[0],{waitUntil:'networkidle0'});
await p.goto(B+'/',{waitUntil:'networkidle0'}); await new Promise(r=>setTimeout(r,600));
await click("chooseMode('quick')");
await p.waitForFunction(()=>document.querySelector('.screen.active').id==='s-register');
await p.type('#r_name','ต่อ');await p.type('#r_shop','ชาบู');await p.type('#r_contact','0891234567');
await p.click('#r_consent');await click('startQuiz()');
await p.waitForFunction(()=>document.querySelector('.screen.active').id==='s-quiz');
for(let g=0;g<60&&(await vis())==='s-quiz';g++){
  for(let i=0;i<12;i++){ if(!(await p.$eval('#qNext',e=>e.disabled)))break;
    const ok=await p.evaluate(()=>{const b=[...document.querySelectorAll('#qBody button')].filter(x=>x.offsetParent!==null&&!x.className.includes('calc')&&!x.classList.contains('sel'));if(!b.length)return false;b[Math.min(1,b.length-1)].click();return true;});
    if(!ok)break;await new Promise(r=>setTimeout(r,20));}
  await p.click('#qNext');await new Promise(r=>setTimeout(r,35));}
await p.evaluate(()=>document.querySelectorAll('#intentChips button')[0].click());
await click('finishQuick()');
await p.waitForFunction(()=>document.querySelector('.screen.active').id==='s-quickresult',{timeout:8000});
const done=await p.evaluate(()=>state.answers.filter(a=>a&&a.v!=null).length);
await click('continueToDeep()'); await new Promise(r=>setTimeout(r,500));
console.log(`ตอบไปแล้วก่อนต่อยอด : ${done} ข้อ`);
console.log('เหลือให้ตอบ        :', await p.evaluate(()=>state.order.length), 'ข้อ');
console.log('ทุกข้อในลำดับยังไม่เคยตอบ:', await p.evaluate(()=>state.order.every(i=>!(state.answers[i]&&state.answers[i].v!=null))));
console.log('ตัวนับบนหน้าจอ      :', await p.$eval('#qCount',e=>e.textContent));
console.log('ข้อความบอก         :', await p.$eval('#qCarried',e=>e.textContent));
const bb=await (await p.$('#s-quiz .wrap')).boundingBox();
await p.screenshot({path:'/tmp/carried.png',clip:{x:0,y:Math.max(0,bb.y-10),width:390,height:420}});
// เดินต่อจนจบ ต้องได้รายงานเต็มและคำตอบครบ 47
for(let g=0;g<80&&(await vis())==='s-quiz';g++){
  for(let i=0;i<12;i++){ if(!(await p.$eval('#qNext',e=>e.disabled)))break;
    const ok=await p.evaluate(()=>{const b=[...document.querySelectorAll('#qBody button')].filter(x=>x.offsetParent!==null&&!x.className.includes('calc')&&!x.classList.contains('sel'));if(!b.length)return false;b[Math.min(1,b.length-1)].click();return true;});
    if(!ok)break;await new Promise(r=>setTimeout(r,15));}
  await p.click('#qNext');await new Promise(r=>setTimeout(r,25));}
console.log('\nเดินจนจบ → อยู่หน้า :', await vis());
console.log('คำตอบรวมทั้งหมด     :', await p.evaluate(()=>state.answers.filter(a=>a&&a.v!=null).length), 'ข้อ');
await br.close();
