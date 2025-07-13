ALTER TABLE "providers" ADD COLUMN "access_key_id" text;--> statement-breakpoint
-- CREATE INDEX "customers_organization_id_idx" ON "customers" USING btree ("organization_id");