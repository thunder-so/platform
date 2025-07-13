ALTER TABLE "plans" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "plans" CASCADE;--> statement-breakpoint
-- ALTER TABLE "organizations" DROP CONSTRAINT "organizations_plan_id_plans_id_fk";
--> statement-breakpoint
ALTER TABLE "organizations" ALTER COLUMN "plan_id" SET DATA TYPE text;--> statement-breakpoint
DROP TABLE "payments" CASCADE;--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"metadata" jsonb NOT NULL,
	"created_at" timestamp(6) with time zone DEFAULT now() NOT NULL,
	"organization_id" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "polar_customer_id" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "polar_subscription_id" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "subscription_status" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "subscription_period_start" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "subscription_period_end" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "subscription_cancel_at_period_end" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_polar_customer_id_unique" UNIQUE("polar_customer_id");--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_polar_subscription_id_unique" UNIQUE("polar_subscription_id");
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payments" ADD CONSTRAINT "payments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;