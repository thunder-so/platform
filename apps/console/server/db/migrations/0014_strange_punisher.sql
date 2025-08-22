/* 
    Unfortunately in current drizzle-kit version we can't automatically get name for primary key.
    We are working on making it available!

    Meanwhile you can:
        1. Check pk name in your database, by running
            SELECT constraint_name FROM information_schema.table_constraints
            WHERE table_schema = 'public'
                AND table_name = 'destroys'
                AND constraint_type = 'PRIMARY KEY';
        2. Uncomment code below and paste pk name manually
        
    Hope to release this update as soon as possible
*/

-- ALTER TABLE "destroys" DROP CONSTRAINT "<constraint_name>";--> statement-breakpoint
ALTER TABLE "destroys" DROP CONSTRAINT "destroys_pkey";--> statement-breakpoint
ALTER TABLE "destroys" ADD COLUMN "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "destroys" ALTER COLUMN "destroy_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "services" ALTER COLUMN "stack_type" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "services" ALTER COLUMN "stack_version" SET NOT NULL;--> statement-breakpoint
CREATE INDEX "applications_organization_id_idx" ON "applications" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "environments_application_id_idx" ON "environments" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "environments_provider_id_idx" ON "environments" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX "providers_organization_id_idx" ON "providers" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "services_environment_id_idx" ON "services" USING btree ("environment_id");--> statement-breakpoint
CREATE INDEX "services_installation_id_idx" ON "services" USING btree ("installation_id");