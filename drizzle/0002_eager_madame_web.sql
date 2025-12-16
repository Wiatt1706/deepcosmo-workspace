ALTER TABLE "verification" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "verification" ADD COLUMN "deleted_at" timestamp;