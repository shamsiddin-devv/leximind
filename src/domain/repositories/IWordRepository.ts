import { CefrLevel, Word } from "../entities/Word";

export interface WordFilters {
  cefrLevel?: CefrLevel,
  search?: string,
  excludeIds?: string[],
  page?: number,
  limit?: number,
};

export interface WordListResult {
  data: Word[],
  total: number
  page: number,
  limit: number,
  totalPage: number,
}

export interface IWordRepository {
  findById(id: string): Promise<Word | null>
  findByText(text: string, cefrLevel: CefrLevel): Promise<Word | null>
  findAll(filters: WordFilters): Promise<WordListResult>
  create(word: Word): Promise<Word>,
  update(id: string, word: Word): Promise<Word>
};