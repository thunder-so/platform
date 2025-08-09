-- Step 1: Drop the foreign key from subscriptions that depends on the unique constraint.
ALTER TABLE "subscriptions" DROP CONSTRAINT "subscriptions_polar_customer_id_customers_polar_customer_id_fk";
--> statement-breakpoint

-- Step 2: Now it's safe to drop the unique constraint from customers.
ALTER TABLE "customers" DROP CONSTRAINT "customers_polar_customer_id_unique";
--> statement-breakpoint

-- Step 3: Drop the old single-column primary key from customers.
ALTER TABLE "customers" DROP CONSTRAINT "customers_pkey";
--> statement-breakpoint

-- Step 4: Add the new composite primary key to customers.
ALTER TABLE "customers" ADD CONSTRAINT "customers_user_id_organization_id_pk" PRIMARY KEY("user_id","organization_id");
--> statement-breakpoint

-- Step 5: DATA MIGRATION - Backfill the customers table from existing subscriptions data.
INSERT INTO "customers" (user_id, organization_id, polar_customer_id)
SELECT
    user_id,
    organization_id,
    polar_customer_id
FROM
    "subscriptions"
ON CONFLICT (user_id, organization_id) DO NOTHING;
--> statement-breakpoint

-- Step 6: Add the new composite foreign key to subscriptions.
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_organization_id_customers_user_id_organization_id_fk" FOREIGN KEY ("user_id","organization_id") REFERENCES "public"."customers"("user_id","organization_id") ON DELETE no action ON UPDATE no action;