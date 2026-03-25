import { Hono } from "hono";
import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  authSessions,
  authUsers,
  coworkGroupMembers,
  coworkGroups,
  coworkMeetingGroups,
  coworkMeetingParticipants,
  coworkMeetings,
  coworkMeetingTypes,
  coworkMeetingUploads,
  coworkObstacles,
  coworkValues,
  coworkVisions,
  permissionDefinitions,
  platformOperatorProfiles,
  tenantJoinRequests,
  tenantMemberships,
  tenantRoleDefinitions,
  tenantScopedRolePermissions,
  tenants,
  workspaceAccessLog,
  workspaceCompanySetup,
  workspaceEmailConfigs,
  workspaceLlmConfigs,
} from "../db/schema.js";

export const workspaceRouter = new Hono();
const ZERO_COMPANY_TAX_ID = "510100105";
const SESSION_COOKIE_NAME = "kanobi_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

const userCreateSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  tenantId: z.string().uuid(),
  role: z.enum(["member", "support", "superuser"]),
});

const membershipUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  jobTitle: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  avatarUrl: z.string().optional().nullable(),
  password: z.string().min(6).optional(),
  role: z.enum(["member", "support", "superuser"]).optional(),
  status: z.enum(["active", "disabled"]).optional(),
});

const requestDecisionSchema = z.object({
  status: z.enum(["approved", "rejected"]),
});

const companySetupSchema = z.object({
  legalName: z.string().min(1),
  displayName: z.string().min(1),
  taxId: z.string().min(1),
  websiteUrl: z.string().optional().nullable(),
  countryCode: z.string().optional().nullable(),
  primaryContactName: z.string().optional().nullable(),
  primaryContactEmail: z.string().email().optional().nullable().or(z.literal("")),
  billingEmail: z.string().email().optional().nullable().or(z.literal("")),
  companySummary: z.string().optional().nullable(),
});

const companyUpdateSchema = companySetupSchema.extend({
  status: z.enum(["active", "suspended"]),
});

const integrationsSchema = z.object({
  tenantId: z.string().uuid().optional(),
  llmConfigs: z.array(
    z.object({
      provider: z.enum(["openai", "anthropic", "llama"]),
      defaultModel: z.string().optional().nullable(),
      apiKeyCiphertext: z.string().optional().nullable(),
      isEnabled: z.boolean(),
    })
  ),
  emailConfig: z.object({
    provider: z.enum(["smtp", "ses", "resend", "custom"]),
    fromName: z.string().min(1),
    fromEmail: z.string().email(),
    replyToEmail: z.string().email().optional().nullable().or(z.literal("")),
    smtpHost: z.string().optional().nullable(),
    smtpPort: z.number().int().nullable(),
    smtpUsername: z.string().optional().nullable(),
    smtpPasswordCiphertext: z.string().optional().nullable(),
    isEnabled: z.boolean(),
  }),
  godProfile: z.object({
    name: z.string().min(1),
    email: z.string().email(),
    phone: z.string().optional().nullable(),
  }),
});

const currentUserUpdateSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  jobTitle: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  avatarUrl: z.string().optional().nullable(),
});

const tenantPermissionsUpdateSchema = z.object({
  roles: z.array(
    z.object({
      roleCode: z.enum(["member", "support", "superuser"]),
      permissions: z.array(
        z.enum(["workspace_use", "workspace_backoffice", "workspace_config"])
      ),
    })
  ),
});

const tenantContextSchema = z.object({
  tenantId: z.string().uuid().nullable(),
});

const zeroSeedDataSchema = z.object({
  exportedAt: z.string(),
  tenant: z.object({
    name: z.string(),
    slug: z.string(),
    taxId: z.string(),
    status: z.enum(["active", "suspended", "archived"]),
  }),
  companySetup: z
    .object({
      legalName: z.string(),
      displayName: z.string(),
      taxId: z.string(),
      websiteUrl: z.string().nullable(),
      countryCode: z.string().nullable(),
      primaryContactName: z.string().nullable(),
      primaryContactEmail: z.string().nullable(),
      billingEmail: z.string().nullable(),
      companySummary: z.string().nullable(),
    })
    .nullable(),
  users: z.array(
    z.object({
      email: z.string().email(),
      firstName: z.string(),
      lastName: z.string(),
      jobTitle: z.string().nullable(),
      phone: z.string().nullable(),
      avatarUrl: z.string().nullable(),
      passwordHash: z.string(),
      accountStatus: z.enum(["active", "disabled", "invited"]),
      platformRole: z.enum(["user", "god"]),
      membership: z.object({
        role: z.enum(["member", "support", "superuser"]),
        status: z.enum(["active", "disabled"]),
        isPrimarySuperuser: z.boolean(),
      }),
    })
  ),
  tenantRoleDefinitions: z.array(
    z.object({
      code: z.enum(["member", "support", "superuser"]),
      name: z.string(),
      description: z.string().nullable(),
      isSystem: z.boolean(),
      isActive: z.boolean(),
    })
  ),
  permissionDefinitions: z.array(
    z.object({
      code: z.string(),
      name: z.string(),
      description: z.string().nullable(),
      scope: z.enum(["platform", "tenant"]),
      menuKey: z.string().nullable(),
      isSystem: z.boolean(),
      isActive: z.boolean(),
    })
  ),
  tenantPermissions: z.array(
    z.object({
      roleCode: z.enum(["member", "support", "superuser"]),
      permissions: z.array(z.string()),
    })
  ),
  llmConfigs: z.array(
    z.object({
      provider: z.enum(["openai", "anthropic", "llama"]),
      defaultModel: z.string().nullable(),
      apiKeyCiphertext: z.string(),
      isEnabled: z.boolean(),
    })
  ),
  emailConfig: z
    .object({
      provider: z.enum(["smtp", "ses", "resend", "custom"]),
      fromName: z.string(),
      fromEmail: z.string(),
      replyToEmail: z.string().nullable(),
      smtpHost: z.string().nullable(),
      smtpPort: z.number().nullable(),
      smtpUsername: z.string().nullable(),
      smtpPasswordCiphertext: z.string().nullable().optional(),
      isEnabled: z.boolean(),
    })
    .nullable(),
});

const strategyItemSchema = z.object({
  shortName: z.string().min(1).max(160),
  description: z.string().min(1),
});

const coworkGroupSchema = z.object({
  name: z.string().min(1).max(160),
  description: z.string().optional().nullable(),
  membershipIds: z.array(z.string().uuid()).default([]),
});

const coworkMeetingSchema = z.object({
  meetingTypeId: z.string().uuid(),
  name: z.string().min(1).max(200),
  scheduledAt: z.string().datetime(),
  durationMinutes: z.number().int().min(15).max(1440),
  status: z.enum(["scheduled", "completed", "cancelled"]),
  focus: z.string().optional().nullable(),
  outcome: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  groupIds: z.array(z.string().uuid()).default([]),
  participantMembershipIds: z.array(z.string().uuid()).default([]),
});

const coworkMeetingTypeSchema = z.object({
  code: z.string().min(1).max(80),
  name: z.string().min(1).max(160),
  description: z.string().optional().nullable(),
  cadence: z.enum(["weekly", "monthly", "quarterly", "semiannual"]),
  isActive: z.boolean(),
});

type ResolvedTenant = { id: string; name: string; taxId: string };
type SessionRecord = {
  id: string;
  userId: string;
  scope: "god" | "tenant";
  activeTenantId: string | null;
  expiresAt: Date;
};

function isProtectedTenant(args: { taxId?: string | null; id?: string | null }) {
  return args.taxId === ZERO_COMPANY_TAX_ID;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function splitName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] ?? "User",
    lastName: parts.slice(1).join(" ") || "Account",
  };
}

function slugifyCompanyName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 180);
}

async function createUniqueTenantSlug(baseName: string) {
  const baseSlug = slugifyCompanyName(baseName) || "company";
  let slug = baseSlug;
  let suffix = 1;

  while (true) {
    const existing = await db.query.tenants.findFirst({
      where: eq(tenants.slug, slug),
      columns: { id: true },
    });

    if (!existing) return slug;

    suffix += 1;
    slug = `${baseSlug}-${suffix}`;
  }
}

async function resolveTenant(tenantId?: string): Promise<ResolvedTenant | null> {
  if (tenantId) {
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, tenantId),
      columns: { id: true, name: true, taxId: true },
    });
    return tenant ?? null;
  }

  const [tenant] = await db
    .select({ id: tenants.id, name: tenants.name, taxId: tenants.taxId })
    .from(tenants)
    .orderBy(asc(tenants.createdAt))
    .limit(1);

  return tenant ?? null;
}

function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function parseCookieHeader(cookieHeader?: string | null) {
  if (!cookieHeader) return {};
  return cookieHeader.split(";").reduce<Record<string, string>>((accumulator, segment) => {
    const [rawName, ...rawValue] = segment.trim().split("=");
    if (!rawName) return accumulator;
    accumulator[rawName] = decodeURIComponent(rawValue.join("="));
    return accumulator;
  }, {});
}

function buildSessionCookie(token: string) {
  return `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; Max-Age=${SESSION_MAX_AGE_SECONDS}; HttpOnly; SameSite=Lax`;
}

async function ensureSession(c: any) {
  const cookies = parseCookieHeader(c.req.header("cookie"));
  const sessionToken = cookies[SESSION_COOKIE_NAME];

  if (sessionToken) {
    const [session] = await db
      .select({
        id: authSessions.id,
        userId: authSessions.userId,
        scope: authSessions.scope,
        activeTenantId: authSessions.activeTenantId,
        expiresAt: authSessions.expiresAt,
      })
      .from(authSessions)
      .where(eq(authSessions.sessionTokenHash, hashSessionToken(sessionToken)))
      .limit(1);

    if (session && session.expiresAt > new Date()) {
      await db
        .update(authSessions)
        .set({
          lastSeenAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(authSessions.id, session.id));

      return { session, sessionToken };
    }
  }

  const [bootstrapUser] = await db
    .select({
      id: authUsers.id,
    })
    .from(authUsers)
    .orderBy(desc(sql<boolean>`${authUsers.platformRole} = 'god'`), asc(authUsers.createdAt))
    .limit(1);

  if (!bootstrapUser) {
    return null;
  }

  const nextToken = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);
  const [createdSession] = await db
    .insert(authSessions)
    .values({
      userId: bootstrapUser.id,
      sessionTokenHash: hashSessionToken(nextToken),
      scope: "god",
      activeTenantId: null,
      lastSeenAt: new Date(),
      expiresAt,
    })
    .returning({
      id: authSessions.id,
      userId: authSessions.userId,
      scope: authSessions.scope,
      activeTenantId: authSessions.activeTenantId,
      expiresAt: authSessions.expiresAt,
    });

  c.header("Set-Cookie", buildSessionCookie(nextToken));
  return createdSession ? { session: createdSession, sessionToken: nextToken } : null;
}

async function resolveCurrentUser(session: SessionRecord) {
  const [row] = await db
    .select({
      id: authUsers.id,
      email: authUsers.email,
      firstName: authUsers.firstName,
      lastName: authUsers.lastName,
      jobTitle: authUsers.jobTitle,
      phone: authUsers.phone,
      avatarUrl: authUsers.avatarUrl,
      platformRole: authUsers.platformRole,
    })
    .from(authUsers)
    .where(eq(authUsers.id, session.userId))
    .limit(1);

  if (!row) return null;

  if (session.activeTenantId && row.platformRole !== "god") {
    const membership = await db.query.tenantMemberships.findFirst({
      where: and(
        eq(tenantMemberships.tenantId, session.activeTenantId),
        eq(tenantMemberships.userId, session.userId),
        eq(tenantMemberships.status, "active")
      ),
      columns: { role: true },
    });

    return {
      ...row,
      membershipRole: membership?.role ?? null,
    };
  }

  return {
    ...row,
    membershipRole: session.activeTenantId ? "superuser" : null,
  };
}

async function canAccessTenant(userId: string, tenantId: string) {
  const [user] = await db
    .select({ platformRole: authUsers.platformRole })
    .from(authUsers)
    .where(eq(authUsers.id, userId))
    .limit(1);

  if (!user) return false;
  if (user.platformRole === "god") return true;

  const membership = await db.query.tenantMemberships.findFirst({
    where: and(
      eq(tenantMemberships.userId, userId),
      eq(tenantMemberships.tenantId, tenantId),
      eq(tenantMemberships.status, "active")
    ),
    columns: { id: true },
  });

  return Boolean(membership);
}

async function isGodUser(userId: string) {
  const [user] = await db
    .select({ platformRole: authUsers.platformRole })
    .from(authUsers)
    .where(eq(authUsers.id, userId))
    .limit(1);

  return user?.platformRole === "god";
}

async function canManageProtectedTenant(c: any, tenantId: string) {
  const sessionBundle = await ensureSession(c);
  if (!sessionBundle) {
    return { ok: false as const, response: c.json({ error: "Current session not found." }, 401) };
  }

  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.id, tenantId),
    columns: { taxId: true },
  });

  if (!tenant) {
    return { ok: false as const, response: c.json({ error: "Tenant not found." }, 404) };
  }

  if (!isProtectedTenant({ taxId: tenant.taxId })) {
    return { ok: true as const, session: sessionBundle.session };
  }

  if (sessionBundle.session.activeTenantId) {
    return {
      ok: false as const,
      response: c.json({ error: "Zero can only be managed in God mode." }, 403),
    };
  }

  return { ok: true as const, session: sessionBundle.session };
}

async function getTenantFromSession(c: any, { required = true } = {}) {
  const sessionBundle = await ensureSession(c);
  if (!sessionBundle) {
    return required ? c.json({ error: "No active session found." }, 401) : null;
  }

  if (!sessionBundle.session.activeTenantId) {
    return required ? c.json({ error: "No tenant selected for this session." }, 400) : null;
  }

  const tenant = await resolveTenant(sessionBundle.session.activeTenantId);

  if (!tenant) {
    return required ? c.json({ error: "Selected tenant not found." }, 404) : null;
  }

  return tenant;
}

async function requireSupportAccess(c: any) {
  const sessionBundle = await ensureSession(c);
  if (!sessionBundle) {
    return c.json({ error: "Current session not found." }, 401);
  }

  if (!sessionBundle.session.activeTenantId) {
    return c.json({ error: "No tenant selected for this session." }, 400);
  }

  const tenant = await resolveTenant(sessionBundle.session.activeTenantId);
  if (!tenant) {
    return c.json({ error: "Selected tenant not found." }, 404);
  }

  const currentUser = await resolveCurrentUser(sessionBundle.session);
  if (!currentUser) {
    return c.json({ error: "Current user not found." }, 404);
  }

  const effectiveRole =
    currentUser.platformRole === "god"
      ? "superuser"
      : currentUser.membershipRole;

  if (effectiveRole !== "support" && effectiveRole !== "superuser") {
    return c.json({ error: "Support access required." }, 403);
  }

  return {
    tenant,
    currentUser,
    effectiveRole,
    session: sessionBundle.session,
  };
}

async function requireUsersAccess(c: any, tenantId?: string) {
  const sessionBundle = await ensureSession(c);
  if (!sessionBundle) {
    return c.json({ error: "Current session not found." }, 401);
  }

  if (!sessionBundle.session.activeTenantId) {
    const god = await isGodUser(sessionBundle.session.userId);
    if (!god) {
      return c.json({ error: "God access required." }, 403);
    }

    if (tenantId) {
      const tenant = await resolveTenant(tenantId);
      if (!tenant) {
        return c.json({ error: "Tenant not found." }, 404);
      }
      return { tenant, session: sessionBundle.session, mode: "god" as const };
    }

    return { tenant: null, session: sessionBundle.session, mode: "god" as const };
  }

  const access = await requireSupportAccess(c);
  if (access instanceof Response) return access;

  if (tenantId && access.tenant.id !== tenantId) {
    return c.json({ error: "Tenant mismatch." }, 403);
  }

  return { ...access, mode: "tenant" as const };
}

async function requireMeetingTypeAccess(c: any) {
  const sessionBundle = await ensureSession(c);
  if (!sessionBundle) {
    return c.json({ error: "Current session not found." }, 401);
  }

  const currentUser = await resolveCurrentUser(sessionBundle.session);
  if (!currentUser) {
    return c.json({ error: "Current user not found." }, 404);
  }

  if (currentUser.platformRole === "god" && !sessionBundle.session.activeTenantId) {
    return {
      currentUser,
      mode: "god" as const,
    };
  }

  const access = await requireSupportAccess(c);
  if (access instanceof Response) return access;
  return {
    currentUser: access.currentUser,
    mode: "tenant" as const,
  };
}

workspaceRouter.get("/summary", async (c) => {
  const tenant = await getTenantFromSession(c);
  if (tenant instanceof Response) return tenant;

  const [users, requests, llms, companySetup] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(tenantMemberships)
      .where(and(eq(tenantMemberships.tenantId, tenant.id), eq(tenantMemberships.status, "active"))),
    db
      .select({ count: sql<number>`count(*)` })
      .from(tenantJoinRequests)
      .where(and(eq(tenantJoinRequests.tenantId, tenant.id), eq(tenantJoinRequests.status, "pending"))),
    db
      .select({ count: sql<number>`count(*)` })
      .from(workspaceLlmConfigs)
      .where(and(eq(workspaceLlmConfigs.tenantId, tenant.id), eq(workspaceLlmConfigs.isEnabled, true))),
    db.query.workspaceCompanySetup.findFirst({
      where: eq(workspaceCompanySetup.tenantId, tenant.id),
    }),
  ]);

  return c.json({
    tenant,
    metrics: {
      activeUsers: Number(users[0]?.count ?? 0),
      pendingRequests: Number(requests[0]?.count ?? 0),
      configuredProviders: Number(llms[0]?.count ?? 0),
    },
    companySetup,
  });
});

workspaceRouter.get("/cowork/strategy", async (c) => {
  const access = await requireSupportAccess(c);
  if (access instanceof Response) return access;

  const [vision, values, obstacles] = await Promise.all([
    db.query.coworkVisions.findFirst({
      where: eq(coworkVisions.tenantId, access.tenant.id),
    }),
    db.query.coworkValues.findMany({
      where: eq(coworkValues.tenantId, access.tenant.id),
      orderBy: desc(coworkValues.createdAt),
    }),
    db.query.coworkObstacles.findMany({
      where: eq(coworkObstacles.tenantId, access.tenant.id),
      orderBy: desc(coworkObstacles.createdAt),
    }),
  ]);

  return c.json({
    tenant: access.tenant,
    role: access.effectiveRole,
    vision: vision
      ? {
          id: vision.id,
          shortName: vision.shortName,
          description: vision.description,
          createdAt: vision.createdAt,
          updatedAt: vision.updatedAt,
        }
      : null,
    values: values.map((item) => ({
      id: item.id,
      shortName: item.shortName,
      description: item.description,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    })),
    obstacles: obstacles.map((item) => ({
      id: item.id,
      shortName: item.shortName,
      description: item.description,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    })),
  });
});

workspaceRouter.put("/cowork/strategy/vision", zValidator("json", strategyItemSchema), async (c) => {
  const access = await requireSupportAccess(c);
  if (access instanceof Response) return access;
  const payload = c.req.valid("json");

  await db
    .insert(coworkVisions)
    .values({
      tenantId: access.tenant.id,
      shortName: payload.shortName.trim(),
      description: payload.description.trim(),
      createdByUserId: access.currentUser.id,
      updatedByUserId: access.currentUser.id,
    })
    .onConflictDoUpdate({
      target: coworkVisions.tenantId,
      set: {
        shortName: payload.shortName.trim(),
        description: payload.description.trim(),
        updatedByUserId: access.currentUser.id,
        updatedAt: new Date(),
      },
    });

  return c.json({ ok: true });
});

workspaceRouter.delete("/cowork/strategy/vision", async (c) => {
  const access = await requireSupportAccess(c);
  if (access instanceof Response) return access;

  await db.delete(coworkVisions).where(eq(coworkVisions.tenantId, access.tenant.id));
  return c.json({ ok: true });
});

workspaceRouter.post("/cowork/strategy/values", zValidator("json", strategyItemSchema), async (c) => {
  const access = await requireSupportAccess(c);
  if (access instanceof Response) return access;
  const payload = c.req.valid("json");

  await db.insert(coworkValues).values({
    tenantId: access.tenant.id,
    shortName: payload.shortName.trim(),
    description: payload.description.trim(),
    createdByUserId: access.currentUser.id,
    updatedByUserId: access.currentUser.id,
  });

  return c.json({ ok: true });
});

workspaceRouter.patch(
  "/cowork/strategy/values/:valueId",
  zValidator("json", strategyItemSchema),
  async (c) => {
    const access = await requireSupportAccess(c);
    if (access instanceof Response) return access;
    const payload = c.req.valid("json");
    const valueId = c.req.param("valueId");

    await db
      .update(coworkValues)
      .set({
        shortName: payload.shortName.trim(),
        description: payload.description.trim(),
        updatedByUserId: access.currentUser.id,
        updatedAt: new Date(),
      })
      .where(and(eq(coworkValues.id, valueId), eq(coworkValues.tenantId, access.tenant.id)));

    return c.json({ ok: true });
  }
);

workspaceRouter.delete("/cowork/strategy/values/:valueId", async (c) => {
  const access = await requireSupportAccess(c);
  if (access instanceof Response) return access;
  const valueId = c.req.param("valueId");

  await db
    .delete(coworkValues)
    .where(and(eq(coworkValues.id, valueId), eq(coworkValues.tenantId, access.tenant.id)));

  return c.json({ ok: true });
});

workspaceRouter.post(
  "/cowork/strategy/obstacles",
  zValidator("json", strategyItemSchema),
  async (c) => {
    const access = await requireSupportAccess(c);
    if (access instanceof Response) return access;
    const payload = c.req.valid("json");

    await db.insert(coworkObstacles).values({
      tenantId: access.tenant.id,
      shortName: payload.shortName.trim(),
      description: payload.description.trim(),
      createdByUserId: access.currentUser.id,
      updatedByUserId: access.currentUser.id,
    });

    return c.json({ ok: true });
  }
);

workspaceRouter.patch(
  "/cowork/strategy/obstacles/:obstacleId",
  zValidator("json", strategyItemSchema),
  async (c) => {
    const access = await requireSupportAccess(c);
    if (access instanceof Response) return access;
    const payload = c.req.valid("json");
    const obstacleId = c.req.param("obstacleId");

    await db
      .update(coworkObstacles)
      .set({
        shortName: payload.shortName.trim(),
        description: payload.description.trim(),
        updatedByUserId: access.currentUser.id,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(coworkObstacles.id, obstacleId),
          eq(coworkObstacles.tenantId, access.tenant.id)
        )
      );

    return c.json({ ok: true });
  }
);

workspaceRouter.delete("/cowork/strategy/obstacles/:obstacleId", async (c) => {
  const access = await requireSupportAccess(c);
  if (access instanceof Response) return access;
  const obstacleId = c.req.param("obstacleId");

  await db
    .delete(coworkObstacles)
    .where(
      and(
        eq(coworkObstacles.id, obstacleId),
        eq(coworkObstacles.tenantId, access.tenant.id)
      )
    );

  return c.json({ ok: true });
});

workspaceRouter.get("/cowork/groups", async (c) => {
  const access = await requireSupportAccess(c);
  if (access instanceof Response) return access;

  const [groups, users] = await Promise.all([
    db.query.coworkGroups.findMany({
      where: eq(coworkGroups.tenantId, access.tenant.id),
      orderBy: asc(coworkGroups.name),
    }),
    db
      .select({
        membershipId: tenantMemberships.id,
        groupId: coworkGroupMembers.groupId,
        userId: authUsers.id,
        name: sql<string>`concat(${authUsers.firstName}, ' ', ${authUsers.lastName})`,
        email: authUsers.email,
      })
      .from(coworkGroupMembers)
      .innerJoin(tenantMemberships, eq(tenantMemberships.id, coworkGroupMembers.tenantMembershipId))
      .innerJoin(authUsers, eq(authUsers.id, tenantMemberships.userId))
      .where(eq(tenantMemberships.tenantId, access.tenant.id)),
  ]);

  return c.json({
    tenant: access.tenant,
    groups: groups.map((group) => ({
      id: group.id,
      name: group.name,
      description: group.description,
      members: users
        .filter((member) => member.groupId === group.id)
        .map((member) => ({
          membershipId: member.membershipId,
          userId: member.userId,
          name: member.name.trim(),
          email: member.email,
        })),
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
    })),
  });
});

workspaceRouter.post("/cowork/groups", zValidator("json", coworkGroupSchema), async (c) => {
  const access = await requireSupportAccess(c);
  if (access instanceof Response) return access;
  const payload = c.req.valid("json");

  const [group] = await db
    .insert(coworkGroups)
    .values({
      tenantId: access.tenant.id,
      name: payload.name.trim(),
      description: payload.description?.trim() || null,
      createdByUserId: access.currentUser.id,
      updatedByUserId: access.currentUser.id,
    })
    .returning({ id: coworkGroups.id });

  if (group && payload.membershipIds.length) {
    await db.insert(coworkGroupMembers).values(
      payload.membershipIds.map((membershipId) => ({
        groupId: group.id,
        tenantMembershipId: membershipId,
        createdByUserId: access.currentUser.id,
      }))
    );
  }

  return c.json({ ok: true });
});

workspaceRouter.patch(
  "/cowork/groups/:groupId",
  zValidator("json", coworkGroupSchema),
  async (c) => {
    const access = await requireSupportAccess(c);
    if (access instanceof Response) return access;
    const payload = c.req.valid("json");
    const groupId = c.req.param("groupId");

    await db.transaction(async (tx) => {
      await tx
        .update(coworkGroups)
        .set({
          name: payload.name.trim(),
          description: payload.description?.trim() || null,
          updatedByUserId: access.currentUser.id,
          updatedAt: new Date(),
        })
        .where(and(eq(coworkGroups.id, groupId), eq(coworkGroups.tenantId, access.tenant.id)));

      await tx.delete(coworkGroupMembers).where(eq(coworkGroupMembers.groupId, groupId));

      if (payload.membershipIds.length) {
        await tx.insert(coworkGroupMembers).values(
          payload.membershipIds.map((membershipId) => ({
            groupId,
            tenantMembershipId: membershipId,
            createdByUserId: access.currentUser.id,
          }))
        );
      }
    });

    return c.json({ ok: true });
  }
);

workspaceRouter.delete("/cowork/groups/:groupId", async (c) => {
  const access = await requireSupportAccess(c);
  if (access instanceof Response) return access;
  const groupId = c.req.param("groupId");

  await db
    .delete(coworkGroups)
    .where(and(eq(coworkGroups.id, groupId), eq(coworkGroups.tenantId, access.tenant.id)));

  return c.json({ ok: true });
});

workspaceRouter.get("/cowork/meeting-types", async (c) => {
  const access = await requireMeetingTypeAccess(c);
  if (access instanceof Response) return access;

  const rows = await db.query.coworkMeetingTypes.findMany({
    orderBy: [asc(coworkMeetingTypes.sortOrder), asc(coworkMeetingTypes.name)],
  });

  return c.json({
    meetingTypes: rows.map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
      cadence: row.cadence,
      isActive: row.isActive,
      sortOrder: row.sortOrder,
    })),
  });
});

workspaceRouter.post(
  "/cowork/meeting-types",
  zValidator("json", coworkMeetingTypeSchema),
  async (c) => {
    const access = await requireMeetingTypeAccess(c);
    if (access instanceof Response) return access;
    const payload = c.req.valid("json");

    await db.insert(coworkMeetingTypes).values({
      code: payload.code.trim(),
      name: payload.name.trim(),
      description: payload.description?.trim() || null,
      cadence: payload.cadence,
      isActive: payload.isActive,
      createdByUserId: access.currentUser.id,
      updatedByUserId: access.currentUser.id,
    });

    return c.json({ ok: true });
  }
);

workspaceRouter.patch(
  "/cowork/meeting-types/:meetingTypeId",
  zValidator("json", coworkMeetingTypeSchema),
  async (c) => {
    const access = await requireMeetingTypeAccess(c);
    if (access instanceof Response) return access;
    const payload = c.req.valid("json");
    const meetingTypeId = c.req.param("meetingTypeId");

    await db
      .update(coworkMeetingTypes)
      .set({
        code: payload.code.trim(),
        name: payload.name.trim(),
        description: payload.description?.trim() || null,
        cadence: payload.cadence,
        isActive: payload.isActive,
        updatedByUserId: access.currentUser.id,
        updatedAt: new Date(),
      })
      .where(eq(coworkMeetingTypes.id, meetingTypeId));

    return c.json({ ok: true });
  }
);

workspaceRouter.delete("/cowork/meeting-types/:meetingTypeId", async (c) => {
  const access = await requireMeetingTypeAccess(c);
  if (access instanceof Response) return access;
  const meetingTypeId = c.req.param("meetingTypeId");

  await db.delete(coworkMeetingTypes).where(eq(coworkMeetingTypes.id, meetingTypeId));
  return c.json({ ok: true });
});

workspaceRouter.get("/cowork/meetings", async (c) => {
  const access = await requireSupportAccess(c);
  if (access instanceof Response) return access;

  const [meetings, groupLinks, participantLinks, uploads, groups, meetingTypes] = await Promise.all([
    db.query.coworkMeetings.findMany({
      where: eq(coworkMeetings.tenantId, access.tenant.id),
      orderBy: desc(coworkMeetings.scheduledAt),
    }),
    db
      .select({
        meetingId: coworkMeetingGroups.meetingId,
        groupId: coworkGroups.id,
        groupName: coworkGroups.name,
      })
      .from(coworkMeetingGroups)
      .innerJoin(coworkGroups, eq(coworkGroups.id, coworkMeetingGroups.groupId))
      .where(eq(coworkGroups.tenantId, access.tenant.id)),
    db
      .select({
        meetingId: coworkMeetingParticipants.meetingId,
        membershipId: tenantMemberships.id,
        userName: sql<string>`concat(${authUsers.firstName}, ' ', ${authUsers.lastName})`,
        userEmail: authUsers.email,
      })
      .from(coworkMeetingParticipants)
      .innerJoin(tenantMemberships, eq(tenantMemberships.id, coworkMeetingParticipants.tenantMembershipId))
      .innerJoin(authUsers, eq(authUsers.id, tenantMemberships.userId))
      .where(eq(tenantMemberships.tenantId, access.tenant.id)),
    db
      .select({
        meetingId: coworkMeetingUploads.meetingId,
        id: coworkMeetingUploads.id,
        fileName: coworkMeetingUploads.fileName,
      })
      .from(coworkMeetingUploads)
      .innerJoin(coworkMeetings, eq(coworkMeetings.id, coworkMeetingUploads.meetingId))
      .where(eq(coworkMeetings.tenantId, access.tenant.id)),
    db.query.coworkGroups.findMany({
      where: eq(coworkGroups.tenantId, access.tenant.id),
      orderBy: asc(coworkGroups.name),
    }),
    db.query.coworkMeetingTypes.findMany({
      where: eq(coworkMeetingTypes.isActive, true),
      orderBy: [asc(coworkMeetingTypes.sortOrder), asc(coworkMeetingTypes.name)],
    }),
  ]);

  return c.json({
    tenant: access.tenant,
    groups: groups.map((group) => ({ id: group.id, name: group.name })),
    meetingTypes: meetingTypes.map((type) => ({
      id: type.id,
      code: type.code,
      name: type.name,
      cadence: type.cadence,
    })),
    meetings: meetings.map((meeting) => ({
      id: meeting.id,
      meetingTypeId: meeting.meetingTypeId,
      name: meeting.name,
      scheduledAt: meeting.scheduledAt,
      durationMinutes: meeting.durationMinutes,
      status: meeting.status,
      focus: meeting.focus,
      outcome: meeting.outcome,
      notes: meeting.notes,
      groups: groupLinks.filter((link) => link.meetingId === meeting.id),
      participants: participantLinks.filter((link) => link.meetingId === meeting.id).map((link) => ({
        membershipId: link.membershipId,
        name: link.userName.trim(),
        email: link.userEmail,
      })),
      uploads: uploads.filter((upload) => upload.meetingId === meeting.id),
    })),
  });
});

workspaceRouter.post("/cowork/meetings", zValidator("json", coworkMeetingSchema), async (c) => {
  const access = await requireSupportAccess(c);
  if (access instanceof Response) return access;
  const payload = c.req.valid("json");

  await db.transaction(async (tx) => {
    const [meeting] = await tx
      .insert(coworkMeetings)
      .values({
        tenantId: access.tenant.id,
        meetingTypeId: payload.meetingTypeId,
        name: payload.name.trim(),
        scheduledAt: new Date(payload.scheduledAt),
        durationMinutes: payload.durationMinutes,
        status: payload.status,
        focus: payload.focus?.trim() || null,
        outcome: payload.outcome?.trim() || null,
        notes: payload.notes?.trim() || null,
        createdByUserId: access.currentUser.id,
        updatedByUserId: access.currentUser.id,
      })
      .returning({ id: coworkMeetings.id });

    if (!meeting) return;

    if (payload.groupIds.length) {
      await tx.insert(coworkMeetingGroups).values(
        payload.groupIds.map((groupId) => ({
          meetingId: meeting.id,
          groupId,
          createdByUserId: access.currentUser.id,
        }))
      );
    }

    if (payload.participantMembershipIds.length) {
      await tx.insert(coworkMeetingParticipants).values(
        payload.participantMembershipIds.map((tenantMembershipId) => ({
          meetingId: meeting.id,
          tenantMembershipId,
          createdByUserId: access.currentUser.id,
        }))
      );
    }
  });

  return c.json({ ok: true });
});

workspaceRouter.patch(
  "/cowork/meetings/:meetingId",
  zValidator("json", coworkMeetingSchema),
  async (c) => {
    const access = await requireSupportAccess(c);
    if (access instanceof Response) return access;
    const payload = c.req.valid("json");
    const meetingId = c.req.param("meetingId");

    await db.transaction(async (tx) => {
      await tx
        .update(coworkMeetings)
        .set({
          meetingTypeId: payload.meetingTypeId,
          name: payload.name.trim(),
          scheduledAt: new Date(payload.scheduledAt),
          durationMinutes: payload.durationMinutes,
          status: payload.status,
          focus: payload.focus?.trim() || null,
          outcome: payload.outcome?.trim() || null,
          notes: payload.notes?.trim() || null,
          updatedByUserId: access.currentUser.id,
          updatedAt: new Date(),
        })
        .where(and(eq(coworkMeetings.id, meetingId), eq(coworkMeetings.tenantId, access.tenant.id)));

      await tx.delete(coworkMeetingGroups).where(eq(coworkMeetingGroups.meetingId, meetingId));
      await tx
        .delete(coworkMeetingParticipants)
        .where(eq(coworkMeetingParticipants.meetingId, meetingId));

      if (payload.groupIds.length) {
        await tx.insert(coworkMeetingGroups).values(
          payload.groupIds.map((groupId) => ({
            meetingId,
            groupId,
            createdByUserId: access.currentUser.id,
          }))
        );
      }

      if (payload.participantMembershipIds.length) {
        await tx.insert(coworkMeetingParticipants).values(
          payload.participantMembershipIds.map((tenantMembershipId) => ({
            meetingId,
            tenantMembershipId,
            createdByUserId: access.currentUser.id,
          }))
        );
      }
    });

    return c.json({ ok: true });
  }
);

workspaceRouter.delete("/cowork/meetings/:meetingId", async (c) => {
  const access = await requireSupportAccess(c);
  if (access instanceof Response) return access;
  const meetingId = c.req.param("meetingId");

  await db
    .delete(coworkMeetings)
    .where(and(eq(coworkMeetings.id, meetingId), eq(coworkMeetings.tenantId, access.tenant.id)));

  return c.json({ ok: true });
});

workspaceRouter.get("/mission-control", async (c) => {
  const [
    activeTenants,
    suspendedTenants,
    pendingRequests,
    superusers,
    llmEnabledTenants,
    emailEnabledTenants,
    godUsers,
    companyRows,
  ] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(tenants)
      .where(eq(tenants.status, "active")),
    db
      .select({ count: sql<number>`count(*)` })
      .from(tenants)
      .where(eq(tenants.status, "suspended")),
    db
      .select({ count: sql<number>`count(*)` })
      .from(tenantJoinRequests)
      .where(eq(tenantJoinRequests.status, "pending")),
    db
      .select({ count: sql<number>`count(*)` })
      .from(tenantMemberships)
      .where(and(eq(tenantMemberships.role, "superuser"), eq(tenantMemberships.status, "active"))),
    db
      .select({ count: sql<number>`count(distinct ${workspaceLlmConfigs.tenantId})` })
      .from(workspaceLlmConfigs)
      .where(eq(workspaceLlmConfigs.isEnabled, true)),
    db
      .select({ count: sql<number>`count(*)` })
      .from(workspaceEmailConfigs)
      .where(eq(workspaceEmailConfigs.isEnabled, true)),
    db
      .select({ count: sql<number>`count(*)` })
      .from(authUsers)
      .where(eq(authUsers.platformRole, "god")),
    db
      .select({
        tenantId: tenants.id,
        company: workspaceCompanySetup.displayName,
        legalName: workspaceCompanySetup.legalName,
        taxId: tenants.taxId,
        status: tenants.status,
        primaryContactEmail: workspaceCompanySetup.primaryContactEmail,
        superuserName: sql<string>`concat(${authUsers.firstName}, ' ', ${authUsers.lastName})`,
        superuserEmail: authUsers.email,
      })
      .from(tenants)
      .leftJoin(workspaceCompanySetup, eq(workspaceCompanySetup.tenantId, tenants.id))
      .leftJoin(
        tenantMemberships,
        and(
          eq(tenantMemberships.tenantId, tenants.id),
          eq(tenantMemberships.isPrimarySuperuser, true)
        )
      )
      .leftJoin(authUsers, eq(authUsers.id, tenantMemberships.userId))
      .orderBy(asc(tenants.name)),
  ]);

  return c.json({
    metrics: {
      activeTenants: Number(activeTenants[0]?.count ?? 0),
      suspendedTenants: Number(suspendedTenants[0]?.count ?? 0),
      pendingRequests: Number(pendingRequests[0]?.count ?? 0),
      superusers: Number(superusers[0]?.count ?? 0),
      llmEnabledTenants: Number(llmEnabledTenants[0]?.count ?? 0),
      emailEnabledTenants: Number(emailEnabledTenants[0]?.count ?? 0),
      godUsers: Number(godUsers[0]?.count ?? 0),
    },
    companies: companyRows.map((row) => ({
      tenantId: row.tenantId,
      company: row.company ?? row.legalName ?? "Sem nome",
      legalName: row.legalName ?? row.company ?? "Sem nome legal",
      taxId: row.taxId,
      status: row.status,
      primaryContactEmail: row.primaryContactEmail ?? "",
      superuserName: row.superuserName?.trim() || "Sem superuser",
      superuserEmail: row.superuserEmail ?? "",
    })),
  });
});

workspaceRouter.get("/me", async (c) => {
  const sessionBundle = await ensureSession(c);
  if (!sessionBundle) {
    return c.json({ error: "Current session not found." }, 401);
  }
  const currentUser = await resolveCurrentUser(sessionBundle.session);

  if (!currentUser) {
    return c.json({ error: "Current user not found." }, 404);
  }

  return c.json({
    user: {
      id: currentUser.id,
      name: `${currentUser.firstName} ${currentUser.lastName}`.trim(),
      email: currentUser.email,
      jobTitle: currentUser.jobTitle ?? "",
      phone: currentUser.phone ?? "",
      avatarUrl: currentUser.avatarUrl ?? "",
      role: sessionBundle.session.activeTenantId
        ? currentUser.membershipRole ?? (currentUser.platformRole === "god" ? "superuser" : "member")
        : currentUser.platformRole === "god"
          ? "god"
          : currentUser.membershipRole ?? "member",
    },
  });
});

workspaceRouter.put("/me", zValidator("json", currentUserUpdateSchema), async (c) => {
  const sessionBundle = await ensureSession(c);
  if (!sessionBundle) {
    return c.json({ error: "Current session not found." }, 401);
  }
  const currentUser = await resolveCurrentUser(sessionBundle.session);

  if (!currentUser) {
    return c.json({ error: "Current user not found." }, 404);
  }

  const payload = c.req.valid("json");
  const parsedName = splitName(payload.name);

  await db
    .update(authUsers)
    .set({
      firstName: parsedName.firstName,
      lastName: parsedName.lastName,
      email: payload.email.trim(),
      emailNormalized: normalizeEmail(payload.email),
      jobTitle: payload.jobTitle || null,
      phone: payload.phone || null,
      avatarUrl: payload.avatarUrl || null,
      updatedAt: new Date(),
    })
    .where(eq(authUsers.id, currentUser.id));

  return c.json({ ok: true });
});

workspaceRouter.get("/context", async (c) => {
  const sessionBundle = await ensureSession(c);
  if (!sessionBundle) {
    return c.json({ error: "Current session not found." }, 401);
  }

  const tenant = sessionBundle.session.activeTenantId
    ? await resolveTenant(sessionBundle.session.activeTenantId)
    : null;

  return c.json({
    mode: sessionBundle.session.activeTenantId ? "tenant" : "god",
    tenant: tenant
      ? {
          id: tenant.id,
          name: tenant.name,
          taxId: tenant.taxId,
        }
      : null,
  });
});

workspaceRouter.put("/context", zValidator("json", tenantContextSchema), async (c) => {
  const sessionBundle = await ensureSession(c);
  if (!sessionBundle) {
    return c.json({ error: "Current session not found." }, 401);
  }

  const payload = c.req.valid("json");

  if (!payload.tenantId) {
    await db
      .update(authSessions)
      .set({
        scope: "god",
        activeTenantId: null,
        updatedAt: new Date(),
      })
      .where(eq(authSessions.id, sessionBundle.session.id));

    return c.json({ ok: true, mode: "god", tenant: null });
  }

  const tenant = await resolveTenant(payload.tenantId);
  if (!tenant) {
    return c.json({ error: "Tenant not found." }, 404);
  }

  const allowed = await canAccessTenant(sessionBundle.session.userId, tenant.id);
  if (!allowed) {
    return c.json({ error: "You do not have access to this tenant." }, 403);
  }

  await db
    .update(authSessions)
    .set({
      scope: "tenant",
      activeTenantId: tenant.id,
      updatedAt: new Date(),
    })
    .where(eq(authSessions.id, sessionBundle.session.id));

  await db.insert(workspaceAccessLog).values({
    tenantId: tenant.id,
    actorUserId: sessionBundle.session.userId,
    entryMode: "god_override",
    source: "mission_control",
  });

  return c.json({
    ok: true,
    mode: "tenant",
    tenant: {
      id: tenant.id,
      name: tenant.name,
      taxId: tenant.taxId,
    },
  });
});

workspaceRouter.get("/companies", async (c) => {
  const sessionBundle = await ensureSession(c);
  if (!sessionBundle) {
    return c.json({ error: "Current session not found." }, 401);
  }
  const tenantId = sessionBundle.session.activeTenantId;
  const rows = await db
    .select({
      id: tenants.id,
      name: tenants.name,
      slug: tenants.slug,
      taxId: tenants.taxId,
      status: tenants.status,
      legalName: workspaceCompanySetup.legalName,
      displayName: workspaceCompanySetup.displayName,
      websiteUrl: workspaceCompanySetup.websiteUrl,
      countryCode: workspaceCompanySetup.countryCode,
      primaryContactName: workspaceCompanySetup.primaryContactName,
      primaryContactEmail: workspaceCompanySetup.primaryContactEmail,
      billingEmail: workspaceCompanySetup.billingEmail,
      companySummary: workspaceCompanySetup.companySummary,
    })
    .from(tenants)
    .leftJoin(workspaceCompanySetup, eq(workspaceCompanySetup.tenantId, tenants.id))
    .where(tenantId ? eq(tenants.id, tenantId) : undefined)
    .orderBy(asc(tenants.name));

  return c.json({
    companies: rows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      taxId: row.taxId,
      status: row.status,
      legalName: row.legalName ?? row.name,
      displayName: row.displayName ?? row.name,
      websiteUrl: row.websiteUrl,
      countryCode: row.countryCode,
      primaryContactName: row.primaryContactName,
      primaryContactEmail: row.primaryContactEmail,
      billingEmail: row.billingEmail,
      companySummary: row.companySummary,
      isProtected: isProtectedTenant({ taxId: row.taxId }),
    })),
  });
});

workspaceRouter.get("/companies/catalog", async (c) => {
  const sessionBundle = await ensureSession(c);
  if (!sessionBundle) {
    return c.json({ error: "Current session not found." }, 401);
  }

  const isGod = await isGodUser(sessionBundle.session.userId);
  if (!isGod) {
    return c.json({ error: "Only God can list all companies." }, 403);
  }

  const rows = await db
    .select({
      id: tenants.id,
      name: tenants.name,
      slug: tenants.slug,
      taxId: tenants.taxId,
      status: tenants.status,
      legalName: workspaceCompanySetup.legalName,
      displayName: workspaceCompanySetup.displayName,
      websiteUrl: workspaceCompanySetup.websiteUrl,
      countryCode: workspaceCompanySetup.countryCode,
      primaryContactName: workspaceCompanySetup.primaryContactName,
      primaryContactEmail: workspaceCompanySetup.primaryContactEmail,
      billingEmail: workspaceCompanySetup.billingEmail,
      companySummary: workspaceCompanySetup.companySummary,
    })
    .from(tenants)
    .leftJoin(workspaceCompanySetup, eq(workspaceCompanySetup.tenantId, tenants.id))
    .orderBy(asc(tenants.name));

  return c.json({
    companies: rows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      taxId: row.taxId,
      status: row.status,
      legalName: row.legalName ?? row.name,
      displayName: row.displayName ?? row.name,
      websiteUrl: row.websiteUrl,
      countryCode: row.countryCode,
      primaryContactName: row.primaryContactName,
      primaryContactEmail: row.primaryContactEmail,
      billingEmail: row.billingEmail,
      companySummary: row.companySummary,
      isProtected: isProtectedTenant({ taxId: row.taxId }),
    })),
  });
});

workspaceRouter.post(
  "/companies",
  zValidator("json", companyUpdateSchema),
  async (c) => {
    const payload = c.req.valid("json");

    const duplicateTaxId = await db.query.tenants.findFirst({
      where: eq(tenants.taxId, payload.taxId),
      columns: { id: true },
    });

    if (duplicateTaxId) {
      return c.json({ error: "Ja existe uma empresa com este NIF." }, 409);
    }

    const slug = await createUniqueTenantSlug(payload.displayName);

    const [tenant] = await db
      .insert(tenants)
      .values({
        name: payload.displayName,
        slug,
        taxId: payload.taxId,
        status: payload.status,
      })
      .returning({ id: tenants.id });

    if (!tenant) {
      return c.json({ error: "Could not create company." }, 500);
    }

    await db.insert(workspaceCompanySetup).values({
      tenantId: tenant.id,
      legalName: payload.legalName,
      displayName: payload.displayName,
      taxId: payload.taxId,
      websiteUrl: payload.websiteUrl || null,
      countryCode: payload.countryCode || null,
      primaryContactName: payload.primaryContactName || null,
      primaryContactEmail: payload.primaryContactEmail || null,
      billingEmail: payload.billingEmail || null,
      companySummary: payload.companySummary || null,
      setupCompletedAt: new Date(),
    });

    return c.json({ ok: true, tenantId: tenant.id });
  }
);

workspaceRouter.get("/users", async (c) => {
  const access = await requireUsersAccess(c);
  if (access instanceof Response) return access;
  const tenantId = access.tenant?.id ?? null;
  const rows = await db
    .select({
      id: tenantMemberships.id,
      userId: authUsers.id,
      companyId: tenants.id,
      company: tenants.name,
      firstName: authUsers.firstName,
      lastName: authUsers.lastName,
      name: sql<string>`concat(${authUsers.firstName}, ' ', ${authUsers.lastName})`,
      email: authUsers.email,
      jobTitle: authUsers.jobTitle,
      phone: authUsers.phone,
      avatarUrl: authUsers.avatarUrl,
      role: tenantMemberships.role,
      status: tenantMemberships.status,
      lastSeen: authUsers.lastLoginAt,
      isPrimarySuperuser: tenantMemberships.isPrimarySuperuser,
    })
    .from(tenantMemberships)
    .innerJoin(authUsers, eq(authUsers.id, tenantMemberships.userId))
    .innerJoin(tenants, eq(tenants.id, tenantMemberships.tenantId))
    .where(tenantId ? eq(tenantMemberships.tenantId, tenantId) : undefined)
    .orderBy(desc(tenantMemberships.createdAt));

  return c.json({
    users: rows.map((row) => ({
      id: row.id,
      userId: row.userId,
      companyId: row.companyId,
      company: row.company,
      firstName: row.firstName,
      lastName: row.lastName,
      name: row.name,
      email: row.email,
      jobTitle: row.jobTitle,
      phone: row.phone,
      avatarUrl: row.avatarUrl,
      role: row.role,
      status: row.status === "removed" ? "disabled" : row.status,
      lastSeen: row.lastSeen,
      isPrimarySuperuser: row.isPrimarySuperuser,
    })),
  });
});

workspaceRouter.post("/users", zValidator("json", userCreateSchema), async (c) => {
  const { name, email, role, tenantId } = c.req.valid("json");
  const access = await requireUsersAccess(c, tenantId);
  if (access instanceof Response) return access;
  const protectedTenantAccess = await canManageProtectedTenant(c, tenantId);
  if (!protectedTenantAccess.ok) {
    return protectedTenantAccess.response;
  }
  const normalized = normalizeEmail(email);
  const { firstName, lastName } = splitName(name);

  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.id, tenantId),
  });

  if (!tenant) {
    return c.json({ error: "Company not found." }, 404);
  }

  const membership = await db.transaction(async (tx) => {
    const existingUser = await tx.query.authUsers.findFirst({
      where: eq(authUsers.emailNormalized, normalized),
    });

    const userId =
      existingUser?.id ??
      (
        await tx
          .insert(authUsers)
          .values({
            email: email.trim(),
            emailNormalized: normalized,
            firstName,
            lastName,
            passwordHash: "managed-by-superuser",
            accountStatus: "active",
          })
          .returning({ id: authUsers.id })
      )[0]?.id;

    if (!userId) {
      throw new Error("Could not create user.");
    }

    const currentPrimary = await tx.query.tenantMemberships.findFirst({
      where: and(
        eq(tenantMemberships.tenantId, tenant.id),
        eq(tenantMemberships.isPrimarySuperuser, true)
      ),
      columns: { id: true },
    });

    const [createdMembership] = await tx
      .insert(tenantMemberships)
      .values({
        tenantId,
        userId,
        role,
        status: "active",
        isPrimarySuperuser: role === "superuser" && !currentPrimary,
      })
      .onConflictDoNothing()
      .returning({
        id: tenantMemberships.id,
        role: tenantMemberships.role,
        status: tenantMemberships.status,
      });

    if (!currentPrimary && createdMembership?.id && createdMembership.role === "superuser") {
      await tx
        .update(tenants)
        .set({ primarySuperuserMembershipId: createdMembership.id, updatedAt: new Date() })
        .where(eq(tenants.id, tenantId));
    }

    return createdMembership;
  }).catch((error) => {
    throw error;
  });

  if (!membership) {
    return c.json({ error: "Could not create user." }, 500);
  }

  return c.json({ ok: true, membership });
});

workspaceRouter.patch(
  "/users/:membershipId",
  zValidator("json", membershipUpdateSchema),
  async (c) => {
    const membershipId = c.req.param("membershipId");
    const patch = c.req.valid("json");

    const membership = await db.query.tenantMemberships.findFirst({
      where: eq(tenantMemberships.id, membershipId),
    });

    if (!membership) {
      return c.json({ error: "Membership not found." }, 404);
    }

    const access = await requireUsersAccess(c, membership.tenantId);
    if (access instanceof Response) return access;

    const protectedTenantAccess = await canManageProtectedTenant(c, membership.tenantId);
    if (!protectedTenantAccess.ok) {
      return protectedTenantAccess.response;
    }

    const authUser = await db.query.authUsers.findFirst({
      where: eq(authUsers.id, membership.userId),
    });

    if (!authUser) {
      return c.json({ error: "User not found." }, 404);
    }

    if (
      patch.name ||
      patch.firstName ||
      patch.lastName ||
      patch.email ||
      patch.jobTitle !== undefined ||
      patch.phone !== undefined ||
      patch.avatarUrl !== undefined ||
      patch.password
    ) {
      const parsedName = patch.name
        ? splitName(patch.name)
        : {
            firstName: patch.firstName ?? authUser.firstName,
            lastName: patch.lastName ?? authUser.lastName,
          };
      await db
        .update(authUsers)
        .set({
          ...(patch.email
            ? {
                email: patch.email.trim(),
                emailNormalized: normalizeEmail(patch.email),
              }
            : {}),
          ...(parsedName
            ? {
                firstName: patch.firstName ?? parsedName.firstName,
                lastName: patch.lastName ?? parsedName.lastName,
              }
            : {}),
          ...(patch.jobTitle !== undefined ? { jobTitle: patch.jobTitle || null } : {}),
          ...(patch.phone !== undefined ? { phone: patch.phone || null } : {}),
          ...(patch.avatarUrl !== undefined ? { avatarUrl: patch.avatarUrl || null } : {}),
          ...(patch.password
            ? {
                passwordHash: createHash("sha256")
                  .update(patch.password)
                  .digest("hex"),
              }
            : {}),
          updatedAt: new Date(),
        })
        .where(eq(authUsers.id, membership.userId));
    }

    await db
      .update(tenantMemberships)
      .set({
        ...(patch.role ? { role: patch.role } : {}),
        ...(patch.status ? { status: patch.status } : {}),
        ...(patch.status === "disabled" ? { deactivatedAt: new Date() } : {}),
        updatedAt: new Date(),
      })
      .where(eq(tenantMemberships.id, membershipId));

    return c.json({ ok: true });
  }
);

workspaceRouter.delete("/users/:membershipId", async (c) => {
  const membershipId = c.req.param("membershipId");
  const membership = await db.query.tenantMemberships.findFirst({
    where: eq(tenantMemberships.id, membershipId),
  });

  if (!membership) {
    return c.json({ error: "Membership not found." }, 404);
  }

  const access = await requireUsersAccess(c, membership.tenantId);
  if (access instanceof Response) return access;

  const protectedTenantAccess = await canManageProtectedTenant(c, membership.tenantId);
  if (!protectedTenantAccess.ok) {
    return protectedTenantAccess.response;
  }

  if (membership.isPrimarySuperuser) {
    return c.json({ error: "Primary superuser cannot be deleted." }, 409);
  }

  await db.delete(tenantMemberships).where(eq(tenantMemberships.id, membershipId));
  return c.json({ ok: true });
});

workspaceRouter.get("/requests", async (c) => {
  const sessionBundle = await ensureSession(c);
  if (!sessionBundle) {
    return c.json({ error: "Current session not found." }, 401);
  }
  const tenantId = sessionBundle.session.activeTenantId;
  const rows = await db
    .select({
      id: tenantJoinRequests.id,
      createdAt: tenantJoinRequests.createdAt,
      status: tenantJoinRequests.status,
      message: tenantJoinRequests.requestMessage,
      name: sql<string>`concat(${authUsers.firstName}, ' ', ${authUsers.lastName})`,
      email: authUsers.email,
      requesterUserId: authUsers.id,
      tenantId: tenants.id,
      company: tenants.name,
    })
    .from(tenantJoinRequests)
    .innerJoin(authUsers, eq(authUsers.id, tenantJoinRequests.requesterUserId))
    .innerJoin(tenants, eq(tenants.id, tenantJoinRequests.tenantId))
    .where(tenantId ? eq(tenantJoinRequests.tenantId, tenantId) : undefined)
    .orderBy(desc(tenantJoinRequests.createdAt));

  return c.json({ requests: rows });
});

workspaceRouter.get("/permissions", async (c) => {
  const tenant = await getTenantFromSession(c);
  if (tenant instanceof Response) return tenant;

  const [roles, permissions, assignments, userCounts] = await Promise.all([
    db.query.tenantRoleDefinitions.findMany({
      orderBy: asc(tenantRoleDefinitions.code),
    }),
    db.query.permissionDefinitions.findMany({
      where: and(
        eq(permissionDefinitions.scope, "tenant"),
        eq(permissionDefinitions.isActive, true)
      ),
      orderBy: asc(permissionDefinitions.code),
    }),
    db
      .select({
        roleCode: tenantRoleDefinitions.code,
        permissionCode: permissionDefinitions.code,
      })
      .from(tenantScopedRolePermissions)
      .innerJoin(tenantRoleDefinitions, eq(tenantRoleDefinitions.id, tenantScopedRolePermissions.roleId))
      .innerJoin(permissionDefinitions, eq(permissionDefinitions.id, tenantScopedRolePermissions.permissionId))
      .where(eq(tenantScopedRolePermissions.tenantId, tenant.id)),
    db
      .select({
        role: tenantMemberships.role,
        count: sql<number>`count(*)`,
      })
      .from(tenantMemberships)
      .where(eq(tenantMemberships.tenantId, tenant.id))
      .groupBy(tenantMemberships.role),
  ]);

  return c.json({
    tenant,
    permissions: permissions.map((permission) => ({
      code: permission.code,
      name: permission.name,
      menuKey: permission.menuKey,
    })),
    roles: roles.map((role) => ({
      code: role.code,
      name: role.name,
      description: role.description,
      permissions: assignments
        .filter((assignment) => assignment.roleCode === role.code)
        .map((assignment) => assignment.permissionCode),
      userCount: userCounts.find((entry) => entry.role === role.code)?.count ?? 0,
    })),
  });
});

workspaceRouter.put(
  "/permissions",
  zValidator("json", tenantPermissionsUpdateSchema),
  async (c) => {
    const tenant = await getTenantFromSession(c);
    if (tenant instanceof Response) return tenant;

    const payload = c.req.valid("json");

    await db.delete(tenantScopedRolePermissions).where(eq(tenantScopedRolePermissions.tenantId, tenant.id));

    for (const role of payload.roles) {
      const roleRow = await db.query.tenantRoleDefinitions.findFirst({
        where: eq(tenantRoleDefinitions.code, role.roleCode),
        columns: { id: true },
      });

      if (!roleRow) continue;

      if (!role.permissions.length) continue;

      const permissionRows = await db.query.permissionDefinitions.findMany({
        where: and(
          eq(permissionDefinitions.scope, "tenant"),
          inArray(permissionDefinitions.code, role.permissions)
        ),
        columns: { id: true, code: true },
      });

      if (!permissionRows.length) continue;

      await db.insert(tenantScopedRolePermissions).values(
        permissionRows.map((permission) => ({
          tenantId: tenant.id,
          roleId: roleRow.id,
          permissionId: permission.id,
        }))
      );
    }

    return c.json({ ok: true });
  }
);

workspaceRouter.patch(
  "/requests/:requestId",
  zValidator("json", requestDecisionSchema),
  async (c) => {
    const requestId = c.req.param("requestId");
    const { status } = c.req.valid("json");

    const existing = await db.query.tenantJoinRequests.findFirst({
      where: eq(tenantJoinRequests.id, requestId),
    });

    if (!existing) {
      return c.json({ error: "Request not found." }, 404);
    }

    await db
      .update(tenantJoinRequests)
      .set({
        status,
        decidedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(tenantJoinRequests.id, requestId));

    if (status === "approved") {
      await db
        .insert(tenantMemberships)
        .values({
          tenantId: existing.tenantId,
          userId: existing.requesterUserId,
          role: "member",
          status: "active",
        })
        .onConflictDoNothing();
    }

    return c.json({ ok: true });
  }
);

workspaceRouter.delete("/requests/:requestId", async (c) => {
  const requestId = c.req.param("requestId");

  await db.delete(tenantJoinRequests).where(eq(tenantJoinRequests.id, requestId));

  return c.json({ ok: true });
});

workspaceRouter.get("/company-setup", async (c) => {
  const tenant = await getTenantFromSession(c);
  if (tenant instanceof Response) return tenant;

  const setup = await db.query.workspaceCompanySetup.findFirst({
    where: eq(workspaceCompanySetup.tenantId, tenant.id),
  });

  return c.json({
    tenant,
    companySetup: setup ?? {
      legalName: tenant.name,
      displayName: tenant.name,
      taxId: tenant.taxId,
      websiteUrl: "",
      countryCode: "",
      primaryContactName: "",
      primaryContactEmail: "",
      billingEmail: "",
      companySummary: "",
    },
  });
});

workspaceRouter.put(
  "/company-setup",
  zValidator("json", companySetupSchema),
  async (c) => {
    const tenant = await getTenantFromSession(c);
    if (tenant instanceof Response) return tenant;

    const payload = c.req.valid("json");

    await db
      .insert(workspaceCompanySetup)
      .values({
        tenantId: tenant.id,
        legalName: payload.legalName,
        displayName: payload.displayName,
        taxId: payload.taxId,
        websiteUrl: payload.websiteUrl || null,
        countryCode: payload.countryCode || null,
        primaryContactName: payload.primaryContactName || null,
        primaryContactEmail: payload.primaryContactEmail || null,
        billingEmail: payload.billingEmail || null,
        companySummary: payload.companySummary || null,
        setupCompletedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: workspaceCompanySetup.tenantId,
        set: {
          legalName: payload.legalName,
          displayName: payload.displayName,
          taxId: payload.taxId,
          websiteUrl: payload.websiteUrl || null,
          countryCode: payload.countryCode || null,
          primaryContactName: payload.primaryContactName || null,
          primaryContactEmail: payload.primaryContactEmail || null,
          billingEmail: payload.billingEmail || null,
          companySummary: payload.companySummary || null,
          setupCompletedAt: new Date(),
          updatedAt: new Date(),
        },
      });

    await db
      .update(tenants)
      .set({
        name: payload.displayName,
        taxId: payload.taxId,
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, tenant.id));

    return c.json({ ok: true });
  }
);

workspaceRouter.patch(
  "/companies/:tenantId",
  zValidator("json", companyUpdateSchema),
  async (c) => {
    const tenantId = c.req.param("tenantId");
    const payload = c.req.valid("json");

    const protectedTenantAccess = await canManageProtectedTenant(c, tenantId);
    if (!protectedTenantAccess.ok) {
      return protectedTenantAccess.response;
    }

    const existingTenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, tenantId),
      columns: { id: true },
    });

    if (!existingTenant) {
      return c.json({ error: "Company not found." }, 404);
    }

    const protectedTenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, tenantId),
      columns: { taxId: true },
    });

    const isProtected = isProtectedTenant({ taxId: protectedTenant?.taxId });
    const nextStatus = isProtected ? "active" : payload.status;
    const nextTaxId = isProtected ? protectedTenant?.taxId ?? payload.taxId : payload.taxId;

    await db
      .insert(workspaceCompanySetup)
      .values({
        tenantId,
        legalName: payload.legalName,
        displayName: payload.displayName,
        taxId: nextTaxId,
        websiteUrl: payload.websiteUrl || null,
        countryCode: payload.countryCode || null,
        primaryContactName: payload.primaryContactName || null,
        primaryContactEmail: payload.primaryContactEmail || null,
        billingEmail: payload.billingEmail || null,
        companySummary: payload.companySummary || null,
        setupCompletedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: workspaceCompanySetup.tenantId,
        set: {
          legalName: payload.legalName,
          displayName: payload.displayName,
          taxId: nextTaxId,
          websiteUrl: payload.websiteUrl || null,
          countryCode: payload.countryCode || null,
          primaryContactName: payload.primaryContactName || null,
          primaryContactEmail: payload.primaryContactEmail || null,
          billingEmail: payload.billingEmail || null,
          companySummary: payload.companySummary || null,
          setupCompletedAt: new Date(),
          updatedAt: new Date(),
        },
      });

    await db
      .update(tenants)
      .set({
        name: payload.displayName,
        taxId: nextTaxId,
        status: nextStatus,
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, tenantId));

    return c.json({ ok: true });
  }
);

workspaceRouter.delete("/companies/:tenantId", async (c) => {
  const tenantId = c.req.param("tenantId");
  const existingTenant = await db.query.tenants.findFirst({
    where: eq(tenants.id, tenantId),
    columns: { id: true },
  });

  if (!existingTenant) {
    return c.json({ error: "Company not found." }, 404);
  }

  const protectedTenant = await db.query.tenants.findFirst({
    where: eq(tenants.id, tenantId),
    columns: { taxId: true, name: true },
  });

  if (isProtectedTenant({ taxId: protectedTenant?.taxId })) {
    return c.json({ error: "Zero is a protected company and cannot be deleted." }, 409);
  }

  await db.delete(tenants).where(eq(tenants.id, tenantId));
  return c.json({ ok: true });
});

workspaceRouter.get("/integrations", async (c) => {
  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.taxId, ZERO_COMPANY_TAX_ID),
  });

  if (!tenant) {
    return c.json({ error: "Zero company not found." }, 404);
  }

  const [llmRows, emailConfig] = await Promise.all([
    db.query.workspaceLlmConfigs.findMany({
      where: eq(workspaceLlmConfigs.tenantId, tenant.id),
      orderBy: asc(workspaceLlmConfigs.provider),
    }),
    db.query.workspaceEmailConfigs.findFirst({
      where: eq(workspaceEmailConfigs.tenantId, tenant.id),
    }),
  ]);

  const sessionBundle = await ensureSession(c);
  const godUser = sessionBundle ? await resolveCurrentUser(sessionBundle.session) : null;
  const godProfile = godUser
    ? await db.query.platformOperatorProfiles.findFirst({
        where: eq(platformOperatorProfiles.userId, godUser.id),
      })
    : null;

  return c.json({
    tenant: {
      id: tenant.id,
      name: tenant.name,
      taxId: tenant.taxId,
    },
    llmConfigs: llmRows,
    emailConfig:
      emailConfig ?? {
        provider: "smtp",
        fromName: "",
        fromEmail: "",
        replyToEmail: "",
        smtpHost: "",
        smtpPort: null,
        smtpUsername: "",
        smtpPasswordCiphertext: "",
        isEnabled: false,
      },
    godProfile: godUser
      ? {
          name: godProfile?.contactName ?? `${godUser.firstName} ${godUser.lastName}`.trim(),
          email: godProfile?.contactEmail ?? godUser.email,
          phone: godProfile?.contactPhone ?? godUser.phone ?? "",
        }
      : {
          name: "",
          email: "",
          phone: "",
        },
  });
});

workspaceRouter.get("/seed-data", async (c) => {
  const zeroTenant = await db.query.tenants.findFirst({
    where: eq(tenants.taxId, ZERO_COMPANY_TAX_ID),
  });

  if (!zeroTenant) {
    return c.json({ error: "Zero company not found." }, 404);
  }

  const [companySetup, users, llmConfigs, emailConfig, tenantRoles, permissions, tenantRoleLinks] =
    await Promise.all([
      db.query.workspaceCompanySetup.findFirst({
        where: eq(workspaceCompanySetup.tenantId, zeroTenant.id),
      }),
      db
        .select({
          email: authUsers.email,
          firstName: authUsers.firstName,
          lastName: authUsers.lastName,
          jobTitle: authUsers.jobTitle,
          phone: authUsers.phone,
          avatarUrl: authUsers.avatarUrl,
          passwordHash: authUsers.passwordHash,
          accountStatus: authUsers.accountStatus,
          platformRole: authUsers.platformRole,
          role: tenantMemberships.role,
          status: tenantMemberships.status,
          isPrimarySuperuser: tenantMemberships.isPrimarySuperuser,
        })
        .from(tenantMemberships)
        .innerJoin(authUsers, eq(authUsers.id, tenantMemberships.userId))
        .where(eq(tenantMemberships.tenantId, zeroTenant.id))
        .orderBy(asc(authUsers.email)),
      db.query.workspaceLlmConfigs.findMany({
        where: eq(workspaceLlmConfigs.tenantId, zeroTenant.id),
        orderBy: asc(workspaceLlmConfigs.provider),
      }),
      db.query.workspaceEmailConfigs.findFirst({
        where: eq(workspaceEmailConfigs.tenantId, zeroTenant.id),
      }),
      db.query.tenantRoleDefinitions.findMany({
        orderBy: asc(tenantRoleDefinitions.code),
      }),
      db.query.permissionDefinitions.findMany({
        where: eq(permissionDefinitions.scope, "tenant"),
        orderBy: asc(permissionDefinitions.code),
      }),
      db
        .select({
          roleCode: tenantRoleDefinitions.code,
          permissionCode: permissionDefinitions.code,
        })
        .from(tenantScopedRolePermissions)
        .innerJoin(tenantRoleDefinitions, eq(tenantRoleDefinitions.id, tenantScopedRolePermissions.roleId))
        .innerJoin(permissionDefinitions, eq(permissionDefinitions.id, tenantScopedRolePermissions.permissionId))
        .where(eq(tenantScopedRolePermissions.tenantId, zeroTenant.id)),
    ]);

  return c.json({
    exportedAt: new Date().toISOString(),
    tenant: {
      name: zeroTenant.name,
      slug: zeroTenant.slug,
      taxId: zeroTenant.taxId,
      status: zeroTenant.status,
    },
    companySetup: companySetup
      ? {
          legalName: companySetup.legalName,
          displayName: companySetup.displayName,
          taxId: companySetup.taxId,
          websiteUrl: companySetup.websiteUrl,
          countryCode: companySetup.countryCode,
          primaryContactName: companySetup.primaryContactName,
          primaryContactEmail: companySetup.primaryContactEmail,
          billingEmail: companySetup.billingEmail,
          companySummary: companySetup.companySummary,
        }
      : null,
    users: users.map((user) => ({
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      jobTitle: user.jobTitle,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      passwordHash: user.passwordHash,
      accountStatus: user.accountStatus,
      platformRole: user.platformRole,
      membership: {
        role: user.role,
        status: user.status === "removed" ? "disabled" : user.status,
        isPrimarySuperuser: user.isPrimarySuperuser,
      },
    })),
    tenantRoleDefinitions: tenantRoles.map((role) => ({
      code: role.code,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      isActive: role.isActive,
    })),
    permissionDefinitions: permissions.map((permission) => ({
      code: permission.code,
      name: permission.name,
      description: permission.description,
      scope: permission.scope,
      menuKey: permission.menuKey,
      isSystem: permission.isSystem,
      isActive: permission.isActive,
    })),
    tenantPermissions: tenantRoles.map((role) => ({
      roleCode: role.code,
      permissions: tenantRoleLinks
        .filter((entry) => entry.roleCode === role.code)
        .map((entry) => entry.permissionCode),
    })),
    llmConfigs: llmConfigs.map((config) => ({
      provider: config.provider,
      defaultModel: config.defaultModel,
      apiKeyCiphertext: config.apiKeyCiphertext,
      isEnabled: config.isEnabled,
    })),
    emailConfig: emailConfig
      ? {
          provider: emailConfig.provider,
          fromName: emailConfig.fromName,
          fromEmail: emailConfig.fromEmail,
          replyToEmail: emailConfig.replyToEmail,
          smtpHost: emailConfig.smtpHost,
          smtpPort: emailConfig.smtpPort,
          smtpUsername: emailConfig.smtpUsername,
          smtpPasswordCiphertext: emailConfig.smtpPasswordCiphertext,
          isEnabled: emailConfig.isEnabled,
        }
      : null,
  });
});

workspaceRouter.post("/seed-data", zValidator("json", zeroSeedDataSchema), async (c) => {
  const payload = c.req.valid("json");

  const zeroCandidates = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(sql`${tenants.taxId} = ${ZERO_COMPANY_TAX_ID} or lower(${tenants.name}) = lower('Zero')`);

  const uniqueIds = [...new Set(zeroCandidates.map((entry) => entry.id))];
  if (uniqueIds.length > 1) {
    return c.json({ error: "Existem multiplas empresas Zero. Corrige antes de importar." }, 409);
  }

  const zeroSlug = payload.tenant.slug || "zero";
  const existingZeroId = uniqueIds[0] ?? null;
  const [tenant] =
    existingZeroId
      ? await db
          .update(tenants)
          .set({
            name: "Zero",
            slug: zeroSlug,
            taxId: ZERO_COMPANY_TAX_ID,
            status: payload.tenant.status,
            updatedAt: new Date(),
          })
          .where(eq(tenants.id, existingZeroId))
          .returning({ id: tenants.id })
      : await db
          .insert(tenants)
          .values({
            name: "Zero",
            slug: zeroSlug,
            taxId: ZERO_COMPANY_TAX_ID,
            status: payload.tenant.status,
          })
          .returning({ id: tenants.id });

  if (!tenant) {
    return c.json({ error: "Nao foi possivel criar ou atualizar a empresa Zero." }, 500);
  }

  if (payload.companySetup) {
    await db
      .insert(workspaceCompanySetup)
      .values({
        tenantId: tenant.id,
        legalName: payload.companySetup.legalName,
        displayName: payload.companySetup.displayName,
        taxId: ZERO_COMPANY_TAX_ID,
        websiteUrl: payload.companySetup.websiteUrl,
        countryCode: payload.companySetup.countryCode,
        primaryContactName: payload.companySetup.primaryContactName,
        primaryContactEmail: payload.companySetup.primaryContactEmail,
        billingEmail: payload.companySetup.billingEmail,
        companySummary: payload.companySetup.companySummary,
        setupCompletedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: workspaceCompanySetup.tenantId,
        set: {
          legalName: payload.companySetup.legalName,
          displayName: payload.companySetup.displayName,
          taxId: ZERO_COMPANY_TAX_ID,
          websiteUrl: payload.companySetup.websiteUrl,
          countryCode: payload.companySetup.countryCode,
          primaryContactName: payload.companySetup.primaryContactName,
          primaryContactEmail: payload.companySetup.primaryContactEmail,
          billingEmail: payload.companySetup.billingEmail,
          companySummary: payload.companySetup.companySummary,
          setupCompletedAt: new Date(),
          updatedAt: new Date(),
        },
      });
  }

  for (const role of payload.tenantRoleDefinitions) {
    await db
      .insert(tenantRoleDefinitions)
      .values({
        code: role.code,
        name: role.name,
        description: role.description,
        isSystem: role.isSystem,
        isActive: role.isActive,
      })
      .onConflictDoUpdate({
        target: tenantRoleDefinitions.code,
        set: {
          name: role.name,
          description: role.description,
          isSystem: role.isSystem,
          isActive: role.isActive,
          updatedAt: new Date(),
        },
      });
  }

  for (const permission of payload.permissionDefinitions) {
    await db
      .insert(permissionDefinitions)
      .values({
        code: permission.code,
        name: permission.name,
        description: permission.description,
        scope: permission.scope,
        menuKey: permission.menuKey,
        isSystem: permission.isSystem,
        isActive: permission.isActive,
      })
      .onConflictDoUpdate({
        target: permissionDefinitions.code,
        set: {
          name: permission.name,
          description: permission.description,
          scope: permission.scope,
          menuKey: permission.menuKey,
          isSystem: permission.isSystem,
          isActive: permission.isActive,
          updatedAt: new Date(),
        },
      });
  }

  await db.delete(tenantScopedRolePermissions).where(eq(tenantScopedRolePermissions.tenantId, tenant.id));
  for (const permissionSet of payload.tenantPermissions) {
    const role = await db.query.tenantRoleDefinitions.findFirst({
      where: eq(tenantRoleDefinitions.code, permissionSet.roleCode),
      columns: { id: true },
    });
    if (!role) continue;

    const permissionRows = await db.query.permissionDefinitions.findMany({
      where: and(
        eq(permissionDefinitions.scope, "tenant"),
        inArray(permissionDefinitions.code, permissionSet.permissions)
      ),
      columns: { id: true },
    });

    if (!permissionRows.length) continue;
    await db.insert(tenantScopedRolePermissions).values(
      permissionRows.map((permission) => ({
        tenantId: tenant.id,
        roleId: role.id,
        permissionId: permission.id,
      }))
    );
  }

  const primarySuperuserMembershipId = await db.transaction(async (tx) => {
    await tx.delete(tenantMemberships).where(eq(tenantMemberships.tenantId, tenant.id));

    let nextPrimarySuperuserMembershipId: string | null = null;
    for (const user of payload.users) {
      const normalizedEmail = normalizeEmail(user.email);
      const [authUser] = await tx
        .insert(authUsers)
        .values({
          email: user.email,
          emailNormalized: normalizedEmail,
          firstName: user.firstName,
          lastName: user.lastName,
          jobTitle: user.jobTitle,
          phone: user.phone,
          avatarUrl: user.avatarUrl,
          passwordHash: user.passwordHash,
          platformRole: user.platformRole,
          accountStatus: user.accountStatus,
        })
        .onConflictDoUpdate({
          target: authUsers.emailNormalized,
          set: {
            firstName: user.firstName,
            lastName: user.lastName,
            jobTitle: user.jobTitle,
            phone: user.phone,
            avatarUrl: user.avatarUrl,
            passwordHash: user.passwordHash,
            platformRole: user.platformRole,
            accountStatus: user.accountStatus,
            updatedAt: new Date(),
          },
        })
        .returning({ id: authUsers.id });

      if (!authUser) continue;

      const [membership] = await tx
        .insert(tenantMemberships)
        .values({
          tenantId: tenant.id,
          userId: authUser.id,
          role: user.membership.role,
          status: user.membership.status,
          isPrimarySuperuser: user.membership.isPrimarySuperuser,
        })
        .returning({ id: tenantMemberships.id });

      if (user.membership.isPrimarySuperuser && membership) {
        nextPrimarySuperuserMembershipId = membership.id;
      }
    }

    return nextPrimarySuperuserMembershipId;
  });

  await db
    .update(tenants)
    .set({
      name: "Zero",
      taxId: ZERO_COMPANY_TAX_ID,
      primarySuperuserMembershipId,
      updatedAt: new Date(),
    })
    .where(eq(tenants.id, tenant.id));

  await db.delete(workspaceLlmConfigs).where(eq(workspaceLlmConfigs.tenantId, tenant.id));
  for (const config of payload.llmConfigs) {
    await db.insert(workspaceLlmConfigs).values({
      tenantId: tenant.id,
      provider: config.provider,
      apiKeyCiphertext: config.apiKeyCiphertext,
      defaultModel: config.defaultModel,
      isEnabled: config.isEnabled,
    });
  }

  if (payload.emailConfig) {
    await db
      .insert(workspaceEmailConfigs)
      .values({
        tenantId: tenant.id,
        provider: payload.emailConfig.provider,
        fromName: payload.emailConfig.fromName,
        fromEmail: payload.emailConfig.fromEmail,
        replyToEmail: payload.emailConfig.replyToEmail,
        smtpHost: payload.emailConfig.smtpHost,
        smtpPort: payload.emailConfig.smtpPort,
        smtpUsername: payload.emailConfig.smtpUsername,
        smtpPasswordCiphertext: payload.emailConfig.smtpPasswordCiphertext ?? null,
        isEnabled: payload.emailConfig.isEnabled,
      })
      .onConflictDoUpdate({
        target: workspaceEmailConfigs.tenantId,
        set: {
          provider: payload.emailConfig.provider,
          fromName: payload.emailConfig.fromName,
          fromEmail: payload.emailConfig.fromEmail,
          replyToEmail: payload.emailConfig.replyToEmail,
          smtpHost: payload.emailConfig.smtpHost,
          smtpPort: payload.emailConfig.smtpPort,
          smtpUsername: payload.emailConfig.smtpUsername,
          smtpPasswordCiphertext: payload.emailConfig.smtpPasswordCiphertext ?? null,
          isEnabled: payload.emailConfig.isEnabled,
          updatedAt: new Date(),
        },
      });
  }

  return c.json({ ok: true, tenantId: tenant.id });
});

workspaceRouter.put(
  "/integrations",
  zValidator("json", integrationsSchema),
  async (c) => {
    const payload = c.req.valid("json");
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.taxId, ZERO_COMPANY_TAX_ID),
      columns: { id: true },
    });

    if (!tenant) {
      return c.json({ error: "Zero company not found." }, 404);
    }

    for (const config of payload.llmConfigs) {
      await db
        .insert(workspaceLlmConfigs)
        .values({
          tenantId: tenant.id,
          provider: config.provider,
          apiKeyCiphertext: config.apiKeyCiphertext || "",
          defaultModel: config.defaultModel || null,
          isEnabled: config.isEnabled,
        })
        .onConflictDoUpdate({
          target: [workspaceLlmConfigs.tenantId, workspaceLlmConfigs.provider],
          set: {
            apiKeyCiphertext: config.apiKeyCiphertext || "",
            defaultModel: config.defaultModel || null,
            isEnabled: config.isEnabled,
            updatedAt: new Date(),
          },
        });
    }

    await db
      .insert(workspaceEmailConfigs)
      .values({
        tenantId: tenant.id,
        provider: payload.emailConfig.provider,
        fromName: payload.emailConfig.fromName,
        fromEmail: payload.emailConfig.fromEmail,
        replyToEmail: payload.emailConfig.replyToEmail || null,
        smtpHost: payload.emailConfig.smtpHost || null,
        smtpPort: payload.emailConfig.smtpPort,
        smtpUsername: payload.emailConfig.smtpUsername || null,
        smtpPasswordCiphertext: payload.emailConfig.smtpPasswordCiphertext || null,
        isEnabled: payload.emailConfig.isEnabled,
      })
      .onConflictDoUpdate({
        target: workspaceEmailConfigs.tenantId,
        set: {
          provider: payload.emailConfig.provider,
          fromName: payload.emailConfig.fromName,
          fromEmail: payload.emailConfig.fromEmail,
          replyToEmail: payload.emailConfig.replyToEmail || null,
          smtpHost: payload.emailConfig.smtpHost || null,
          smtpPort: payload.emailConfig.smtpPort,
          smtpUsername: payload.emailConfig.smtpUsername || null,
          smtpPasswordCiphertext: payload.emailConfig.smtpPasswordCiphertext || null,
          isEnabled: payload.emailConfig.isEnabled,
          updatedAt: new Date(),
        },
      });

    const sessionBundle = await ensureSession(c);
    const godUser = sessionBundle ? await resolveCurrentUser(sessionBundle.session) : null;
    if (godUser) {
      const parsedName = splitName(payload.godProfile.name);

      await db
        .update(authUsers)
        .set({
          firstName: parsedName.firstName,
          lastName: parsedName.lastName,
          email: payload.godProfile.email.trim(),
          emailNormalized: normalizeEmail(payload.godProfile.email),
          phone: payload.godProfile.phone || null,
          updatedAt: new Date(),
        })
        .where(eq(authUsers.id, godUser.id));

      await db
        .insert(platformOperatorProfiles)
        .values({
          userId: godUser.id,
          contactName: payload.godProfile.name.trim(),
          contactEmail: payload.godProfile.email.trim(),
          contactPhone: payload.godProfile.phone || null,
          updatedByUserId: godUser.id,
        })
        .onConflictDoUpdate({
          target: platformOperatorProfiles.userId,
          set: {
            contactName: payload.godProfile.name.trim(),
            contactEmail: payload.godProfile.email.trim(),
            contactPhone: payload.godProfile.phone || null,
            updatedByUserId: godUser.id,
            updatedAt: new Date(),
          },
        });
    }

    return c.json({ ok: true });
  }
);
