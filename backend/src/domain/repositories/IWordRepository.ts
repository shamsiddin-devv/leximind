import { CefrLevel, Word } from '../entities/Word';

export interface WordFilters {
  cefrLevel?: CefrLevel;
  search?: string;
  topic?: string;
  after?: string;
  excludeIds?: string[];
  page?: number;
  limit?: number;
}

export interface WordListResult {
  data: Word[];
  total: number;
  page: number;
  limit: number;
  totalPage: number;
  nextCursor?: string;
}

export interface IWordRepository {
  findById(id: string): Promise<Word | null>;
  editSenses(id: string, edit: (word: Word) => Word): Promise<Word>;
  findByText(text: string, cefrLevel: CefrLevel): Promise<Word | null>;
  findAll(filters: WordFilters): Promise<WordListResult>;
  create(word: Word): Promise<Word>;
  createMany(word: Word[]): Promise<void>;
  delete(id: string): Promise<void>;
  update(id: string, word: Word): Promise<Word>;
}
