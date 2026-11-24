import type { InterfaceLanguage } from './language';
import { routes } from './router';

const uz = {
  navigation: 'Menyu guruhlari', accountNavigation: 'Akkaunt navigatsiyasi', sidebar: 'Yon menyu',
  openMenu: 'Menyuni ochish', closeMenu: 'Menyuni yopish', expandMenu: 'Yon menyuni kengaytirish', collapseMenu: 'Yon menyuni yig‘ish',
  quick: 'Tezkor menyu', dark: 'Tungi rejim', toLight: 'Kunduzgi rejimga o‘tish', toDark: 'Tungi rejimga o‘tish',
  notifications: 'Bildirishnomalar', emptyNotifications: 'Yangi bildirishnoma yo‘q.',
  profileMenu: 'Profil menyusi', sound: 'O‘yin ovozlari', footer: 'Inglizcha so‘zlarni o‘rganish va takrorlash',
  signOutTitle: 'Akkauntdan chiqish', signOutDetail: 'Joriy akkaunt seansi yakunlanadi.',
  signOut: 'Chiqish', signingOut: 'Chiqilmoqda…', cancel: 'Bekor qilish', close: 'Yopish',
  search: 'Qidirish', searchTitle: 'Lug‘atdan qidirish', searchClose: 'Qidiruvni yopish', searchPlaceholder: 'So‘z qidiring',
  searchResults: 'Lug‘at natijalari', searching: 'Qidirilmoqda…', noWords: 'Mos so‘z topilmadi.',
  matches: (count: number) => `${count} ta mos natija`, searchFailed: 'Qidiruvda xatolik yuz berdi.',
  choose: 'Tanlash', open: 'Ochish',
  accountMenu: 'Yon menyudagi akkaunt boshqaruvi', viewProfile: 'Profilni ko‘rish', switchAccount: 'Akkauntni almashtirish',
  addAccount: 'Akkaunt qo‘shish', addingAccount: 'Qo‘shilmoqda…', pass: 'Parol', email: 'Email',
  addAccountHint: 'Boshqa akkauntingizga kiring.', duplicateAccount: 'Bu akkaunt ro‘yxatda bor. Uni almashtirish bo‘limidan tanlang.',
  expiredAccount: 'Bu akkaunt seansi tugagan. Uni qayta qo‘shing.', invalidCredentials: 'Email yoki parol noto‘g‘ri.',
};

export const shellCopy: Record<InterfaceLanguage, typeof uz> = {
  uz,
  en: {
    navigation: 'Navigation groups', accountNavigation: 'Account navigation', sidebar: 'Sidebar',
    openMenu: 'Open menu', closeMenu: 'Close menu', expandMenu: 'Expand sidebar', collapseMenu: 'Collapse sidebar',
    quick: 'Quick links', dark: 'Dark mode', toLight: 'Switch to light mode', toDark: 'Switch to dark mode',
    notifications: 'Notifications', emptyNotifications: 'No new notifications.',
    profileMenu: 'Profile menu', sound: 'Game sounds', footer: 'Learn and review English vocabulary',
    signOutTitle: 'Sign out', signOutDetail: 'This will end your current session.',
    signOut: 'Sign out', signingOut: 'Signing out…', cancel: 'Cancel', close: 'Close',
    search: 'Search', searchTitle: 'Search vocabulary', searchClose: 'Close search', searchPlaceholder: 'Search words',
    searchResults: 'Vocabulary results', searching: 'Searching…', noWords: 'No matching words.',
    matches: (count) => `Matches · ${count}`, searchFailed: 'Search failed. Try again.',
    choose: 'Select', open: 'Open', accountMenu: 'Sidebar account menu', viewProfile: 'View profile', switchAccount: 'Switch account',
    addAccount: 'Add account', addingAccount: 'Adding…', pass: 'Password', email: 'Email',
    addAccountHint: 'Sign in to another account.', duplicateAccount: 'This account is already listed. Select it to switch.',
    expiredAccount: 'This session expired. Add the account again.', invalidCredentials: 'Incorrect email or password.',
  },
  ru: {
    navigation: 'Разделы меню', accountNavigation: 'Меню аккаунта', sidebar: 'Боковое меню',
    openMenu: 'Открыть меню', closeMenu: 'Закрыть меню', expandMenu: 'Развернуть боковое меню', collapseMenu: 'Свернуть боковое меню',
    quick: 'Быстрые ссылки', dark: 'Тёмная тема', toLight: 'Включить светлую тему', toDark: 'Включить тёмную тему',
    notifications: 'Уведомления', emptyNotifications: 'Новых уведомлений нет.',
    profileMenu: 'Меню профиля', sound: 'Звуки в играх', footer: 'Изучайте и повторяйте английские слова',
    signOutTitle: 'Выйти из аккаунта', signOutDetail: 'Текущий сеанс будет завершён.',
    signOut: 'Выйти', signingOut: 'Выход…', cancel: 'Отмена', close: 'Закрыть',
    search: 'Поиск', searchTitle: 'Поиск по словарю', searchClose: 'Закрыть поиск', searchPlaceholder: 'Найти слово',
    searchResults: 'Результаты поиска', searching: 'Поиск…', noWords: 'Подходящих слов нет.',
    matches: (count) => `Найдено · ${count}`, searchFailed: 'Не удалось выполнить поиск. Попробуйте ещё раз.',
    choose: 'Выбрать', open: 'Открыть', accountMenu: 'Аккаунт в боковом меню', viewProfile: 'Посмотреть профиль', switchAccount: 'Сменить аккаунт',
    addAccount: 'Добавить аккаунт', addingAccount: 'Добавление…', pass: 'Пароль', email: 'Почта',
    addAccountHint: 'Войдите в другой аккаунт.', duplicateAccount: 'Этот аккаунт уже в списке. Выберите его для переключения.',
    expiredAccount: 'Сеанс завершён. Добавьте аккаунт снова.', invalidCredentials: 'Неверная почта или пароль.',
  },
};

const russianRoutes: Readonly<Record<string, string>> = {
  [routes.dashboard]: 'Главная', [routes.vocabulary]: 'Словарь', [routes.games]: 'Игры', [routes.learningSessions]: 'Занятия',
  [routes.studyPlan]: 'План занятий', [routes.reviewCenter]: 'Повторение', [routes.statistics]: 'Статистика',
  [routes.learningCalendar]: 'Календарь', [routes.topics]: 'Темы', [routes.achievements]: 'Достижения',
  [routes.leaderboard]: 'Рейтинг', [routes.collections]: 'Мои коллекции', [routes.referrals]: 'Приглашения', [routes.mistakes]: 'Работа над ошибками',
  [routes.profile]: 'Профиль', [routes.settingsAccount]: 'Аккаунт', [routes.settingsPassword]: 'Пароль',
  [routes.settingsLearning]: 'Настройки обучения', [routes.settingsNotifications]: 'Уведомления', [routes.settingsAppearance]: 'Внешний вид',
  [routes.settingsCustomization]: 'Интерфейс', [routes.settingsPrivacy]: 'Конфиденциальность',
};

const russianGroups: Readonly<Record<string, string>> = {
  'Main Navigation': 'Обучение', Progress: 'Прогресс', Explore: 'Обзор', Personal: 'Личное', Settings: 'Настройки',
};

export function routeLabel(language: InterfaceLanguage, href: string, label: string) {
  if (language !== 'ru') return label;
  return label === 'Settings' ? russianGroups.Settings : russianRoutes[href] ?? label;
}

export function groupLabel(language: InterfaceLanguage, label: string) {
  return language === 'ru' ? russianGroups[label] ?? label : label;
}
