CREATE TYPE "public"."NOTIFICATION_CHANNEL" AS ENUM('EMAIL', 'SLACK', 'DISCORD', 'IN_APP');--> statement-breakpoint
CREATE TYPE "public"."NOTIFICATION_TYPE" AS ENUM('APP_BUILD_SUCCESS', 'APP_BUILD_FAILURE', 'APP_DEPLOY_SUCCESS', 'APP_DEPLOY_FAILURE');--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"environment_id" text NOT NULL,
	"type" "NOTIFICATION_TYPE" NOT NULL,
	"channel" "NOTIFICATION_CHANNEL" DEFAULT 'EMAIL' NOT NULL,
	"metadata" jsonb NOT NULL,
	"created_at" timestamp (6) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_environment_id_environments_id_fk" FOREIGN KEY ("environment_id") REFERENCES "public"."environments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notifications_organization_id_idx" ON "notifications" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "notifications_environment_id_idx" ON "notifications" USING btree ("environment_id");--> statement-breakpoint
CREATE INDEX "notifications_type_idx" ON "notifications" USING btree ("type");