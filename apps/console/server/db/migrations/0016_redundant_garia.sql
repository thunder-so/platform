CREATE TYPE "public"."BUILD_SYSTEM" AS ENUM('Nixpacks', 'Buildpacks', 'Custom Dockerfile');--> statement-breakpoint
CREATE TYPE "public"."VARIABLE_TYPE" AS ENUM('build', 'runtime');--> statement-breakpoint
CREATE TABLE "service_secrets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"resource_arn" text,
	"type" "VARIABLE_TYPE" NOT NULL,
	"service_id" text NOT NULL,
	"created_at" timestamp (6) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (6) with time zone DEFAULT now(),
	"deleted_at" timestamp (6) with time zone
);
--> statement-breakpoint
CREATE TABLE "service_variables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"type" "VARIABLE_TYPE" NOT NULL,
	"service_id" text NOT NULL,
	"created_at" timestamp (6) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (6) with time zone DEFAULT now(),
	"deleted_at" timestamp (6) with time zone
);
--> statement-breakpoint
ALTER TABLE "environment_variables" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "environment_variables" CASCADE;--> statement-breakpoint
ALTER TABLE "domains" RENAME COLUMN "hostedZoneId" TO "hosted_zone_id";--> statement-breakpoint
ALTER TABLE "domains" RENAME COLUMN "globalCertificateArn" TO "global_certificate_arn";--> statement-breakpoint
ALTER TABLE "domains" RENAME COLUMN "regionalCertificateArn" TO "regional_certificate_arn";--> statement-breakpoint
ALTER TABLE "domains" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "domains" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
-- ALTER TABLE "domains" ALTER COLUMN "id" DROP IDENTITY;--> statement-breakpoint
ALTER TABLE "providers" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "owner" text;--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "repo" text;--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "branch" text;--> statement-breakpoint
ALTER TABLE "service_secrets" ADD CONSTRAINT "service_secrets_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_variables" ADD CONSTRAINT "service_variables_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" DROP COLUMN "app_props";--> statement-breakpoint
ALTER TABLE "services" DROP COLUMN "cdn_props";--> statement-breakpoint
ALTER TABLE "services" DROP COLUMN "edge_props";--> statement-breakpoint
ALTER TABLE "services" DROP COLUMN "domain_props";--> statement-breakpoint
ALTER TABLE "services" DROP COLUMN "pipeline_props";