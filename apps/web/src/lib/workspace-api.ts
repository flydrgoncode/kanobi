export type ApiWorkspaceUser = {
  id: string;
  userId: string;
  companyId: string;
  company: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  jobTitle: string | null;
  phone: string | null;
  avatarUrl: string | null;
  role: "member" | "support" | "superuser";
  status: "active" | "disabled";
  lastSeen: string | null;
  isPrimarySuperuser: boolean;
};

export type ApiCurrentUser = {
  id: string;
  name: string;
  email: string;
  jobTitle: string;
  phone: string;
  avatarUrl: string;
  role: "member" | "support" | "superuser" | "god";
};

export type ApiJoinRequest = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  message: string | null;
  status: "pending" | "approved" | "rejected" | "cancelled";
  requesterUserId: string;
  tenantId: string;
  company: string;
};

export type ApiCompanySetup = {
  legalName: string;
  displayName: string;
  taxId: string;
  websiteUrl: string | null;
  countryCode: string | null;
  primaryContactName: string | null;
  primaryContactEmail: string | null;
  billingEmail: string | null;
  companySummary: string | null;
};

export type ApiLlmConfig = {
  provider: "openai" | "anthropic" | "llama";
  defaultModel: string | null;
  apiKeyCiphertext: string;
  isEnabled: boolean;
};

export type ApiEmailConfig = {
  provider: "smtp" | "ses" | "resend" | "custom";
  fromName: string;
  fromEmail: string;
  replyToEmail: string | null;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpUsername: string | null;
  smtpPasswordCiphertext?: string | null;
  isEnabled: boolean;
};

export type ApiGodProfile = {
  name: string;
  email: string;
  phone: string;
};

type ApiTenantRef = {
  id: string;
  name: string;
  taxId: string;
};

export type ApiCompany = {
  id: string;
  name: string;
  slug: string;
  taxId: string;
  isProtected: boolean;
  status: "active" | "suspended" | "archived";
  legalName: string;
  displayName: string;
  websiteUrl: string | null;
  countryCode: string | null;
  primaryContactName: string | null;
  primaryContactEmail: string | null;
  billingEmail: string | null;
  companySummary: string | null;
};

export type ApiMissionControlOverview = {
  metrics: {
    activeTenants: number;
    suspendedTenants: number;
    pendingRequests: number;
    superusers: number;
    llmEnabledTenants: number;
    emailEnabledTenants: number;
    godUsers: number;
  };
  companies: Array<{
    tenantId: string;
    company: string;
    legalName: string;
    taxId: string;
    status: "active" | "suspended" | "archived";
    primaryContactEmail: string;
    superuserName: string;
    superuserEmail: string;
  }>;
};

export type ApiTenantPermissions = {
  tenant: ApiTenantRef;
  permissions: Array<{
    code: "workspace_use" | "workspace_backoffice" | "workspace_config";
    name: string;
    menuKey: string | null;
  }>;
  roles: Array<{
    code: "member" | "support" | "superuser";
    name: string;
    description: string | null;
    permissions: Array<"workspace_use" | "workspace_backoffice" | "workspace_config">;
    userCount: number;
  }>;
};

export type ApiTenantContext = {
  mode: "god" | "tenant";
  tenant: {
    id: string;
    name: string;
    taxId: string;
  } | null;
};

export type ApiCoworkStrategyItem = {
  id: string;
  shortName: string;
  description: string;
  createdAt: string;
  updatedAt: string;
};

export type ApiCoworkStrategy = {
  tenant: ApiTenantRef;
  role: "support" | "superuser";
  vision: ApiCoworkStrategyItem | null;
  values: ApiCoworkStrategyItem[];
  obstacles: ApiCoworkStrategyItem[];
};

export type ApiCoworkGroup = {
  id: string;
  name: string;
  description: string | null;
  members: Array<{
    membershipId: string;
    userId: string;
    name: string;
    email: string;
  }>;
  createdAt: string;
  updatedAt: string;
};

export type ApiCoworkGroupsResponse = {
  tenant: ApiTenantRef;
  groups: ApiCoworkGroup[];
};

export type ApiCoworkMeetingType = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  cadence: "weekly" | "monthly" | "quarterly" | "semiannual";
  isActive?: boolean;
  sortOrder?: number;
};

export type ApiCoworkMeeting = {
  id: string;
  meetingTypeId: string;
  name: string;
  scheduledAt: string;
  durationMinutes: number;
  status: "scheduled" | "completed" | "cancelled";
  focus: string | null;
  outcome: string | null;
  notes: string | null;
  groups: Array<{
    meetingId: string;
    groupId: string;
    groupName: string;
  }>;
  participants: Array<{
    membershipId: string;
    name: string;
    email: string;
  }>;
  uploads: Array<{
    meetingId: string;
    id: string;
    fileName: string;
  }>;
};

export type ApiCoworkMeetingsResponse = {
  tenant: ApiTenantRef;
  groups: Array<{ id: string; name: string }>;
  meetingTypes: Array<{
    id: string;
    code: string;
    name: string;
    cadence: "weekly" | "monthly" | "quarterly" | "semiannual";
  }>;
  meetings: ApiCoworkMeeting[];
};

export type ApiZeroSeedData = {
  exportedAt: string;
  tenant: {
    name: string;
    slug: string;
    taxId: string;
    status: "active" | "suspended" | "archived";
  };
  companySetup: ApiCompanySetup | null;
  users: Array<{
    email: string;
    firstName: string;
    lastName: string;
    jobTitle: string | null;
    phone: string | null;
    avatarUrl: string | null;
    passwordHash: string;
    accountStatus: "active" | "disabled" | "invited";
    platformRole: "user" | "god";
    membership: {
      role: "member" | "support" | "superuser";
      status: "active" | "disabled";
      isPrimarySuperuser: boolean;
    };
  }>;
  tenantRoleDefinitions: Array<{
    code: "member" | "support" | "superuser";
    name: string;
    description: string | null;
    isSystem: boolean;
    isActive: boolean;
  }>;
  permissionDefinitions: Array<{
    code: string;
    name: string;
    description: string | null;
    scope: "platform" | "tenant";
    menuKey: string | null;
    isSystem: boolean;
    isActive: boolean;
  }>;
  tenantPermissions: Array<{
    roleCode: "member" | "support" | "superuser";
    permissions: string[];
  }>;
  llmConfigs: ApiLlmConfig[];
  emailConfig: ApiEmailConfig | null;
};

async function request<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(`/api/workspace${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.message || payload.error || "Workspace request failed.");
  }

  return response.json() as Promise<T>;
}

export function getWorkspaceSummary() {
  return request<{
    tenant: ApiTenantRef;
    metrics: { activeUsers: number; pendingRequests: number; configuredProviders: number };
    companySetup: ApiCompanySetup | null;
  }>("/summary");
}

export function getMissionControlOverview() {
  return request<ApiMissionControlOverview>("/mission-control");
}

export function getCurrentUser() {
  return request<{ user: ApiCurrentUser }>("/me");
}

export function saveCurrentUser(
  payload: {
    name: string;
    email: string;
    jobTitle: string;
    phone: string;
    avatarUrl: string;
  },
) {
  return request<{ ok: true }>("/me", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function getWorkspaceUsers() {
  return request<{ users: ApiWorkspaceUser[] }>("/users");
}

export function createWorkspaceUser(payload: {
  name: string;
  email: string;
  tenantId: string;
  role: ApiWorkspaceUser["role"];
}) {
  return request<{ ok: true }>("/users", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateWorkspaceUser(
  membershipId: string,
  payload: Partial<
    Pick<ApiWorkspaceUser, "role" | "status"> & {
      name: string;
      email: string;
      firstName: string;
      lastName: string;
      jobTitle: string | null;
      phone: string | null;
      avatarUrl: string | null;
      password: string;
    }
  >
) {
  return request<{ ok: true }>(`/users/${membershipId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteWorkspaceUser(membershipId: string) {
  return request<{ ok: true }>(`/users/${membershipId}`, {
    method: "DELETE",
  });
}

export function getWorkspaceRequests() {
  return request<{ requests: ApiJoinRequest[] }>("/requests");
}

export function decideWorkspaceRequest(
  requestId: string,
  status: "approved" | "rejected"
) {
  return request<{ ok: true }>(`/requests/${requestId}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function deleteWorkspaceRequest(requestId: string) {
  return request<{ ok: true }>(`/requests/${requestId}`, {
    method: "DELETE",
  });
}

export function getCompanySetup() {
  return request<{ tenant: ApiTenantRef; companySetup: ApiCompanySetup }>("/company-setup");
}

export function getCompanies() {
  return request<{ companies: ApiCompany[] }>("/companies");
}

export function getCompanyCatalog() {
  return request<{ companies: ApiCompany[] }>("/companies/catalog");
}

export function createCompany(
  payload: ApiCompanySetup & { status: "active" | "suspended" }
) {
  return request<{ ok: true; tenantId: string }>("/companies", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateCompany(
  tenantId: string,
  payload: ApiCompanySetup & { status: "active" | "suspended" }
) {
  return request<{ ok: true }>(`/companies/${tenantId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteCompany(tenantId: string) {
  return request<{ ok: true }>(`/companies/${tenantId}`, {
    method: "DELETE",
  });
}

export function saveCompanySetup(payload: ApiCompanySetup) {
  return request<{ ok: true }>("/company-setup", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function getIntegrations() {
  return request<{
    tenant: ApiTenantRef;
    llmConfigs: ApiLlmConfig[];
    emailConfig: ApiEmailConfig;
    godProfile: ApiGodProfile;
  }>("/integrations");
}

export function saveIntegrations(payload: {
  llmConfigs: ApiLlmConfig[];
  emailConfig: ApiEmailConfig;
  godProfile: ApiGodProfile;
}) {
  return request<{ ok: true }>("/integrations", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function getTenantPermissions() {
  return request<ApiTenantPermissions>("/permissions");
}

export function saveTenantPermissions(payload: {
  roles: Array<{
    roleCode: "member" | "support" | "superuser";
    permissions: Array<"workspace_use" | "workspace_backoffice" | "workspace_config">;
  }>;
}) {
  return request<{ ok: true }>("/permissions", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function getTenantContext() {
  return request<ApiTenantContext>("/context");
}

export function setTenantContext(tenantId: string | null) {
  return request<{ ok: true; mode: "god" | "tenant"; tenant: ApiTenantContext["tenant"] }>(
    "/context",
    {
      method: "PUT",
      body: JSON.stringify({ tenantId }),
    }
  );
}

export function downloadZeroSeedData() {
  return fetch("/api/workspace/seed-data", {
    credentials: "include",
  }).then(async (response) => {
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.message || payload.error || "Seed data request failed.");
    }
    return response.json() as Promise<ApiZeroSeedData>;
  });
}

export function uploadZeroSeedData(payload: ApiZeroSeedData) {
  return request<{ ok: true; tenantId: string }>("/seed-data", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getCoworkStrategy() {
  return request<ApiCoworkStrategy>("/cowork/strategy");
}

export function saveCoworkVision(payload: { shortName: string; description: string }) {
  return request<{ ok: true }>("/cowork/strategy/vision", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteCoworkVision() {
  return request<{ ok: true }>("/cowork/strategy/vision", {
    method: "DELETE",
  });
}

export function createCoworkValue(payload: { shortName: string; description: string }) {
  return request<{ ok: true }>("/cowork/strategy/values", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateCoworkValue(
  valueId: string,
  payload: { shortName: string; description: string }
) {
  return request<{ ok: true }>(`/cowork/strategy/values/${valueId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteCoworkValue(valueId: string) {
  return request<{ ok: true }>(`/cowork/strategy/values/${valueId}`, {
    method: "DELETE",
  });
}

export function createCoworkObstacle(payload: { shortName: string; description: string }) {
  return request<{ ok: true }>("/cowork/strategy/obstacles", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateCoworkObstacle(
  obstacleId: string,
  payload: { shortName: string; description: string }
) {
  return request<{ ok: true }>(`/cowork/strategy/obstacles/${obstacleId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteCoworkObstacle(obstacleId: string) {
  return request<{ ok: true }>(`/cowork/strategy/obstacles/${obstacleId}`, {
    method: "DELETE",
  });
}

export function getCoworkGroups() {
  return request<ApiCoworkGroupsResponse>("/cowork/groups");
}

export function createCoworkGroup(payload: {
  name: string;
  description: string | null;
  membershipIds: string[];
}) {
  return request<{ ok: true }>("/cowork/groups", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateCoworkGroup(
  groupId: string,
  payload: { name: string; description: string | null; membershipIds: string[] }
) {
  return request<{ ok: true }>(`/cowork/groups/${groupId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteCoworkGroup(groupId: string) {
  return request<{ ok: true }>(`/cowork/groups/${groupId}`, {
    method: "DELETE",
  });
}

export function getCoworkMeetingTypes() {
  return request<{ meetingTypes: ApiCoworkMeetingType[] }>("/cowork/meeting-types");
}

export function createCoworkMeetingType(payload: {
  code: string;
  name: string;
  description: string | null;
  cadence: "weekly" | "monthly" | "quarterly" | "semiannual";
  isActive: boolean;
}) {
  return request<{ ok: true }>("/cowork/meeting-types", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateCoworkMeetingType(
  meetingTypeId: string,
  payload: {
    code: string;
    name: string;
    description: string | null;
    cadence: "weekly" | "monthly" | "quarterly" | "semiannual";
    isActive: boolean;
  }
) {
  return request<{ ok: true }>(`/cowork/meeting-types/${meetingTypeId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteCoworkMeetingType(meetingTypeId: string) {
  return request<{ ok: true }>(`/cowork/meeting-types/${meetingTypeId}`, {
    method: "DELETE",
  });
}

export function getCoworkMeetings() {
  return request<ApiCoworkMeetingsResponse>("/cowork/meetings");
}

export function createCoworkMeeting(payload: {
  meetingTypeId: string;
  name: string;
  scheduledAt: string;
  durationMinutes: number;
  status: "scheduled" | "completed" | "cancelled";
  focus: string | null;
  outcome: string | null;
  notes: string | null;
  groupIds: string[];
  participantMembershipIds: string[];
}) {
  return request<{ ok: true }>("/cowork/meetings", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateCoworkMeeting(
  meetingId: string,
  payload: {
    meetingTypeId: string;
    name: string;
    scheduledAt: string;
    durationMinutes: number;
    status: "scheduled" | "completed" | "cancelled";
    focus: string | null;
    outcome: string | null;
    notes: string | null;
    groupIds: string[];
    participantMembershipIds: string[];
  }
) {
  return request<{ ok: true }>(`/cowork/meetings/${meetingId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteCoworkMeeting(meetingId: string) {
  return request<{ ok: true }>(`/cowork/meetings/${meetingId}`, {
    method: "DELETE",
  });
}
