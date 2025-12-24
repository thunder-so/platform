ALTER TABLE "services" ADD COLUMN "app_props" jsonb;--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "cdn_props" jsonb;--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "edge_props" jsonb;--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "domain_props" jsonb;--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "pipeline_props" jsonb;--> statement-breakpoint
ALTER TABLE "services" DROP COLUMN "runtime";--> statement-breakpoint
ALTER TABLE "services" DROP COLUMN "runtime_version";--> statement-breakpoint
ALTER TABLE "services" DROP COLUMN "redirects";--> statement-breakpoint
ALTER TABLE "services" DROP COLUMN "rewrites";--> statement-breakpoint
ALTER TABLE "services" DROP COLUMN "headers";