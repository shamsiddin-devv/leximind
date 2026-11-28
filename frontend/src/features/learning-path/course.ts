import type { Level } from '../../shared/types/api';

export type Sentence = readonly [english: string, uzbek: string];

type Question = {
  prompt: string;
  options: readonly [string, string, string];
  answer: number;
  explanation: string;
};

export type Lesson = {
  id: string;
  title: string;
  rule: string;
  takeaway: string;
  examples: readonly [Sentence, Sentence, Sentence];
  mistake: readonly [incorrect: string, correct: string, reason: string];
  question: Question;
  expressions?: readonly string[];
};

type Unit = {
  level: Level;
  title: string;
  description: string;
  lessons: readonly [Lesson, Lesson];
};

export const course: readonly Unit[] = [
  {
    level: 'A1', title: 'Birinchi suhbat', description: 'O‘zingizni tanishtiring va kundalik ishlaringiz haqida gapiring.',
    lessons: [
      {
        id: 'introductions', title: 'O‘zingizni tanishtiring',
        rule: 'Inglizchada «Men talabaman» kabi gapda I va student orasiga am qo‘yiladi. Am kim ekaningizni bildiradigan bog‘lovchi fe’l. «U» haqida gapirganda is, «biz» uchun are ishlatiladi.',
        takeaway: 'Bitta odamning kasbini aytganda kasb nomidan oldin a yoki an ishlatiladi. Suhbatda I am o‘rniga I’m deyish tabiiy.',
        examples: [['I am a student.', 'Men talabaman.'], ['I’m a teacher.', 'Men o‘qituvchiman.'], ['She is a student.', 'U talaba.']],
        mistake: ['I a student.', 'I am a student.', 'I va a student orasiga am qo‘ying.'],
        question: { prompt: 'I ___ a teacher.', options: ['is', 'am', 'are'], answer: 1, explanation: 'I bilan am ishlatiladi.' },
        expressions: ['i-am', 'be'],
      },
      {
        id: 'daily-routines', title: 'Har kuni nima qilasiz?',
        rule: 'Takrorlanadigan ishni aytishda I, you, we va they dan keyin work yoziladi. He, she va it bilan work oxiriga -s qo‘shilib, works bo‘ladi.',
        takeaway: 'Inkor yasashda I bilan do not (don’t), he va she bilan does not (doesn’t) ishlatiladi. Does shaxsni bildirgani uchun undan keyin work shakli qoladi.',
        examples: [['I work at home.', 'Men uyda ishlayman.'], ['He works at home.', 'U (erkak) uyda ishlaydi.'], ['She works at home.', 'U (ayol) uyda ishlaydi.']],
        mistake: ['She doesn’t works at home.', 'She doesn’t work at home.', 'Doesn’t bilan work ga -s qo‘shilmaydi.'],
        question: { prompt: 'She ___ at home.', options: ['work', 'working', 'works'], answer: 2, explanation: 'Oddiy hozirgi zamonda she dan keyin works keladi.' },
        expressions: ['do-not', 'work'],
      },
    ],
  },
  {
    level: 'A2', title: 'Vaqt va harakat', description: 'Hozirgi ish, o‘tgan voqea va ertangi rejani ajrating.',
    lessons: [
      {
        id: 'happening-now', title: 'Hozir nima qilyapsiz?',
        rule: 'Hozir bajarilayotgan ishni aytish uchun tanish am, is yoki are dan foydalaning va harakat bildiruvchi fe’lga -ing qo‘shing. I am working degani «Men hozir ishlayapman».',
        takeaway: 'Work kundalik odatni, am working davom etayotgan ishni bildiradi. Inglizcha davomiy gapda am, is yoki are ham kerak.',
        examples: [['I am working now.', 'Men hozir ishlayapman.'], ['She is studying now.', 'U hozir o‘qiyapti.'], ['They are working at home.', 'Ular uyda ishlayapti.']],
        mistake: ['She studying now.', 'She is studying now.', 'She bilan is ishlatiladi. Studying harakatning davom etayotganini bildiradi.'],
        question: { prompt: 'They ___ working at home.', options: ['are', 'is', 'am'], answer: 0, explanation: 'They bilan are ishlatiladi.' },
        expressions: ['i-am-working', 'study'],
      },
      {
        id: 'past-and-future', title: 'Kecha va ertaga',
        rule: 'Ish tugagan vaqtni aytganda work ga -ed qo‘shing. Study fe’lida undoshdan keyingi y harfi -ed oldidan i ga aylanadi. Kelajakda will dan keyin fe’lning asosiy shakli ishlatiladi.',
        takeaway: 'Yesterday — kecha, tomorrow — ertaga. Bu so‘zlar gapdagi vaqtni aniqlashga yordam beradi.',
        examples: [['I worked yesterday.', 'Men kecha ishladim.'], ['She studied yesterday.', 'U kecha o‘qidi.'], ['I will work tomorrow.', 'Men ertaga ishlayman.']],
        mistake: ['I will worked tomorrow.', 'I will work tomorrow.', 'Will kelajakni ko‘rsatadi, shuning uchun work shaklini ishlating.'],
        question: { prompt: 'She ___ yesterday.', options: ['study', 'studied', 'studying'], answer: 1, explanation: 'Yesterday tugagan vaqtni bildiradi. Study fe’lining o‘tgan zamoni studied.' },
      },
    ],
  },
  {
    level: 'B1', title: 'Tajriba va rejalar', description: 'Tajribani hozir bilan bog‘lang va ehtimoliy rejalarni tushuntiring.',
    lessons: [
      {
        id: 'experience', title: 'Tajriba haqida gapiring',
        rule: 'I have worked here gapi hozirgacha bo‘lgan tajribangizni aytadi. Have yordamchi vazifada keladi. Undan keyingi worked — fe’lning shu tuzilmada ishlatiladigan shakli.',
        takeaway: 'I va they bilan have, she va he bilan has ishlatiladi. Kecha kabi tugagan vaqt aniq aytilganda I worked yesterday to‘g‘ri.',
        examples: [['I have worked here.', 'Men bu yerda ishlaganman.'], ['She has studied English.', 'U ingliz tilini o‘rgangan.'], ['I haven’t worked here.', 'Men bu yerda ishlamaganman.']],
        mistake: ['She have studied English.', 'She has studied English.', 'She bilan has ishlatiladi.'],
        question: { prompt: 'She ___ worked here.', options: ['have', 'is', 'has'], answer: 2, explanation: 'She bilan tajriba haqida gapirganda has + worked ishlatiladi.' },
        expressions: ['i-have-worked', 'have'],
      },
      {
        id: 'possible-plans', title: 'Agar shunday bo‘lsa…',
        rule: 'If «agar» degani. Ertaga bajarilishi mumkin bo‘lgan shartni if dan keyin oddiy hozirgi zamonda ayting. Natijani will bilan bildiring.',
        takeaway: 'If I have time — bu shart. I will study — shu shart bajarilganda yuz beradigan natija.',
        examples: [['If I have time, I will study.', 'Agar vaqtim bo‘lsa, o‘qiyman.'], ['If she works, I will study.', 'Agar u ishlasa, men o‘qiyman.'], ['If it rains, we will work at home.', 'Agar yomg‘ir yog‘sa, uyda ishlaymiz.']],
        mistake: ['If I will have time, I will study.', 'If I have time, I will study.', 'Bu tuzilmada will natija qismida keladi.'],
        question: { prompt: 'If it ___, we will work at home.', options: ['rains', 'will rain', 'raining'], answer: 0, explanation: 'If dan keyin oddiy hozirgi zamon, it bilan rains ishlatiladi.' },
      },
    ],
  },
  {
    level: 'B2', title: 'Xabar va matn', description: 'Boshqaning gapini yetkazing va natijaga urg‘u bering.',
    lessons: [
      {
        id: 'reported-speech', title: 'U nima dedi?',
        rule: 'Gapni boshqa odamga yetkazganda she said kabi kirishdan foydalaning. Gap o‘tgan vaqtda aytilgan bo‘lsa, davom etayotgan harakat is studying shaklidan was studying shakliga ko‘chishi mumkin.',
        takeaway: 'Olmosh kim haqida gap ketayotganiga qarab o‘zgaradi. Kelajakni bildirgan will ko‘pincha would ga aylanadi. Xabar boshqa kuni aytilsa, tomorrow o‘rniga the following day ishlatilishi mumkin.',
        examples: [['She said she worked at home.', 'U uyda ishlashini aytdi.'], ['He said he was studying.', 'U o‘qiyotganini aytdi.'], ['They said they would work tomorrow.', 'Ular ertaga ishlashlarini aytishdi.']],
        mistake: ['She said I worked at home.', 'She said she worked at home.', 'U o‘zi haqida gapirgan bo‘lsa, xabarni yetkazayotganda she ishlatiladi.'],
        question: { prompt: 'He said he ___ studying at that moment.', options: ['were', 'was', 'be'], answer: 1, explanation: 'O‘sha paytda davom etgan ish uchun he was studying shakli ishlatiladi.' },
      },
      {
        id: 'passive-voice', title: 'Natijani oldinga chiqaring',
        rule: 'Kim yozganidan ko‘ra hisobot muhim bo‘lsa, gapni the report bilan boshlang. Keyin zamonga mos be shakli va written ishlatiladi. Written — write fe’lining bu tuzilishga mos shakli.',
        takeaway: 'Bitta hisobot uchun was written, bir nechtasi uchun were written. Kelajakda ikkalasiga ham will be written ishlatiladi.',
        examples: [['The report was written yesterday.', 'Hisobot kecha yozildi.'], ['The reports were written at home.', 'Hisobotlar uyda yozildi.'], ['The report will be written tomorrow.', 'Hisobot ertaga yoziladi.']],
        mistake: ['The report was wrote yesterday.', 'The report was written yesterday.', 'Majhul nisbatda was dan keyin write ning written shakli kerak.'],
        question: { prompt: 'The reports ___ written yesterday.', options: ['was', 'is', 'were'], answer: 2, explanation: 'Reports ko‘plikda. O‘tgan zamondagi yordamchi shakl were bo‘ladi.' },
      },
    ],
  },
  {
    level: 'C1', title: 'Urg‘u va ehtimol', description: 'Rasmiy matndagi urg‘u va sodir bo‘lmagan voqealarni ifodalang.',
    lessons: [
      {
        id: 'inversion', title: 'Urg‘uni gap boshiga olib chiqing',
        rule: 'Never gap boshida ishlatilganda yordamchi fe’l olmoshdan oldinga o‘tadi. I have never worked here gapi urg‘u bilan Never have I worked here shaklida yozilishi mumkin.',
        takeaway: 'Tayyor yordamchi bo‘lmasa, vaqt va shaxsga mos do, does yoki did qo‘shiladi. Only then did I understand jumlasida zamon did orqali bildiriladi.',
        examples: [['Never have I worked here.', 'Men bu yerda hech qachon ishlamaganman.'], ['Rarely does she work at home.', 'U kamdan-kam hollarda uyda ishlaydi.'], ['Only then did I understand.', 'Faqat shundagina tushundim.']],
        mistake: ['Rarely she works at home.', 'Rarely does she work at home.', 'Rarely boshida kelganda does egadan oldin, work esa egadan keyin turadi.'],
        question: { prompt: 'Only then ___ I understand.', options: ['did', 'have', 'was'], answer: 0, explanation: 'Oddiy o‘tgan zamonda urg‘uli tuzilish uchun did + ega + asosiy fe’l ishlatiladi.' },
      },
      {
        id: 'missed-opportunities', title: 'O‘tgan imkoniyatlar',
        rule: 'Had I known — If I had known iborasining rasmiyroq ko‘rinishi. O‘tmishda aslida bo‘lmagan shartni anglatadi. If tushirilganda had egadan oldinga chiqadi.',
        takeaway: 'Would have helped bo‘lmagan natijani ifodalaydi. Would + have dan keyin fe’lning uchinchi shakli ishlatiladi.',
        examples: [['Had I known, I would have helped.', 'Bilganimda yordam bergan bo‘lardim.'], ['Had she studied, she would have passed.', 'U o‘qiganida, imtihondan o‘tgan bo‘lardi.'], ['If I had known, I would have helped.', 'Agar bilganimda, yordam bergan bo‘lardim.']],
        mistake: ['Had I knew, I would have helped.', 'Had I known, I would have helped.', 'Had bilan know fe’lining uchinchi shakli known ishlatiladi.'],
        question: { prompt: 'Had she studied, she ___ have passed.', options: ['did', 'would', 'will'], answer: 1, explanation: 'O‘tmishdagi tasavvur qilingan natijada would have ishlatiladi.' },
      },
    ],
  },
  {
    level: 'C2', title: 'Nozik ma’no va ohang', description: 'Fikrni ehtiyotkorlik bilan yozing va vaziyatga mos iltimos qiling.',
    lessons: [
      {
        id: 'careful-claims', title: 'Dalilga mos ishonch darajasi',
        rule: 'Hisobot dalil taklif qilsa, suggests deb yozishingiz mumkin. Xulosa taxmin bo‘lsa, may yordamida ehtimolni ko‘rsating. Appears taassurot yoki mavjud belgilarga tayangan fikrni kiritadi.',
        takeaway: 'The report is accurate deganda aniqlikni qat’iy aytasiz. The report may be accurate deganda esa uning ehtimolini bildirasiz.',
        examples: [['The report suggests that it may work.', 'Hisobot bu ish berishi mumkinligini ko‘rsatadi.'], ['It appears that the report is accurate.', 'Ko‘rinishidan, hisobot aniq.'], ['The report may be accurate.', 'Hisobot aniq bo‘lishi mumkin.']],
        mistake: ['The report may is accurate.', 'The report may be accurate.', 'May dan keyin fe’lning asosiy shakli be ishlatiladi.'],
        question: { prompt: 'The report ___ be accurate.', options: ['is', 'does', 'may'], answer: 2, explanation: 'May ehtimolni bildiradi va undan keyin be keladi.' },
      },
      {
        id: 'polite-requests', title: 'Vaziyatga mos iltimos',
        rule: 'Could you help me? odobli iltimos. Would you mind helping me? iborasi suhbatdoshga rad etish uchun ham joy qoldiradi. Mind dan keyin helping kabi -ing shakli ishlatiladi.',
        takeaway: 'I would appreciate your help yozma va rasmiy kontekstga mos. Og‘zaki suhbatda qisqaroq iltimos tabiiyroq eshitilishi mumkin.',
        examples: [['Could you help me?', 'Menga yordam bera olasizmi?'], ['Would you mind helping me?', 'Menga yordam berishga qarshi emasmisiz?'], ['I would appreciate your help.', 'Yordamingizdan minnatdor bo‘lardim.']],
        mistake: ['Would you mind to help me?', 'Would you mind helping me?', 'Iltimosdagi mind dan keyin harakat -ing shaklida keladi.'],
        question: { prompt: 'Would you mind ___ me?', options: ['helping', 'help', 'helped'], answer: 0, explanation: 'Mind dan keyin -ing shakli helping keladi.' },
        expressions: ['would-you-mind'],
      },
    ],
  },
];

export const lessons = course.flatMap((unit) => unit.lessons.map((lesson) => ({ ...lesson, level: unit.level })));
export type CourseLesson = (typeof lessons)[number];
