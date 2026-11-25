# Telegram orqali telefon tasdiqlash

1. [BotFather](https://t.me/BotFather) orqali LexiMind uchun alohida bot yarating.
2. Backend sirlariga `TELEGRAM_BOT_TOKEN` yoki `TG_BOT_API_KEY`, `TELEGRAM_BOT_USERNAME` (boshida `@` belgisisiz) va `TELEGRAM_WEBHOOK_SECRET` ni kiriting. Sirni `node -p "require('node:crypto').randomBytes(32).toString('hex')"` yordamida yarating. Token va sirni backend muhitida saqlang.
3. Migratsiya qo‘llangan backend HTTPS orqali ishlagach, backend papkasida `TELEGRAM_WEBHOOK_ORIGIN` ga backendning to‘liq origin qiymatini berib `node scripts/register-telegram-webhook.cjs` ni ishga tushiring. Buyruq botning joriy webhook manzilini yangilaydi.
4. LexiMind profilida telefon bosqichini oching. Raqam kiriting, botni oching va raqamni ulashing. Bitta ko‘k tugma kontaktni ulashadi. Kod kelgach, yashil «Kodni nusxalash» tugmasidan foydalaning va kodni LexiMind’ga kiriting.

Bot Telegram yangilanishlarini grammY orqali webhook’dan qabul qiladi. Mahalliy backend uchun ochiq HTTPS manzili kerak. Ishlayotgan botning webhook manzilini boshqa xizmat bilan bo‘lishmaslik uchun alohida bot ishlating.

Havola 10 daqiqada tugaydi. Har bir so‘rovga 5 ta xato urinish beriladi. Kod faqat Telegram akkauntining o‘ziga tegishli raqam LexiMind’dagi raqam bilan mos kelganda yuboriladi. Raqam akkaunt sozlamalarida almashtirilsa, tasdiq bekor qilinadi. Ko‘cha va uy tafsilotlari faqat akkaunt egasiga ko‘rinadi.

[Telegram bot hujjati](https://core.telegram.org/bots/api#keyboardbutton)
