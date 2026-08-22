// Transactional email via Resend.
//
// Every message goes out as HTML *and* plain text: some Thai mail clients and
// most spam filters want the text part, and a mail with only HTML scores worse.

const BRAND = '#C8102E';

async function send(env, { to, subject, html, text }) {
  const key = env.RESEND_API_KEY;
  const from = env.MAIL_FROM;
  if (!key || !from) {
    // Fail loudly in the log but never break the user's flow — signing up
    // still succeeds, the person just has to ask for the mail again.
    console.error('[email] RESEND_API_KEY or MAIL_FROM is not set — mail not sent to', to);
    return { ok: false };
  }

  // Overridable so a local or staging run can point at a mail catcher instead
  // of sending real mail to real people.
  const res = await fetch(env.RESEND_API_URL || 'https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, subject, html, text }),
  });

  if (!res.ok) {
    console.error('[email] resend failed', res.status, await res.text());
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
อีเมลนี้ส่งจาก restauranthealthcheck.com · ดำเนินการโดย PenguinX ร่วมกับ CP
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
  return send(env, {
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
  return send(env, {
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
  return send(env, {
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
  return send(env, {
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
