import { BadRequestError } from "../errors/BadRequestError";
import { WordSense } from "./WordSense";

const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;

export type CefrLevel = typeof CEFR_LEVELS[number];

export interface IWordProps {
  id?: string;
  text: string;
  cefrLevel: CefrLevel;
  sense: WordSense[];
  audioUrl?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Word {
  constructor(private props: IWordProps) {
    if (!props.text || props.text.trim() === '') {
      throw new BadRequestError('Text is required.');
    }

    if (!CEFR_LEVELS.includes(props.cefrLevel)) {
      throw new BadRequestError(`Invalid CEFR level: ${props.cefrLevel}`);
    }

    if(!props.sense.length || props.sense.length === 0) {
      throw new BadRequestError('Word must have at least one sense.');
    }

    this.props.text = props.text.trim().toLowerCase();
  }

  hasAudio(): boolean {
    return this.props.audioUrl !== undefined;
  }

  get id() { return this.props.id; }
  get text() { return this.props.text; }
  get cefrLevel() { return this.props.cefrLevel; }
  get sense() { return this.props.sense; }
  get audioUrl() { return this.props.audioUrl; }
  get createdAt() { return this.props.createdAt; }
  get updatedAt() { return this.props.updatedAt; }
}