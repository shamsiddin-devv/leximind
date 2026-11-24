import type { InterfaceLanguage } from '../../../app/language';
import type { Plan } from '../../../shared/types/api';

type DailyAction = [title: string, detail: string, action: string];
const uz = {
  hello: 'Salom', description: 'Bugungi mashqlaringiz va o‘quv natijalaringiz.', level: (value: string) => `${value} daraja`,
  dateLocale: 'uz-UZ', daily: 'Kunlik mashq', studyPlan: 'O‘quv rejasi', loading: 'Yuklanmoqda…',
  available: (count: number) => `Takrorlashga tayyor ${count} ta kartangiz bor.`,
  summary: 'Mashq statistikasi', cards: 'So‘z kartalari', reviews: 'Takrorlashlar', sessions: 'Tugallangan sessiyalar',
  quickTitle: 'Mashqni tanlang', allGames: 'Barcha o‘yinlar', play: 'Boshlash',
  quick: [],
  forecast: 'Keyingi takrorlashlar', noForecast: 'Hozircha rejalashtirilgan takrorlash yo‘q.',
  today: 'Bugun', done: 'bajarildi', results: 'O‘quv natijalari va kun so‘zi',
  streak: 'Faollik seriyasi', daysInARow: 'kun ketma-ket', goal: 'Kunlik maqsad', newWords: 'yangi so‘z',
  minutes: (count: number) => `Kuniga ${count} daqiqa`,
  word: 'Kun so‘zi', wordHint: 'O‘zbekcha tarjima', speak: 'Talaffuzni tinglash', vocabulary: 'Lug‘atni ochish',
  hardWords: 'Qiyin so‘zlar', repeats: (count: number) => `${count} marta`,
};

export const dashboardCopy: Record<InterfaceLanguage, Omit<typeof uz, 'quick'> & { quick: [string, string][] }> = {
  uz,
  en: {
    hello: 'Hello', description: 'Your exercises and learning progress for today.', level: (value) => `${value} level`,
    dateLocale: 'en-GB', daily: 'Daily practice', studyPlan: 'Study plan', loading: 'Loading…',
    available: (count) => `${count} ${count === 1 ? 'card is' : 'cards are'} ready to review.`,
    summary: 'Practice statistics', cards: 'Flashcards', reviews: 'Reviews', sessions: 'Completed sessions',
    quickTitle: 'Pick an exercise', allGames: 'All games', play: 'Start',
    quick: [['Find the meaning', 'Choose the translation that matches the word.'], ['Spelling practice', 'Type the correct English spelling.'], ['Dictation', 'Listen and type the word you hear.']],
    forecast: 'Upcoming reviews', noForecast: 'No reviews are scheduled yet.', today: 'Today', done: 'completed',
    results: 'Learning progress and word of the day', streak: 'Study streak', daysInARow: 'days in a row', goal: 'Daily goal', newWords: 'new words',
    minutes: (count) => `${count} minutes a day`, word: 'Word of the day', wordHint: 'Uzbek translation', speak: 'Listen to the pronunciation',
    vocabulary: 'Open vocabulary', hardWords: 'Difficult words', repeats: (count) => `Attempts · ${count}`,
  },
  ru: {
    hello: 'Привет', description: 'Упражнения и результаты обучения на сегодня.', level: (value) => `Уровень ${value}`,
    dateLocale: 'ru-RU', daily: 'Ежедневная практика', studyPlan: 'План занятий', loading: 'Загрузка…',
    available: (count) => `Карточки на повторение · ${count}`,
    summary: 'Статистика занятий', cards: 'Карточки', reviews: 'Повторения', sessions: 'Завершённые занятия',
    quickTitle: 'Выберите упражнение', allGames: 'Все игры', play: 'Начать',
    quick: [['Найдите значение', 'Выберите подходящий перевод слова.'], ['Правописание', 'Напишите английское слово правильно.'], ['Диктант', 'Прослушайте и запишите слово.']],
    forecast: 'Ближайшие повторения', noForecast: 'Повторения пока не запланированы.', today: 'Сегодня', done: 'выполнено',
    results: 'Результаты обучения и слово дня', streak: 'Серия занятий', daysInARow: 'дней подряд', goal: 'Цель на день', newWords: 'новых слов',
    minutes: (count) => `${count} мин в день`, word: 'Слово дня', wordHint: 'Перевод на узбекский', speak: 'Прослушать произношение',
    vocabulary: 'Открыть словарь', hardWords: 'Сложные слова', repeats: (count) => `Попытки · ${count}`,
  },
};

export const dailyCopy: Record<Exclude<InterfaceLanguage, 'uz'>, {
  actions: Record<Plan['nextAction'], DailyAction>; pending: DailyAction; random: (level: string) => DailyAction;
}> = {
  en: {
    actions: {
      RESUME_SESSION: ['Pick up where you left off.', 'Finish the remaining cards in your current session.', 'Continue practice'],
      START_SESSION: ['A little practice every day.', 'Review the flashcards that are due today.', 'Start practice'],
      ADD_OR_RESUME_CARDS: ['Create your first flashcard.', 'Choose words you want to learn from the vocabulary.', 'Choose words'],
      CAUGHT_UP: ['You’re caught up for today.', 'Try a game to practice while you wait for your next review.', 'Browse games'],
      DAILY_NEW_LIMIT_REACHED: ['You reached today’s goal.', 'Keep practicing with a vocabulary game.', 'Browse games'],
    },
    pending: ['A little practice every day.', 'Your personal study plan is loading.', 'Start practice'],
    random: (level) => ['Practice with random words.', `Find the translations of ${level} words.`, 'Start random practice'],
  },
  ru: {
    actions: {
      RESUME_SESSION: ['Продолжите занятие.', 'Повторите оставшиеся карточки текущего занятия.', 'Продолжить занятие'],
      START_SESSION: ['Один шаг каждый день.', 'Повторите карточки, которые запланированы на сегодня.', 'Начать занятие'],
      ADD_OR_RESUME_CARDS: ['Создайте первую карточку.', 'Выберите в словаре слова, которые хотите выучить.', 'Выбрать слова'],
      CAUGHT_UP: ['На сегодня всё.', 'До следующего повторения можно потренироваться в игре.', 'Открыть игры'],
      DAILY_NEW_LIMIT_REACHED: ['Дневная цель выполнена.', 'Продолжите практику в словарной игре.', 'Открыть игры'],
    },
    pending: ['Один шаг каждый день.', 'Загружаем ваш личный план занятий.', 'Начать занятие'],
    random: (level) => ['Тренируйтесь со случайными словами.', `Подберите перевод слов уровня ${level}.`, 'Начать тренировку'],
  },
};
