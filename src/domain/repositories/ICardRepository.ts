import { Card, CardStateType } from "../entities/Card";


export interface CardFilters {
  userId?: string;
  wordId?: string;
  state?: CardStateType;
  page?: number;
  pageSize?: number;
  limit?: number;
};

export interface CardResult {
  data: Card[];
  total: number;
  page: number;
  pageSize: number;
  totalPage: number
}

export interface ICardRepository {
  findById(id: string): Promise<Card | null>;
  findByUserId(userId: string): Promise<Card | null>;
  findUnique(userId: string, wordId: string): Promise<Card | null>;
  findAll(filter: CardFilters): Promise<CardResult | null>
  create(data: Card): Promise<Card | null>;
  createMany(data: Card[]): Promise<void>;
  update(id: string, data: Card): Promise<Card | null>;
};