-- The lesson IDs and taught headwords match frontend/src/features/learning-path/course.ts.
CREATE TABLE course_lessons (id text PRIMARY KEY, level cefr_level NOT NULL, position integer NOT NULL UNIQUE CHECK (position > 0));
CREATE TABLE course_lesson_words (lesson_id text REFERENCES course_lessons(id) ON DELETE CASCADE, word_id uuid REFERENCES words(id) ON DELETE CASCADE, PRIMARY KEY (lesson_id, word_id));
CREATE INDEX course_lesson_words_word ON course_lesson_words(word_id);
CREATE TABLE user_course_lessons (user_id uuid REFERENCES users(id) ON DELETE CASCADE, lesson_id text REFERENCES course_lessons(id) ON DELETE RESTRICT, completed_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (user_id, lesson_id));

INSERT INTO course_lessons(id,level,position) VALUES
  ('introductions', 'A1', '1'),
  ('daily-routines', 'A1', '2'),
  ('happening-now', 'A2', '3'),
  ('past-and-future', 'A2', '4'),
  ('experience', 'B1', '5'),
  ('possible-plans', 'B1', '6'),
  ('reported-speech', 'B2', '7'),
  ('passive-voice', 'B2', '8'),
  ('inversion', 'C1', '9'),
  ('missed-opportunities', 'C1', '10'),
  ('careful-claims', 'C2', '11'),
  ('polite-requests', 'C2', '12');

CREATE TEMP TABLE course_vocabulary_seed (headword text, level cefr_level, definition text, example text, translation text) ON COMMIT DROP;
INSERT INTO course_vocabulary_seed VALUES
  ('i am', 'A1', 'I so‘zi kim haqda gap ketayotganini, am esa kasb yoki holatni shu shaxsga bog‘laydi.', 'I’m a teacher.', 'men …man'),
  ('be', 'A1', 'Kasb, holat va joyni aytishda gapning ikki qismini bog‘laydi.', 'She is a student.', 'bo‘lmoq'),
  ('i', 'A1', 'So‘zlovchining o‘zini bildiradi, doimo katta I bilan yoziladi.', 'I work at home.', 'men'),
  ('a', 'A1', 'Birinchi marta tilga olinayotgan yoki aniq ko‘rsatilmagan bitta sanaladigan ot oldidan ishlatiladi.', 'I am a student.', 'bir'),
  ('student', 'A1', 'Sanash mumkin.', 'I am a student.', 'talaba'),
  ('teacher', 'A1', 'Teach «o‘qitmoq».', 'I’m a teacher.', 'o‘qituvchi'),
  ('she', 'A1', 'He kabi uchinchi shaxs birlik.', 'She is a student.', 'u (ayol)'),
  ('do not', 'A1', 'Oddiy hozirgi zamonda harakatni inkor qilish uchun do yoki does va not kerak.', 'She doesn’t work at home.', '…mayman / …maydi'),
  ('work', 'A1', 'Work ning o‘zagi work.', 'She works at home.', 'ishlamoq'),
  ('at', 'A1', 'At home joyni, at that moment aniq vaqtni bildiradi.', 'I work at home.', '…da'),
  ('home', 'A1', 'At home «uyda» degani.', 'I work at home.', 'uy'),
  ('he', 'A1', 'Gap kim haqida ekanini bildiradi.', 'He works at home.', 'u (erkak)'),
  ('i am working', 'A2', 'I ishni kim qilayotganini bildiradi.', 'I am working now.', 'men ishlayapman'),
  ('study', 'A2', 'Undoshdan keyingi y oddiy hozirgi zamondagi -es va o‘tgan zamondagi -ed oldidan i ga o‘zgaradi.', 'She studied yesterday.', 'o‘qimoq, o‘rganmoq'),
  ('now', 'A2', 'Gap qaysi vaqtda sodir bo‘layotganini aytadi.', 'She is studying now.', 'hozir'),
  ('they', 'A2', 'Bir nechta shaxs yoki narsani bildiradi.', 'They are working at home.', 'ular'),
  ('yesterday', 'A2', 'Tugagan vaqtni bildiradi.', 'I worked yesterday.', 'kecha'),
  ('will', 'A2', 'Kelajakdagi harakat yoki natijani ifodalaydi.', 'I will work tomorrow.', '…adi / …moqchi'),
  ('tomorrow', 'A2', 'So‘z aytilayotgan kundan keyingi kunni bildiradi.', 'I will work tomorrow.', 'ertaga'),
  ('i have worked', 'B1', 'I ish egasini, worked harakatni bildiradi.', 'I have worked here.', 'men ishlaganman'),
  ('have', 'B1', 'Have time birikmasida have «vaqti bor» degani.', 'If I have time, I will study.', 'ega bo‘lmoq'),
  ('here', 'B1', 'So‘zlovchiga yaqin joyni anglatadi.', 'I have worked here.', 'bu yerda'),
  ('english', 'B1', 'Til nomi ham, sifat ham bosh harf bilan boshlanadi.', 'She has studied English.', 'ingliz tili / inglizcha'),
  ('if', 'B1', 'Shart qismi if bilan boshlanadi.', 'If I had known, I would have helped.', 'agar'),
  ('time', 'B1', 'Have time birikmasida umumiy vaqtni bildiradi.', 'If I have time, I will study.', 'vaqt'),
  ('it', 'B1', 'Odatda narsa yoki vaziyatni anglatadi.', 'If it rains, we will work at home.', 'u / bu'),
  ('rain', 'B1', 'Ob-havoni aytishda it bilan ishlatiladi.', 'If it rains, we will work at home.', 'yomg‘ir yog‘moq'),
  ('we', 'B1', 'So‘zlovchini ham o‘z ichiga olgan guruhni bildiradi.', 'We work at home.', 'biz'),
  ('say', 'B2', 'Biror odamning gapini yetkazishda said bilan boshlash mumkin.', 'He said he was studying.', 'aytmoq'),
  ('would', 'B2', 'Farazdagi natijani, o‘tgan nutqda kelajakni yoki muloyim iltimosni ifodalaydi.', 'I would appreciate your help.', '…ar edi'),
  ('that', 'B2', 'Suggests that dan keyin qanday xulosa ilgari surilgani keladi.', 'It appears that the report is accurate.', '…ligini / o‘sha'),
  ('moment', 'B2', 'At that moment aynan o‘sha lahzani bildiradi.', 'He said he was studying at that moment.', 'lahza'),
  ('the', 'B2', 'Qaysi narsa nazarda tutilgani tushunarli bo‘lsa ishlatiladi.', 'The report was written yesterday.', 'o‘sha / ma’lum'),
  ('report', 'B2', 'Bitta hisobot report, bir nechtasi reports.', 'The reports were written at home.', 'hisobot'),
  ('write', 'B2', 'O‘tgan shaklini yasashda oddiy -ed qo‘shilmaydi.', 'The report was written yesterday.', 'yozmoq'),
  ('never', 'C1', 'Chastotaning nol ekanini bildiradi.', 'Never have I worked here.', 'hech qachon'),
  ('rarely', 'C1', 'Ish juda kam sodir bo‘lishini bildiradi.', 'Rarely does she work at home.', 'kamdan-kam'),
  ('do', 'C1', 'Yordamchi bo‘lganda o‘zbekchaga alohida tarjima qilinmaydi.', 'Rarely does she work at home.', 'qilmoq'),
  ('only', 'C1', 'O‘zidan keyingi ma’noni cheklaydi.', 'Only then did I understand.', 'faqat'),
  ('then', 'C1', 'Voqea qachon yoki nimadan keyin yuz berganini bildiradi.', 'Only then did I understand.', 'shunda / keyin'),
  ('understand', 'C1', 'Did bilan asosiy understand shakli qo‘llanadi.', 'Only then did I understand.', 'tushunmoq'),
  ('know', 'C1', 'O‘tmishda «bilgan» deganda knew, yordamchi had dan keyin known ishlatiladi.', 'Had I known, I would have helped.', 'bilmoq'),
  ('help', 'C1', 'Could you help me gapida harakat.', 'Would you mind helping me?', 'yordam bermoq / yordam'),
  ('pass', 'C1', 'Imtihon haqida gapirilganda «muvaffaqiyatli topshirmoq» ma’nosida keladi.', 'Had she studied, she would have passed.', 'imtihondan o‘tmoq'),
  ('suggest', 'C2', 'Dalil haqida gapirganda ehtimoliy xulosani bildiradi.', 'The report suggests that it may work.', 'taklif qilmoq / ko‘rsatmoq'),
  ('may', 'C2', 'Xulosa qat’iy bo‘lmasa, may orqali ehtimolni ayting.', 'The report may be accurate.', 'mumkin'),
  ('appear', 'C2', 'It appears that birikmasi mavjud belgilardan kelib chiqqan fikrni kiritadi.', 'It appears that the report is accurate.', 'ko‘rinmoq'),
  ('accurate', 'C2', 'Natija, raqam yoki hisobotdagi ma’lumot to‘g‘ri ekanini bildiradi.', 'The report may be accurate.', 'aniq, to‘g‘ri'),
  ('would you mind helping me', 'C2', 'Would savol boshida muloyim ohang beradi.', 'Would you mind helping me?', 'Menga yordam berishga qarshi emasmisiz?'),
  ('could', 'C2', 'O‘tgan qobiliyat yoki ehtimolni anglatishi mumkin.', 'Could you help me?', '…a olardi / …a olasizmi'),
  ('you', 'C2', 'Bir kishiga ham, bir necha kishiga ham ishlatiladi.', 'Could you help me?', 'sen yoki siz'),
  ('mind', 'C2', 'Iltimosda Would you mind dan keyin helping kabi -ing shakli keladi.', 'Would you mind helping me?', 'qarshi bo‘lmoq'),
  ('appreciate', 'C2', 'Would appreciate muloyim minnatdorlik bildiradi.', 'I would appreciate your help.', 'qadrlamoq');

INSERT INTO words(text,cefr_level)
SELECT s.headword,s.level FROM course_vocabulary_seed s
WHERE NOT EXISTS (SELECT 1 FROM words w WHERE w.text=s.headword AND w.cefr_level <= s.level)
ON CONFLICT (cefr_level,text) DO NOTHING;

INSERT INTO word_senses(word_id,definition,example_sentence,translation_uz,order_index)
SELECT w.id,s.definition,s.example,s.translation,0 FROM course_vocabulary_seed s
JOIN words w ON w.text=s.headword AND w.cefr_level=s.level
ON CONFLICT (word_id,order_index) DO NOTHING;

INSERT INTO course_lesson_words(lesson_id,word_id)
SELECT v.lesson_id,w.id FROM (VALUES
  ('introductions', 'i am', 'A1'),
  ('introductions', 'be', 'A1'),
  ('introductions', 'i', 'A1'),
  ('introductions', 'a', 'A1'),
  ('introductions', 'student', 'A1'),
  ('introductions', 'teacher', 'A1'),
  ('introductions', 'she', 'A1'),
  ('daily-routines', 'do not', 'A1'),
  ('daily-routines', 'work', 'A1'),
  ('daily-routines', 'at', 'A1'),
  ('daily-routines', 'home', 'A1'),
  ('daily-routines', 'he', 'A1'),
  ('happening-now', 'i am working', 'A2'),
  ('happening-now', 'study', 'A2'),
  ('happening-now', 'now', 'A2'),
  ('happening-now', 'they', 'A2'),
  ('past-and-future', 'yesterday', 'A2'),
  ('past-and-future', 'will', 'A2'),
  ('past-and-future', 'tomorrow', 'A2'),
  ('experience', 'i have worked', 'B1'),
  ('experience', 'have', 'B1'),
  ('experience', 'here', 'B1'),
  ('experience', 'english', 'B1'),
  ('possible-plans', 'if', 'B1'),
  ('possible-plans', 'time', 'B1'),
  ('possible-plans', 'it', 'B1'),
  ('possible-plans', 'rain', 'B1'),
  ('possible-plans', 'we', 'B1'),
  ('reported-speech', 'say', 'B2'),
  ('reported-speech', 'would', 'B2'),
  ('reported-speech', 'that', 'B2'),
  ('reported-speech', 'moment', 'B2'),
  ('passive-voice', 'the', 'B2'),
  ('passive-voice', 'report', 'B2'),
  ('passive-voice', 'write', 'B2'),
  ('inversion', 'never', 'C1'),
  ('inversion', 'rarely', 'C1'),
  ('inversion', 'do', 'C1'),
  ('inversion', 'only', 'C1'),
  ('inversion', 'then', 'C1'),
  ('inversion', 'understand', 'C1'),
  ('missed-opportunities', 'know', 'C1'),
  ('missed-opportunities', 'help', 'C1'),
  ('missed-opportunities', 'pass', 'C1'),
  ('careful-claims', 'suggest', 'C2'),
  ('careful-claims', 'may', 'C2'),
  ('careful-claims', 'appear', 'C2'),
  ('careful-claims', 'accurate', 'C2'),
  ('polite-requests', 'would you mind helping me', 'C2'),
  ('polite-requests', 'could', 'C2'),
  ('polite-requests', 'you', 'C2'),
  ('polite-requests', 'mind', 'C2'),
  ('polite-requests', 'appreciate', 'C2')
) AS v(lesson_id,headword,level)
JOIN LATERAL (SELECT id FROM words WHERE text=v.headword AND cefr_level <= v.level::cefr_level ORDER BY cefr_level DESC LIMIT 1) w ON true;
