import { BookOpen, Gamepad2, RotateCcw, Sparkles } from 'lucide-react';

export const tourSteps = [
  { anchor: 'study', icon: Sparkles },
  { anchor: 'vocabulary', icon: BookOpen, menuFallback: true },
  { anchor: 'games', icon: Gamepad2, menuFallback: true },
  { anchor: 'progress', icon: RotateCcw, menuFallback: true },
] as const;

export const onboardingCopy = {
  uz: {
    label: 'Ilova bo‘ylab tur',
    close: 'Turni yopish',
    skip: 'O‘tkazib yuborish',
    back: 'Orqaga',
    next: 'Keyingi',
    finish: 'Boshlash',
    step: (current: number, total: number) => `${total} bosqichdan ${current}-si`,
    steps: [
      ['LexiMind’ga xush kelibsiz!', 'O‘quv panelidan kunlik mashqni boshlang va maqsadingizga qancha qolganini kuzating.'],
      ['Vocabulary', 'Yangi so‘zlarni toping, talaffuzini tinglang va takrorlash uchun kartalaringizga qo‘shing.'],
      ['Games', 'Tarjima, diktant va xotira o‘yinlari bilan yangi so‘zlarni mustahkamlang.'],
      ['Takrorlash va natijalar', 'Progress bo‘limida kartalaringizni takrorlang, natijalaringizni ko‘ring va taqvimda faolligingizni kuzating.'],
    ],
  },
  en: {
    label: 'Take a tour', close: 'Close tour', skip: 'Skip tour', back: 'Back', next: 'Next', finish: 'Get started',
    step: (current: number, total: number) => `Step ${current} of ${total}`,
    steps: [
      ['Welcome to LexiMind!', 'Start your daily practice on the dashboard and see how close you are to your goal.'],
      ['Vocabulary', 'Discover new words, listen to their pronunciation, and save them as review cards.'],
      ['Games', 'Make new words stick with translation, dictation, and memory games.'],
      ['Review and progress', 'Open Progress to review your cards, see your results, and track your activity on the calendar.'],
    ],
  },
  ru: {
    label: 'Обзор приложения', close: 'Закрыть обзор', skip: 'Пропустить обзор', back: 'Назад', next: 'Далее', finish: 'Начать',
    step: (current: number, total: number) => `Шаг ${current} из ${total}`,
    steps: [
      ['Добро пожаловать в LexiMind!', 'Начните ежедневную тренировку на главной странице и следите за выполнением цели.'],
      ['Словарь', 'Находите новые слова, слушайте произношение и добавляйте слова в карточки для повторения.'],
      ['Игры', 'Закрепляйте новые слова с помощью перевода, диктантов и игр на память.'],
      ['Повторение и прогресс', 'В разделе «Прогресс» повторяйте карточки, смотрите результаты и следите за активностью в календаре.'],
    ],
  },
} as const;
