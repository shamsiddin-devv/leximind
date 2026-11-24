import type { InterfaceLanguage } from '../../app/language';
import { dailyCopy } from './pages/dashboardCopy';
import type { Plan, Profile } from '../../shared/types/api';

const dailyActions: Record<Plan['nextAction'], [string, string, string]> = {
  RESUME_SESSION: ['Mashqni davom ettiring.', 'Faol sessiyangiz bor. Qolgan kartalarni hozir takrorlashingiz mumkin.', 'Mashqni davom ettirish'],
  START_SESSION: ['Har kuni bir qadam.', 'Takrorlash kuni kelgan kartalaringizni mustahkamlang.', 'Mashqni boshlash'],
  ADD_OR_RESUME_CARDS: ['Birinchi kartangizni yarating.', 'Lug‘atdan o‘rganmoqchi bo‘lgan so‘zlaringizni tanlang.', 'So‘zlarni tanlash'],
  CAUGHT_UP: ['Bugungi kartalar tugadi.', 'Keyingi takrorlashgacha o‘yin orqali so‘z boyligingizni sinang.', 'O‘yinlarni ko‘rish'],
  DAILY_NEW_LIMIT_REACHED: ['Bugungi maqsadga yetdingiz.', 'Yangi so‘zlar limiti bajarildi. Mashqni o‘yin bilan davom ettirishingiz mumkin.', 'O‘yinlarni ko‘rish'],
};

export function describeDailySession(profile?: Profile, plan?: Plan, language: InterfaceLanguage = 'uz'): [string, string, string] {
  if (language !== 'uz') {
    const copy = dailyCopy[language];
    if (profile?.reviewMode === 'random' && !plan?.activeSessionId) return copy.random(profile.studyLevel ?? profile.level);
    return plan ? copy.actions[plan.nextAction] : copy.pending;
  }
  if (profile?.reviewMode === 'random' && !plan?.activeSessionId) {
    return ['Tasodifiy so‘zlar bilan mashq qiling.',
      `${profile.studyLevel ?? profile.level} darajasidagi so‘zlarning tarjimasini toping.`, 'Tasodifiy mashqni boshlash'];
  }
  return plan ? dailyActions[plan.nextAction] : ['Har kuni bir qadam.', 'Shaxsiy mashq rejangiz yuklanmoqda.', 'Mashqni boshlash'];
}
