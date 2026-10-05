import { BadRequestError } from "../errors/BadRequestError";

const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;

export type CefrLevel = typeof CEFR_LEVELS[number];

export interface IWordProps {
  id?: string;
  text: string;
  cefrLevel: CefrLevel;
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

    this.props.text = props.text.trim().toLowerCase();
  }

  hasAudio(): boolean {
    return this.props.audioUrl !== undefined;
  }

  get id() { return this.props.id; }
  get text() { return this.props.text; }
  get cefrLevel() { return this.props.cefrLevel; }
  get audioUrl() { return this.props.audioUrl; }
  get createdAt() { return this.props.createdAt; }
  get updatedAt() { return this.props.updatedAt; }
}