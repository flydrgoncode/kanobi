import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Trash2 } from "lucide-react";
import { Layout } from "../components/Layout";
import { useTenantSelection } from "../context/tenant-selection";
import { getCompanySetup } from "../lib/workspace-api";

const destructiveScopes = [
  "Apagar metodos",
  "Apagar sub-metodos",
  "Apagar metricas",
  "Apagar valores",
  "Apagar visao",
  "Apagar obstaculos",
  "Apagar tabelas de metricas",
];

export default function DangerZone() {
  const { selectedTenantId } = useTenantSelection();
  const [confirmation, setConfirmation] = useState("");
  const { data } = useQuery({
    queryKey: ["workspace-company-setup", selectedTenantId],
    queryFn: getCompanySetup,
    retry: false,
  });
  const tenantName = data?.companySetup.displayName ?? "";
  const canDelete = useMemo(
    () => confirmation.trim() === tenantName,
    [confirmation, tenantName]
  );

  return (
    <Layout section="Danger Zone" sectionLabel="Mission Control">
      <div className="space-y-6">
        <section className="panel p-8">
          <div className="inline-flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-red-600 dark:text-red-300">
            <AlertTriangle className="h-3.5 w-3.5" />
            Operacoes destrutivas
          </div>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight text-text-main">
            Limpeza de dados do tenant
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-text-muted">
            Estas acoes pertencem exclusivamente ao Mission Control. Devem pedir confirmacao
            forte e ficar auditadas no backend.
          </p>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <aside className="panel p-8">
            <h2 className="text-sm font-semibold text-text-main">Escopo da limpeza</h2>
            <div className="mt-5 space-y-3">
              {destructiveScopes.map((scope) => (
                <div
                  key={scope}
                  className="rounded-xl border border-border-subtle bg-bg-base px-4 py-3 text-sm text-text-main"
                >
                  {scope}
                </div>
              ))}
            </div>
          </aside>

          <section className="panel p-8">
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6">
              <h2 className="text-sm font-semibold text-text-main">Confirmacao obrigatoria</h2>
              <p className="mt-3 text-sm leading-6 text-text-muted">
                Para desbloquear a acao, escreve exatamente o nome do tenant:
                <span className="ml-1 font-semibold text-text-main">
                  {tenantName || "tenant sem nome"}
                </span>
              </p>
              <input
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                className="mt-5 w-full rounded-xl border border-border-subtle bg-bg-surface px-4 py-3 text-sm text-text-main outline-none transition-all focus:border-border-strong focus:ring-1 focus:ring-border-strong"
              />
              <button
                disabled={!canDelete}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-35"
              >
                <Trash2 className="h-4 w-4" />
                Apagar dados do tenant
              </button>
            </div>
          </section>
        </section>
      </div>
    </Layout>
  );
}
