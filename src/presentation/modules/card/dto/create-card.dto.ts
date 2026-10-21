import { CardStateType } from 'src/domain/entities/Card';

export class CreateCardDto {
  userId: string;
  wordId: string;
  stability: number;
  difficulty: number;
  due: Date;
  reps: number;
  lapses: number;
  state: CardStateType;
}
