ALTER TABLE "customers" RENAME COLUMN "id" TO "user_id";--> statement-breakpoint
ALTER TABLE "customers" DROP CONSTRAINT "customers_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "organization_id" text;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
CREATE INDEX "customers_organization_id_idx" ON "customers" USING btree ("organization_id");