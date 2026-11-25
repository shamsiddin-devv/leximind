import type { InterfaceLanguage } from '../../app/language';

const uz = {
  label: 'Yo‘l-yo‘riq',
  title: 'Birinchi qadamlar',
  intro: 'Bir mashq bajaring, kartaga so‘z qo‘shing va uni takrorlang.',
  progress: (done: number, total: number) => `${total} qadamdan ${done} tasi bajarildi`,
  dismiss: 'Tavsiyani yashirish',
  close: 'Yopish',
  done: 'Bajarildi',
  studyPlan: 'O‘quv rejasi',
  statistics: 'Statistika',
  steps: {
    practice: ['Birinchi mashqni bajaring', 'Inglizcha so‘zning o‘zbekcha ma’nosini tanlang.', 'So‘zni toping'],
    vocabulary: ['Birinchi kartangizni qo‘shing', 'Lug‘atdan so‘z topib, «Karta qo‘shish» tugmasini bosing.', 'Lug‘atni ochish'],
    review: ['So‘zni takrorlang', 'Kartadagi tarjimani esga tushirib, javobingizni baholang.', 'Takrorlashga o‘tish'],
  },
};

export const gettingStartedCopy: Record<InterfaceLanguage, typeof uz> = {
  uz,
  en: {
    label: 'Getting started',
    title: 'Your first steps',
    intro: 'Finish an exercise, add a word to your cards, and review it.',
    progress: (done, total) => `${done} of ${total} steps complete`,
    dismiss: 'Hide suggestion',
    close: 'Close',
    done: 'Complete',
    studyPlan: 'Study plan',
    statistics: 'Statistics',
    steps: {
      practice: ['Finish your first exercise', 'Choose the Uzbek meaning of an English word.', 'Find the word'],
      vocabulary: ['Add your first card', 'Find a word in Vocabulary and choose Add card.', 'Open Vocabulary'],
      review: ['Review a word', 'Recall the translation on a card, then rate your answer.', 'Open Review Center'],
    },
  },
  ru: {
    label: 'Как начать',
    title: 'Первые шаги',
    intro: 'Выполните упражнение, добавьте слово в карточки и повторите его.',
    progress: (done, total) => `Выполнено: ${done} из ${total}`,
    dismiss: 'Скрыть подсказку',
    close: 'Закрыть',
    done: 'Выполнено',
    studyPlan: 'Учебный план',
    statistics: 'Статистика',
    steps: {
      practice: ['Выполните первое упражнение', 'Выберите узбекский перевод английского слова.', 'Найти слово'],
      vocabulary: ['Добавьте первую карточку', 'Найдите слово в словаре и нажмите «Добавить карточку».', 'Открыть словарь'],
      review: ['Повторите слово', 'Вспомните перевод слова на карточке и оцените ответ.', 'Перейти к повторению'],
    },
  },
};
