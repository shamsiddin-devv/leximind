import { CefrLevel } from "src/domain/entities/Word";
import { WordSense } from "src/domain/entities/WordSense";

export interface CreateWordDto {
  text: string;
  cefrLevel: CefrLevel;
  sense: WordSense[];
  audioUrl?: string;
}
