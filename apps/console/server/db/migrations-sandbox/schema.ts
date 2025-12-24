import { pgTable, foreignKey, text, jsonb, timestamp, index, uniqueIndex, serial, integer, uuid, boolean, pgPolicy, varchar, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const accountAccess = pgEnum("ACCOUNT_ACCESS", ['READ_ONLY', 'READ_WRITE', 'ADMIN', 'OWNER'])
export const applicationStatus = pgEnum("APPLICATION_STATUS", ['PENDING', 'CONFIGURED', 'READY'])
export const buildStatus = pgEnum("BUILD_STATUS", ['NULL', 'IN_PROGRESS', 'SUCCEEDED', 'FAILED', 'FAULT', 'TIMED_OUT', 'STOPPED'])
export const pipelineStatus = pgEnum("PIPELINE_STATUS", ['NULL', 'STARTED', 'SUCCEEDED', 'RESUMED', 'FAILED', 'CANCELED', 'SUPERSEDED'])
export const stackType = pgEnum("STACK_TYPE", ['SPA', 'FUNCTION', 'WEB_SERVICE'])


export const environments = pgTable("environments", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	displayName: text("display_name").notNull(),
	metadata: jsonb(),
	region: text(),
	createdAt: timestamp("created_at", { precision: 6, withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 6, withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	deletedAt: timestamp("deleted_at", { precision: 6, withTimezone: true, mode: 'string' }),
	providerId: text("provider_id"),
	applicationId: text("application_id").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.applicationId],
			foreignColumns: [applications.id],
			name: "environments_application_id_fkey"
		}).onUpdate("cascade").onDelete("restrict"),
	foreignKey({
			columns: [table.providerId],
			foreignColumns: [providers.id],
			name: "environments_provider_id_fkey"
		}).onUpdate("cascade").onDelete("set null"),
]);

export const destroys = pgTable("destroys", {
	destroyId: text("destroy_id").primaryKey().notNull(),
	destroyStatus: buildStatus("destroy_status").default('NULL'),
	destroyContext: jsonb("destroy_context"),
	createdAt: timestamp("created_at", { precision: 6, withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 6, withTimezone: true, mode: 'string' }),
	deletedAt: timestamp("deleted_at", { precision: 6, withTimezone: true, mode: 'string' }),
	serviceId: text("service_id").notNull(),
	environmentId: text("environment_id").notNull(),
}, (table) => [
	index("destroys_destroy_id_idx").using("btree", table.destroyId.asc().nullsLast().op("text_ops")),
	uniqueIndex("destroys_destroy_id_key").using("btree", table.destroyId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.environmentId],
			foreignColumns: [environments.id],
			name: "destroys_environment_id_fkey"
		}).onUpdate("cascade").onDelete("restrict"),
	foreignKey({
			columns: [table.serviceId],
			foreignColumns: [services.id],
			name: "destroys_service_id_fkey"
		}).onUpdate("cascade").onDelete("restrict"),
]);

export const builds = pgTable("builds", {
	id: text().primaryKey().notNull(),
	buildId: text("build_id"),
	buildStart: timestamp("build_start", { precision: 6, withTimezone: true, mode: 'string' }),
	buildEnd: timestamp("build_end", { precision: 6, withTimezone: true, mode: 'string' }),
	buildLog: jsonb("build_log"),
	buildStatus: buildStatus("build_status").default('NULL'),
	buildContext: jsonb("build_context"),
	createdAt: timestamp("created_at", { precision: 6, withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 6, withTimezone: true, mode: 'string' }),
	deletedAt: timestamp("deleted_at", { precision: 6, withTimezone: true, mode: 'string' }),
	serviceId: text("service_id").notNull(),
	environmentId: text("environment_id").notNull(),
}, (table) => [
	index("builds_build_id_idx").using("btree", table.buildId.asc().nullsLast().op("text_ops")),
	uniqueIndex("builds_build_id_key").using("btree", table.buildId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.environmentId],
			foreignColumns: [environments.id],
			name: "builds_environment_id_fkey"
		}).onUpdate("cascade").onDelete("restrict"),
	foreignKey({
			columns: [table.serviceId],
			foreignColumns: [services.id],
			name: "builds_service_id_fkey"
		}).onUpdate("cascade").onDelete("restrict"),
]);

export const domains = pgTable("domains", {
	id: serial().primaryKey().notNull(),
	domain: text().notNull(),
	hostedZoneId: text().notNull(),
	globalCertificateArn: text().notNull(),
	regionalCertificateArn: text(),
	createdAt: timestamp("created_at", { precision: 6, withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 6, withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	deletedAt: timestamp("deleted_at", { precision: 6, withTimezone: true, mode: 'string' }),
	serviceId: text("service_id").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.serviceId],
			foreignColumns: [services.id],
			name: "domains_service_id_fkey"
		}).onUpdate("cascade").onDelete("restrict"),
]);

export const environmentVariables = pgTable("environment_variables", {
	id: text().primaryKey().notNull(),
	key: text().notNull(),
	value: text().notNull(),
	resource: text(),
	environmentId: text("environment_id").notNull(),
	createdAt: timestamp("created_at", { precision: 6, withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 6, withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	deletedAt: timestamp("deleted_at", { precision: 6, withTimezone: true, mode: 'string' }),
}, (table) => [
	foreignKey({
			columns: [table.environmentId],
			foreignColumns: [environments.id],
			name: "environment_variables_environment_id_fkey"
		}).onUpdate("cascade").onDelete("restrict"),
]);

export const installations = pgTable("installations", {
	id: serial().primaryKey().notNull(),
	installationId: integer("installation_id").notNull(),
	createdAt: timestamp("created_at", { precision: 6, withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 6, withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	deletedAt: timestamp("deleted_at", { precision: 6, withTimezone: true, mode: 'string' }),
	userId: uuid("user_id").notNull(),
	metadata: jsonb().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "installations_user_id_fkey"
		}).onUpdate("cascade").onDelete("restrict"),
]);

export const memberships = pgTable("memberships", {
	id: serial().primaryKey().notNull(),
	organizationId: text("organization_id").notNull(),
	userId: uuid("user_id").notNull(),
	access: accountAccess().default('READ_ONLY').notNull(),
	pending: boolean().default(false).notNull(),
	createdAt: timestamp("created_at", { precision: 6, withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 6, withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	deletedAt: timestamp("deleted_at", { precision: 6, withTimezone: true, mode: 'string' }),
}, (table) => [
	uniqueIndex("memberships_user_id_organization_id_key").using("btree", table.userId.asc().nullsLast().op("text_ops"), table.organizationId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "memberships_organization_id_fkey"
		}).onUpdate("cascade").onDelete("restrict"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "memberships_user_id_fkey"
		}).onUpdate("cascade").onDelete("restrict"),
]);

export const plans = pgTable("plans", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	maxProviders: integer("max_providers").notNull(),
	price: text(),
	priceId: text("price_id"),
	createdAt: timestamp("created_at", { precision: 6, withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 6, withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	deletedAt: timestamp("deleted_at", { precision: 6, withTimezone: true, mode: 'string' }),
});

export const providers = pgTable("providers", {
	id: text().primaryKey().notNull(),
	alias: text(),
	roleArn: text("role_arn"),
	accountId: text("account_id"),
	region: text(),
	stackId: text("stack_id"),
	stackName: text("stack_name"),
	createdAt: timestamp("created_at", { precision: 6, withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 6, withTimezone: true, mode: 'string' }),
	deletedAt: timestamp("deleted_at", { precision: 6, withTimezone: true, mode: 'string' }),
	organizationId: text("organization_id").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "providers_organization_id_fkey"
		}).onUpdate("cascade").onDelete("restrict"),
]);

export const userAccessTokens = pgTable("user_access_tokens", {
	resource: text(),
	createdAt: timestamp("created_at", { precision: 6, withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	userId: uuid("user_id").notNull(),
	updatedAt: timestamp("updated_at", { precision: 6, withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	deletedAt: timestamp("deleted_at", { precision: 6, withTimezone: true, mode: 'string' }),
	environmentId: text("environment_id").notNull(),
	secretId: uuid("secret_id").primaryKey().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.environmentId],
			foreignColumns: [environments.id],
			name: "user_access_tokens_environment_id_fkey"
		}).onUpdate("cascade").onDelete("restrict"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_access_tokens_user_id_fkey"
		}).onUpdate("cascade").onDelete("restrict"),
	pgPolicy("Individuals can view their own secrets. ", { as: "permissive", for: "select", to: ["public"], using: sql`(auth.uid() = user_id)` }),
	pgPolicy("Individuals can update their own secrets.", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("Individuals can delete their own secrets.", { as: "permissive", for: "delete", to: ["public"] }),
	pgPolicy("Individuals can create secrets.", { as: "permissive", for: "insert", to: ["public"] }),
]);

export const services = pgTable("services", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	displayName: text("display_name").notNull(),
	stackType: stackType("stack_type").default('SPA'),
	stackVersion: text("stack_version"),
	runtime: text(),
	runtimeVersion: text("runtime_version"),
	metadata: jsonb(),
	resources: jsonb(),
	createdAt: timestamp("created_at", { precision: 6, withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 6, withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	deletedAt: timestamp("deleted_at", { precision: 6, withTimezone: true, mode: 'string' }),
	environmentId: text("environment_id").notNull(),
	installationId: integer("installation_id"),
	headers: jsonb(),
	redirects: jsonb(),
	rewrites: jsonb(),
}, (table) => [
	index("services_codepipelinename").using("btree", sql`((resources ->> 'CodePipelineName'::text))`),
	foreignKey({
			columns: [table.environmentId],
			foreignColumns: [environments.id],
			name: "services_environment_id_fkey"
		}).onUpdate("cascade").onDelete("restrict"),
	foreignKey({
			columns: [table.installationId],
			foreignColumns: [installations.installationId],
			name: "services_installation_id_fkey"
		}).onUpdate("cascade").onDelete("set null"),
]);

export const users = pgTable("users", {
	id: uuid().primaryKey().notNull(),
	updatedAt: timestamp("updated_at", { precision: 6, withTimezone: true, mode: 'string' }),
	email: text(),
	fullName: text("full_name"),
	avatarUrl: text("avatar_url"),
	website: text(),
}, (table) => [
	pgPolicy("Users can update own profile.", { as: "permissive", for: "update", to: ["public"], using: sql`(auth.uid() = id)` }),
	pgPolicy("Users can insert their own profile.", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("Public profiles are viewable by everyone.", { as: "permissive", for: "select", to: ["public"] }),
]);

export const payments = pgTable("payments", {
	id: serial().primaryKey().notNull(),
	metadata: jsonb().notNull(),
	createdAt: timestamp("created_at", { precision: 6, withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	organizationId: text("organization_id").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "payments_organization_id_fkey"
		}).onUpdate("cascade").onDelete("restrict"),
]);

export const prismaMigrations = pgTable("_prisma_migrations", {
	id: varchar({ length: 36 }).primaryKey().notNull(),
	checksum: varchar({ length: 64 }).notNull(),
	finishedAt: timestamp("finished_at", { withTimezone: true, mode: 'string' }),
	migrationName: varchar("migration_name", { length: 255 }).notNull(),
	logs: text(),
	rolledBackAt: timestamp("rolled_back_at", { withTimezone: true, mode: 'string' }),
	startedAt: timestamp("started_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	appliedStepsCount: integer("applied_steps_count").default(0).notNull(),
});

export const applications = pgTable("applications", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	displayName: text("display_name").notNull(),
	organizationId: text("organization_id").notNull(),
	createdAt: timestamp("created_at", { precision: 6, withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	deletedAt: timestamp("deleted_at", { precision: 6, withTimezone: true, mode: 'string' }),
	metadata: jsonb(),
	status: applicationStatus().default('PENDING').notNull(),
}, (table) => [
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "applications_organization_id_fkey"
		}).onUpdate("cascade").onDelete("restrict"),
]);

export const events = pgTable("events", {
	pipelineExecutionId: text("pipeline_execution_id").primaryKey().notNull(),
	pipelineStart: timestamp("pipeline_start", { precision: 6, withTimezone: true, mode: 'string' }),
	pipelineEnd: timestamp("pipeline_end", { precision: 6, withTimezone: true, mode: 'string' }),
	pipelineState: pipelineStatus("pipeline_state").default('NULL'),
	pipelineMetadata: jsonb("pipeline_metadata"),
	pipelineLog: jsonb("pipeline_log"),
	createdAt: timestamp("created_at", { precision: 6, withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 6, withTimezone: true, mode: 'string' }),
	deletedAt: timestamp("deleted_at", { precision: 6, withTimezone: true, mode: 'string' }),
	serviceId: text("service_id").notNull(),
	environmentId: text("environment_id").notNull(),
}, (table) => [
	index("events_pipeline_execution_id_idx").using("btree", table.pipelineExecutionId.asc().nullsLast().op("text_ops")),
	uniqueIndex("events_pipeline_execution_id_key").using("btree", table.pipelineExecutionId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.environmentId],
			foreignColumns: [environments.id],
			name: "events_environment_id_fkey"
		}).onUpdate("cascade").onDelete("restrict"),
	foreignKey({
			columns: [table.serviceId],
			foreignColumns: [services.id],
			name: "events_service_id_fkey"
		}).onUpdate("cascade").onDelete("restrict"),
]);

export const organizations = pgTable("organizations", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	metadata: jsonb(),
	planId: integer("plan_id").notNull(),
	createdAt: timestamp("created_at", { precision: 6, withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 6, withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	deletedAt: timestamp("deleted_at", { precision: 6, withTimezone: true, mode: 'string' }),
}, (table) => [
	foreignKey({
			columns: [table.planId],
			foreignColumns: [plans.id],
			name: "organizations_plan_id_fkey"
		}).onUpdate("cascade").onDelete("restrict"),
]);
