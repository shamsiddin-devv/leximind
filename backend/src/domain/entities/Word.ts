import { BadRequestError } from '../errors/BadRequestError';
import { WordSense } from './WordSense';

const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;

export type CefrLevel = (typeof CEFR_LEVELS)[number];

export interface IWordProps {
  id?: string;
  text: string;
  cefrLevel: CefrLevel;
  sense: WordSense[];
  audioUrl?: string;
  topic?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Word {
  constructor(private props: IWordProps) {
    if (
      typeof props.text !== 'string' ||
      !props.text.trim() ||
      props.text.length > 255
    ) {
      throw new BadRequestError('Text is required.');
    }

    if (!CEFR_LEVELS.includes(props.cefrLevel)) {
      throw new BadRequestError(`Invalid CEFR level: ${props.cefrLevel}`);
    }

    if (
      !Array.isArray(props.sense) ||
      props.sense.length === 0 ||
      props.sense.length > 20
    ) {
      throw new BadRequestError('Word must have at least one sense.');
    }

    if (
      new Set(props.sense.map((s) => s.orderIndex)).size !== props.sense.length
    )
      throw new BadRequestError('Sense order indexes must be unique.');
    this.props.text = props.text.trim().toLowerCase();
  }

  hasAudio(): boolean {
    return this.props.audioUrl !== undefined;
  }
  withSenses(sense: WordSense[]): Word {
    return new Word({ ...this.props, sense });
  }

  get id() {
    return this.props.id;
  }
  get text() {
    return this.props.text;
  }
  get cefrLevel() {
    return this.props.cefrLevel;
  }
  get sense() {
    return this.props.sense;
  }
  get audioUrl() {
    return this.props.audioUrl;
  }
  get topic() {
    return this.props.topic;
  }
  get createdAt() {
    return this.props.createdAt;
  }
  get updatedAt() {
    return this.props.updatedAt;
  }
}
