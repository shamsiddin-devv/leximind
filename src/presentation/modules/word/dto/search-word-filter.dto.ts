import { CefrLevel } from "src/domain/entities/Word";

export interface SearchWordFilterDto {
  cefrLevel?: CefrLevel;
  search?: string;
  excludeIds?: string[];
  page?: number;
  limit?: number;
}
