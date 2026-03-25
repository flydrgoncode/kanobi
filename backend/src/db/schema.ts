import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};

export const platformRoleEnum = pgEnum("platform_role", ["user", "god"]);
export const accountStatusEnum = pgEnum("account_status", [
  "active",
  "disabled",
  "invited",
]);
export const tenantStatusEnum = pgEnum("tenant_status", [
  "active",
  "suspended",
  "archived",
]);
export const membershipRoleEnum = pgEnum("membership_role", [
  "member",
  "support",
  "superuser",
]);
export const membershipStatusEnum = pgEnum("membership_status", [
  "active",
  "disabled",
  "removed",
]);
export const joinRequestStatusEnum = pgEnum("join_request_status", [
  "pending",
  "approved",
  "rejected",
  "cancelled",
]);
export const llmProviderEnum = pgEnum("llm_provider", [
  "openai",
  "anthropic",
  "llama",
]);
export const emailProviderEnum = pgEnum("email_provider", [
  "smtp",
  "ses",
  "resend",
  "custom",
]);
export const permissionScopeEnum = pgEnum("permission_scope", ["platform", "tenant"]);
export const permissionEffectEnum = pgEnum("permission_effect", ["allow", "deny"]);
export const accessEntryModeEnum = pgEnum("access_entry_mode", ["normal", "god_override"]);
export const accessEntrySourceEnum = pgEnum("access_entry_source", [
  "direct",
  "companies_list",
  "mission_control",
]);
export const authSessionScopeEnum = pgEnum("auth_session_scope", ["god", "tenant"]);
export const coworkMeetingCadenceEnum = pgEnum("cowork_meeting_cadence", [
  "weekly",
  "monthly",
  "quarterly",
  "semiannual",
]);
export const coworkMeetingStatusEnum = pgEnum("cowork_meeting_status", [
  "scheduled",
  "completed",
  "cancelled",
]);

export const authUsers = pgTable(
  "auth_users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: varchar("email", { length: 320 }).notNull(),
    emailNormalized: varchar("email_normalized", { length: 320 }).notNull(),
    firstName: varchar("first_name", { length: 120 }).notNull(),
    lastName: varchar("last_name", { length: 120 }).notNull(),
    jobTitle: varchar("job_title", { length: 160 }),
    phone: varchar("phone", { length: 40 }),
    avatarUrl: text("avatar_url"),
    passwordHash: text("password_hash").notNull(),
    platformRole: platformRoleEnum("platform_role").default("user").notNull(),
    accountStatus: accountStatusEnum("account_status").default("active").notNull(),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => ({
    emailNormalizedIdx: uniqueIndex("auth_users_email_normalized_uidx").on(
      table.emailNormalized
    ),
    statusIdx: index("auth_users_account_status_idx").on(table.accountStatus),
  })
);

export const authSessions = pgTable(
  "auth_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    sessionTokenHash: text("session_token_hash").notNull(),
    scope: authSessionScopeEnum("scope").default("god").notNull(),
    activeTenantId: uuid("active_tenant_id").references(() => tenants.id, {
      onDelete: "set null",
    }),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ...timestamps,
  },
  (table) => ({
    tokenIdx: uniqueIndex("auth_sessions_token_hash_uidx").on(table.sessionTokenHash),
    userIdx: index("auth_sessions_user_idx").on(table.userId, table.expiresAt),
    tenantIdx: index("auth_sessions_active_tenant_idx").on(table.activeTenantId, table.expiresAt),
  })
);

export const platformRoleDefinitions = pgTable(
  "platform_role_definitions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: varchar("code", { length: 80 }).notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    description: text("description"),
    isSystem: boolean("is_system").default(true).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    ...timestamps,
  },
  (table) => ({
    codeIdx: uniqueIndex("platform_role_definitions_code_uidx").on(table.code),
    activeIdx: index("platform_role_definitions_active_idx").on(table.isActive),
  })
);

export const tenantRoleDefinitions = pgTable(
  "tenant_role_definitions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: varchar("code", { length: 80 }).notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    description: text("description"),
    isSystem: boolean("is_system").default(true).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    ...timestamps,
  },
  (table) => ({
    codeIdx: uniqueIndex("tenant_role_definitions_code_uidx").on(table.code),
    activeIdx: index("tenant_role_definitions_active_idx").on(table.isActive),
  })
);

export const permissionDefinitions = pgTable(
  "permission_definitions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: varchar("code", { length: 120 }).notNull(),
    name: varchar("name", { length: 160 }).notNull(),
    description: text("description"),
    scope: permissionScopeEnum("scope").notNull(),
    menuKey: varchar("menu_key", { length: 160 }),
    isSystem: boolean("is_system").default(true).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    ...timestamps,
  },
  (table) => ({
    codeIdx: uniqueIndex("permission_definitions_code_uidx").on(table.code),
    scopeIdx: index("permission_definitions_scope_idx").on(table.scope, table.isActive),
  })
);

export const platformRolePermissions = pgTable(
  "platform_role_permissions",
  {
    roleId: uuid("role_id")
      .notNull()
      .references(() => platformRoleDefinitions.id, { onDelete: "cascade" }),
    permissionId: uuid("permission_id")
      .notNull()
      .references(() => permissionDefinitions.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    pk: uniqueIndex("platform_role_permissions_role_permission_uidx").on(
      table.roleId,
      table.permissionId
    ),
    permissionIdx: index("platform_role_permissions_permission_idx").on(table.permissionId),
  })
);

export const tenantRolePermissions = pgTable(
  "tenant_role_permissions",
  {
    roleId: uuid("role_id")
      .notNull()
      .references(() => tenantRoleDefinitions.id, { onDelete: "cascade" }),
    permissionId: uuid("permission_id")
      .notNull()
      .references(() => permissionDefinitions.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    pk: uniqueIndex("tenant_role_permissions_role_permission_uidx").on(
      table.roleId,
      table.permissionId
    ),
    permissionIdx: index("tenant_role_permissions_permission_idx").on(table.permissionId),
  })
);

export const tenants = pgTable(
  "tenants",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 200 }).notNull(),
    slug: varchar("slug", { length: 200 }).notNull(),
    taxId: varchar("tax_id", { length: 32 }).notNull(),
    status: tenantStatusEnum("status").default("active").notNull(),
    primarySuperuserMembershipId: uuid("primary_superuser_membership_id"),
    ...timestamps,
  },
  (table) => ({
    slugIdx: uniqueIndex("tenants_slug_uidx").on(table.slug),
    taxIdIdx: uniqueIndex("tenants_tax_id_uidx").on(table.taxId),
    statusIdx: index("tenants_status_idx").on(table.status),
  })
);

export const tenantScopedRolePermissions = pgTable(
  "tenant_scoped_role_permissions",
  {
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    roleId: uuid("role_id")
      .notNull()
      .references(() => tenantRoleDefinitions.id, { onDelete: "cascade" }),
    permissionId: uuid("permission_id")
      .notNull()
      .references(() => permissionDefinitions.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    pk: uniqueIndex("tenant_scoped_role_permissions_tenant_role_permission_uidx").on(
      table.tenantId,
      table.roleId,
      table.permissionId
    ),
    tenantRoleIdx: index("tenant_scoped_role_permissions_tenant_role_idx").on(
      table.tenantId,
      table.roleId
    ),
    permissionIdx: index("tenant_scoped_role_permissions_permission_idx").on(table.permissionId),
  })
);

export const tenantMemberships = pgTable(
  "tenant_memberships",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    role: membershipRoleEnum("role").notNull(),
    status: membershipStatusEnum("status").default("active").notNull(),
    isPrimarySuperuser: boolean("is_primary_superuser").default(false).notNull(),
    invitedByUserId: uuid("invited_by_user_id").references(() => authUsers.id, {
      onDelete: "set null",
    }),
    deactivatedAt: timestamp("deactivated_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => ({
    tenantUserIdx: uniqueIndex("tenant_memberships_tenant_user_uidx").on(
      table.tenantId,
      table.userId
    ),
    tenantRoleIdx: index("tenant_memberships_tenant_role_idx").on(
      table.tenantId,
      table.role
    ),
    tenantStatusIdx: index("tenant_memberships_tenant_status_idx").on(
      table.tenantId,
      table.status
    ),
  })
);

export const tenantMembershipPermissionOverrides = pgTable(
  "tenant_membership_permission_overrides",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantMembershipId: uuid("tenant_membership_id")
      .notNull()
      .references(() => tenantMemberships.id, { onDelete: "cascade" }),
    permissionId: uuid("permission_id")
      .notNull()
      .references(() => permissionDefinitions.id, { onDelete: "cascade" }),
    effect: permissionEffectEnum("effect").notNull(),
    createdByUserId: uuid("created_by_user_id").references(() => authUsers.id, {
      onDelete: "set null",
    }),
    ...timestamps,
  },
  (table) => ({
    membershipPermissionIdx: uniqueIndex(
      "tenant_membership_permission_overrides_membership_permission_uidx"
    ).on(table.tenantMembershipId, table.permissionId),
    permissionIdx: index("tenant_membership_permission_overrides_permission_idx").on(
      table.permissionId
    ),
  })
);

export const tenantJoinRequestStatuses = pgTable("tenant_join_request_statuses", {
  code: joinRequestStatusEnum("code").primaryKey(),
  label: varchar("label", { length: 80 }).notNull(),
  description: text("description"),
  sortOrder: integer("sort_order").notNull(),
  isTerminal: boolean("is_terminal").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const tenantJoinRequests = pgTable(
  "tenant_join_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    requesterUserId: uuid("requester_user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    requestedRole: membershipRoleEnum("requested_role").default("member").notNull(),
    requestMessage: text("request_message"),
    status: joinRequestStatusEnum("status").default("pending").notNull(),
    decidedByUserId: uuid("decided_by_user_id").references(() => authUsers.id, {
      onDelete: "set null",
    }),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    rejectionReason: text("rejection_reason"),
    ...timestamps,
  },
  (table) => ({
    requesterIdx: index("tenant_join_requests_requester_idx").on(table.requesterUserId),
    tenantStatusIdx: index("tenant_join_requests_tenant_status_idx").on(
      table.tenantId,
      table.status
    ),
  })
);

export const workspaceCompanySetup = pgTable("workspace_company_setup", {
  tenantId: uuid("tenant_id")
    .primaryKey()
    .references(() => tenants.id, { onDelete: "cascade" }),
  legalName: varchar("legal_name", { length: 200 }).notNull(),
  displayName: varchar("display_name", { length: 160 }).notNull(),
  taxId: varchar("tax_id", { length: 32 }).notNull(),
  websiteUrl: varchar("website_url", { length: 255 }),
  countryCode: varchar("country_code", { length: 2 }),
  primaryContactName: varchar("primary_contact_name", { length: 160 }),
  primaryContactEmail: varchar("primary_contact_email", { length: 320 }),
  billingEmail: varchar("billing_email", { length: 320 }),
  companySummary: text("company_summary"),
  setupCompletedAt: timestamp("setup_completed_at", { withTimezone: true }),
  ...timestamps,
});

export const workspaceLlmConfigs = pgTable(
  "workspace_llm_configs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    provider: llmProviderEnum("provider").notNull(),
    apiKeyCiphertext: text("api_key_ciphertext").notNull(),
    defaultModel: varchar("default_model", { length: 120 }),
    isEnabled: boolean("is_enabled").default(true).notNull(),
    createdByUserId: uuid("created_by_user_id").references(() => authUsers.id, {
      onDelete: "set null",
    }),
    updatedByUserId: uuid("updated_by_user_id").references(() => authUsers.id, {
      onDelete: "set null",
    }),
    ...timestamps,
  },
  (table) => ({
    tenantProviderIdx: uniqueIndex("workspace_llm_configs_tenant_provider_uidx").on(
      table.tenantId,
      table.provider
    ),
  })
);

export const workspaceEmailConfigs = pgTable("workspace_email_configs", {
  tenantId: uuid("tenant_id")
    .primaryKey()
    .references(() => tenants.id, { onDelete: "cascade" }),
  provider: emailProviderEnum("provider").notNull(),
  fromName: varchar("from_name", { length: 160 }).notNull(),
  fromEmail: varchar("from_email", { length: 320 }).notNull(),
  replyToEmail: varchar("reply_to_email", { length: 320 }),
  smtpHost: varchar("smtp_host", { length: 200 }),
  smtpPort: integer("smtp_port"),
  smtpUsername: varchar("smtp_username", { length: 200 }),
  smtpPasswordCiphertext: text("smtp_password_ciphertext"),
  isEnabled: boolean("is_enabled").default(true).notNull(),
  createdByUserId: uuid("created_by_user_id").references(() => authUsers.id, {
    onDelete: "set null",
  }),
  updatedByUserId: uuid("updated_by_user_id").references(() => authUsers.id, {
    onDelete: "set null",
  }),
  ...timestamps,
});

export const platformOperatorProfiles = pgTable("platform_operator_profiles", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  contactName: varchar("contact_name", { length: 160 }).notNull(),
  contactEmail: varchar("contact_email", { length: 320 }).notNull(),
  contactPhone: varchar("contact_phone", { length: 40 }),
  updatedByUserId: uuid("updated_by_user_id").references(() => authUsers.id, {
    onDelete: "set null",
  }),
  ...timestamps,
});

export const authAuditLog = pgTable(
  "auth_audit_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
    actorUserId: uuid("actor_user_id").references(() => authUsers.id, {
      onDelete: "set null",
    }),
    entityType: varchar("entity_type", { length: 80 }).notNull(),
    entityId: varchar("entity_id", { length: 120 }).notNull(),
    action: varchar("action", { length: 80 }).notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    tenantIdx: index("auth_audit_log_tenant_idx").on(table.tenantId, table.createdAt),
    actorIdx: index("auth_audit_log_actor_idx").on(table.actorUserId, table.createdAt),
  })
);

export const workspaceAccessLog = pgTable(
  "workspace_access_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    actorUserId: uuid("actor_user_id").references(() => authUsers.id, {
      onDelete: "set null",
    }),
    entryMode: accessEntryModeEnum("entry_mode").notNull(),
    source: accessEntrySourceEnum("source").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    tenantCreatedIdx: index("workspace_access_log_tenant_created_idx").on(
      table.tenantId,
      table.createdAt
    ),
    actorCreatedIdx: index("workspace_access_log_actor_created_idx").on(
      table.actorUserId,
      table.createdAt
    ),
  })
);

export const coworkEntityTargetTypes = pgTable("cowork_entity_target_types", {
  code: varchar("code", { length: 80 }).primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  allowsReactions: boolean("allows_reactions").default(true).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  sortOrder: integer("sort_order").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const coworkReactionTypes = pgTable("cowork_reaction_types", {
  code: varchar("code", { length: 80 }).primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  iconKey: varchar("icon_key", { length: 80 }).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  sortOrder: integer("sort_order").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const coworkVisions = pgTable(
  "cowork_visions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    shortName: varchar("short_name", { length: 160 }).notNull(),
    description: text("description").notNull(),
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "restrict" }),
    updatedByUserId: uuid("updated_by_user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "restrict" }),
    ...timestamps,
  },
  (table) => ({
    tenantUniqueIdx: uniqueIndex("cowork_visions_tenant_uidx").on(table.tenantId),
    createdByIdx: index("cowork_visions_created_by_idx").on(table.createdByUserId),
    updatedByIdx: index("cowork_visions_updated_by_idx").on(table.updatedByUserId),
  })
);

export const coworkValues = pgTable(
  "cowork_values",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    shortName: varchar("short_name", { length: 160 }).notNull(),
    description: text("description").notNull(),
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "restrict" }),
    updatedByUserId: uuid("updated_by_user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "restrict" }),
    ...timestamps,
  },
  (table) => ({
    tenantShortNameIdx: uniqueIndex("cowork_values_tenant_short_name_uidx").on(
      table.tenantId,
      table.shortName
    ),
    tenantCreatedIdx: index("cowork_values_tenant_created_idx").on(
      table.tenantId,
      table.createdAt
    ),
  })
);

export const coworkObstacles = pgTable(
  "cowork_obstacles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    shortName: varchar("short_name", { length: 160 }).notNull(),
    description: text("description").notNull(),
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "restrict" }),
    updatedByUserId: uuid("updated_by_user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "restrict" }),
    ...timestamps,
  },
  (table) => ({
    tenantShortNameIdx: uniqueIndex("cowork_obstacles_tenant_short_name_uidx").on(
      table.tenantId,
      table.shortName
    ),
    tenantCreatedIdx: index("cowork_obstacles_tenant_created_idx").on(
      table.tenantId,
      table.createdAt
    ),
  })
);

export const coworkEntityReactions = pgTable(
  "cowork_entity_reactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    targetTypeCode: varchar("target_type_code", { length: 80 })
      .notNull()
      .references(() => coworkEntityTargetTypes.code, { onDelete: "restrict" }),
    targetEntityId: uuid("target_entity_id").notNull(),
    reactionTypeCode: varchar("reaction_type_code", { length: 80 })
      .notNull()
      .references(() => coworkReactionTypes.code, { onDelete: "restrict" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    uniqueReactionIdx: uniqueIndex("cowork_entity_reactions_unique_uidx").on(
      table.tenantId,
      table.targetTypeCode,
      table.targetEntityId,
      table.reactionTypeCode,
      table.userId
    ),
    targetIdx: index("cowork_entity_reactions_target_idx").on(
      table.tenantId,
      table.targetTypeCode,
      table.targetEntityId,
      table.createdAt
    ),
    userIdx: index("cowork_entity_reactions_user_idx").on(table.tenantId, table.userId),
  })
);

export const coworkComments = pgTable(
  "cowork_comments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    targetTypeCode: varchar("target_type_code", { length: 80 })
      .notNull()
      .references(() => coworkEntityTargetTypes.code, { onDelete: "restrict" }),
    targetEntityId: uuid("target_entity_id").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    commentText: text("comment_text").notNull(),
    ...timestamps,
  },
  (table) => ({
    targetIdx: index("cowork_comments_target_idx").on(
      table.tenantId,
      table.targetTypeCode,
      table.targetEntityId,
      table.createdAt
    ),
    userIdx: index("cowork_comments_user_idx").on(
      table.tenantId,
      table.userId,
      table.createdAt
    ),
  })
);

export const coworkGroups = pgTable(
  "cowork_groups",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 160 }).notNull(),
    description: text("description"),
    createdByUserId: uuid("created_by_user_id").references(() => authUsers.id, {
      onDelete: "set null",
    }),
    updatedByUserId: uuid("updated_by_user_id").references(() => authUsers.id, {
      onDelete: "set null",
    }),
    ...timestamps,
  },
  (table) => ({
    tenantNameIdx: uniqueIndex("cowork_groups_tenant_name_uidx").on(
      table.tenantId,
      table.name
    ),
    tenantCreatedIdx: index("cowork_groups_tenant_created_idx").on(
      table.tenantId,
      table.createdAt
    ),
  })
);

export const coworkGroupMembers = pgTable(
  "cowork_group_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => coworkGroups.id, { onDelete: "cascade" }),
    tenantMembershipId: uuid("tenant_membership_id")
      .notNull()
      .references(() => tenantMemberships.id, { onDelete: "cascade" }),
    createdByUserId: uuid("created_by_user_id").references(() => authUsers.id, {
      onDelete: "set null",
    }),
    ...timestamps,
  },
  (table) => ({
    groupMembershipIdx: uniqueIndex("cowork_group_members_group_membership_uidx").on(
      table.groupId,
      table.tenantMembershipId
    ),
    membershipIdx: index("cowork_group_members_membership_idx").on(
      table.tenantMembershipId,
      table.createdAt
    ),
  })
);

export const coworkMeetingTypes = pgTable(
  "cowork_meeting_types",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: varchar("code", { length: 80 }).notNull(),
    name: varchar("name", { length: 160 }).notNull(),
    description: text("description"),
    cadence: coworkMeetingCadenceEnum("cadence").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdByUserId: uuid("created_by_user_id").references(() => authUsers.id, {
      onDelete: "set null",
    }),
    updatedByUserId: uuid("updated_by_user_id").references(() => authUsers.id, {
      onDelete: "set null",
    }),
    ...timestamps,
  },
  (table) => ({
    codeIdx: uniqueIndex("cowork_meeting_types_code_uidx").on(table.code),
    sortIdx: index("cowork_meeting_types_sort_idx").on(table.sortOrder, table.name),
  })
);

export const coworkMeetings = pgTable(
  "cowork_meetings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    meetingTypeId: uuid("meeting_type_id")
      .notNull()
      .references(() => coworkMeetingTypes.id, { onDelete: "restrict" }),
    name: varchar("name", { length: 200 }).notNull(),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
    durationMinutes: integer("duration_minutes").notNull(),
    status: coworkMeetingStatusEnum("status").default("scheduled").notNull(),
    focus: text("focus"),
    outcome: text("outcome"),
    notes: text("notes"),
    createdByUserId: uuid("created_by_user_id").references(() => authUsers.id, {
      onDelete: "set null",
    }),
    updatedByUserId: uuid("updated_by_user_id").references(() => authUsers.id, {
      onDelete: "set null",
    }),
    ...timestamps,
  },
  (table) => ({
    tenantScheduledIdx: index("cowork_meetings_tenant_scheduled_idx").on(
      table.tenantId,
      table.scheduledAt
    ),
    tenantStatusIdx: index("cowork_meetings_tenant_status_idx").on(
      table.tenantId,
      table.status
    ),
    meetingTypeIdx: index("cowork_meetings_type_idx").on(table.meetingTypeId),
  })
);

export const coworkMeetingGroups = pgTable(
  "cowork_meeting_groups",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    meetingId: uuid("meeting_id")
      .notNull()
      .references(() => coworkMeetings.id, { onDelete: "cascade" }),
    groupId: uuid("group_id")
      .notNull()
      .references(() => coworkGroups.id, { onDelete: "cascade" }),
    createdByUserId: uuid("created_by_user_id").references(() => authUsers.id, {
      onDelete: "set null",
    }),
    ...timestamps,
  },
  (table) => ({
    meetingGroupIdx: uniqueIndex("cowork_meeting_groups_meeting_group_uidx").on(
      table.meetingId,
      table.groupId
    ),
    groupIdx: index("cowork_meeting_groups_group_idx").on(table.groupId, table.createdAt),
  })
);

export const coworkMeetingParticipants = pgTable(
  "cowork_meeting_participants",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    meetingId: uuid("meeting_id")
      .notNull()
      .references(() => coworkMeetings.id, { onDelete: "cascade" }),
    tenantMembershipId: uuid("tenant_membership_id")
      .notNull()
      .references(() => tenantMemberships.id, { onDelete: "cascade" }),
    createdByUserId: uuid("created_by_user_id").references(() => authUsers.id, {
      onDelete: "set null",
    }),
    ...timestamps,
  },
  (table) => ({
    meetingMembershipIdx: uniqueIndex(
      "cowork_meeting_participants_meeting_membership_uidx"
    ).on(table.meetingId, table.tenantMembershipId),
    membershipIdx: index("cowork_meeting_participants_membership_idx").on(
      table.tenantMembershipId,
      table.createdAt
    ),
    meetingIdx: index("cowork_meeting_participants_meeting_idx").on(
      table.meetingId,
      table.createdAt
    ),
  })
);

export const coworkMeetingUploads = pgTable(
  "cowork_meeting_uploads",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    meetingId: uuid("meeting_id")
      .notNull()
      .references(() => coworkMeetings.id, { onDelete: "cascade" }),
    uploadedByUserId: uuid("uploaded_by_user_id").references(() => authUsers.id, {
      onDelete: "set null",
    }),
    fileName: varchar("file_name", { length: 255 }).notNull(),
    storageKey: text("storage_key").notNull(),
    mimeType: varchar("mime_type", { length: 120 }),
    fileSizeBytes: integer("file_size_bytes"),
    ...timestamps,
  },
  (table) => ({
    meetingIdx: index("cowork_meeting_uploads_meeting_idx").on(
      table.meetingId,
      table.createdAt
    ),
  })
);

export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    ownerUserId: uuid("owner_user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    title: text("title").notNull().default("New conversation"),
    ...timestamps,
  },
  (table) => ({
    tenantOwnerIdx: index("conversations_tenant_owner_idx").on(
      table.tenantId,
      table.ownerUserId
    ),
  })
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    authorUserId: uuid("author_user_id").references(() => authUsers.id, {
      onDelete: "set null",
    }),
    role: text("role", { enum: ["user", "assistant"] }).notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    conversationIdx: index("messages_conversation_idx").on(
      table.conversationId,
      table.createdAt
    ),
  })
);

export type AuthUser = typeof authUsers.$inferSelect;
export type Tenant = typeof tenants.$inferSelect;
export type TenantMembership = typeof tenantMemberships.$inferSelect;
