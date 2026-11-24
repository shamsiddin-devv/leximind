# Texnik yo‘riqnoma

LexiMind yangiliklari «Yangiliklar» tanlovini yoqqan akkauntlarning ilova ichidagi bildirishnomalar ro‘yxatiga tushadi. Xabar e’lon qilish uchun bazaga yozish huquqiga ega operator backend katalogidan buyruq ishga tushiradi.

Xabarni UTF-8 formatidagi JSON faylga yozing.

```json
{
  "slug": "noyabr-yangiliklari",
  "title": "Yangi mashqlar",
  "body": "Bugundan boshlab yangi tinglash mashqlarini sinab ko‘rishingiz mumkin."
}
```

```sh
npm run db:news -- patches/news.json
npm run db:news -- patches/news.json --apply
```

Birinchi buyruq xabar matni, holati va kimlar obuna bo‘lganining umumiy sonini ko‘rsatadi. Ikkinchi buyruq tasdiqlangan xabarni e’lon qiladi. Shu slug bilan takror ishga tushirish qo‘shimcha bildirishnoma yaratmaydi. Tahrirlangan e’lon uchun yangi slug ishlating. Obunachilar bo‘lmasa, slug e’lon qilingan deb belgilanmaydi.
