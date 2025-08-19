
import { pgTable, pgEnum, uuid, text, timestamp, jsonb, integer, boolean, unique, index, primaryKey, foreignKey } from 'drizzle-orm/pg-core';
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

/**
 * Platform Infrastructure Tables
 */
export const providers = pgTable('providers', {
  id: cuid2('id').setLength(32).defaultRandom().primaryKey(),
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

export const services = pgTable('services', {
  id: cuid2('id').setLength(32).defaultRandom().primaryKey(),
  name: text('name').notNull(),
  display_name: text('display_name').notNull(),
  stack_type: stackTypeEnum('stack_type').default('SPA'),
  stack_version: text('stack_version'),
  resources: jsonb('resources'),
  metadata: jsonb('metadata'),
  app_props: jsonb('app_props'),
  cdn_props: jsonb('cdn_props'),
  edge_props: jsonb('edge_props'),
  domain_props: jsonb('domain_props'),
  pipeline_props: jsonb('pipeline_props'),
  created_at: timestamp('created_at', { withTimezone: true, precision: 6 }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true, precision: 6 }).defaultNow(),
  deleted_at: timestamp('deleted_at', { withTimezone: true, precision: 6 }),
  environment_id: text('environment_id').notNull().references(() => environments.id),
  installation_id: integer('installation_id').references(() => installations.installation_id),
}, (table) => ({
  environmentIdIdx: index('services_environment_id_idx').on(table.environment_id),
  installationIdIdx: index('services_installation_id_idx').on(table.installation_id),
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

export const environmentVariables = pgTable('environment_variables', {
  id: cuid2('id').setLength(32).defaultRandom().primaryKey(),
  key: text('key').notNull(),
  value: text('value').notNull(),
  resource: text('resource'),
  environment_id: text('environment_id').notNull().references(() => environments.id),
  created_at: timestamp('created_at', { withTimezone: true, precision: 6 }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true, precision: 6 }).defaultNow(),
  deleted_at: timestamp('deleted_at', { withTimezone: true, precision: 6 }),
});

export const userAccessTokens = pgTable('user_access_tokens', {
  secret_id: uuid('secret_id').primaryKey(),
  resource: text('resource'),
  user_id: uuid('user_id').notNull().references(() => users.id),
  environment_id: text('environment_id').references(() => environments.id),
  created_at: timestamp('created_at', { withTimezone: true, precision: 6 }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true, precision: 6 }).defaultNow(),
  deleted_at: timestamp('deleted_at', { withTimezone: true, precision: 6 }),
});

export const domains = pgTable('domains', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  domain: text('domain').notNull(),
  hostedZoneId: text('hostedZoneId').notNull(),
  globalCertificateArn: text('globalCertificateArn').notNull(),
  regionalCertificateArn: text('regionalCertificateArn'),
  created_at: timestamp('created_at', { withTimezone: true, precision: 6 }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true, precision: 6 }).defaultNow(),
  deleted_at: timestamp('deleted_at', { withTimezone: true, precision: 6 }),
  service_id: text('service_id').notNull().references(() => services.id),
});

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

export const destroys = pgTable('destroys', {
  destroy_id: text('destroy_id').primaryKey().unique(),
  destroy_status: buildStatusEnum('destroy_status').default('NULL'),
  destroy_context: jsonb('destroy_context'),
  created_at: timestamp('created_at', { withTimezone: true, precision: 6 }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true, precision: 6 }).defaultNow(),
  deleted_at: timestamp('deleted_at', { withTimezone: true, precision: 6 }),
  service_id: text('service_id').notNull().references(() => services.id),
  environment_id: text('environment_id').notNull().references(() => environments.id),
});

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
export type EnvironmentVariable = typeof environmentVariables.$inferSelect;
export type EnvironmentVariables = Partial<EnvironmentVariable>[];
export type NewEnvironmentVariable = typeof environmentVariables.$inferInsert;

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

// Application Schema Interfaces
export interface AppProps {
  rootDir: string;
  debug?: boolean;
}

export interface CloudFrontProps {
  errorPagePath?: string;
  allowHeaders?: string[];
  allowCookies?: string[];
  allowQueryParams?: string[];
  denyQueryParams?: string[];
}

export interface EdgeProps {
  headers?: Array<{ path: string; name: string; value: string }>;
  redirects?: Array<{ source: string; destination: string }>;
  rewrites?: Array<{ source: string; destination: string }>;
}

export interface SourceProps {
  owner: string;
  repo: string;
  branchOrRef: string;
}

// --- Stack-Specific Prop Interfaces ---

// Build Props
export interface NodeBasedBuildProps {
  runtime?: string;
  runtime_version?: number | string;
  installcmd?: string;
  buildcmd?: string;
  environment?: Array<{ [key: string]: string }>;
  include?: string[];
  exclude?: string[];
  secrets?: { key: string; resource: string; }[];
}

export interface DockerBasedBuildProps {
  include?: string[];
  exclude?: string[];
  environment?: Record<string, string>;
  secrets?: { key: string; resource: string; }[];
  dockerBuildArgs?: string[];
}

// Domain Props
export interface SpaDomainProps {
  domain?: string;
  globalCertificateArn?: string;
  hostedZoneId?: string;
}

export interface FunctionDomainProps {
  domain?: string;
  regionalCertificateArn?: string;
  hostedZoneId?: string;
}

export interface WebServiceDomainProps {
  domain?: string;
  globalCertificateArn?: string;
  regionalCertificateArn?: string;
  hostedZoneId?: string;
}

// Metadata Props
export type BuildSystem = 'Nixpacks' | 'Buildpacks' | 'Custom Dockerfile';

export interface SpaMetadata {
  outputDir: string;
}

export interface FunctionMetadata {
  buildSystem?: BuildSystem;
  dockerFile?: string;
  memorySize?: number;
  timeout?: number;
  keepWarm?: boolean;
  url?: boolean;
  runtime?: 'nodejs20.x' | 'nodejs22.x' | 'nodejs24.x';
  architecture?: 'x86_64' | 'ARM_64';
  codeDir?: string;
  handler?: string;
  include?: string[];
  exclude?: string[];
  tracing?: boolean;
  reservedConcurrency?: number;
  provisionedConcurrency?: number;
  variables?: Array<{ [key: string]: string }>;
  secrets?: { key: string; resource: string; }[];
  dockerBuildArgs?: string[];
}

export interface WebServiceMetadata {
  buildSystem?: BuildSystem;
  dockerFile?: string;
  desiredCount: number;
  cpu?: number;
  memorySize?: number;
  port?: number;
  architecture?: 'x86_64' | 'ARM64';
  variables?: Array<{ [key: string]: string; }>;
  secrets?: { key: string; resource: string; }[];
  dockerBuildArgs?: string[];
}

// Pipeline Props
interface BasePipelineProps {
  sourceProps: SourceProps;
  eventBus?: string;
}

export interface SpaPipelineProps extends BasePipelineProps {
  buildProps?: NodeBasedBuildProps;
}

export interface FunctionPipelineProps extends BasePipelineProps {
  buildProps?: DockerBasedBuildProps;
}

export interface WebServicePipelineProps extends BasePipelineProps {
  buildProps?: DockerBasedBuildProps;
}

// --- Main Discriminated Union for ServiceSchema ---

export type ServiceSchema = Omit<Service, 'metadata' | 'pipeline_props' | 'domain_props'> & {
  app_props: AppProps | null;
  cdn_props: CloudFrontProps | null;
  edge_props: EdgeProps | null;
  resources: Record<string, any> | null;
} & (
  | { 
      stack_type: 'SPA'; 
      metadata: SpaMetadata | null;
      pipeline_props: SpaPipelineProps | null;
      domain_props: SpaDomainProps | null;
    }
  | { 
      stack_type: 'FUNCTION'; 
      metadata: FunctionMetadata | null; 
      pipeline_props: FunctionPipelineProps | null;
      domain_props: FunctionDomainProps | null;
    }
  | { 
      stack_type: 'WEB_SERVICE'; 
      metadata: WebServiceMetadata | null; 
      pipeline_props: WebServicePipelineProps | null;
      domain_props: WebServiceDomainProps | null;
    }
);

export type ProviderSchema = Partial<Provider>;

export type EnvironmentSchema = Partial<Environment> & {
  environment_variables?: EnvironmentVariables[];
  provider?: ProviderSchema;
  services?: ServiceSchema[];
  user_access_token?: UserAccessToken;
};

export type ApplicationSchema = Partial<Application> & {
  environments?: EnvironmentSchema[];
};

/**
 * Github Interfaces
 */
export interface Branch {
  name: string;
  commit: {
    sha: string;
    url: string;
  };
  protected: boolean;
  is_default: boolean;
}