ALTER TABLE "user_access_tokens" ALTER COLUMN "secret_id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "user_access_tokens" ALTER COLUMN "environment_id" DROP NOT NULL;