import { CardStateType } from "../entities/Card";

export interface IScheduleResult {
  stability: number;
  difficulty: number;
  due: Date;
  reps: number;
  lapses: number;
  state: CardStateType;
  learningSteps: number;
};