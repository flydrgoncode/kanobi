import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Save, ShieldCheck, Users } from "lucide-react";
import { Layout } from "../components/Layout";
import { useTenantSelection } from "../context/tenant-selection";
import {
  getTenantPermissions,
  saveTenantPermissions,
  type ApiTenantPermissions,
} from "../lib/workspace-api";

type PermissionCode = "workspace_use" | "workspace_backoffice" | "workspace_config";
type PermissionsPayload = {
  roles: Array<{
    roleCode: "member" | "support" | "superuser";
    permissions: PermissionCode[];
  }>;
};

const permissionLabels: Record<PermissionCode, string> = {
  workspace_use: "Uso",
  workspace_backoffice: "Backoffice",
  workspace_config: "Configuracao",
};

export default function Permissions() {
  const { selectedTenantId } = useTenantSelection();
  const queryClient = useQueryClient();

  const { data, error, isLoading } = useQuery({
    queryKey: ["tenant-permissions", selectedTenantId],
    queryFn: () => getTenantPermissions(),
    enabled: Boolean(selectedTenantId),
    retry: false,
  });

  const mutation = useMutation({
    mutationFn: (payload: PermissionsPayload) =>
      saveTenantPermissions(payload),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["tenant-permissions", selectedTenantId] }),
  });

  const permissionOrder = useMemo(
    () =>
      (data?.permissions ?? []).slice().sort((left, right) => {
        const order: PermissionCode[] = [
          "workspace_use",
          "workspace_backoffice",
          "workspace_config",
        ];
        return order.indexOf(left.code) - order.indexOf(right.code);
      }),
    [data?.permissions]
  );

  const togglePermission = (
    roleCode: ApiTenantPermissions["roles"][number]["code"],
    permissionCode: PermissionCode
  ) => {
    if (!data) return;

    const roles = data.roles.map((role) => {
      if (role.code !== roleCode) return role;

      const nextPermissions = role.permissions.includes(permissionCode)
        ? role.permissions.filter((item) => item !== permissionCode)
        : [...role.permissions, permissionCode];

      return {
        ...role,
        permissions: nextPermissions,
      };
    });

    mutation.mutate({
      roles: roles.map((role) => ({
        roleCode: role.code,
        permissions: role.permissions,
      })),
    });
  };

  return (
    <Layout section="Definição de Permissões" sectionLabel="Mission Control">
      <div className="space-y-6">
        {!selectedTenantId ? (
          <section className="panel p-8">
            <div className="context-chip mb-4 inline-flex">Definição de Permissões</div>
            <h1 className="text-3xl font-semibold tracking-tight text-text-main">
              Escolhe uma empresa para gerir permissoes
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-text-muted">
              Em modo God vês o Mission Control inteiro. Para alterar permissoes de
              workspace, escolhe primeiro uma empresa no selector do topo.
            </p>
          </section>
        ) : null}

        {selectedTenantId && error ? (
          <section className="panel p-6">
            <p className="text-sm text-red-600 dark:text-red-300">
              {error instanceof Error
                ? error.message
                : "Nao foi possivel ler as permissoes da empresa."}
            </p>
          </section>
        ) : null}

        {selectedTenantId && data ? (
          <>
            <section className="panel p-8">
              <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                <div className="max-w-2xl">
                  <div className="context-chip mb-4 inline-flex">Definição de Permissões</div>
                  <h1 className="text-3xl font-semibold tracking-tight text-text-main">
                    Permissoes de {data.tenant.name}
                  </h1>
                  <p className="mt-3 text-sm leading-6 text-text-muted">
                    O God consegue ajustar os acessos do tenant por role. O mesmo
                    ecran pode ser reutilizado dentro do workspace para ver apenas a
                    configuracao da empresa atual.
                  </p>
                </div>
                <div className="rounded-lg bg-[var(--context-soft)] px-4 py-2 text-xs font-semibold text-[var(--context-accent)]">
                  {data.roles.length} roles
                </div>
              </div>
            </section>

            <section>
              <div className="panel overflow-hidden">
                <div className="border-b border-border-subtle px-8 py-6">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h2 className="text-sm font-semibold text-text-main">Roles to tenant</h2>
                      <p className="mt-1 text-sm text-text-muted">
                        A matriz abaixo controla os menus visiveis e os acessos de
                        member, support e superuser neste workspace.
                      </p>
                    </div>
                    {mutation.isPending ? (
                      <div className="rounded-lg bg-[var(--context-soft)] px-4 py-2 text-xs font-semibold text-[var(--context-accent)]">
                        A gravar...
                      </div>
                    ) : null}
                  </div>
                </div>

                {isLoading ? (
                  <div className="px-8 py-6 text-sm text-text-muted">
                    A carregar permissoes do Postgres...
                  </div>
                ) : null}

                <div className="border-b border-border-subtle px-8 py-3">
                  <div className="grid items-center gap-4 xl:grid-cols-[minmax(240px,1fr)_repeat(3,minmax(150px,180px))_120px]">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted">
                      Role
                    </div>
                    {permissionOrder.map((permission) => (
                      <div
                        key={permission.code}
                        className="text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted"
                      >
                        {permissionLabels[permission.code]}
                      </div>
                    ))}
                    <div className="text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted">
                      Gravacao
                    </div>
                  </div>
                </div>

                <div className="divide-y divide-border-subtle">
                  {data.roles.map((role) => (
                    <article
                      key={role.code}
                      className="grid items-center gap-4 px-8 py-4 xl:grid-cols-[minmax(240px,1fr)_repeat(3,minmax(150px,180px))_120px]"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-bg-base">
                            {role.code === "superuser" ? (
                              <ShieldCheck className="h-4.5 w-4.5 text-text-main" />
                            ) : (
                              <Users className="h-4.5 w-4.5 text-text-main" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-text-main">
                              {role.name}
                            </div>
                            <div className="truncate text-xs text-text-muted">
                              {role.description || "Sem descricao"} · {role.userCount} users
                            </div>
                          </div>
                        </div>
                      </div>

                      {permissionOrder.map((permission) => {
                        const isEnabled = role.permissions.includes(permission.code);
                        return (
                          <div key={permission.code} className="flex items-center justify-center">
                            <button
                              type="button"
                              onClick={() => togglePermission(role.code, permission.code)}
                              className={`relative h-6 w-11 rounded-full transition-colors ${
                                isEnabled
                                  ? "bg-emerald-500/80"
                                  : "bg-slate-300 dark:bg-slate-700"
                              }`}
                              aria-label={`Alternar ${permissionLabels[permission.code]} para ${role.name}`}
                            >
                              <span
                                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                                  isEnabled ? "translate-x-5" : "translate-x-0.5"
                                }`}
                              />
                            </button>
                          </div>
                        );
                      })}

                      <div className="flex justify-end">
                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-border-subtle px-3 py-2 text-xs font-semibold text-text-main">
                          <Save className="h-3.5 w-3.5" />
                          Auto
                        </span>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </section>
          </>
        ) : null}
      </div>
    </Layout>
  );
}
