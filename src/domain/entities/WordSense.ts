import { BadRequestError } from "../errors/BadRequestError";

export interface IWordSenseProps {
  id?: string;
  wordId: string;
  definition: string;
  exampleSentence: string;
  translationUz: string;
  orderIndex: number;
}

export class WordSense {
  constructor(private props: IWordSenseProps) {
    if(!props.wordId) {
      throw new BadRequestError('Word id is required.');
    };

    if(!props.definition || props.definition.trim() === '') {
      throw new BadRequestError('Definition is required.');
    };

    if(!props.exampleSentence || props.exampleSentence.trim() === '') {
      throw new BadRequestError('Example sentence is required.');    
    };

    if(!props.translationUz || props.translationUz.trim() === '') {
      throw new BadRequestError('Translation Uz is required.');
    };

    if(!props.orderIndex) {
      throw new BadRequestError('Order index is required.');
    };
  };

  get id() { return this.props.id }
  get wordId() { return this.props.wordId }
  get definition() { return this.props.definition }
  get exampleSentence() { return this.props.exampleSentence }
  get translationUz() { return this.props.translationUz }
  get orderIndex() { return this.props.orderIndex }
};