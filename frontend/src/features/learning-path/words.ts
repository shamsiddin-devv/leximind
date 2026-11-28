import type { Sentence } from './course';

type Form = { text: string; change?: string; explanation: string };
type ShortForm = { full: string; short: string; use: string };

export type Word = {
  id: string;
  original: string;
  translation: string;
  role: string;
  explanation: string;
  example: Sentence;
  aliases?: readonly string[];
  stem?: string;
  forms?: readonly Form[];
  contractions?: readonly ShortForm[];
  language?: string;
};

const entries: Word[] = [];
type Detail = Pick<Word, 'aliases' | 'stem' | 'forms' | 'contractions' | 'language'>;
const form = (text: string, explanation: string, change?: string): Form => ({ text, change, explanation });
const short = (full: string, short: string, use: string): ShortForm => ({ full, short, use });

function word(id: string, original: string, translation: string, role: string, explanation: string, example: Sentence, detail?: Detail) {
  entries.push({ id, original, translation, role, explanation, example, ...detail });
}

word('be', 'be', 'bo‘lmoq', 'Bog‘lovchi yoki yordamchi fe’l', 'Kasb, holat va joyni aytishda gapning ikki qismini bog‘laydi. -ing bilan ish davom etayotganini, written bilan esa ish kimga yoki nimaga qaratilganini ifodalaydi.', ['She is a student.', 'U talaba.'], {
  aliases: ['am', 'is', 'are', 'was', 'were', 'been', 'being'], forms: [
    form('I am', 'Hozirgi zamonda faqat I bilan am keladi.', 'am'), form('he / she / it is', 'Bitta shaxs yoki narsa bilan is keladi.', 'is'),
    form('you / we / they are', 'You, we va they bilan are keladi.', 'are'), form('I / he / she / it was', 'O‘tgan zamonda was ishlatiladi.', 'was'),
    form('you / we / they were', 'Bu olmoshlarning o‘tgan zamon shakli were.', 'were'), form('will be', 'Kelajakda will dan keyin be qoladi.', 'be'),
    form('have been', 'Have yoki has dan keyin been ishlatiladi.', 'been'), form('being', 'Fe’lning -ing shakli bo‘lib, davom etayotgan holatni ifodalashi mumkin.', 'ing'),
  ], contractions: [short('she is', 'she’s', 'Suhbatda is qisqarishi mumkin.'), short('they are', 'they’re', 'Suhbatda are qisqarishi mumkin.'), short('is not', 'isn’t', 'Inkorni og‘zaki nutqda qisqa ayting.')],
});
word('i-am', 'I am', 'men …man', 'Shaxs va holat', 'I so‘zi kim haqda gap ketayotganini, am esa kasb yoki holatni shu shaxsga bog‘laydi. Apostrof am dagi a tushirilgan joyni ko‘rsatadi.', ['I’m a teacher.', 'Men o‘qituvchiman.'], {
  aliases: ["i'm"], contractions: [short('I am', 'I’m', 'Suhbat va norasmiy yozishmada. Rasmiy matnda to‘liq shakl odatda mosroq.')],
});
word('work', 'work', 'ishlamoq', 'Harakat fe’li', 'Work ning o‘zagi work. -s ishni kim odatda qilishini, -ing ish davom etayotganini, -ed esa o‘tgan zamon yoki have bilan ishlatiladigan shaklni bildiradi.', ['She works at home.', 'U uyda ishlaydi.'], {
  stem: 'work', aliases: ['works', 'working', 'worked'], forms: [
    form('I work', '«Men ishlayman». I bilan o‘zak qoladi.'), form('He works', '«U (erkak) ishlaydi». He bilan -s qo‘shiladi.', 's'),
    form('She works', '«U (ayol) ishlaydi». Fe’l shakli he bilan bir xil.', 's'), form('I am working', '«Men ishlayapman». Am va -ing davomiy harakatni bildiradi.', 'ing'),
    form('I worked', '«Men ishladim». -ed o‘tgan zamonni bildiradi.', 'ed'), form('I have worked', '«Men ishlaganman». Have o‘tgan tajribani hozir bilan bog‘laydi.', 'have'),
    form('I will work', 'Kelajakni will bildiradi, fe’lga qo‘shimcha qo‘shilmaydi.', 'will'),
  ],
});
word('do-not', 'do not', '…mayman / …maydi', 'Inkor ifodasi', 'Oddiy hozirgi zamonda harakatni inkor qilish uchun do yoki does va not kerak. Does he, she va it bilan keladi. Ikki holatda ham asosiy fe’l work kabi asl shaklda turadi.', ['She doesn’t work at home.', 'U uyda ishlamaydi.'], {
  aliases: ["don't", "doesn't", "didn't"], contractions: [
    short('do not', 'don’t', 'I, you, we va they bilan, shuningdek inkor buyruqda.'),
    short('does not', 'doesn’t', 'He, she va it bilan.'), short('did not', 'didn’t', 'O‘tgan zamonda barcha shaxslar bilan.'),
  ],
});
word('i-am-working', 'I am working', 'men ishlayapman', 'Davom etayotgan harakat', 'I ishni kim qilayotganini bildiradi. Am shu shaxsga mos yordamchi fe’l, work harakatning ma’nosi, -ing esa harakat davom etayotganini ko‘rsatadi.', ['I am working now.', 'Men hozir ishlayapman.'], { stem: 'work', forms: [form('work → working', 'O‘zakka -ing qo‘shiladi.', 'ing')], contractions: [short('I am working', 'I’m working', 'Suhbatdagi ixcham shakl.')] });
word('i-have-worked', 'I have worked', 'men ishlaganman', 'Hozirga bog‘langan tajriba', 'I ish egasini, worked harakatni bildiradi. Have shu tajribani hozir bilan bog‘laydi. Worked dan oldin have kelgani uchun bu gap I worked bilan bir xil vazifani bajarmaydi.', ['I have worked here.', 'Men bu yerda ishlaganman.'], { stem: 'work', forms: [form('work → worked', 'Muntazam fe’lning uchinchi shakli -ed bilan yasaladi.', 'ed')], contractions: [short('I have worked', 'I’ve worked', 'Og‘zaki va norasmiy nutqda ishlatiladi.')] });
word('study', 'study', 'o‘qimoq, o‘rganmoq', 'Harakat fe’li', 'Undoshdan keyingi y oddiy hozirgi zamondagi -es va o‘tgan zamondagi -ed oldidan i ga o‘zgaradi. -ing oldidan y qoladi.', ['She studied yesterday.', 'U kecha o‘qidi.'], { stem: 'study', aliases: ['studies', 'studying', 'studied'], forms: [form('studies', 'He, she yoki it bilan ishlatiladi.', 'ies'), form('studied', 'O‘tgan zamon yoki have dan keyin ishlatiladi.', 'ied'), form('studying', 'Davom etayotgan ishda am, is yoki are bilan ishlatiladi.', 'ing')] });
word('have', 'have', 'ega bo‘lmoq', 'Asosiy yoki yordamchi fe’l', 'Have time birikmasida have «vaqti bor» degani. Have worked tuzilmasida have asosiy harakatga vaqt va tajriba ma’nosini qo‘shadi.', ['If I have time, I will study.', 'Agar vaqtim bo‘lsa, o‘qiyman.'], {
  aliases: ['has', 'had', 'having', "haven't", "hasn't"], forms: [form('she has', 'She bilan hozirgi zamonda has keladi.', 'has'), form('they had', 'Oddiy o‘tgan zamonda hamma shaxs uchun had ishlatiladi.', 'had'), form('had known', 'Had + uchinchi shakl boshqa o‘tgan voqeadan ilgari bo‘lgan ishni yoki tasavvurdagi o‘tmish shartini bildiradi.', 'had')],
  contractions: [short('have not', 'haven’t', 'I, you, we va they bilan.'), short('has not', 'hasn’t', 'He, she va it bilan.'), short('I have', 'I’ve', 'Have yordamchi bo‘lib kelganda tabiiy.')],
});
word('do', 'do', 'qilmoq', 'Asosiy yoki yordamchi fe’l', 'Yordamchi bo‘lganda o‘zbekchaga alohida tarjima qilinmaydi. Savol, inkor yoki urg‘uli so‘z tartibida zamon va shaxsni ko‘rsatadi.', ['Rarely does she work at home.', 'U uyda kamdan-kam ishlaydi.'], { aliases: ['does', 'did', 'done', 'doing'], forms: [form('does', 'Hozirgi zamonda he, she va it uchun.', 'es'), form('did', 'O‘tgan zamonda barcha shaxs uchun.', 'did'), form('done', 'Have yoki has dan keyin keladigan shakl.', 'done'), form('doing', 'Davom etayotgan ish uchun.', 'ing')] });
word('write', 'write', 'yozmoq', 'Noto‘g‘ri fe’l', 'O‘tgan shaklini yasashda oddiy -ed qo‘shilmaydi. Majhul gapda be ning mos shakli + written kerak.', ['The report was written yesterday.', 'Hisobot kecha yozildi.'], { aliases: ['writes', 'wrote', 'written', 'writing'], forms: [form('writes', 'Uchinchi shaxs birlikda -s qo‘shiladi.', 's'), form('wrote', 'Oddiy o‘tgan zamon.', 'wrote'), form('written', 'Be yoki have dan keyin kerak bo‘ladigan uchinchi shakl.', 'tten'), form('writing', 'Oxirgi e tushadi va -ing qo‘shiladi.', 'ing')] });
word('know', 'know', 'bilmoq', 'Noto‘g‘ri fe’l', 'O‘tmishda «bilgan» deganda knew, yordamchi had dan keyin known ishlatiladi. Know dagi k talaffuz qilinmaydi.', ['Had I known, I would have helped.', 'Bilganimda yordam bergan bo‘lardim.'], { aliases: ['knows', 'knew', 'known', 'knowing'], forms: [form('knows', 'He, she va it bilan.', 's'), form('knew', 'Oddiy o‘tgan zamon, -ed qo‘shilmaydi.', 'ew'), form('known', 'Have yoki had bilan keladigan uchinchi shakl.', 'n'), form('knowing', 'Bilish holatini boshqa gap qismiga bog‘lay oladi.', 'ing')] });
word('say', 'say', 'aytmoq', 'Noto‘g‘ri fe’l', 'Biror odamning gapini yetkazishda said bilan boshlash mumkin. Said ning yozilishi ham, talaffuzi ham say dan farq qiladi.', ['He said he was studying.', 'U o‘qiyotganini aytdi.'], { aliases: ['says', 'said', 'saying'], forms: [form('says', 'Uchinchi shaxs birlikda. Talaffuzi /sez/.', 's'), form('said', 'O‘tgan va uchinchi shakl. Talaffuzi /sed/.', 'id'), form('saying', 'Gapirish davom etayotganida ishlatiladi.', 'ing')] });
word('understand', 'understand', 'tushunmoq', 'Noto‘g‘ri fe’l', 'Did bilan asosiy understand shakli qo‘llanadi. Yordamchisiz o‘tgan zamonda understood ishlatiladi.', ['Only then did I understand.', 'Faqat shundagina tushundim.'], { aliases: ['understood', 'understands', 'understanding'], forms: [form('understands', 'He, she va it uchun.', 's'), form('understood', 'O‘tgan zamon va uchinchi shakl.', 'stood'), form('understanding', 'Ba’zi vaziyatlarda ot sifatida «tushuncha» degani.', 'ing')] });
word('would-you-mind', 'Would you mind helping me?', 'Menga yordam berishga qarshi emasmisiz?', 'Odobli iltimos', 'Would savol boshida muloyim ohang beradi. Mind dan keyin helping kabi -ing shakli keladi. «No, not at all» deb javob berilsa, odam yordamga qarshi emas.', ['Would you mind helping me?', 'Menga yordam berishga qarshi emasmisiz?']);

for (const [id, meaning, explanation, example, uz, aliases] of [
  ['i', 'men', 'So‘zlovchining o‘zini bildiradi, doimo katta I bilan yoziladi. To‘ldiruvchi shakli me, egalik shakli my.', 'I work at home.', 'Men uyda ishlayman.', ['me', 'my', 'mine']],
  ['you', 'sen yoki siz', 'Bir kishiga ham, bir necha kishiga ham ishlatiladi. Your egalikni bildiradi. You bilan are keladi.', 'Could you help me?', 'Menga yordam bera olasizmi?', ['your', 'yours']],
  ['he', 'u (erkak)', 'Gap kim haqida ekanini bildiradi. Him — harakat qaratilgan odam, his — egalik.', 'He works at home.', 'U uyda ishlaydi.', ['him', 'his']],
  ['she', 'u (ayol)', 'He kabi uchinchi shaxs birlik. Hozirgi odatlarda ikkalasi bilan ham works deyiladi. Her «uni» yoki «uning» ma’nosida keladi.', 'She is a student.', 'U talaba.', ['her', 'hers']],
  ['it', 'u / bu', 'Odatda narsa yoki vaziyatni anglatadi. It rains gapida it ob-havo ifodasini boshlaydi. Its egalikni bildiradi.', 'If it rains, we will work at home.', 'Agar yomg‘ir yog‘sa, uyda ishlaymiz.', ['its']],
  ['we', 'biz', 'So‘zlovchini ham o‘z ichiga olgan guruhni bildiradi. Us — to‘ldiruvchi, our — egalik shakli.', 'We work at home.', 'Biz uyda ishlaymiz.', ['us', 'our', 'ours']],
  ['they', 'ular', 'Bir nechta shaxs yoki narsani bildiradi. Jinsi noma’lum bitta odam uchun ham ishlatilishi mumkin. Them «ularni», their «ularning» degani.', 'They are working at home.', 'Ular uyda ishlayapti.', ['them', 'their', 'theirs']],
] as const) word(id, id === 'i' ? 'I' : id, meaning, 'Olmosh', explanation, [example, uz], { aliases });

word('a', 'a / an', 'bir', 'Noaniq artikl', 'Birinchi marta tilga olinayotgan yoki aniq ko‘rsatilmagan bitta sanaladigan ot oldidan ishlatiladi. Undosh tovushdan oldin a, unli tovushdan oldin an yoziladi.', ['I am a student.', 'Men talabaman.'], { aliases: ['a', 'an'], forms: [form('a student', 'Student undosh tovushdan boshlanadi.', 'a'), form('an English teacher', 'English unli tovushdan boshlanadi.', 'an')] });
word('the', 'the', 'o‘sha / ma’lum', 'Aniq artikl', 'Qaysi narsa nazarda tutilgani tushunarli bo‘lsa ishlatiladi. Birlik va ko‘plikda bir xil yoziladi. O‘zbek tilida alohida tarjima qilinmasligi mumkin.', ['The report was written yesterday.', 'Hisobot kecha yozildi.']);
word('at', 'at', '…da', 'Joy yoki vaqtni bildiruvchi so‘z', 'At home joyni, at that moment aniq vaqtni bildiradi. At dan keyingi so‘z nimani nazarda tutayotganingizni ko‘rsatadi.', ['I work at home.', 'Men uyda ishlayman.']);
word('if', 'if', 'agar', 'Shartni boshlovchi so‘z', 'Shart qismi if bilan boshlanadi. Ertangi ehtimolda if + hozirgi zamon ishlatiladi. O‘tgan, amalga oshmagan shartda if + had + uchinchi shakl ishlatiladi.', ['If I had known, I would have helped.', 'Agar bilganimda, yordam bergan bo‘lardim.']);
word('that', 'that', '…ligini / o‘sha', 'Gaplarni bog‘lovchi yoki ko‘rsatkich', 'Suggests that dan keyin qanday xulosa ilgari surilgani keladi. At that moment birikmasida that aynan o‘sha lahzani ko‘rsatadi.', ['It appears that the report is accurate.', 'Ko‘rinishidan, hisobot aniq.']);
word('not', 'not', '…emas / …ma', 'Inkor so‘zi', 'Yordamchi fe’ldan keyin keladi. Yordamchi vazifasidagi do, does, have kabi so‘zlar bilan n’t shakligacha qisqarishi mumkin.', ['I do not work at home.', 'Men uyda ishlamayman.']);
word('will', 'will', '…adi / …moqchi', 'Kelajak yordamchisi', 'Kelajakdagi harakat yoki natijani ifodalaydi. Keyingi fe’l work yoki be kabi asosiy shaklda qoladi.', ['I will work tomorrow.', 'Men ertaga ishlayman.'], { aliases: ["won't"], contractions: [short('I will', 'I’ll', 'So‘zlashuvda.'), short('will not', 'won’t', 'Inkorning maxsus qisqartmasi.')] });
word('would', 'would', '…ar edi', 'Faraz yoki muloyimlik yordamchisi', 'Farazdagi natijani, o‘tgan nutqda kelajakni yoki muloyim iltimosni ifodalaydi. Would have + uchinchi shakl o‘tgan, aslida yuz bermagan natijani bildiradi.', ['I would appreciate your help.', 'Yordamingizdan minnatdor bo‘lardim.'], { aliases: ["wouldn't"], contractions: [short('I would', 'I’d', 'I’d help birikmasida I’d — I would.'), short('would not', 'wouldn’t', 'Norasmiy inkor shakli.')] });
word('could', 'could', '…a olardi / …a olasizmi', 'Imkoniyat yordamchisi', 'O‘tgan qobiliyat yoki ehtimolni anglatishi mumkin. Savolda yordam so‘rashni muloyimlashtiradi. Keyingi fe’l help kabi asl shaklda turadi.', ['Could you help me?', 'Menga yordam bera olasizmi?'], { aliases: ["couldn't"], contractions: [short('could not', 'couldn’t', 'Inkorning qisqa shakli.')] });
word('may', 'may', 'mumkin', 'Ehtimol yoki ruxsat yordamchisi', 'Xulosa qat’iy bo‘lmasa, may orqali ehtimolni ayting. Undan keyin be yoki work kabi asosiy shakl ishlatiladi.', ['The report may be accurate.', 'Hisobot aniq bo‘lishi mumkin.']);
word('help', 'help', 'yordam bermoq / yordam', 'Fe’l yoki ot', 'Could you help me gapida harakat. Your help birikmasida «yordamingiz» degan ot. Mind dan keyin helping kerak.', ['Would you mind helping me?', 'Menga yordam berishga qarshi emasmisiz?'], { stem: 'help', aliases: ['helps', 'helped', 'helping'], forms: [form('helps', 'He, she va it bilan.', 's'), form('helped', 'O‘tgan va uchinchi shakl.', 'ed'), form('helping', 'Mind dan keyingi shakl.', 'ing')] });
for (const [id, meaning, explanation, ex, uz] of [
  ['rain', 'yomg‘ir yog‘moq', 'Ob-havoni aytishda it bilan ishlatiladi.', 'If it rains, we will work at home.', 'Agar yomg‘ir yog‘sa, uyda ishlaymiz.'],
  ['pass', 'imtihondan o‘tmoq', 'Imtihon haqida gapirilganda «muvaffaqiyatli topshirmoq» ma’nosida keladi.', 'Had she studied, she would have passed.', 'U o‘qiganida, imtihondan o‘tgan bo‘lardi.'],
  ['suggest', 'taklif qilmoq / ko‘rsatmoq', 'Dalil haqida gapirganda ehtimoliy xulosani bildiradi. That dan keyin shu xulosa bayon qilinadi.', 'The report suggests that it may work.', 'Hisobot bu ish berishi mumkinligini ko‘rsatadi.'],
  ['appear', 'ko‘rinmoq', 'It appears that birikmasi mavjud belgilardan kelib chiqqan fikrni kiritadi.', 'It appears that the report is accurate.', 'Ko‘rinishidan, hisobot aniq.'],
  ['mind', 'qarshi bo‘lmoq', 'Iltimosda Would you mind dan keyin helping kabi -ing shakli keladi.', 'Would you mind helping me?', 'Menga yordam berishga qarshi emasmisiz?'],
  ['appreciate', 'qadrlamoq', 'Would appreciate muloyim minnatdorlik bildiradi. Undan keyin your help kabi ot birikmasi kelishi mumkin.', 'I would appreciate your help.', 'Yordamingizdan minnatdor bo‘lardim.'],
] as const) {
  const endsInE = id.endsWith('e');
  const s = id.endsWith('ss') ? 'es' : 's';
  const ed = endsInE ? 'd' : 'ed';
  const ing = (endsInE ? id.slice(0, -1) : id) + 'ing';
  word(id, id, meaning, 'Harakat fe’li', explanation, [ex, uz], { stem: id, aliases: [id + s, id + ed, ing],
    forms: [form(id + s, 'He, she yoki it bilan oddiy hozirgi zamon.', s), form(id + ed, 'O‘tgan zamon yoki uchinchi shakl.', ed),
      form(ing, endsInE ? 'Oxirgi e tushadi va -ing qo‘shiladi.' : 'Davomiy yoki bog‘langan shakl uchun -ing qo‘shiladi.', 'ing')],
  });
}
for (const [id, meaning, explanation, ex, uz] of [
  ['student', 'talaba', 'Sanash mumkin. Bittasi a student, bir nechtasi students.', 'I am a student.', 'Men talabaman.'],
  ['teacher', 'o‘qituvchi', 'Teach «o‘qitmoq». -er ishni bajaruvchi odamni bildiradi.', 'I’m a teacher.', 'Men o‘qituvchiman.'],
  ['report', 'hisobot', 'Bitta hisobot report, bir nechtasi reports. The qaysi hisobot haqida so‘z ketayotganini anglatadi.', 'The reports were written at home.', 'Hisobotlar uyda yozildi.'],
  ['home', 'uy', 'At home «uyda» degani. Go home birikmasida esa home «uyga» ma’nosida, at ishlatilmaydi.', 'I work at home.', 'Men uyda ishlayman.'],
  ['time', 'vaqt', 'Have time birikmasida umumiy vaqtni bildiradi. A time yoki times boshqa vaziyatlarda «bir marotaba» yoki «marotabalar» degani bo‘lishi mumkin.', 'If I have time, I will study.', 'Agar vaqtim bo‘lsa, o‘qiyman.'],
  ['day', 'kun', 'Day sanaladigan ot. The following day oldingi gapda aytilgan kundan keyingisini bildiradi.', 'I will work the following day.', 'Keyingi kuni ishlayman.'],
  ['moment', 'lahza', 'At that moment aynan o‘sha lahzani bildiradi. Bitta lahza uchun moment, ko‘pligi moments.', 'He said he was studying at that moment.', 'U aynan o‘sha paytda o‘qiyotganini aytdi.'],
] as const) word(id, id, meaning, 'Ot', explanation, [ex, uz], { stem: id === 'teacher' ? 'teach' : id,
  aliases: [id + 's'], forms: [...(id === 'teacher' ? [form('teach → teacher', 'O‘qituvchi bo‘lgan shaxsni -er bildiradi.', 'er')] : []), form(id + 's', 'Sanaladigan otning ko‘plik shakli.', 's')],
});
word('english', 'English', 'ingliz tili / inglizcha', 'Til nomi yoki sifat', 'Til nomi ham, sifat ham bosh harf bilan boshlanadi. Study English birikmasida til nomidan oldin artikl kerak bo‘lmaydi.', ['She has studied English.', 'U ingliz tilini o‘rgangan.']);
word('accurate', 'accurate', 'aniq, to‘g‘ri', 'Sifat', 'Natija, raqam yoki hisobotdagi ma’lumot to‘g‘ri ekanini bildiradi. Be dan keyin kelishi mumkin.', ['The report may be accurate.', 'Hisobot aniq bo‘lishi mumkin.'], { stem: 'accurate', forms: [form('inaccurate', 'In- old qo‘shimchasi ma’noni inkor qiladi.', 'in'), form('accurately', '-ly ish qanday bajarilganini bildiradi.', 'ly'), form('more accurate', 'Ikki narsani solishtirishda more ishlatiladi.', 'more')] });
for (const [id, meaning, explanation, ex, uz] of [
  ['now', 'hozir', 'Gap qaysi vaqtda sodir bo‘layotganini aytadi. Davomiy harakat bilan tez-tez uchraydi.', 'She is studying now.', 'U hozir o‘qiyapti.'],
  ['here', 'bu yerda', 'So‘zlovchiga yaqin joyni anglatadi. Work here birikmasida alohida at qo‘shilmaydi.', 'I have worked here.', 'Men bu yerda ishlaganman.'],
  ['yesterday', 'kecha', 'Tugagan vaqtni bildiradi. Shuning uchun o‘tgan zamondagi worked bilan mos keladi.', 'I worked yesterday.', 'Men kecha ishladim.'],
  ['tomorrow', 'ertaga', 'So‘z aytilayotgan kundan keyingi kunni bildiradi. Xabar boshqa kuni yetkazilsa vaqt ifodasi vaziyatga qarab o‘zgaradi.', 'I will work tomorrow.', 'Men ertaga ishlayman.'],
  ['never', 'hech qachon', 'Chastotaning nol ekanini bildiradi. Gap boshida urg‘u bilan kelganda yordamchi fe’l egadan oldinga chiqadi.', 'Never have I worked here.', 'Men bu yerda hech qachon ishlamaganman.'],
  ['rarely', 'kamdan-kam', 'Ish juda kam sodir bo‘lishini bildiradi. Rare «kam uchraydigan», -ly esa bu yerda ravish yasaydi.', 'Rarely does she work at home.', 'U kamdan-kam uyda ishlaydi.'],
  ['only', 'faqat', 'O‘zidan keyingi ma’noni cheklaydi. Only then gap boshida urg‘uli so‘z tartibini talab qiladi.', 'Only then did I understand.', 'Faqat shundagina tushundim.'],
  ['then', 'shunda / keyin', 'Voqea qachon yoki nimadan keyin yuz berganini bildiradi.', 'Only then did I understand.', 'Faqat shundagina tushundim.'],
  ['following', 'keyingi', 'Follow «ergashmoq», the following day birikmasida following «keyingi» ma’nosida keladi.', 'I will work the following day.', 'Keyingi kuni ishlayman.'],
] as const) word(id, id, meaning, id === 'following' ? 'Sifat' : 'Ravish', explanation, [ex, uz]);
word('rabotat', 'работать', 'ishlamoq', 'Ruscha fe’l bilan qiyoslash', 'Работ- ish ma’nosini olib yuradi. -ать fe’lning lug‘atdagi shakliga tegishli. Hozirda oxiri shaxs va songa qarab, o‘tgan zamonda esa jins va songa qarab o‘zgaradi. Bu rus tilidagi taqqoslash misoli.', ['Я работаю.', 'Men ishlayman.'], {
  language: 'ru-RU', stem: 'работ-', forms: [
    form('Я работаю', 'Men ishlayman. Работ- dan keyin -аю keladi.', 'аю'),
    form('Ты работаешь', 'Sen ishlaysan. Bitta tanish odamga -аешь ishlatiladi.', 'аешь'),
    form('Он работает', 'U (erkak) ishlaydi. Hozirgi zamonda uchinchi shaxs uchun -ает.', 'ает'),
    form('Она работает', 'U (ayol) ishlaydi. Hozirgi zamonda shakl erkak va ayol uchun bir xil.', 'ает'),
    form('Мы работаем', 'Biz ishlaymiz. Birinchi shaxs ko‘plikda -аем.', 'аем'),
    form('Вы работаете', 'Siz ishlaysiz. Ko‘plikda yoki hurmat bilan murojaatda -аете.', 'аете'),
    form('Они работают', 'Ular ishlaydi. Uchinchi shaxs ko‘plikda -ают.', 'ают'),
    form('Он работал', 'U (erkak) ishladi. O‘tgan zamonda erkak jins shakli.', 'ал'),
    form('Она работала', 'U (ayol) ishladi. O‘tgan zamonda ayol jins shakli.', 'ала'),
    form('Оно работало', 'U ishladi. Masalan, o‘rta jinsdagi устройство — qurilma haqida.', 'ало'),
    form('Они работали', 'Ular ishladi. O‘tgan zamon ko‘pligida jins shaklni o‘zgartirmaydi.', 'али'),
  ],
});

export const words: readonly Word[] = entries;
export const wordsById = new Map(words.map((entry) => [entry.id, entry]));
const wordsByToken = new Map(words.flatMap((entry) => [entry.original, ...entry.aliases ?? []].map((token) => [token.toLowerCase(), entry] as const)));

export function findWord(token: string) {
  return wordsByToken.get(token.toLowerCase().replaceAll('’', "'"));
}
