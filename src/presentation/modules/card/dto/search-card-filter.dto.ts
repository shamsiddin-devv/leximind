import { CardStateType } from "src/domain/entities/Card";

export interface SearchCardFilterDto {
  userId?: string;
  wordId?: string;
  state?: CardStateType;
  page?: number;
  pageSize?: number;
  limit?: number;
}
