import { CircleAlert, CircleCheckBig, Mail, Shield } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "../components/Layout";
import { getMissionControlOverview } from "../lib/workspace-api";

function companyStatusLabel(status: "active" | "suspended" | "archived") {
  if (status === "active") return "Activa";
  if (status === "suspended") return "Suspensa";
  return "Arquivada";
}

export default function MissionControl() {
  const { data, error, isLoading } = useQuery({
    queryKey: ["mission-control-overview"],
    queryFn: getMissionControlOverview,
    retry: false,
  });

  const metrics = data?.metrics;
  const companies = data?.companies ?? [];

  const metricCards = [
    {
      label: "Empresas activas",
      value: String(metrics?.activeTenants ?? 0),
      detail: "Tenants activos no Postgres",
    },
    {
      label: "Empresas suspensas",
      value: String(metrics?.suspendedTenants ?? 0),
      detail: "A precisar de revisao operacional",
    },
    {
      label: "Convites pendentes",
      value: String(metrics?.pendingRequests ?? 0),
      detail: "Pedidos a aguardar decisao",
    },
    {
      label: "Superusers activos",
      value: String(metrics?.superusers ?? 0),
      detail: "Administradores principais por empresa",
    },
  ];

  const healthCards = [
    {
      label: "Contas God",
      value: String(metrics?.godUsers ?? 0),
      tone: "positive" as const,
      note: "Operadores globais do Mission Control",
    },
    {
      label: "LLM por tenant",
      value: String(metrics?.llmEnabledTenants ?? 0),
      tone: "neutral" as const,
      note: "Empresas com providers LLM activos",
    },
    {
      label: "Email por tenant",
      value: String(metrics?.emailEnabledTenants ?? 0),
      tone: "warning" as const,
      note: "Workspaces com canal de email configurado",
    },
  ];

  return (
    <Layout
      section="Mission Control"
      sectionLabel="Dashboard do negocio"
      context="mission-control"
      role="god"
    >
      <div className="space-y-6">
        {error ? (
          <section className="panel p-6">
            <p className="text-sm text-red-600 dark:text-red-300">
              {error instanceof Error
                ? error.message
                : "Nao foi possivel ler o dashboard do Postgres."}
            </p>
          </section>
        ) : null}

        <section className="panel overflow-hidden">
          <div className="grid gap-8 px-8 py-8 xl:grid-cols-[1.2fr_0.8fr]">
            <div>
              <div className="context-chip mb-4 inline-flex">Business cockpit</div>
              <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-text-main">
                Controlo executivo da plataforma Kanobi
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-text-muted">
                Este dashboard e completamente lido do Postgres e resume o estado real
                de empresas, convites, superusers e configuracao da plataforma.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              <article className="rounded-xl border border-border-subtle bg-bg-base px-5 py-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                  <Shield className="h-4 w-4 text-[var(--context-accent)]" />
                  Governance
                </div>
                <div className="mt-3 text-lg font-semibold text-text-main">
                  {metrics?.godUsers ?? 0} conta God activa
                </div>
                <p className="mt-1 text-sm text-text-muted">
                  Impersonation controlado e sem memberships artificiais.
                </p>
              </article>
              <article className="rounded-xl border border-border-subtle bg-bg-base px-5 py-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                  <Mail className="h-4 w-4 text-[var(--context-accent)]" />
                  Outreach
                </div>
                <div className="mt-3 text-lg font-semibold text-text-main">
                  {metrics?.emailEnabledTenants ?? 0} canais de email activos
                </div>
                <p className="mt-1 text-sm text-text-muted">
                  Configuracoes de envio reais por tenant.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-4">
          {metricCards.map((metric) => (
            <article key={metric.label} className="panel px-6 py-5">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">
                {metric.label}
              </div>
              <div className="mt-3 text-3xl font-semibold tracking-tight text-text-main">
                {isLoading ? "..." : metric.value}
              </div>
              <p className="mt-2 text-sm text-text-muted">{metric.detail}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <article className="panel overflow-hidden">
            <div className="border-b border-border-subtle px-8 py-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-text-main">Empresas em foco</div>
                  <p className="mt-1 text-sm text-text-muted">
                    Empresas, superusers e contacto principal lidos do Postgres.
                  </p>
                </div>
                <div className="rounded-lg bg-[var(--context-soft)] px-3 py-2 text-xs font-semibold text-[var(--context-accent)]">
                  {companies.length} empresas
                </div>
              </div>
            </div>

            <div className="border-b border-border-subtle px-8 py-3">
              <div className="grid items-center gap-4 xl:grid-cols-[minmax(260px,1.2fr)_180px_120px_1fr]">
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted">Empresa</div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted">Superuser</div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted">Estado</div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted">Contacto</div>
              </div>
            </div>
            <div className="divide-y divide-border-subtle">
              {isLoading ? (
                <div className="px-8 py-6 text-sm text-text-muted">
                  A carregar dashboard do Postgres...
                </div>
              ) : companies.length === 0 ? (
                <div className="px-8 py-6 text-sm text-text-muted">
                  Sem empresas carregadas na base de dados.
                </div>
              ) : (
                companies.map((row) => (
                  <div
                    key={row.tenantId}
                    className="grid items-center gap-4 px-8 py-4 xl:grid-cols-[minmax(260px,1.2fr)_180px_120px_1fr]"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-text-main">
                        {row.company}
                      </div>
                      <div className="truncate text-xs text-text-muted">
                        {row.legalName} · NIF {row.taxId}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm text-text-main">{row.superuserName}</div>
                      <div className="truncate text-xs text-text-muted">{row.superuserEmail}</div>
                    </div>
                    <div className="truncate text-sm text-text-main">
                      {companyStatusLabel(row.status)}
                    </div>
                    <div className="truncate text-sm text-text-muted">
                      {row.primaryContactEmail || "Sem email principal"}
                    </div>
                  </div>
                ))
              )}
            </div>
          </article>

          <article className="panel overflow-hidden">
            <div className="border-b border-border-subtle px-8 py-6">
              <div className="text-sm font-semibold text-text-main">Saude da plataforma</div>
              <p className="mt-1 text-sm text-text-muted">
                Indicadores reais de configuracao e governance.
              </p>
            </div>

            <div className="space-y-4 px-8 py-6">
              {healthCards.map((item) => (
                <div key={item.label} className="rounded-xl border border-border-subtle bg-bg-base px-5 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-text-main">{item.label}</div>
                    <div className="flex items-center gap-2 text-sm font-semibold text-text-main">
                      {item.tone === "positive" ? (
                        <CircleCheckBig className="h-4 w-4 text-emerald-600" />
                      ) : item.tone === "warning" ? (
                        <CircleAlert className="h-4 w-4 text-amber-600" />
                      ) : (
                        <Shield className="h-4 w-4 text-[var(--context-accent)]" />
                      )}
                      {isLoading ? "..." : item.value}
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-text-muted">{item.note}</p>
                </div>
              ))}
            </div>
          </article>
        </section>
      </div>
    </Layout>
  );
}
