ALTER TABLE "services" ALTER COLUMN "stack_type" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "services" ALTER COLUMN "stack_type" SET DEFAULT 'SPA'::text;--> statement-breakpoint
DROP TYPE "public"."STACK_TYPE";--> statement-breakpoint
CREATE TYPE "public"."STACK_TYPE" AS ENUM('SPA', 'FUNCTION', 'WEB_SERVICE');--> statement-breakpoint
ALTER TABLE "services" ALTER COLUMN "stack_type" SET DEFAULT 'SPA'::"public"."STACK_TYPE";--> statement-breakpoint
ALTER TABLE "services" ALTER COLUMN "stack_type" SET DATA TYPE "public"."STACK_TYPE" USING "stack_type"::"public"."STACK_TYPE";