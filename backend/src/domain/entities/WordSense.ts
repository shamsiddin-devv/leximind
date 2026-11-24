import { BadRequestError } from '../errors/BadRequestError';

export interface IWordSenseProps {
  id?: string;
  wordId?: string;
  definition: string;
  exampleSentence: string;
  exampleAudioUrl?: string | null;
  translationUz: string;
  orderIndex: number;
}

export class WordSense {
  constructor(private props: IWordSenseProps) {
    if (
      typeof props.definition !== 'string' ||
      !props.definition.trim() ||
      props.definition.length > 255
    ) {
      throw new BadRequestError('Definition is required.');
    }

    if (
      typeof props.exampleSentence !== 'string' ||
      (props.exampleSentence !== '' && !props.exampleSentence.trim()) ||
      props.exampleSentence.length > 255
    ) {
      throw new BadRequestError('Example sentence is invalid.');
    }

    if (
      typeof props.translationUz !== 'string' ||
      !props.translationUz.trim() ||
      props.translationUz.length > 255
    ) {
      throw new BadRequestError('Translation Uz is required.');
    }

    if (!Number.isInteger(props.orderIndex) || props.orderIndex < 0) {
      throw new BadRequestError('Order index is required.');
    }
  }

  get id() {
    return this.props.id;
  }
  get wordId() {
    return this.props.wordId;
  }
  get definition() {
    return this.props.definition;
  }
  get exampleSentence() {
    return this.props.exampleSentence;
  }
  get exampleAudioUrl() {
    return this.props.exampleAudioUrl ?? undefined;
  }
  get translationUz() {
    return this.props.translationUz;
  }
  get orderIndex() {
    return this.props.orderIndex;
  }
}
