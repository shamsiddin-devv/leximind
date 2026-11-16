import type { CefrLevel } from '../../../domain/entities/Word';

export interface CreateWordUseCaseDto {
  text: string;
  cefrLevel: CefrLevel;
  sense: import('../../../domain/entities/WordSense').IWordSenseProps[];
  audioUrl?: string;
  topic?: string;
}
