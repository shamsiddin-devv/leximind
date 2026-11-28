import type { AccountEmailKind } from '../../application/use-cases/user/AccountActions';

const copy = {
  register: {
    title: 'Ro‘yxatdan o‘tishni yakunlang',
    subject: 'LexiMind ro‘yxatdan o‘tish kodi',
    instruction:
      'Hisobingizni yaratish uchun kodni LexiMind ro‘yxatdan o‘tish sahifasiga kiriting.',
    action: 'Ro‘yxatdan o‘tish',
  },
  verify_email: {
    title: 'Email manzilingizni tasdiqlang',
    subject: 'LexiMind email manzilini tasdiqlash',
    instruction:
      'LexiMind akkauntingizni tasdiqlash uchun quyidagi kodni ilovaga kiriting.',
    action: 'Emailni tasdiqlash',
  },
  reset_password: {
    title: 'Parolingizni tiklang',
    subject: 'LexiMind parolini tiklash',
    instruction:
      'Yangi parol o‘rnatish uchun quyidagi kodni tiklash sahifasiga kiriting.',
    action: 'Parolni tiklash',
  },
} satisfies Record<
  AccountEmailKind,
  Record<'title' | 'subject' | 'instruction' | 'action', string>
>;

const ignore =
  'Bu so‘rovni siz yubormagan bo‘lsangiz, xatga e’tibor bermasangiz bo‘ladi.';
const expires = 'Kod so‘rov yuborilgan vaqtdan boshlab 10 daqiqa amal qiladi.';

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function accountActionEmail(
  kind: AccountEmailKind,
  code: string | undefined,
  actionUrl: URL | null,
) {
  const { title, subject, instruction, action } = copy[kind];
  const text = [
    title,
    code && instruction,
    code && `Bir martalik kod: ${code}\n${expires}`,
    actionUrl && `${action}: ${actionUrl}`,
    ignore,
  ]
    .filter(Boolean)
    .join('\n\n');

  const html = `<!doctype html>
<html lang="uz">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${subject}</title></head>
<body style="margin:0;padding:0;background-color:#f5f4fb;color:#17172c;font-family:Arial,Helvetica,sans-serif">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#f5f4fb">
    <tr><td align="center" style="padding:32px 16px">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#ffffff" style="max-width:520px;border:1px solid #e5e1f2;border-radius:20px;text-align:left">
        <tr><td style="padding:24px 28px 20px;border-bottom:1px solid #eae6f4">
          <span style="font-size:25px;font-weight:bold;letter-spacing:-1px;color:#17172c">Lexi<span style="color:#5048d9">Mind</span></span>
        </td></tr>
        <tr><td style="padding:26px 28px 28px">
          <h1 style="margin:0 0 12px;font-size:26px;line-height:1.2;color:#17172c">${title}</h1>
          ${
            code
              ? `<p style="margin:0 0 22px;font-size:16px;line-height:1.5;color:#4e4a65">${instruction}</p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#eeebff" style="border:1px solid #dbd3ff;border-radius:14px">
            <tr><td align="center" style="padding:18px 10px;color:#392e9b">
              <p style="margin:0 0 9px;font-size:13px;font-weight:bold;line-height:1.3">Bir martalik kod</p>
              <p dir="ltr" style="margin:0;font-family:Consolas,monospace;font-size:32px;line-height:1.2;font-weight:bold;letter-spacing:5px">${escapeHtml(code)}</p>
            </td></tr>
          </table>
          <p style="margin:12px 0 0;font-size:14px;line-height:1.5;color:#4e4a65">${expires}</p>`
              : ''
          }
          ${
            actionUrl
              ? `<table role="presentation" cellspacing="0" cellpadding="0" style="margin-top:22px">
            <tr><td bgcolor="#5048d9" style="border-radius:10px">
              <a href="${escapeHtml(actionUrl.href)}" style="display:inline-block;padding:13px 18px;color:#ffffff;font-size:15px;font-weight:bold;text-decoration:none">${action}</a>
            </td></tr>
          </table>`
              : ''
          }
        </td></tr>
        <tr><td style="padding:18px 28px 22px;border-top:1px solid #eae6f4;font-size:14px;line-height:1.5;color:#4e4a65">${ignore}</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  return { subject, text, html };
}
