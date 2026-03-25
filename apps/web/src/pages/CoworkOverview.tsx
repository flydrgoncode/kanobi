import { useQuery } from "@tanstack/react-query";
import { Layout } from "../components/Layout";
import { useTenantSelection } from "../context/tenant-selection";
import { getCurrentUser } from "../lib/workspace-api";

export default function CoworkOverview() {
  const { selectedTenantId, selectedTenantName, isHydrating } = useTenantSelection();
  const { data } = useQuery({
    queryKey: ["cowork-current-user", selectedTenantId],
    queryFn: () => getCurrentUser(),
    retry: false,
  });

  const currentRole = data?.user.role === "god" ? "superuser" : data?.user.role ?? "member";

  return (
    <Layout
      section="Overview"
      sectionLabel="Cowork"
      context="cowork"
      role={currentRole}
    >
      <div className="space-y-6">
        <section className="panel p-8">
          <div className="max-w-3xl">
            <div className="context-chip mb-4 inline-flex">Cowork</div>
            <h1 className="text-3xl font-semibold tracking-tight text-text-main">
              {selectedTenantId
                ? `Workspace de ${selectedTenantName || "uma empresa"}`
                : "Cowork precisa de uma empresa ativa"}
            </h1>
            <p className="mt-3 text-sm leading-6 text-text-muted">
              {selectedTenantId
                ? "Este surface arranca sempre em contexto de tenant e será a área operacional da empresa."
                : "Escolhe primeiro uma empresa no Mission Control para entrares no Cowork em contexto de tenant."}
            </p>
          </div>
        </section>

        {isHydrating ? (
          <section className="panel p-8">
            <p className="text-sm text-text-muted">A carregar contexto do tenant...</p>
          </section>
        ) : !selectedTenantId ? (
          <section className="panel p-8">
            <p className="text-sm text-text-muted">
              Sem tenant ativo. Volta ao Mission Control, escolhe uma empresa e entra depois no
              Cowork.
            </p>
          </section>
        ) : (
          <section className="panel p-8">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-border-subtle bg-bg-surface px-5 py-4">
                <div className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                  Role ativa
                </div>
                <div className="mt-2 text-lg font-semibold text-text-main">{currentRole}</div>
              </div>
              <div className="rounded-xl border border-border-subtle bg-bg-surface px-5 py-4">
                <div className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                  Empresa
                </div>
                <div className="mt-2 text-lg font-semibold text-text-main">
                  {selectedTenantName}
                </div>
              </div>
              <div className="rounded-xl border border-border-subtle bg-bg-surface px-5 py-4">
                <div className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                  Sprint 1
                </div>
                <div className="mt-2 text-lg font-semibold text-text-main">Strategy ligado ao Postgres</div>
              </div>
            </div>
          </section>
        )}
      </div>
    </Layout>
  );
}
