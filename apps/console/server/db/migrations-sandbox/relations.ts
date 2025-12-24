import { relations } from "drizzle-orm/relations";
import { applications, environments, providers, destroys, services, builds, domains, environmentVariables, users, installations, organizations, memberships, userAccessTokens, payments, events, plans } from "./schema";

export const environmentsRelations = relations(environments, ({one, many}) => ({
	application: one(applications, {
		fields: [environments.applicationId],
		references: [applications.id]
	}),
	provider: one(providers, {
		fields: [environments.providerId],
		references: [providers.id]
	}),
	destroys: many(destroys),
	builds: many(builds),
	environmentVariables: many(environmentVariables),
	userAccessTokens: many(userAccessTokens),
	services: many(services),
	events: many(events),
}));

export const applicationsRelations = relations(applications, ({one, many}) => ({
	environments: many(environments),
	organization: one(organizations, {
		fields: [applications.organizationId],
		references: [organizations.id]
	}),
}));

export const providersRelations = relations(providers, ({one, many}) => ({
	environments: many(environments),
	organization: one(organizations, {
		fields: [providers.organizationId],
		references: [organizations.id]
	}),
}));

export const destroysRelations = relations(destroys, ({one}) => ({
	environment: one(environments, {
		fields: [destroys.environmentId],
		references: [environments.id]
	}),
	service: one(services, {
		fields: [destroys.serviceId],
		references: [services.id]
	}),
}));

export const servicesRelations = relations(services, ({one, many}) => ({
	destroys: many(destroys),
	builds: many(builds),
	domains: many(domains),
	environment: one(environments, {
		fields: [services.environmentId],
		references: [environments.id]
	}),
	installation: one(installations, {
		fields: [services.installationId],
		references: [installations.installationId]
	}),
	events: many(events),
}));

export const buildsRelations = relations(builds, ({one}) => ({
	environment: one(environments, {
		fields: [builds.environmentId],
		references: [environments.id]
	}),
	service: one(services, {
		fields: [builds.serviceId],
		references: [services.id]
	}),
}));

export const domainsRelations = relations(domains, ({one}) => ({
	service: one(services, {
		fields: [domains.serviceId],
		references: [services.id]
	}),
}));

export const environmentVariablesRelations = relations(environmentVariables, ({one}) => ({
	environment: one(environments, {
		fields: [environmentVariables.environmentId],
		references: [environments.id]
	}),
}));

export const installationsRelations = relations(installations, ({one, many}) => ({
	user: one(users, {
		fields: [installations.userId],
		references: [users.id]
	}),
	services: many(services),
}));

export const usersRelations = relations(users, ({many}) => ({
	installations: many(installations),
	memberships: many(memberships),
	userAccessTokens: many(userAccessTokens),
}));

export const membershipsRelations = relations(memberships, ({one}) => ({
	organization: one(organizations, {
		fields: [memberships.organizationId],
		references: [organizations.id]
	}),
	user: one(users, {
		fields: [memberships.userId],
		references: [users.id]
	}),
}));

export const organizationsRelations = relations(organizations, ({one, many}) => ({
	memberships: many(memberships),
	providers: many(providers),
	payments: many(payments),
	applications: many(applications),
	plan: one(plans, {
		fields: [organizations.planId],
		references: [plans.id]
	}),
}));

export const userAccessTokensRelations = relations(userAccessTokens, ({one}) => ({
	environment: one(environments, {
		fields: [userAccessTokens.environmentId],
		references: [environments.id]
	}),
	user: one(users, {
		fields: [userAccessTokens.userId],
		references: [users.id]
	}),
}));

export const paymentsRelations = relations(payments, ({one}) => ({
	organization: one(organizations, {
		fields: [payments.organizationId],
		references: [organizations.id]
	}),
}));

export const eventsRelations = relations(events, ({one}) => ({
	environment: one(environments, {
		fields: [events.environmentId],
		references: [environments.id]
	}),
	service: one(services, {
		fields: [events.serviceId],
		references: [services.id]
	}),
}));

export const plansRelations = relations(plans, ({many}) => ({
	organizations: many(organizations),
}));