ALTER TABLE "services" ADD COLUMN "pipeline_metadata" jsonb;--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "cloudfront_metadata" jsonb;--> statement-breakpoint
ALTER TABLE "services" DROP COLUMN "owner";--> statement-breakpoint
ALTER TABLE "services" DROP COLUMN "repo";--> statement-breakpoint
ALTER TABLE "services" DROP COLUMN "branch";