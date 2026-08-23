// Transactional email via Resend.
//
// Every message goes out as HTML *and* plain text: some Thai mail clients and
// most spam filters want the text part, and a mail with only HTML scores worse.

const BRAND = '#C8102E';

async function sendMail(env, { to, subject, html, text }) {
  const key = env.RESEND_API_KEY;
  const from = env.MAIL_FROM;
  if (!key || !from) {
    // Fail loudly in the log but never break the user's flow — signing up
    // still succeeds, the person just has to ask for the mail again.
    console.error('[email] RESEND_API_KEY or MAIL_FROM is not set — mail not sent to', to);
    return { ok: false };
  }

  // A mail outage must never take the caller down with it: an unreachable
  // provider would otherwise throw here and turn "save my assessment" into a
  // 500, losing the lead over an email we could have retried. Every failure
  // — refused connection, DNS, timeout, 4xx, 5xx — comes back as ok:false.
  let res;
  try {
    // Overridable so a local or staging run can point at a mail catcher
    // instead of sending real mail to real people.
    res = await fetch(env.RESEND_API_URL || 'https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to, subject, html, text }),
      signal: AbortSignal.timeout(10000),
    });
  } catch (e) {
    console.error('[email] could not reach the mail provider:', e && e.message ? e.message : e);
    return { ok: false };
  }

  if (!res.ok) {
    console.error('[email] resend failed', res.status, await res.text().catch(() => ''));
    return { ok: false };
  }
  return { ok: true };
}

function layout(bodyHtml) {
  return `<!doctype html><html lang="th"><body style="margin:0;padding:0;background:#FAF7F2">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FAF7F2;padding:28px 12px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border-radius:14px;border:1px solid #ece5da">
<tr><td style="height:6px;background:${BRAND};border-radius:14px 14px 0 0"></td></tr>
<tr><td style="padding:30px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:16px;line-height:1.7;color:#17140F">
<div style="font-weight:700;font-size:15px;margin-bottom:22px;color:#17140F">PenguinX <span style="color:#8a8077;font-weight:400">·</span> Restaurant Health Check</div>
${bodyHtml}
</td></tr>
<tr><td style="padding:0 28px 26px;font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:12px;line-height:1.6;color:#8a8077">
อีเมลนี้ส่งจาก restauranthealthcheck.com · ดำเนินการโดย บริษัท เพนกวินเอ็กซ์ จำกัด<br>สอบถามเรื่องข้อมูลส่วนบุคคล: <a href="mailto:tor@penguinx.co" style="color:#8a8077">tor@penguinx.co</a>
</td></tr>
</table></td></tr></table></body></html>`;
}

function button(href, label) {
  return `<div style="margin:26px 0">
<a href="${href}" style="display:inline-block;background:${BRAND};color:#fff;text-decoration:none;padding:14px 26px;border-radius:11px;font-weight:700;font-size:16px">${label}</a>
</div>
<div style="font-size:13px;color:#8a8077;line-height:1.6;word-break:break-all">
ถ้าปุ่มกดไม่ได้ ก๊อปลิงก์นี้ไปวางในเบราว์เซอร์:<br>${href}
</div>`;
}

export function sendVerifyEmail(env, to, link) {
  return sendMail(env, {
    to,
    subject: 'ยืนยันอีเมลของคุณ · Restaurant Health Check',
    html: layout(
      `<p style="margin:0 0 4px">สวัสดีครับ</p>
<p style="margin:0">กดปุ่มด้านล่างเพื่อยืนยันอีเมล แล้วเข้าใช้งานบัญชีของคุณได้เลย</p>
${button(link, 'ยืนยันอีเมล')}
<p style="margin:24px 0 0;font-size:14px;color:#5c554c">ลิงก์นี้ใช้ได้ภายใน 24 ชั่วโมง และใช้ได้ครั้งเดียว<br>
ถ้าคุณไม่ได้สมัครใช้งาน ไม่ต้องทำอะไรครับ</p>`,
    ),
    text: `ยืนยันอีเมลของคุณ · Restaurant Health Check

กดลิงก์นี้เพื่อยืนยันอีเมล:
${link}

ลิงก์ใช้ได้ภายใน 24 ชั่วโมง และใช้ได้ครั้งเดียว
ถ้าคุณไม่ได้สมัครใช้งาน ไม่ต้องทำอะไรครับ`,
  });
}

export function sendResetEmail(env, to, link) {
  return sendMail(env, {
    to,
    subject: 'ตั้งรหัสผ่านใหม่ · Restaurant Health Check',
    html: layout(
      `<p style="margin:0">เราได้รับคำขอตั้งรหัสผ่านใหม่สำหรับบัญชีนี้ กดปุ่มด้านล่างเพื่อตั้งรหัสใหม่</p>
${button(link, 'ตั้งรหัสผ่านใหม่')}
<p style="margin:24px 0 0;font-size:14px;color:#5c554c">ลิงก์นี้ใช้ได้ภายใน 30 นาที และใช้ได้ครั้งเดียว<br>
<b>ถ้าคุณไม่ได้เป็นคนขอ</b> ไม่ต้องทำอะไรครับ รหัสผ่านเดิมยังใช้ได้ตามปกติ</p>`,
    ),
    text: `ตั้งรหัสผ่านใหม่ · Restaurant Health Check

กดลิงก์นี้เพื่อตั้งรหัสผ่านใหม่:
${link}

ลิงก์ใช้ได้ภายใน 30 นาที และใช้ได้ครั้งเดียว
ถ้าคุณไม่ได้เป็นคนขอ ไม่ต้องทำอะไรครับ รหัสผ่านเดิมยังใช้ได้ตามปกติ`,
  });
}

// Sent when someone tries to sign up with an address that already has an
// account. The signup endpoint answers identically either way, so this mail is
// what keeps the flow honest without telling a stranger who is registered.
export function sendAccountExistsEmail(env, to, loginLink, resetLink) {
  return sendMail(env, {
    to,
    subject: 'อีเมลนี้มีบัญชีอยู่แล้ว · Restaurant Health Check',
    html: layout(
      `<p style="margin:0">มีคนพยายามสมัครบัญชีใหม่ด้วยอีเมลนี้ แต่อีเมลนี้มีบัญชีอยู่แล้ว</p>
<p style="margin:16px 0 0">ถ้าเป็นคุณเอง เข้าสู่ระบบได้เลย หรือถ้าจำรหัสผ่านไม่ได้ก็ตั้งรหัสใหม่ได้</p>
${button(loginLink, 'เข้าสู่ระบบ')}
<p style="margin:20px 0 0;font-size:14px;color:#5c554c">ลืมรหัสผ่าน? ตั้งรหัสใหม่ที่นี่:<br>
<a href="${resetLink}" style="color:${BRAND}">${resetLink}</a></p>`,
    ),
    text: `อีเมลนี้มีบัญชีอยู่แล้ว · Restaurant Health Check

มีคนพยายามสมัครบัญชีใหม่ด้วยอีเมลนี้ แต่อีเมลนี้มีบัญชีอยู่แล้ว

เข้าสู่ระบบ: ${loginLink}
ลืมรหัสผ่าน: ${resetLink}`,
  });
}

export function sendPasswordChangedEmail(env, to, resetLink) {
  return sendMail(env, {
    to,
    subject: 'รหัสผ่านของคุณถูกเปลี่ยนแล้ว · Restaurant Health Check',
    html: layout(
      `<p style="margin:0">รหัสผ่านของบัญชีนี้ถูกเปลี่ยนเรียบร้อยแล้ว และอุปกรณ์ที่เคยเข้าสู่ระบบไว้ถูกให้ออกจากระบบทั้งหมด</p>
<p style="margin:18px 0 0;font-size:14px;color:#5c554c"><b>ถ้าคุณไม่ได้เป็นคนเปลี่ยน</b> ให้ตั้งรหัสผ่านใหม่ทันทีที่
<a href="${resetLink}" style="color:${BRAND}">${resetLink}</a></p>`,
    ),
    text: `รหัสผ่านของคุณถูกเปลี่ยนแล้ว · Restaurant Health Check

รหัสผ่านของบัญชีนี้ถูกเปลี่ยนเรียบร้อยแล้ว และอุปกรณ์ที่เคยเข้าสู่ระบบไว้ถูกให้ออกจากระบบทั้งหมด

ถ้าคุณไม่ได้เป็นคนเปลี่ยน ให้ตั้งรหัสผ่านใหม่ทันทีที่:
${resetLink}`,
  });
}

const DIM_LABEL = {
  D1: 'ตัวเจ้าของ & ผู้นำ',
  D2: 'สุขภาพการเงิน',
  D3: 'แบรนด์ & การตลาด',
  D4: 'ระบบ & ทีม',
  D5: 'ความพร้อมขยาย',
};

const TIER_LINE = {
  HOT: 'ร้านคุณอยู่ในกลุ่มที่พร้อมขยาย',
  WARM: 'ร้านคุณมีฐานที่ดี แต่ยังมีจุดต้องเสริมก่อนเร่งโต',
  NURTURE: 'ตอนนี้โฟกัสที่การวางรากฐานก่อนขยาย',
};

// Summary of a finished assessment. The full report lives on the site — this
// mail is the number, the five dimensions, and a way back in.

// ── ส่วนประกอบของอีเมลสรุปผล ─────────────────────────────────────────────
// เนื้อหาทั้งหมดในนี้มาจาก report ที่เบราว์เซอร์ถอดมาจากรายงานที่ผู้ใช้เห็นจริง
// ฝั่งเซิร์ฟเวอร์ไม่ได้คำนวณอะไรใหม่เลย จะได้ไม่มีสูตรสองชุดที่ค่อย ๆ เพี้ยนจากกัน
// ทุกฟังก์ชันต้องทนกับ report ที่เป็น null หรือมีไม่ครบ (แถวเก่า/รายงานที่วาดไม่สำเร็จ)
const H2 = 'margin:30px 0 10px;font-size:13px;font-weight:700;letter-spacing:.06em;color:#8a8077;text-transform:uppercase';
const CELL = 'padding:8px 6px;font-size:14px;border-bottom:1px solid #f0ebe3';

function statusColor(text) {
  const t = String(text || '');
  if (/ในเกณฑ์/.test(t)) return '#1F9D57';
  if (/วิกฤต|เกินเกณฑ์/.test(t)) return '#C8102E';
  if (/เริ่มสูง|ต่ำกว่าเกณฑ์|พอใช้/.test(t)) return '#E08A00';
  return '#5c554c';
}

// ข้อความที่มีการขึ้นบรรทัดโดยตั้งใจ (บทสรุปผู้บริหาร, ก้าวต่อไป) ต้องคง
// การขึ้นบรรทัดนั้นไว้ใน HTML ด้วย ไม่งั้นสองย่อหน้าจะกลายเป็นก้อนเดียวติดกัน
function paragraphs(text) {
  return escapeHtml(text).split('\n').join('<br>');
}

function section(title, inner) {
  return inner ? `<div style="${H2}">${escapeHtml(title)}</div>${inner}` : '';
}

function execHtml(rep) {
  if (!rep || !rep.exec) return '';
  return section('บทสรุปผู้บริหาร',
    `<p style="margin:0;font-size:15px;line-height:1.75;color:#3b352d">${paragraphs(rep.exec)}</p>`);
}

function finHtml(rep) {
  if (!rep || (!rep.finHead && !(rep.finRows || []).length)) return '';
  const head = rep.finHead
    ? `<div style="background:#17140F;color:#fff;border-radius:11px;padding:14px 16px;font-size:14.5px;line-height:1.6">${escapeHtml(rep.finHead)}</div>`
    : '';
  const note = rep.finEstimated
    ? `<p style="margin:10px 0 0;font-size:13px;line-height:1.6;color:#8a5a00;background:#FFF8E6;border:1px solid #F3DDB5;border-radius:9px;padding:10px 12px">⚠️ ตัวเลขต้นทุนด้านล่างเป็นค่าประมาณที่ระบบเติมให้ ไม่ใช่ตัวเลขจริงของร้านคุณ</p>`
    : '';
  const rows = (rep.finRows || []).map((cells) => {
    const [name, you, target, status, gap] = cells;
    return `<tr>
<td style="${CELL};color:#3b352d;font-weight:600">${escapeHtml(name)}</td>
<td style="${CELL};text-align:right;color:#17140F">${escapeHtml(you)}</td>
<td style="${CELL};text-align:right;color:#8a8077">${escapeHtml(target)}</td>
<td style="${CELL};text-align:right;font-weight:600;color:${statusColor(status)}">${escapeHtml(status)}</td>
<td style="${CELL};text-align:right;color:#C8102E;font-size:13px">${escapeHtml(gap || '')}</td>
</tr>`;
  }).join('');
  const table = rows
    ? `<table style="width:100%;border-collapse:collapse;margin-top:14px">
<tr><th style="${CELL};text-align:left;font-size:12px;color:#8a8077;font-weight:600">รายการ</th>
<th style="${CELL};text-align:right;font-size:12px;color:#8a8077;font-weight:600">ของคุณ</th>
<th style="${CELL};text-align:right;font-size:12px;color:#8a8077;font-weight:600">เกณฑ์</th>
<th style="${CELL};text-align:right;font-size:12px;color:#8a8077;font-weight:600">สถานะ</th>
<th style="${CELL};text-align:right;font-size:12px;color:#8a8077;font-weight:600">กำไรที่เสีย</th></tr>
${rows}</table>`
    : '';
  const profile = rep.finProfile
    ? `<p style="margin:10px 0 0;font-size:12.5px;color:#8a8077">เกณฑ์อ้างอิงสำหรับ: ${escapeHtml(rep.finProfile)}</p>`
    : '';
  return section('วิเคราะห์การเงินจริง · เทียบเกณฑ์ PenguinX', head + note + table + profile);
}

function listHtml(title, items) {
  if (!items || !items.length) return '';
  return section(title, `<ul style="margin:0;padding-left:20px;font-size:14.5px;line-height:1.7;color:#3b352d">${
    items.map((x) => `<li style="margin-bottom:6px">${escapeHtml(x)}</li>`).join('')}</ul>`);
}

function dimsHtml(rep) {
  if (!rep || !(rep.dims || []).length) return '';
  return section('เจาะลึกราย 5 มิติ · ต้องทำอะไรต่อ', (rep.dims).map((d) => `
<div style="border:1px solid #ece5da;border-radius:11px;padding:14px 15px;margin-bottom:10px">
  <div style="font-weight:700;font-size:15px;color:#17140F">${escapeHtml(d.label)}${
    d.score ? ` <span style="font-weight:600;font-size:13px;color:#8a8077">· ${escapeHtml(d.score)}</span>` : ''}</div>
  ${d.diag ? `<p style="margin:7px 0 0;font-size:14px;line-height:1.65;color:#5c554c">${escapeHtml(d.diag)}</p>` : ''}
  ${(d.todo || []).length ? `<ul style="margin:8px 0 0;padding-left:20px;font-size:13.5px;line-height:1.65;color:#3b352d">${
    d.todo.map((x) => `<li>${escapeHtml(x)}</li>`).join('')}</ul>` : ''}
</div>`).join(''));
}

function notesHtml(rep) {
  if (!rep || !(rep.notes || []).length) return '';
  return section('เจาะลึกตามสาเหตุที่คุณระบุ · ต้องแก้ตรงไหน', (rep.notes).map((n) => `
<div style="border-left:3px solid #E08A00;background:#FFFBF3;border-radius:0 10px 10px 0;padding:12px 14px;margin-bottom:10px">
  <div style="font-size:14px;font-weight:600;color:#17140F;line-height:1.6">${escapeHtml(n.cause)}</div>
  ${n.lead ? `<p style="margin:7px 0 0;font-size:13.5px;color:#5c554c;line-height:1.65">${escapeHtml(n.lead)}</p>` : ''}
  ${(n.todo || []).length ? `<ul style="margin:7px 0 0;padding-left:20px;font-size:13.5px;line-height:1.65;color:#3b352d">${
    n.todo.map((x) => `<li>${escapeHtml(x)}</li>`).join('')}</ul>` : ''}
  ${(n.tags || []).length ? `<div style="margin-top:8px;font-size:12px;color:#8a8077">${
    n.tags.map((x) => escapeHtml(x)).join(' · ')}</div>` : ''}
</div>`).join(''));
}

function planHtml(rep) {
  if (!rep || !(rep.plan || []).length) return '';
  return section('แผนปฏิบัติ 90 วัน · ทำทีละเฟส', (rep.plan).map((p) => `
<div style="border:1px solid #ece5da;border-radius:11px;overflow:hidden;margin-bottom:12px">
  <div style="background:#FAF7F2;padding:11px 15px">
    <div style="font-weight:700;font-size:14.5px;color:#17140F">${escapeHtml(p.month)}</div>
    ${p.goal ? `<div style="font-size:12.5px;color:#8a8077;margin-top:2px">${escapeHtml(p.goal)}</div>` : ''}
  </div>
  <div style="padding:12px 15px">${(p.actions || []).map((a) => `
    <div style="margin-bottom:10px">
      <div style="font-weight:600;font-size:14px;color:#17140F">${escapeHtml(a.what)}</div>
      ${(a.weeks || []).length ? `<ul style="margin:6px 0 0;padding-left:20px;font-size:13.5px;line-height:1.65;color:#5c554c">${
        a.weeks.map((w) => `<li>${escapeHtml(w)}</li>`).join('')}</ul>` : ''}
      ${a.measure ? `<div style="margin-top:6px;font-size:13px;color:#1F9D57">${escapeHtml(a.measure)}</div>` : ''}
    </div>`).join('')}</div>
</div>`).join(''));
}

function dragHtml(rep) {
  if (!rep || !(rep.drags || []).length) return '';
  return section('3 คำตอบที่ฉุดคะแนนคุณมากที่สุด', (rep.drags).map((d) => `
<div style="border-left:3px solid #C8102E;background:#FDF6F7;border-radius:0 9px 9px 0;padding:10px 13px;margin-bottom:8px">
  <div style="font-size:14px;font-weight:600;color:#17140F">${escapeHtml(d.q)}</div>
  ${d.ans ? `<div style="font-size:13px;color:#5c554c;margin-top:3px">${escapeHtml(d.ans)}</div>` : ''}
</div>`).join(''));
}

function benchHtml(rep) {
  if (!rep || (!(rep.bench || []).length && !rep.prime)) return '';
  const prime = rep.prime
    ? `<div style="background:#17140F;color:#fff;border-radius:11px;padding:13px 15px;font-size:14.5px;margin-bottom:12px">${escapeHtml(rep.prime)}</div>`
    : '';
  const rows = (rep.bench || []).map((b) => `<tr>
<td style="${CELL};color:#3b352d">${escapeHtml(b.label)}</td>
<td style="${CELL};text-align:right;color:#8a8077;font-size:13px">${escapeHtml(b.target)}</td>
<td style="${CELL};text-align:right;font-weight:600;color:${statusColor(b.status)}">${escapeHtml(b.status)}</td>
</tr>`).join('');
  return section('เทียบมาตรฐานต้นทุน · PenguinX',
    prime + (rows ? `<table style="width:100%;border-collapse:collapse">${rows}</table>` : ''));
}

// ฉบับข้อความล้วน — โปรแกรมอ่านเมลบางตัวและตัวกรองสแปมอ่านเฉพาะส่วนนี้
function reportText(rep) {
  if (!rep) return '';
  const out = [];
  const head = (t) => out.push('', '── ' + t + ' ──');
  if (rep.exec) { head('บทสรุปผู้บริหาร'); out.push(rep.exec); }
  if (rep.finHead || (rep.finRows || []).length) {
    head('วิเคราะห์การเงินจริง · เทียบเกณฑ์ PenguinX');
    if (rep.finHead) out.push(rep.finHead);
    if (rep.finEstimated) out.push('(ตัวเลขต้นทุนเป็นค่าประมาณที่ระบบเติมให้ ไม่ใช่ตัวเลขจริงของร้าน)');
    (rep.finRows || []).forEach(([n, you, target, status, gap]) => {
      out.push(`  ${n}: ${you} (เกณฑ์ ${target}) — ${status}${gap ? ' · ' + gap : ''}`);
    });
    if (rep.finProfile) out.push(`  เกณฑ์อ้างอิงสำหรับ: ${rep.finProfile}`);
  }
  if (rep.prime || (rep.bench || []).length) {
    head('เทียบมาตรฐานต้นทุน');
    if (rep.prime) out.push(rep.prime);
    (rep.bench || []).forEach((b) => out.push(`  ${b.label} · ${b.target} — ${b.status}`));
  }
  if ((rep.syn || []).length) { head('ข้อมูลเชิงลึกที่เชื่อมโยงกัน'); (rep.syn).forEach((x) => out.push('  • ' + x)); }
  if ((rep.dims || []).length) {
    head('เจาะลึกราย 5 มิติ · ต้องทำอะไรต่อ');
    (rep.dims).forEach((d) => {
      out.push(`  ${d.label}${d.score ? ' · ' + d.score : ''}`);
      if (d.diag) out.push('    ' + d.diag);
      (d.todo || []).forEach((x) => out.push('    - ' + x));
    });
  }
  if ((rep.drags || []).length) {
    head('3 คำตอบที่ฉุดคะแนนคุณมากที่สุด');
    (rep.drags).forEach((d) => out.push(`  • ${d.q}${d.ans ? ' — ' + d.ans : ''}`));
  }
  if ((rep.plan || []).length) {
    head('แผนปฏิบัติ 90 วัน');
    (rep.plan).forEach((p) => {
      out.push(`  ${p.month}${p.goal ? ' — ' + p.goal : ''}`);
      (p.actions || []).forEach((a) => {
        out.push('    ' + a.what);
        (a.weeks || []).forEach((w) => out.push('      - ' + w));
        if (a.measure) out.push('      ' + a.measure);
      });
    });
  }
  if ((rep.notes || []).length) {
    head('เจาะลึกตามสาเหตุที่คุณระบุ · ต้องแก้ตรงไหน');
    (rep.notes).forEach((n) => {
      out.push('  • ' + n.cause);
      if (n.lead) out.push('    ' + n.lead);
      (n.todo || []).forEach((x) => out.push('    - ' + x));
      if ((n.tags || []).length) out.push('    ' + n.tags.join(' · '));
    });
  }
  if (rep.next) { head('ก้าวต่อไป'); out.push(rep.next); }
  return out.join('\n');
}

export function sendResultEmail(env, to, r) {
  const rows = Object.keys(DIM_LABEL)
    .filter((k) => r.scores && r.scores[k] != null)
    .map((k) => {
      const v = Math.round(r.scores[k]);
      const color = v >= 60 ? '#1F9D57' : v >= 40 ? '#E08A00' : '#C8102E';
      return `<tr>
<td style="padding:7px 0;font-size:15px;color:#5c554c">${DIM_LABEL[k]}</td>
<td style="padding:7px 0;text-align:right;font-weight:700;font-size:15px;color:${color}">${v}<span style="color:#8a8077;font-weight:400">/100</span></td>
</tr>`;
    })
    .join('');

  const textRows = Object.keys(DIM_LABEL)
    .filter((k) => r.scores && r.scores[k] != null)
    .map((k) => `  ${DIM_LABEL[k]}: ${Math.round(r.scores[k])}/100`)
    .join('\n');

  // ชื่อร้านส่วนใหญ่ขึ้นต้นด้วยคำว่า "ร้าน" อยู่แล้ว เติมซ้ำจะได้ "ร้านร้าน…"
  const shop = r.shop ? (/^ร้าน/.test(r.shop.trim()) ? r.shop.trim() : `ร้าน${r.shop}`) : 'ร้านของคุณ';
  // รายงานฉบับเต็มมีเฉพาะโหมดละเอียดที่วาดรายงานสำเร็จ ที่เหลือได้อีเมลแบบเดิม
  const rep = r.report && typeof r.report === 'object' ? r.report : null;
  const link = r.reportUrl || `${r.site}/account`;

  return sendMail(env, {
    to,
    subject: `ผลตรวจสุขภาพร้าน: ${r.total}/100 · Restaurant Health Check`,
    html: layout(
      `<p style="margin:0 0 6px">สรุปผลตรวจสุขภาพธุรกิจของ<b>${escapeHtml(shop)}</b></p>
<div style="margin:22px 0;padding:22px;background:#FAF7F2;border-radius:13px;text-align:center">
  <div style="font-size:13px;color:#8a8077;letter-spacing:.12em;font-weight:600">ดัชนีสุขภาพร้าน</div>
  <div style="font-size:46px;font-weight:700;line-height:1.15;color:#17140F;margin:4px 0">${r.total}<span style="font-size:19px;color:#8a8077">/100</span></div>
  ${r.typeName ? `<div style="font-size:15px;color:#5c554c;font-weight:600">${escapeHtml(r.typeName)}</div>` : ''}
</div>
<table style="width:100%;border-collapse:collapse">${rows}</table>
<p style="margin:22px 0 0;font-size:15px;color:#5c554c">${TIER_LINE[r.tier] || ''}</p>
${execHtml(rep)}
${finHtml(rep)}
${benchHtml(rep)}
${listHtml('ข้อมูลเชิงลึกที่เชื่อมโยงกัน', rep && rep.syn)}
${dimsHtml(rep)}
${dragHtml(rep)}
${planHtml(rep)}
${notesHtml(rep)}
${rep && rep.next ? section('ก้าวต่อไป',
  `<p style="margin:0;font-size:15px;line-height:1.75;color:#3b352d">${paragraphs(rep.next)}</p>`) : ''}
${button(link, 'เปิดรายงานฉบับเต็มบนเว็บ')}
<p style="margin:22px 0 0;font-size:14px;color:#5c554c">
${r.reportUrl
  ? 'ลิงก์ด้านบนเปิดรายงานฉบับเต็มแบบเดียวกับที่คุณเห็นบนเว็บ พร้อมกราฟและปุ่มบันทึกเป็น PDF — ต้องเข้าสู่ระบบด้วยอีเมลนี้ก่อน'
  : 'ถ้ายังไม่ได้สมัครบัญชี สมัครด้วยอีเมลนี้แล้วผลประเมินจะผูกกับบัญชีให้อัตโนมัติ กลับมาดูย้อนหลังได้ทุกเมื่อ'}</p>`,
    ),
    text: `สรุปผลตรวจสุขภาพธุรกิจของ${shop}

ดัชนีสุขภาพร้าน: ${r.total}/100${r.typeName ? `\nประเภทร้าน: ${r.typeName}` : ''}

${textRows}

${TIER_LINE[r.tier] || ''}
${reportText(rep)}

เปิดรายงานฉบับเต็มบนเว็บ: ${link}

${r.reportUrl
  ? 'ลิงก์ด้านบนเปิดรายงานฉบับเต็มแบบเดียวกับที่คุณเห็นบนเว็บ พร้อมกราฟและปุ่มบันทึกเป็น PDF — ต้องเข้าสู่ระบบด้วยอีเมลนี้ก่อน'
  : 'ถ้ายังไม่ได้สมัครบัญชี สมัครด้วยอีเมลนี้แล้วผลประเมินจะผูกกับบัญชีให้อัตโนมัติ'}`,
  });
}

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
