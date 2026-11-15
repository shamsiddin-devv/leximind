import { Card, CardStateType } from '../entities/Card';

export interface CardFilters {
  dueBefore?: Date;
  userId?: string;
  wordId?: string;
  state?: CardStateType;
  page?: number;
  pageSize?: number;
  limit?: number;
}

export interface CardResult {
  data: Card[];
  total: number;
  page: number;
  pageSize: number;
  totalPage: number;
}

export interface ICardRepository {
  delete(id: string, userId: string): Promise<void>;
  setPaused(id: string, userId: string, paused: boolean): Promise<Card>;
  findById(id: string): Promise<Card | null>;
  findUnique(userId: string, wordId: string): Promise<Card | null>;
  findAll(filter: CardFilters): Promise<CardResult>;
  create(data: Card): Promise<Card>;
  createMany(data: Card[]): Promise<void>;
}
