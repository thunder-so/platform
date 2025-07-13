CREATE TYPE "public"."PRICING_PLAN_INTERVAL" AS ENUM('month', 'year');--> statement-breakpoint
CREATE TYPE "public"."PRICING_TYPE" AS ENUM('one_time', 'recurring');--> statement-breakpoint
CREATE TYPE "public"."SUBSCRIPTION_STATUS" AS ENUM('trialing', 'active', 'canceled', 'incomplete', 'incomplete_expired', 'past_due', 'unpaid', 'paused');--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY NOT NULL,
	"polar_customer_id" text NOT NULL,
	CONSTRAINT "customers_polar_customer_id_unique" UNIQUE("polar_customer_id")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" text PRIMARY KEY NOT NULL,
	"active" boolean NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"metadata" jsonb,
	"created_at" timestamp (6) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (6) with time zone
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"polar_customer_id" text NOT NULL,
	"status" "SUBSCRIPTION_STATUS" NOT NULL,
	"product_id" text,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"created" timestamp (6) with time zone DEFAULT now() NOT NULL,
	"current_period_start" timestamp (6) with time zone DEFAULT now() NOT NULL,
	"current_period_end" timestamp (6) with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp (6) with time zone,
	"cancel_at" timestamp (6) with time zone,
	"canceled_at" timestamp (6) with time zone,
	"metadata" jsonb
);
--> statement-breakpoint
ALTER TABLE "payments" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "payments" CASCADE;--> statement-breakpoint
ALTER TABLE "organizations" DROP CONSTRAINT "organizations_polar_customer_id_unique";--> statement-breakpoint
ALTER TABLE "organizations" DROP CONSTRAINT "organizations_polar_subscription_id_unique";--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_id_users_id_fk" FOREIGN KEY ("id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_polar_customer_id_customers_polar_customer_id_fk" FOREIGN KEY ("polar_customer_id") REFERENCES "public"."customers"("polar_customer_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "customers_polar_customer_id_idx" ON "customers" USING btree ("polar_customer_id");--> statement-breakpoint
CREATE INDEX "subscriptions_user_id_idx" ON "subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "subscriptions_polar_customer_id_idx" ON "subscriptions" USING btree ("polar_customer_id");--> statement-breakpoint
ALTER TABLE "organizations" DROP COLUMN "plan_id";--> statement-breakpoint
ALTER TABLE "organizations" DROP COLUMN "polar_customer_id";--> statement-breakpoint
ALTER TABLE "organizations" DROP COLUMN "polar_subscription_id";--> statement-breakpoint
ALTER TABLE "organizations" DROP COLUMN "subscription_status";--> statement-breakpoint
ALTER TABLE "organizations" DROP COLUMN "subscription_period_start";--> statement-breakpoint
ALTER TABLE "organizations" DROP COLUMN "subscription_period_end";--> statement-breakpoint
ALTER TABLE "organizations" DROP COLUMN "subscription_cancel_at_period_end";