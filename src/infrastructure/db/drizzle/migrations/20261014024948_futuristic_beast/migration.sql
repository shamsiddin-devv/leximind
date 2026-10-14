CREATE TYPE "cefr_level" AS ENUM('A1', 'A2', 'B1', 'B2', 'C1', 'C2');--> statement-breakpoint
CREATE TYPE "game_type" AS ENUM('word_span', 'sequence_memory', 'meaning_match', 'visual_grid', 'word_rush');--> statement-breakpoint
CREATE TYPE "session_status" AS ENUM('in_progress', 'completed');--> statement-breakpoint
CREATE TABLE "assessment_result" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"resulting_level" varchar(255) NOT NULL,
	"correct_count" integer NOT NULL,
	"total_question" integer NOT NULL,
	"taken_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"word_id" uuid NOT NULL,
	"stability" real NOT NULL,
	"difficulty" real NOT NULL,
	"due" timestamp NOT NULL,
	"reps" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	CONSTRAINT "cards_user_id_word_id_unique" UNIQUE("user_id","word_id")
);
--> statement-breakpoint
CREATE TABLE "game_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"game_type" "game_type" NOT NULL,
	"score" integer NOT NULL,
	"playedAt" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "learner_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"level" "cefr_level" NOT NULL,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"streak_day" integer NOT NULL,
	"daily_new_words" integer NOT NULL,
	"xp_multiplier" integer NOT NULL,
	"last_session_at" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "review_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"card_id" uuid NOT NULL,
	"rating" varchar(255) NOT NULL,
	"response_ms" integer NOT NULL,
	"reviewed_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"status" varchar(255) NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"ended_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "session_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"session_id" uuid NOT NULL,
	"card_id" uuid NOT NULL,
	"format" varchar(255) NOT NULL,
	"order_index" varchar(255) NOT NULL,
	"completed" boolean NOT NULL,
	"correct" boolean,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"full_name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL UNIQUE,
	"password_hash" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "word_senses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"word_id" uuid NOT NULL,
	"definition" varchar(255) NOT NULL,
	"example_sentence" varchar(255) NOT NULL,
	"translation_uz" varchar(255) NOT NULL,
	"order_index" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "words" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"text" text NOT NULL,
	"cefr_level" "cefr_level" NOT NULL,
	"audio_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	CONSTRAINT "words_cefr_level_text_unique" UNIQUE("cefr_level","text")
);
--> statement-breakpoint
ALTER TABLE "assessment_result" ADD CONSTRAINT "assessment_result_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "cards" ADD CONSTRAINT "cards_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "cards" ADD CONSTRAINT "cards_word_id_words_id_fkey" FOREIGN KEY ("word_id") REFERENCES "words"("id");--> statement-breakpoint
ALTER TABLE "game_scores" ADD CONSTRAINT "game_scores_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "learner_profiles" ADD CONSTRAINT "learner_profiles_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "review_logs" ADD CONSTRAINT "review_logs_card_id_cards_id_fkey" FOREIGN KEY ("card_id") REFERENCES "cards"("id");--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "session_tasks" ADD CONSTRAINT "session_tasks_session_id_sessions_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id");--> statement-breakpoint
ALTER TABLE "session_tasks" ADD CONSTRAINT "session_tasks_card_id_cards_id_fkey" FOREIGN KEY ("card_id") REFERENCES "cards"("id");--> statement-breakpoint
ALTER TABLE "word_senses" ADD CONSTRAINT "word_senses_word_id_words_id_fkey" FOREIGN KEY ("word_id") REFERENCES "words"("id");