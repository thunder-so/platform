-- ALTER TABLE "services" ALTER COLUMN "stack_type" SET DATA TYPE text;--> statement-breakpoint
-- ALTER TABLE "services" ALTER COLUMN "stack_type" SET DEFAULT 'STATIC'::text;--> statement-breakpoint
-- DROP TYPE "public"."STACK_TYPE";--> statement-breakpoint
-- CREATE TYPE "public"."STACK_TYPE" AS ENUM('STATIC', 'LAMBDA', 'FARGATE');--> statement-breakpoint
-- ALTER TABLE "services" ALTER COLUMN "stack_type" SET DEFAULT 'STATIC'::"public"."STACK_TYPE";--> statement-breakpoint
-- ALTER TABLE "services" ALTER COLUMN "stack_type" SET DATA TYPE "public"."STACK_TYPE" USING "stack_type"::"public"."STACK_TYPE";--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "root_dir" text DEFAULT '/';