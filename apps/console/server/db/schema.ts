import { pgTable, pgEnum, uuid, text, timestamp, jsonb, integer, boolean, unique, index, primaryKey, foreignKey, decimal } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { cuid2 } from 'drizzle-cuid2/postgres';

// Enums
export const buildStatusEnum = pgEnum('BUILD_STATUS', ['NULL', 'IN_PROGRESS', 'SUCCEEDED', 'FAILED', 'FAULT', 'TIMED_OUT', 'STOPPED']);
export const pipelineStatusEnum = pgEnum('PIPELINE_STATUS', ['NULL', 'STARTED', 'SUCCEEDED', 'RESUMED', 'FAILED', 'CANCELED', 'SUPERSEDED']);
export const accountAccessEnum = pgEnum('ACCOUNT_ACCESS', ['READ_ONLY', 'READ_WRITE', 'ADMIN', 'OWNER']);
export const applicationStatusEnum = pgEnum('APPLICATION_STATUS', ['PENDING', 'CONFIGURED', 'READY']);
export const stackTypeEnum = pgEnum('STACK_TYPE', ['SPA', 'FUNCTION', 'WEB_SERVICE']);
export const pricingTypeEnum = pgEnum('PRICING_TYPE', ['one_time', 'recurring']);
export const pricingPlanIntervalEnum = pgEnum('PRICING_PLAN_INTERVAL', ['month', 'year']);
export const subscriptionStatusEnum = pgEnum('SUBSCRIPTION_STATUS', ['trialing', 'active', 'canceled', 'incomplete', 'incomplete_expired', 'past_due', 'unpaid', 'paused']);
export const variableTypeEnum = pgEnum('VARIABLE_TYPE', ['build', 'runtime']);
export const buildSystemEnum = pgEnum('BUILD_SYSTEM', ['Nixpacks', 'Buildpacks', 'Custom Dockerfile']);

/**
 * Core Tables: Users, Organizations, Memberships
 */
export const users = pgTable('users', {
  id: uuid('id').primaryKey(),
  updated_at: timestamp('updated_at', { withTimezone: true, precision: 6 }),
  email: text('email'),
  full_name: text('full_name'),
  avatar_url: text('avatar_url'),
  website: text('website'),
});

export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(memberships),
  subscriptions: many(subscriptions),
  installations: many(installations),
  userAccessTokens: many(userAccessTokens),
}));

export const organizations = pgTable('organizations', {
  id: cuid2('id').setLength(32).defaultRandom().primaryKey(),
  name: text('name').notNull(),
  metadata: jsonb('metadata'),
  created_at: timestamp('created_at', { withTimezone: true, precision: 6 }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true, precision: 6 }).defaultNow(),
  deleted_at: timestamp('deleted_at', { withTimezone: true, precision: 6 }),
});

export const memberships = pgTable('memberships', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  organization_id: text('organization_id').notNull().references(() => organizations.id),
  user_id: uuid('user_id').notNull().references(() => users.id),
  access: accountAccessEnum('access').default('READ_ONLY').notNull(),
  pending: boolean('pending').default(false).notNull(),
  created_at: timestamp('created_at', { withTimezone: true, precision: 6 }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true, precision: 6 }).defaultNow(),
  deleted_at: timestamp('deleted_at', { withTimezone: true, precision: 6 }),
}, (table) => ({
  userOrgUnique: unique().on(table.user_id, table.organization_id)
}));

export const membershipsRelations = relations(memberships, ({ one }) => ({
  user: one(users, { fields: [memberships.user_id], references: [users.id] }),
  organization: one(organizations, { fields: [memberships.organization_id], references: [organizations.id] }),
}));

export const installations = pgTable('installations', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  installation_id: integer('installation_id').unique().notNull(),
  created_at: timestamp('created_at', { withTimezone: true, precision: 6 }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true, precision: 6 }).defaultNow(),
  deleted_at: timestamp('deleted_at', { withTimezone: true, precision: 6 }),
  user_id: uuid('user_id').notNull().references(() => users.id),
  metadata: jsonb('metadata').notNull(),
});

export const installationsRelations = relations(installations, ({ one }) => ({
  user: one(users, { fields: [installations.user_id], references: [users.id] }),
}));

/**
 * Payment & Subscription Tables
 */
export const customers = pgTable('customers', {
  user_id: uuid('user_id').notNull().references(() => users.id),
  organization_id: text('organization_id').notNull().references(() => organizations.id),
  polar_customer_id: text('polar_customer_id').notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.user_id, table.organization_id] }),
  organization_idIdx: index('customers_organization_id_idx').on(table.organization_id),
  polarCustomerIdIdx: index('customers_polar_customer_id_idx').on(table.polar_customer_id),
}));

export const customersRelations = relations(customers, ({ one }) => ({
  user: one(users, { fields: [customers.user_id], references: [users.id] }),
  organization: one(organizations, { fields: [customers.organization_id], references: [organizations.id] }),
}));

export const products = pgTable('products', {
  id: text('id').primaryKey(),
  active: boolean('active').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  metadata: jsonb('metadata'),
  created_at: timestamp('created_at', { withTimezone: true, precision: 6 }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true, precision: 6 }),
});

export const subscriptions = pgTable('subscriptions', {
  id: text('id').primaryKey(),
  user_id: uuid('user_id').notNull().references(() => users.id),
  organization_id: text('organization_id').notNull().references(() => organizations.id),
  polar_customer_id: text('polar_customer_id').notNull(),
  status: subscriptionStatusEnum('status').notNull(),
  product_id: text('product_id').references(() => products.id),
  cancel_at_period_end: boolean('cancel_at_period_end').default(false).notNull(),
  created: timestamp('created', { withTimezone: true, precision: 6 }).defaultNow().notNull(),
  current_period_start: timestamp('current_period_start', { withTimezone: true, precision: 6 }).defaultNow().notNull(),
  current_period_end: timestamp('current_period_end', { withTimezone: true, precision: 6 }).defaultNow().notNull(),
  ended_at: timestamp('ended_at', { withTimezone: true, precision: 6 }),
  cancel_at: timestamp('cancel_at', { withTimezone: true, precision: 6 }),
  canceled_at: timestamp('canceled_at', { withTimezone: true, precision: 6 }),
  metadata: jsonb('metadata'),
}, (table) => ({
  customerFk: foreignKey({ columns: [table.user_id, table.organization_id], foreignColumns: [customers.user_id, customers.organization_id] }),
  user_idIdx: index('subscriptions_user_id_idx').on(table.user_id),
  organization_idIdx: index('subscriptions_organization_id_idx').on(table.organization_id),
  polarCustomerIdIdx: index('subscriptions_polar_customer_id_idx').on(table.polar_customer_id),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  user: one(users, { fields: [subscriptions.user_id], references: [users.id] }),
  organization: one(organizations, { fields: [subscriptions.organization_id], references: [organizations.id] }),
  product: one(products, { fields: [subscriptions.product_id], references: [products.id] }),
  customer: one(customers, { fields: [subscriptions.user_id, subscriptions.organization_id], references: [customers.user_id, customers.organization_id] }),
}));

export const productsRelations = relations(products, ({ many }) => ({
  subscriptions: many(subscriptions),
}));

/**
 * Platform Infrastructure Tables
 */
export const providers = pgTable('providers', {
  id: uuid('id').defaultRandom().primaryKey(),
  alias: text('alias'),
  role_arn: text('role_arn'),
  account_id: text('account_id'),
  region: text('region'),
  stack_id: text('stack_id'),
  stack_name: text('stack_name'),
  access_key_id: text('access_key_id'),
  secret_id: uuid('secret_id'),
  created_at: timestamp('created_at', { withTimezone: true, precision: 6 }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true, precision: 6 }),
  deleted_at: timestamp('deleted_at', { withTimezone: true, precision: 6 }),
  organization_id: text('organization_id').notNull().references(() => organizations.id),
}, (table) => ({
  organizationIdIdx: index('providers_organization_id_idx').on(table.organization_id),
}));

export const providersRelations = relations(providers, ({ one, many }) => ({
  organization: one(organizations, { fields: [providers.organization_id], references: [organizations.id] }),
  environments: many(environments),
}));

export const applications = pgTable('applications', {
  id: cuid2('id').setLength(32).defaultRandom().primaryKey(),
  name: text('name').notNull(),
  display_name: text('display_name').notNull(),
  organization_id: text('organization_id').notNull().references(() => organizations.id),
  created_at: timestamp('created_at', { withTimezone: true, precision: 6 }).defaultNow().notNull(),
  deleted_at: timestamp('deleted_at', { withTimezone: true, precision: 6 }),
  metadata: jsonb('metadata'),
  status: applicationStatusEnum('status').default('PENDING').notNull(),
}, (table) => ({
  organizationIdIdx: index('applications_organization_id_idx').on(table.organization_id),
}));

export const applicationsRelations = relations(applications, ({ one, many }) => ({
  organization: one(organizations, { fields: [applications.organization_id], references: [organizations.id] }),
  environments: many(environments),
}));

export const environments = pgTable('environments', {
  id: cuid2('id').setLength(32).defaultRandom().primaryKey(),
  name: text('name').notNull(),
  display_name: text('display_name').notNull(),
  metadata: jsonb('metadata'),
  region: text('region'),
  created_at: timestamp('created_at', { withTimezone: true, precision: 6 }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true, precision: 6 }).defaultNow(),
  deleted_at: timestamp('deleted_at', { withTimezone: true, precision: 6 }),
  provider_id: text('provider_id').references(() => providers.id),
  application_id: text('application_id').notNull().references(() => applications.id),
}, (table) => ({
  applicationIdIdx: index('environments_application_id_idx').on(table.application_id),
  providerIdIdx: index('environments_provider_id_idx').on(table.provider_id),
}));

export const environmentsRelations = relations(environments, ({ one, many }) => ({
  provider: one(providers, { fields: [environments.provider_id], references: [providers.id] }),
  application: one(applications, { fields: [environments.application_id], references: [applications.id] }),
  services: many(services),
  userAccessTokens: many(userAccessTokens),
  builds: many(builds),
  destroys: many(destroys),
  events: many(events),
}));

export const userAccessTokens = pgTable('user_access_tokens', {
  secret_id: uuid('secret_id').primaryKey(),
  resource: text('resource'),
  user_id: uuid('user_id').notNull().references(() => users.id),
  environment_id: text('environment_id').references(() => environments.id),
  created_at: timestamp('created_at', { withTimezone: true, precision: 6 }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true, precision: 6 }).defaultNow(),
  deleted_at: timestamp('deleted_at', { withTimezone: true, precision: 6 }),
});

export const userAccessTokensRelations = relations(userAccessTokens, ({ one }) => ({
  user: one(users, { fields: [userAccessTokens.user_id], references: [users.id] }),
  environment: one(environments, { fields: [userAccessTokens.environment_id], references: [environments.id] }),
}));

export const services = pgTable('services', {
  id: cuid2('id').setLength(32).defaultRandom().primaryKey(),
  name: text('name').notNull(),
  display_name: text('display_name').notNull(),
  stack_type: stackTypeEnum('stack_type').default('SPA').notNull(),
  stack_version: text('stack_version').notNull(),
  owner: text('owner'),
  repo: text('repo'),
  branch: text('branch'),
  metadata: jsonb('metadata'),
  resources: jsonb('resources'),
  created_at: timestamp('created_at', { withTimezone: true, precision: 6 }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true, precision: 6 }).defaultNow(),
  deleted_at: timestamp('deleted_at', { withTimezone: true, precision: 6 }),
  environment_id: text('environment_id').notNull().references(() => environments.id),
  installation_id: integer('installation_id').references(() => installations.installation_id),
}, (table) => ({
  environmentIdIdx: index('services_environment_id_idx').on(table.environment_id),
  installationIdIdx: index('services_installation_id_idx').on(table.installation_id),
}));

export const servicesRelations = relations(services, ({ one, many }) => ({
  environment: one(environments, { fields: [services.environment_id], references: [environments.id] }),
  installation: one(installations, { fields: [services.installation_id], references: [installations.installation_id] }),
  builds: many(builds),
  destroys: many(destroys),
  events: many(events),
  domains: many(domains),
  serviceVariables: many(serviceVariables),
  serviceSecrets: many(serviceSecrets),
}));

export const serviceVariables = pgTable('service_variables', {
  id: uuid('id').defaultRandom().primaryKey(),
  key: text('key').notNull(),
  value: text('value').notNull(),
  type: variableTypeEnum('type').notNull(),
  service_id: text('service_id').notNull().references(() => services.id),
  created_at: timestamp('created_at', { withTimezone: true, precision: 6 }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true, precision: 6 }).defaultNow(),
  deleted_at: timestamp('deleted_at', { withTimezone: true, precision: 6 }),
});

export const serviceVariablesRelations = relations(serviceVariables, ({ one }) => ({
  service: one(services, { fields: [serviceVariables.service_id], references: [services.id] }),
}));

export const serviceSecrets = pgTable('service_secrets', {
  id: uuid('id').defaultRandom().primaryKey(),
  key: text('key').notNull(),
  value: text('value').notNull(),
  resource_arn: text('resource_arn'),
  type: variableTypeEnum('type').notNull(),
  service_id: text('service_id').notNull().references(() => services.id),
  created_at: timestamp('created_at', { withTimezone: true, precision: 6 }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true, precision: 6 }).defaultNow(),
  deleted_at: timestamp('deleted_at', { withTimezone: true, precision: 6 }),
});

export const serviceSecretsRelations = relations(serviceSecrets, ({ one }) => ({
  service: one(services, { fields: [serviceSecrets.service_id], references: [services.id] }),
}));

export const domains = pgTable('domains', {
  id: uuid('id').defaultRandom().primaryKey(),
  domain: text('domain').notNull(),
  hosted_zone_id: text('hosted_zone_id').notNull(),
  global_certificate_arn: text('global_certificate_arn'),
  regional_certificate_arn: text('regional_certificate_arn'),
  created_at: timestamp('created_at', { withTimezone: true, precision: 6 }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true, precision: 6 }).defaultNow(),
  deleted_at: timestamp('deleted_at', { withTimezone: true, precision: 6 }),
  service_id: text('service_id').notNull().references(() => services.id),
});

export const domainsRelations = relations(domains, ({ one }) => ({
  service: one(services, { fields: [domains.service_id], references: [services.id] }),
}));

// Build and Deploy Tables
export const builds = pgTable('builds', {
  id: uuid('id').primaryKey().defaultRandom(),
  build_id: text('build_id').unique(),
  build_start: timestamp('build_start', { withTimezone: true, precision: 6 }),
  build_end: timestamp('build_end', { withTimezone: true, precision: 6 }),
  build_log: jsonb('build_log'),
  build_status: buildStatusEnum('build_status').default('NULL'),
  build_context: jsonb('build_context'),
  created_at: timestamp('created_at', { withTimezone: true, precision: 6 }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true, precision: 6 }).defaultNow(),
  deleted_at: timestamp('deleted_at', { withTimezone: true, precision: 6 }),
  service_id: text('service_id').notNull().references(() => services.id),
  environment_id: text('environment_id').notNull().references(() => environments.id),
}, (table) => ({
  buildIdIdx: index('builds_build_id_idx').on(table.build_id),
}));

export const buildsRelations = relations(builds, ({ one }) => ({
  service: one(services, { fields: [builds.service_id], references: [services.id] }),
  environment: one(environments, { fields: [builds.environment_id], references: [environments.id] }),
}));

export const destroys = pgTable('destroys', {
  id: uuid('id').defaultRandom().primaryKey(),
  destroy_id: text('destroy_id').unique(),
  destroy_status: buildStatusEnum('destroy_status').default('NULL'),
  destroy_context: jsonb('destroy_context'),
  created_at: timestamp('created_at', { withTimezone: true, precision: 6 }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true, precision: 6 }).defaultNow(),
  deleted_at: timestamp('deleted_at', { withTimezone: true, precision: 6 }),
  service_id: text('service_id').notNull().references(() => services.id),
  environment_id: text('environment_id').notNull().references(() => environments.id),
});

export const destroysRelations = relations(destroys, ({ one }) => ({
  service: one(services, { fields: [destroys.service_id], references: [services.id] }),
  environment: one(environments, { fields: [destroys.environment_id], references: [environments.id] }),
}));

export const events = pgTable('events', {
  pipeline_execution_id: text('pipeline_execution_id').primaryKey().unique(),
  pipeline_start: timestamp('pipeline_start', { withTimezone: true, precision: 6 }),
  pipeline_end: timestamp('pipeline_end', { withTimezone: true, precision: 6 }),
  pipeline_state: pipelineStatusEnum('pipeline_state').default('NULL'),
  pipeline_metadata: jsonb('pipeline_metadata'),
  pipeline_log: jsonb('pipeline_log'),
  created_at: timestamp('created_at', { withTimezone: true, precision: 6 }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true, precision: 6 }).defaultNow(),
  deleted_at: timestamp('deleted_at', { withTimezone: true, precision: 6 }),
  service_id: text('service_id').notNull().references(() => services.id),
  environment_id: text('environment_id').notNull().references(() => environments.id),
});

export const eventsRelations = relations(events, ({ one }) => ({
  service: one(services, { fields: [events.service_id], references: [services.id] }),
  environment: one(environments, { fields: [events.environment_id], references: [environments.id] }),
}));

/**
 * Export types for TypeScript
 */
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;
export type Provider = typeof providers.$inferSelect;
export type NewProvider = typeof providers.$inferInsert;
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
export type UserAccessToken = typeof userAccessTokens.$inferSelect;
export type ServiceVariable = typeof serviceVariables.$inferSelect;
export type NewServiceVariable = typeof serviceVariables.$inferInsert;
export type ServiceSecret = typeof serviceSecrets.$inferSelect;
export type NewServiceSecret = typeof serviceSecrets.$inferInsert;

// Types for Polar Payment Integration
export interface Price {
  id: string;
  type: string;
  created_at: string;
  product_id: string;
  amount_type: string;
  is_archived?: boolean;
  modified_at: string;
  price_amount: number;
  price_currency: string;
  recurring_interval: "month" | "year";
}

export interface ProductMetadata {
  id: string;
  name: string;
  medias: readonly any[];
  prices: readonly Price[];
  benefits: readonly any[];
  metadata: Record<string, any>;
  created_at: string;
  description: string;
  is_archived: boolean;
  modified_at: string;
  is_recurring: boolean;
  organization_id: string;
  recurring_interval: "month" | "year";
  attached_custom_fields: readonly any[];
}

export type DBProduct = typeof products.$inferSelect;
export type Product = Omit<DBProduct, 'metadata'> & { metadata: ProductMetadata };
export type NewProduct = typeof products.$inferInsert;
export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;

// Organization Memberships Schema
export interface Membership {
  id: Organization['id'];
  name: Organization['name'];
  pending: boolean;
  subscriptions?: Array<{
    id: Subscription['id'];
    status: Subscription['status'];
    products?: Product;
  }>;
}

// Github Interfaces
export interface Branch {
  name: string;
  commit: {
    sha: string;
    url: string;
  };
  protected: boolean;
  is_default: boolean;
}