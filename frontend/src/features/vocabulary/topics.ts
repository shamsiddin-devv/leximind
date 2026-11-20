import {
  BookOpen, BriefcaseBusiness, ChartLine, CodeXml, GraduationCap, HeartPulse, House,
  Leaf, Newspaper, Palette, PlaneTakeoff, Quote, Smile, Sun, Utensils, type LucideIcon,
} from 'lucide-react';
import type { Level } from '../../shared/types/api';

export const topicCategories = [
  { id: 'daily', label: 'Kundalik' },
  { id: 'work', label: 'Ish' },
  { id: 'academic', label: 'Akademik' },
  { id: 'technology', label: 'Texnologiya' },
  { id: 'culture', label: 'Madaniyat' },
] as const;

export type TopicDefinition = {
  id: string;
  title: string;
  description?: string;
  category: (typeof topicCategories)[number]['id'];
  suggestedLevel?: Level;
  icon: LucideIcon;
  tone: 'bright' | 'neutral' | 'green';
};

export const featuredTopics: TopicDefinition[] = [
  { id: 'travel', title: 'Sayohat va transport', description: 'Aeroport, mehmonxona, chipta va yo‘nalish so‘zlari.', category: 'daily', suggestedLevel: 'B1', icon: PlaneTakeoff, tone: 'bright' },
  { id: 'work', title: 'Ish va biznes', description: 'Uchrashuvlar, muzokaralar va elektron pochta tili.', category: 'work', suggestedLevel: 'B2', icon: BriefcaseBusiness, tone: 'neutral' },
  { id: 'food', title: 'Ovqat va restoran', description: 'Menyu, ta’m va buyurtma berish iboralari.', category: 'daily', suggestedLevel: 'A2', icon: Utensils, tone: 'green' },
  { id: 'technology', title: 'Texnologiya va IT', description: 'Dasturiy ta’minot, mahsulot va jamoa tili.', category: 'technology', suggestedLevel: 'C1', icon: CodeXml, tone: 'bright' },
  { id: 'study', title: 'Akademik yozuv', description: 'Insho, tadqiqot va dalillarni ifodalash.', category: 'academic', suggestedLevel: 'C1', icon: GraduationCap, tone: 'neutral' },
  { id: 'health', title: 'Sog‘liq va tana', description: 'Shifokor qabuli, simptomlar va sog‘lom turmush.', category: 'daily', suggestedLevel: 'B1', icon: HeartPulse, tone: 'green' },
  { id: 'culture', title: 'Madaniyat va san’at', description: 'Adabiyot, kino va muzey borasidagi so‘zlar.', category: 'culture', suggestedLevel: 'B2', icon: Palette, tone: 'neutral' },
  { id: 'environment', title: 'Atrof-muhit', description: 'Iqlim, energiya va barqarorlik atamalari.', category: 'academic', suggestedLevel: 'B2', icon: Leaf, tone: 'bright' },
  { id: 'personality', title: 'Shaxsiyat va hislar', description: 'Xarakter, kayfiyat va munosabat so‘zlari.', category: 'daily', suggestedLevel: 'B1', icon: Smile, tone: 'green' },
  { id: 'media', title: 'Media va yangiliklar', description: 'Sarlavhalar, reportaj va jurnalistika tili.', category: 'culture', suggestedLevel: 'B2', icon: Newspaper, tone: 'neutral' },
  { id: 'product-management', title: 'Mahsulot boshqaruvi', description: 'Reja, metrika va foydalanuvchi tadqiqoti.', category: 'work', suggestedLevel: 'C1', icon: ChartLine, tone: 'bright' },
  { id: 'idioms', title: 'Iboralar va frazeologizm', description: 'Tabiiy nutqda tez-tez ishlatiladigan iboralar.', category: 'culture', suggestedLevel: 'C1', icon: Quote, tone: 'green' },
];

const otherTopics: TopicDefinition[] = [
  { id: 'daily-life', title: 'Kundalik hayot', description: 'Kundalik ishlar va odatlar uchun so‘zlar.', category: 'daily', icon: Sun, tone: 'bright' },
  { id: 'home', title: 'Uy va jihozlar', description: 'Xonalar, uy anjomlari va ro‘zg‘or so‘zlari.', category: 'daily', icon: House, tone: 'neutral' },
];
const topicsById = new Map([...featuredTopics, ...otherTopics].map((topic) => [topic.id, topic]));

export function topicDefinition(id: string): TopicDefinition {
  const words = id.replaceAll('-', ' ');
  return topicsById.get(id) ?? { id, title: words.charAt(0).toUpperCase() + words.slice(1), category: 'daily', icon: BookOpen, tone: 'neutral' };
}
