import { CardStateType } from 'src/domain/entities/Card';

export interface CreateCardUseCaseDto {
  userId: string;
  wordId: string;
  stability: number;
  difficulty: number;
  due: Date;
  reps: number;
  lapses: number;
  state: CardStateType;
};