CREATE TYPE "card_state" AS ENUM('NEW', 'LEARNING', 'REVIEW', 'RELEARNING');--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "state" "card_state" NOT NULL;--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "lapses" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "last_review_at" timestamp;