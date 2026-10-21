import { BadRequestError } from '../errors/BadRequestError';

export const State = {
  NEW: 'NEW',
  LEARNING: 'LEARNING',
  REVIEW: 'REVIEW',
  RELEARNING: 'RELEARNING',
} as const;
export type CardStateType = (typeof State)[keyof typeof State];

export interface ICardProps {
  id?: string;
  userId: string;
  wordId: string;
  stability: number;
  difficulty: number;
  due: Date;
  reps: number;
  lapses: number;
  state: CardStateType;
  lastReviewedAt?: Date;
  createdAt?: Date;
}

export interface ICardReviewResult {
  stability: number;
  difficulty: number;
  due: Date;
  reps: number;
  lapses: number;
  state: CardStateType;
}

export class Card {
  constructor(private props: ICardProps) {
    this.validate(props);
  }

  private validate(props: ICardProps): void {
    if (!props.userId.trim()) {
      throw new BadRequestError('User id is required.');
    }

    if (!props.wordId.trim()) {
      throw new BadRequestError('Word id is required.');
    }

    if (!Number.isFinite(props.stability) || props.stability < 0) {
      throw new BadRequestError('Invalid stability.');
    }

    if (
      !Number.isFinite(props.difficulty) ||
      props.difficulty < 0 ||
      props.difficulty > 10
    ) {
      throw new BadRequestError('Invalid difficulty.');
    }

    if (!Number.isInteger(props.reps) || props.reps < 0) {
      throw new BadRequestError('Invalid reps.');
    }

    if (!Number.isInteger(props.lapses) || props.lapses < 0) {
      throw new BadRequestError('Invalid lapses.');
    }

    if (!(props.due instanceof Date) || Number.isNaN(props.due.getTime())) {
      throw new BadRequestError('Invalid due date.');
    }

    if (props.state === State.NEW) {
      if (
        props.stability !== 0 ||
        props.difficulty !== 0 ||
        props.reps !== 0 ||
        props.lapses !== 0 ||
        props.lastReviewedAt !== undefined
      ) {
        throw new BadRequestError('Invalid new card state.');
      }
    } else if (props.difficulty < 1) {
      throw new BadRequestError('Reviewed card difficulty must be at least 1.');
    }
  }

  static createNew(userId: string, wordId: string, now: Date): Card {
    return new Card({
      userId,
      wordId,
      stability: 0,
      difficulty: 0,
      state: State.NEW,
      due: now,
      reps: 0,
      lapses: 0,
    });
  }

  isNew(): boolean {
    return this.props.state === State.NEW;
  }

  isDue(now: Date): boolean {
    return this.props.due.getTime() <= now.getTime();
  }

  getSchedulingData() {
    return {
      stability: this.props.stability,
      difficulty: this.props.difficulty,
      due: this.props.due,
      reps: this.props.reps,
      lapses: this.props.lapses,
      state: this.props.state,
      lastReviewedAt: this.props.lastReviewedAt,
    };
  }

  applyReview(result: ICardReviewResult, now: Date): void {
    const nextProps: ICardProps = {
      ...this.props,
      ...result,
      lastReviewedAt: now,
    };

    this.validate(nextProps);

    this.props = nextProps;
  }

  get id() {
    return this.props.id;
  }
  get userId() {
    return this.props.userId;
  }
  get wordId() {
    return this.props.wordId;
  }
  get stability() {
    return this.props.stability;
  }
  get difficulty() {
    return this.props.difficulty;
  }
  get due() {
    return this.props.due;
  }
  get reps() {
    return this.props.reps;
  }
  get lapses() {
    return this.props.lapses;
  }
  get state() {
    return this.props.state;
  }
  get lastReviewedAt() {
    return this.props.lastReviewedAt;
  }
  get createdAt() {
    return this.props.createdAt;
  }
}
