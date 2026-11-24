import type { IWordRepository } from '../../../domain/repositories/IWordRepository';

export class GetDailyWord {
  constructor(private readonly words: IWordRepository) {}

  execute(now = new Date()) {
    return this.words.findDaily(Math.floor(now.getTime() / 86_400_000));
  }
}
