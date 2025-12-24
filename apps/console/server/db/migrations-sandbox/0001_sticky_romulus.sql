ALTER TYPE "public"."STACK_TYPE" ADD VALUE 'ECS';--> statement-breakpoint
ALTER TYPE "public"."STACK_TYPE" ADD VALUE 'CRON';--> statement-breakpoint
ALTER TYPE "public"."STACK_TYPE" ADD VALUE 'THIRD_PARTY';--> statement-breakpoint
ALTER TABLE "applications" DROP CONSTRAINT "applications_organization_fkey";
--> statement-breakpoint
ALTER TABLE "builds" DROP CONSTRAINT "builds_service_fkey";
--> statement-breakpoint
ALTER TABLE "builds" DROP CONSTRAINT "builds_environment_fkey";
--> statement-breakpoint
ALTER TABLE "destroys" DROP CONSTRAINT "destroys_service_fkey";
--> statement-breakpoint
ALTER TABLE "destroys" DROP CONSTRAINT "destroys_environment_fkey";
--> statement-breakpoint
ALTER TABLE "domains" DROP CONSTRAINT "domains_service_fkey";
--> statement-breakpoint
ALTER TABLE "environment_variables" DROP CONSTRAINT "environment_variables_environment_fkey";
--> statement-breakpoint
ALTER TABLE "environments" DROP CONSTRAINT "environments_provider_fkey";
--> statement-breakpoint
ALTER TABLE "environments" DROP CONSTRAINT "environments_application_fkey";
--> statement-breakpoint
ALTER TABLE "events" DROP CONSTRAINT "events_service_fkey";
--> statement-breakpoint
ALTER TABLE "events" DROP CONSTRAINT "events_environment_fkey";
--> statement-breakpoint
ALTER TABLE "installations" DROP CONSTRAINT "installations_user_fkey";
--> statement-breakpoint
ALTER TABLE "memberships" DROP CONSTRAINT "memberships_organization_fkey";
--> statement-breakpoint
ALTER TABLE "memberships" DROP CONSTRAINT "memberships_users_fkey";
--> statement-breakpoint
ALTER TABLE "organizations" DROP CONSTRAINT "organizations_plan_fkey";
--> statement-breakpoint
ALTER TABLE "payments" DROP CONSTRAINT "payments_organization_fkey";
--> statement-breakpoint
ALTER TABLE "providers" DROP CONSTRAINT "providers_organization_fkey";
--> statement-breakpoint
ALTER TABLE "services" DROP CONSTRAINT "services_environment_fkey";
--> statement-breakpoint
ALTER TABLE "services" DROP CONSTRAINT "services_installation_fkey";
--> statement-breakpoint
ALTER TABLE "user_access_tokens" DROP CONSTRAINT "user_access_tokens_users_fkey";
--> statement-breakpoint
ALTER TABLE "user_access_tokens" DROP CONSTRAINT "user_access_tokens_environment_fkey";
--> statement-breakpoint
DROP INDEX "memberships_user_id_organization_id_key";--> statement-breakpoint
ALTER TABLE "applications" ALTER COLUMN "id" SET DATA TYPE varchar(32);--> statement-breakpoint
ALTER TABLE "applications" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "applications" ALTER COLUMN "created_at" SET DATA TYPE timestamp (6) with time zone;--> statement-breakpoint
ALTER TABLE "applications" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "applications" ALTER COLUMN "deleted_at" SET DATA TYPE timestamp (6) with time zone;--> statement-breakpoint
ALTER TABLE "builds" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "builds" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "builds" ALTER COLUMN "build_start" SET DATA TYPE timestamp (6) with time zone;--> statement-breakpoint
ALTER TABLE "builds" ALTER COLUMN "build_end" SET DATA TYPE timestamp (6) with time zone;--> statement-breakpoint
ALTER TABLE "builds" ALTER COLUMN "created_at" SET DATA TYPE timestamp (6) with time zone;--> statement-breakpoint
ALTER TABLE "builds" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "builds" ALTER COLUMN "updated_at" SET DATA TYPE timestamp (6) with time zone;--> statement-breakpoint
ALTER TABLE "builds" ALTER COLUMN "deleted_at" SET DATA TYPE timestamp (6) with time zone;--> statement-breakpoint
ALTER TABLE "destroys" ALTER COLUMN "created_at" SET DATA TYPE timestamp (6) with time zone;--> statement-breakpoint
ALTER TABLE "destroys" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "destroys" ALTER COLUMN "updated_at" SET DATA TYPE timestamp (6) with time zone;--> statement-breakpoint
ALTER TABLE "destroys" ALTER COLUMN "deleted_at" SET DATA TYPE timestamp (6) with time zone;--> statement-breakpoint
ALTER TABLE "domains" ALTER COLUMN "id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "domains" ALTER COLUMN "created_at" SET DATA TYPE timestamp (6) with time zone;--> statement-breakpoint
ALTER TABLE "domains" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "domains" ALTER COLUMN "updated_at" SET DATA TYPE timestamp (6) with time zone;--> statement-breakpoint
ALTER TABLE "domains" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "domains" ALTER COLUMN "deleted_at" SET DATA TYPE timestamp (6) with time zone;--> statement-breakpoint
ALTER TABLE "environment_variables" ALTER COLUMN "id" SET DATA TYPE varchar(32);--> statement-breakpoint
ALTER TABLE "environment_variables" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "environment_variables" ALTER COLUMN "created_at" SET DATA TYPE timestamp (6) with time zone;--> statement-breakpoint
ALTER TABLE "environment_variables" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "environment_variables" ALTER COLUMN "updated_at" SET DATA TYPE timestamp (6) with time zone;--> statement-breakpoint
ALTER TABLE "environment_variables" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "environment_variables" ALTER COLUMN "deleted_at" SET DATA TYPE timestamp (6) with time zone;--> statement-breakpoint
ALTER TABLE "environments" ALTER COLUMN "id" SET DATA TYPE varchar(32);--> statement-breakpoint
ALTER TABLE "environments" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "environments" ALTER COLUMN "created_at" SET DATA TYPE timestamp (6) with time zone;--> statement-breakpoint
ALTER TABLE "environments" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "environments" ALTER COLUMN "updated_at" SET DATA TYPE timestamp (6) with time zone;--> statement-breakpoint
ALTER TABLE "environments" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "environments" ALTER COLUMN "deleted_at" SET DATA TYPE timestamp (6) with time zone;--> statement-breakpoint
ALTER TABLE "events" ALTER COLUMN "pipeline_start" SET DATA TYPE timestamp (6) with time zone;--> statement-breakpoint
ALTER TABLE "events" ALTER COLUMN "pipeline_end" SET DATA TYPE timestamp (6) with time zone;--> statement-breakpoint
ALTER TABLE "events" ALTER COLUMN "created_at" SET DATA TYPE timestamp (6) with time zone;--> statement-breakpoint
ALTER TABLE "events" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "events" ALTER COLUMN "updated_at" SET DATA TYPE timestamp (6) with time zone;--> statement-breakpoint
ALTER TABLE "events" ALTER COLUMN "deleted_at" SET DATA TYPE timestamp (6) with time zone;--> statement-breakpoint
ALTER TABLE "installations" ALTER COLUMN "id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "installations" ALTER COLUMN "created_at" SET DATA TYPE timestamp (6) with time zone;--> statement-breakpoint
ALTER TABLE "installations" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "installations" ALTER COLUMN "updated_at" SET DATA TYPE timestamp (6) with time zone;--> statement-breakpoint
ALTER TABLE "installations" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "installations" ALTER COLUMN "deleted_at" SET DATA TYPE timestamp (6) with time zone;--> statement-breakpoint
ALTER TABLE "installations" ALTER COLUMN "user_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "memberships" ALTER COLUMN "id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "memberships" ALTER COLUMN "user_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "memberships" ALTER COLUMN "pending" SET DEFAULT false;--> statement-breakpoint
ALTER TABLE "memberships" ALTER COLUMN "created_at" SET DATA TYPE timestamp (6) with time zone;--> statement-breakpoint
ALTER TABLE "memberships" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "memberships" ALTER COLUMN "updated_at" SET DATA TYPE timestamp (6) with time zone;--> statement-breakpoint
ALTER TABLE "memberships" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "memberships" ALTER COLUMN "deleted_at" SET DATA TYPE timestamp (6) with time zone;--> statement-breakpoint
ALTER TABLE "organizations" ALTER COLUMN "id" SET DATA TYPE varchar(32);--> statement-breakpoint
ALTER TABLE "organizations" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "organizations" ALTER COLUMN "created_at" SET DATA TYPE timestamp (6) with time zone;--> statement-breakpoint
ALTER TABLE "organizations" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "organizations" ALTER COLUMN "updated_at" SET DATA TYPE timestamp (6) with time zone;--> statement-breakpoint
ALTER TABLE "organizations" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "organizations" ALTER COLUMN "deleted_at" SET DATA TYPE timestamp (6) with time zone;--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "created_at" SET DATA TYPE timestamp (6) with time zone;--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "plans" ALTER COLUMN "id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "plans" ALTER COLUMN "created_at" SET DATA TYPE timestamp (6) with time zone;--> statement-breakpoint
ALTER TABLE "plans" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "plans" ALTER COLUMN "updated_at" SET DATA TYPE timestamp (6) with time zone;--> statement-breakpoint
ALTER TABLE "plans" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "plans" ALTER COLUMN "deleted_at" SET DATA TYPE timestamp (6) with time zone;--> statement-breakpoint
ALTER TABLE "providers" ALTER COLUMN "id" SET DATA TYPE varchar(32);--> statement-breakpoint
ALTER TABLE "providers" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "providers" ALTER COLUMN "created_at" SET DATA TYPE timestamp (6) with time zone;--> statement-breakpoint
ALTER TABLE "providers" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "providers" ALTER COLUMN "updated_at" SET DATA TYPE timestamp (6) with time zone;--> statement-breakpoint
ALTER TABLE "providers" ALTER COLUMN "deleted_at" SET DATA TYPE timestamp (6) with time zone;--> statement-breakpoint
ALTER TABLE "services" ALTER COLUMN "id" SET DATA TYPE varchar(32);--> statement-breakpoint
ALTER TABLE "services" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "services" ALTER COLUMN "created_at" SET DATA TYPE timestamp (6) with time zone;--> statement-breakpoint
ALTER TABLE "services" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "services" ALTER COLUMN "updated_at" SET DATA TYPE timestamp (6) with time zone;--> statement-breakpoint
ALTER TABLE "services" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "services" ALTER COLUMN "deleted_at" SET DATA TYPE timestamp (6) with time zone;--> statement-breakpoint
ALTER TABLE "user_access_tokens" ALTER COLUMN "secret_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "user_access_tokens" ALTER COLUMN "secret_id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "user_access_tokens" ALTER COLUMN "user_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "user_access_tokens" ALTER COLUMN "created_at" SET DATA TYPE timestamp (6) with time zone;--> statement-breakpoint
ALTER TABLE "user_access_tokens" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "user_access_tokens" ALTER COLUMN "updated_at" SET DATA TYPE timestamp (6) with time zone;--> statement-breakpoint
ALTER TABLE "user_access_tokens" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "user_access_tokens" ALTER COLUMN "deleted_at" SET DATA TYPE timestamp (6) with time zone;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "updated_at" SET DATA TYPE timestamp (6) with time zone;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "builds" ADD CONSTRAINT "builds_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "builds" ADD CONSTRAINT "builds_environment_id_environments_id_fk" FOREIGN KEY ("environment_id") REFERENCES "public"."environments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "destroys" ADD CONSTRAINT "destroys_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "destroys" ADD CONSTRAINT "destroys_environment_id_environments_id_fk" FOREIGN KEY ("environment_id") REFERENCES "public"."environments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "domains" ADD CONSTRAINT "domains_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "environment_variables" ADD CONSTRAINT "environment_variables_environment_id_environments_id_fk" FOREIGN KEY ("environment_id") REFERENCES "public"."environments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "environments" ADD CONSTRAINT "environments_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "environments" ADD CONSTRAINT "environments_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_environment_id_environments_id_fk" FOREIGN KEY ("environment_id") REFERENCES "public"."environments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "installations" ADD CONSTRAINT "installations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "providers" ADD CONSTRAINT "providers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_environment_id_environments_id_fk" FOREIGN KEY ("environment_id") REFERENCES "public"."environments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_installation_id_installations_installation_id_fk" FOREIGN KEY ("installation_id") REFERENCES "public"."installations"("installation_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_access_tokens" ADD CONSTRAINT "user_access_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_access_tokens" ADD CONSTRAINT "user_access_tokens_environment_id_environments_id_fk" FOREIGN KEY ("environment_id") REFERENCES "public"."environments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "builds_build_id_idx" ON "builds" USING btree ("build_id");--> statement-breakpoint
ALTER TABLE "destroys" ADD CONSTRAINT "destroys_destroy_id_unique" UNIQUE("destroy_id");--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_pipeline_execution_id_unique" UNIQUE("pipeline_execution_id");--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_organization_id_unique" UNIQUE("user_id","organization_id");