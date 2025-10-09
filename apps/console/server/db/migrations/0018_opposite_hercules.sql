ALTER TABLE "domains" ALTER COLUMN "hosted_zone_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "domains" ALTER COLUMN "global_certificate_arn" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "domains" ALTER COLUMN "regional_certificate_arn" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "domains" ADD COLUMN "verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "domains" ADD COLUMN "verified_at" timestamp (6) with time zone;--> statement-breakpoint
ALTER TABLE "domains" ADD COLUMN "verification_method" text;--> statement-breakpoint
ALTER TABLE "domains" ADD COLUMN "verification_meta" jsonb;
