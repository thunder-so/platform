ALTER TABLE "events" DROP CONSTRAINT "events_pipeline_execution_id_unique";--> statement-breakpoint
ALTER TABLE "services" ALTER COLUMN "stack_type" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "services" ALTER COLUMN "stack_type" SET DEFAULT 'STATIC'::text;--> statement-breakpoint
DROP TYPE "public"."STACK_TYPE";--> statement-breakpoint
CREATE TYPE "public"."STACK_TYPE" AS ENUM('STATIC', 'LAMBDA', 'FARGATE');--> statement-breakpoint
ALTER TABLE "services" ALTER COLUMN "stack_type" SET DEFAULT 'STATIC'::"public"."STACK_TYPE";--> statement-breakpoint
ALTER TABLE "services" ALTER COLUMN "stack_type" SET DATA TYPE "public"."STACK_TYPE" USING "stack_type"::"public"."STACK_TYPE";--> statement-breakpoint
ALTER TABLE "environments" ALTER COLUMN "provider_id" SET DATA TYPE uuid;--> statement-breakpoint
-- ALTER TABLE "services" ADD COLUMN "root_dir" text DEFAULT '/';--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "pipeline_metadata" jsonb;--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "cloudfront_metadata" jsonb;--> statement-breakpoint
ALTER TABLE "services" DROP COLUMN "owner";--> statement-breakpoint
ALTER TABLE "services" DROP COLUMN "repo";--> statement-breakpoint
ALTER TABLE "services" DROP COLUMN "branch";--> statement-breakpoint
DROP TYPE "public"."BUILD_SYSTEM";