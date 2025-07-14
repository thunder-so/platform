import { pgTable, pgEnum, uuid, text, timestamp, jsonb, integer, boolean, unique, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { cuid2 } from 'drizzle-cuid2/postgres';

// Enums
export const buildStatusEnum = pgEnum('BUILD_STATUS', ['NULL', 'IN_PROGRESS', 'SUCCEEDED', 'FAILED', 'FAULT', 'TIMED_OUT', 'STOPPED']);
export const pipelineStatusEnum = pgEnum('PIPELINE_STATUS', ['NULL', 'STARTED', 'SUCCEEDED', 'RESUMED', 'FAILED', 'CANCELED', 'SUPERSEDED']);

/**
 * User, Organization, and Membership tables
 */
export const accountAccessEnum = pgEnum('ACCOUNT_ACCESS', ['READ_ONLY', 'READ_WRITE', 'ADMIN', 'OWNER']);

export const users = pgTable('users', {
  id: uuid('id').primaryKey(),
  updatedAt: timestamp('updated_at', { withTimezone: true, precision: 6 }),
  email: text('email'),
  fullName: text('full_name'),
  avatarUrl: text('avatar_url'),
  website: text('website'),
});

export const organizations = pgTable('organizations', {
  id: cuid2('id').setLength(32).defaultRandom().primaryKey(),
  name: text('name').notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true, precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, precision: 6 }).defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true, precision: 6 }),
});

export const memberships = pgTable('memberships', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  organizationId: text('organization_id').notNull().references(() => organizations.id),
  userId: uuid('user_id').notNull().references(() => users.id),
  access: accountAccessEnum('access').default('READ_ONLY').notNull(),
  pending: boolean('pending').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, precision: 6 }).defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true, precision: 6 }),
}, (table) => ({
  userOrgUnique: unique().on(table.userId, table.organizationId)
}));

export const usersRelations = relations(users, ({ many }) => ({
  installations: many(installations),
  memberships: many(memberships),
  userAccessTokens: many(userAccessTokens),
}));

export const organizationsRelations = relations(organizations, ({ many }) => ({
  applications: many(applications),
  members: many(memberships),
  providers: many(providers),
  subscriptions: many(subscriptions),
}));

export const membershipsRelations = relations(memberships, ({ one }) => ({
  organization: one(organizations, {
    fields: [memberships.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [memberships.userId],
    references: [users.id],
  }),
}));

/**
 * Polar Payment Integration
 */
export const pricingTypeEnum = pgEnum('PRICING_TYPE', ['one_time', 'recurring']);
export const pricingPlanIntervalEnum = pgEnum('PRICING_PLAN_INTERVAL', ['month', 'year']);
export const subscriptionStatusEnum = pgEnum('SUBSCRIPTION_STATUS', ['trialing', 'active', 'canceled', 'incomplete', 'incomplete_expired', 'past_due', 'unpaid', 'paused']);

export const customers = pgTable('customers', {
  userId: uuid('user_id').primaryKey().references(() => users.id),
  organizationId: text('organization_id').notNull().references(() => organizations.id),
  polarCustomerId: text('polar_customer_id').unique().notNull(),
}, (table) => ({
  organizationIdIdx: index('customers_organization_id_idx').on(table.organizationId),
  polarCustomerIdIdx: index('customers_polar_customer_id_idx').on(table.polarCustomerId),
}));

export const products = pgTable('products', {
  id: text('id').primaryKey(), // Polar product ID, e.g., prod_1234
  active: boolean('active').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true, precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, precision: 6 }),
});

export const subscriptions = pgTable('subscriptions', {
  id: text('id').primaryKey(), // Polar subscription ID, e.g., sub_1234
  userId: uuid('user_id').notNull().references(() => users.id),
  organizationId: text('organization_id').notNull().references(() => organizations.id),
  polarCustomerId: text('polar_customer_id').notNull().references(() => customers.polarCustomerId),
  status: subscriptionStatusEnum('status').notNull(),
  productId: text('product_id').references(() => products.id),
  cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false).notNull(),
  created: timestamp('created', { withTimezone: true, precision: 6 }).defaultNow().notNull(),
  currentPeriodStart: timestamp('current_period_start', { withTimezone: true, precision: 6 }).defaultNow().notNull(),
  currentPeriodEnd: timestamp('current_period_end', { withTimezone: true, precision: 6 }).defaultNow().notNull(),
  endedAt: timestamp('ended_at', { withTimezone: true, precision: 6 }),
  cancelAt: timestamp('cancel_at', { withTimezone: true, precision: 6 }),
  canceledAt: timestamp('canceled_at', { withTimezone: true, precision: 6 }),
  metadata: jsonb('metadata'),
}, (table) => ({
  userIdIdx: index('subscriptions_user_id_idx').on(table.userId),
  organizationIdIdx: index('subscriptions_organization_id_idx').on(table.organizationId),
  polarCustomerIdIdx: index('subscriptions_polar_customer_id_idx').on(table.polarCustomerId),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  organization: one(organizations, {
    fields: [subscriptions.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [subscriptions.userId],
    references: [users.id],
  }),
  customer: one(customers, {
    fields: [subscriptions.polarCustomerId],
    references: [customers.polarCustomerId],
  }),
  product: one(products, {
    fields: [subscriptions.productId],
    references: [products.id],
  }),
}));

/**
 * AWS Account Providers
 */
export const providers = pgTable('providers', {
//   id: text('id').primaryKey().$defaultFn(() => cuid2()),
  id: cuid2('id').setLength(32).defaultRandom().primaryKey(),
  alias: text('alias'),
  roleArn: text('role_arn'),
  accountId: text('account_id'),
  region: text('region'),
  stackId: text('stack_id'),
  stackName: text('stack_name'),
  accessKeyId: text('access_key_id'),
  createdAt: timestamp('created_at', { withTimezone: true, precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, precision: 6 }),
  deletedAt: timestamp('deleted_at', { withTimezone: true, precision: 6 }),
  organizationId: text('organization_id').notNull().references(() => organizations.id),
});

export const providersRelations = relations(providers, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [providers.organizationId],
    references: [organizations.id],
  }),
  environments: many(environments),
}));

/**
 * Applications, Environments, Services, and related tables
 */
export const applicationStatusEnum = pgEnum('APPLICATION_STATUS', ['PENDING', 'CONFIGURED', 'READY']);
export const stackTypeEnum = pgEnum('STACK_TYPE', ['SPA', 'LAMBDA', 'ECS', 'CRON', 'THIRD_PARTY']);

export const applications = pgTable('applications', {
  id: cuid2('id').setLength(32).defaultRandom().primaryKey(),
  name: text('name').notNull(),
  displayName: text('display_name').notNull(),
  organizationId: text('organization_id').notNull().references(() => organizations.id),
  createdAt: timestamp('created_at', { withTimezone: true, precision: 6 }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true, precision: 6 }),
  metadata: jsonb('metadata'),
  status: applicationStatusEnum('status').default('PENDING').notNull(),
});

export const environments = pgTable('environments', {
//   id: text('id').primaryKey().$defaultFn(() => cuid2()),
  id: cuid2('id').setLength(32).defaultRandom().primaryKey(),
  name: text('name').notNull(),
  displayName: text('display_name').notNull(),
  metadata: jsonb('metadata'),
  region: text('region'),
  createdAt: timestamp('created_at', { withTimezone: true, precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, precision: 6 }).defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true, precision: 6 }),
  providerId: text('provider_id').references(() => providers.id),
  applicationId: text('application_id').notNull().references(() => applications.id),
});

export const installations = pgTable('installations', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  installationId: integer('installation_id').unique().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, precision: 6 }).defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true, precision: 6 }),
  userId: uuid('user_id').notNull().references(() => users.id),
  metadata: jsonb('metadata').notNull(),
});

export const services = pgTable('services', {
  id: cuid2('id').setLength(32).defaultRandom().primaryKey(),
  name: text('name').notNull(),
  displayName: text('display_name').notNull(),
  stackType: stackTypeEnum('stack_type').default('SPA'),
  stackVersion: text('stack_version'),
  runtime: text('runtime'),
  runtimeVersion: text('runtime_version'),
  metadata: jsonb('metadata'),
  resources: jsonb('resources'),
  redirects: jsonb('redirects'),
  rewrites: jsonb('rewrites'),
  headers: jsonb('headers'),
  createdAt: timestamp('created_at', { withTimezone: true, precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, precision: 6 }).defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true, precision: 6 }),
  environmentId: text('environment_id').notNull().references(() => environments.id),
  installationId: integer('installation_id').references(() => installations.installationId),
});

// export const services2 = pgTable('services2', {
//   id: cuid2('id').setLength(32).defaultRandom().primaryKey(),
//   name: text('name').notNull(),
//   displayName: text('display_name').notNull(),
//   stackType: stackTypeEnum('stack_type').default('SPA'),
//   stackVersion: text('stack_version'),
//   resources: jsonb('resources'), // store stack output
//   metadata: jsonb('metadata'), // service specific: LambdaProps, ServiceProps, etc.
//   appProps: jsonb('app_props'), // rootdir, outputdir
//   cdnProps: jsonb('cdn_props'), // cloudfront
//   edgeProps: jsonb('edge_props'), // headers, redirects, rewrites
//   domainProps: jsonb('domain_props'), // route53, domains, certificates
//   pipelineProps: jsonb('pipeline_props'), // pipeline, event bus
//   createdAt: timestamp('created_at', { withTimezone: true, precision: 6 }).defaultNow().notNull(),
//   updatedAt: timestamp('updated_at', { withTimezone: true, precision: 6 }).defaultNow(),
//   deletedAt: timestamp('deleted_at', { withTimezone: true, precision: 6 }),
//   environmentId: text('environment_id').notNull().references(() => environments.id),
//   installationId: integer('installation_id').references(() => installations.installationId),
// });

export const environmentVariables = pgTable('environment_variables', {
  id: cuid2('id').setLength(32).defaultRandom().primaryKey(),
  key: text('key').notNull(),
  value: text('value').notNull(), // populated when string env variable
  resource: text('resource'), // ARN 
  environmentId: text('environment_id').notNull().references(() => environments.id),
  createdAt: timestamp('created_at', { withTimezone: true, precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, precision: 6 }).defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true, precision: 6 }),
});

export const userAccessTokens = pgTable('user_access_tokens', {
  secretId: uuid('secret_id').primaryKey().defaultRandom(),
  resource: text('resource'), // ARN
  userId: uuid('user_id').notNull().references(() => users.id),
  environmentId: text('environment_id').notNull().references(() => environments.id),
  createdAt: timestamp('created_at', { withTimezone: true, precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, precision: 6 }).defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true, precision: 6 }),
});

export const domains = pgTable('domains', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  domain: text('domain').notNull(),
  hostedZoneId: text('hostedZoneId').notNull(),
  globalCertificateArn: text('globalCertificateArn').notNull(),
  regionalCertificateArn: text('regionalCertificateArn'),
  createdAt: timestamp('created_at', { withTimezone: true, precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, precision: 6 }).defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true, precision: 6 }),
  serviceId: text('service_id').notNull().references(() => services.id),
});

export const builds = pgTable('builds', {
  id: uuid('id').primaryKey().defaultRandom(),
  buildId: text('build_id').unique(),
  buildStart: timestamp('build_start', { withTimezone: true, precision: 6 }),
  buildEnd: timestamp('build_end', { withTimezone: true, precision: 6 }),
  buildLog: jsonb('build_log'),
  buildStatus: buildStatusEnum('build_status').default('NULL'),
  buildContext: jsonb('build_context'),
  createdAt: timestamp('created_at', { withTimezone: true, precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, precision: 6 }),
  deletedAt: timestamp('deleted_at', { withTimezone: true, precision: 6 }),
  serviceId: text('service_id').notNull().references(() => services.id),
  environmentId: text('environment_id').notNull().references(() => environments.id),
}, (table) => ({
  buildIdIdx: index('builds_build_id_idx').on(table.buildId),
}));

export const destroys = pgTable('destroys', {
  destroyId: text('destroy_id').primaryKey().unique(),
  destroyStatus: buildStatusEnum('destroy_status').default('NULL'),
  destroyContext: jsonb('destroy_context'),
  createdAt: timestamp('created_at', { withTimezone: true, precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, precision: 6 }),
  deletedAt: timestamp('deleted_at', { withTimezone: true, precision: 6 }),
  serviceId: text('service_id').notNull().references(() => services.id),
  environmentId: text('environment_id').notNull().references(() => environments.id),
});

export const events = pgTable('events', {
  pipelineExecutionId: text('pipeline_execution_id').primaryKey().unique(),
  pipelineStart: timestamp('pipeline_start', { withTimezone: true, precision: 6 }),
  pipelineEnd: timestamp('pipeline_end', { withTimezone: true, precision: 6 }),
  pipelineState: pipelineStatusEnum('pipeline_state').default('NULL'),
  pipelinemetadata: jsonb('pipeline_metadata'),
  pipelineLog: jsonb('pipeline_log'),
  createdAt: timestamp('created_at', { withTimezone: true, precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, precision: 6 }),
  deletedAt: timestamp('deleted_at', { withTimezone: true, precision: 6 }),
  serviceId: text('service_id').notNull().references(() => services.id),
  environmentId: text('environment_id').notNull().references(() => environments.id),
});

// Relations
// export const paymentsRelations = relations(payments, ({ one }) => ({
//   organization: one(organizations, {
//     fields: [payments.organizationId],
//     references: [organizations.id],
//   }),
// }));

export const applicationsRelations = relations(applications, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [applications.organizationId],
    references: [organizations.id],
  }),
  environments: many(environments),
}));

export const environmentsRelations = relations(environments, ({ one, many }) => ({
  provider: one(providers, {
    fields: [environments.providerId],
    references: [providers.id],
  }),
  application: one(applications, {
    fields: [environments.applicationId],
    references: [applications.id],
  }),
  environmentVariables: many(environmentVariables),
  services: many(services),
  events: many(events),
  builds: many(builds),
  destroys: many(destroys),
  userAccessTokens: many(userAccessTokens),
}));

export const installationsRelations = relations(installations, ({ one, many }) => ({
  user: one(users, {
    fields: [installations.userId],
    references: [users.id],
  }),
  services: many(services),
}));

export const servicesRelations = relations(services, ({ one, many }) => ({
  environment: one(environments, {
    fields: [services.environmentId],
    references: [environments.id],
  }),
  installation: one(installations, {
    fields: [services.installationId],
    references: [installations.installationId],
  }),
  domains: many(domains),
  events: many(events),
  builds: many(builds),
  destroys: many(destroys),
}));

export const environmentVariablesRelations = relations(environmentVariables, ({ one }) => ({
  environment: one(environments, {
    fields: [environmentVariables.environmentId],
    references: [environments.id],
  }),
}));

export const userAccessTokensRelations = relations(userAccessTokens, ({ one }) => ({
  user: one(users, {
    fields: [userAccessTokens.userId],
    references: [users.id],
  }),
  environment: one(environments, {
    fields: [userAccessTokens.environmentId],
    references: [environments.id],
  }),
}));

export const domainsRelations = relations(domains, ({ one }) => ({
  service: one(services, {
    fields: [domains.serviceId],
    references: [services.id],
  }),
}));

export const buildsRelations = relations(builds, ({ one }) => ({
  service: one(services, {
    fields: [builds.serviceId],
    references: [services.id],
  }),
  environment: one(environments, {
    fields: [builds.environmentId],
    references: [environments.id],
  }),
}));

export const destroysRelations = relations(destroys, ({ one }) => ({
  service: one(services, {
    fields: [destroys.serviceId],
    references: [services.id],
  }),
  environment: one(environments, {
    fields: [destroys.environmentId],
    references: [environments.id],
  }),
}));

export const eventsRelations = relations(events, ({ one }) => ({
  service: one(services, {
    fields: [events.serviceId],
    references: [services.id],
  }),
  environment: one(environments, {
    fields: [events.environmentId],
    references: [environments.id],
  }),
}));

// Export types for TypeScript
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;
export type Application = typeof applications.$inferSelect;
export type NewApplication = typeof applications.$inferInsert;
export type Service = typeof services.$inferSelect;
export type NewService = typeof services.$inferInsert;
export type Environment = typeof environments.$inferSelect;
export type NewEnvironment = typeof environments.$inferInsert;
export type Build = typeof builds.$inferSelect;
export type NewBuild = typeof builds.$inferInsert;
export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;