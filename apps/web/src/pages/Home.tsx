import { ArrowRight, Building2, Layers3, PencilLine, ShieldCheck, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "../components/Layout";
import { useTenantSelection } from "../context/tenant-selection";
import { getWorkspaceSummary } from "../lib/workspace-api";

export default function Home() {
  const { selectedTenantId } = useTenantSelection();
  const { data, error } = useQuery({
    queryKey: ["workspace-summary", selectedTenantId],
    queryFn: getWorkspaceSummary,
    retry: false,
  });

  const pendingRequests = data?.metrics.pendingRequests ?? 0;
  const activeUsers = data?.metrics.activeUsers ?? 0;
  const configuredProviders = data?.metrics.configuredProviders ?? 0;
  const governanceHighlights = [
    data?.companySetup?.taxId ? `NIF validado: ${data.companySetup.taxId}` : "Empresa sem NIF configurado",
    activeUsers > 0
      ? `${activeUsers} utilizadores ativos no tenant`
      : "Sem utilizadores ativos no tenant",
    pendingRequests > 0
      ? `${pendingRequests} convites a aguardar decisao`
      : "Sem convites pendentes",
  ];

  return (
    <Layout section="Overview" sectionLabel="Workspace">
      <div className="space-y-6">
        {error ? (
          <section className="panel p-6">
            <p className="text-sm text-red-600 dark:text-red-300">
              {error instanceof Error ? error.message : "Nao foi possivel ler o workspace da base de dados."}
            </p>
          </section>
        ) : null}
        <section className="panel overflow-hidden">
          <div className="grid gap-0 xl:grid-cols-[1.25fr_0.75fr]">
            <div className="px-8 py-8 sm:px-10">
              <div className="context-chip mb-5 inline-flex">Sprint 1 · Mission Control</div>
              <h1 className="max-w-3xl text-[2.35rem] font-semibold tracking-tight text-text-main sm:text-[3rem]">
                Workspace pronto para administracao, setup e governacao do tenant.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-text-muted">
                O Kanobi entra no Sprint 1 com uma shell profissional para o workspace
                e com um menu de mission control focado em companies, acessos,
                integracoes e controlo destrutivo.
              </p>
              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">Fonte de dados: Postgres</p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  to="/workspace/users"
                  className="inline-flex items-center gap-2 rounded-xl bg-bg-inverse px-5 py-3 text-sm font-semibold text-text-inverse transition-opacity hover:opacity-85"
                >
                  Gerir utilizadores <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/workspace/companies"
                  className="inline-flex items-center gap-2 rounded-xl border border-border-subtle bg-bg-base px-5 py-3 text-sm font-semibold text-text-main transition-colors hover:bg-bg-hover"
                >
                  Abrir companies
                </Link>
              </div>
            </div>

            <div className="border-l border-border-subtle bg-[var(--context-soft)] px-8 py-8">
              <div className="flex items-center justify-between gap-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--context-accent)]">
                  Estado operativo
                </div>
                <Link to="/workspace/companies" className="action-link">
                  <PencilLine className="h-3.5 w-3.5" />
                  Editar
                </Link>
              </div>
              <div className="mt-6 space-y-4">
                {[
                  ["Utilizadores ativos", String(activeUsers)],
                  ["Pedidos pendentes", String(pendingRequests)],
                  ["LLMs configurados", `${configuredProviders}/3`],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-end justify-between gap-4 border-b border-[var(--context-border)] pb-3">
                    <div className="text-sm text-text-muted">{label}</div>
                    <div className="text-2xl font-semibold tracking-tight text-text-main">
                      {value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="panel p-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold text-text-main">
                  Prioridades do mission control
                </h2>
                <p className="mt-1 text-sm text-text-muted">
                  O trabalho administrativo desta sprint fica concentrado nestes fluxos.
                </p>
              </div>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {[
                {
                  title: "Companies",
                  detail: "Gerir empresas, estados e escolher o workspace ativo.",
                  icon: Building2,
                  href: "/workspace/companies",
                },
                {
                  title: "Users",
                  detail: "Criar contas completas e gerir roles do workspace.",
                  icon: Users,
                  href: "/workspace/users",
                },
                {
                  title: "Integrations",
                  detail: "Guardar as keys LLM e o canal de email do tenant.",
                  icon: ShieldCheck,
                  href: "/workspace/integrations",
                },
                {
                  title: "Danger Zone",
                  detail: "Preparar operacoes destrutivas com confirmacao forte.",
                  icon: Layers3,
                  href: "/workspace/danger-zone",
                },
              ].map((item) => (
                <Link
                  key={item.title}
                  to={item.href}
                  className="rounded-xl border border-border-subtle bg-bg-base p-5 transition-all hover:-translate-y-0.5 hover:border-border-strong hover:shadow-card"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--context-soft)] text-[var(--context-accent)]">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div className="mt-4 text-sm font-semibold text-text-main">{item.title}</div>
                  <p className="mt-2 text-sm leading-6 text-text-muted">{item.detail}</p>
                </Link>
              ))}
            </div>
          </div>

          <aside className="space-y-6">
            <section className="panel p-8">
              <h2 className="text-sm font-semibold text-text-main">Governacao e trilho</h2>
              <div className="mt-5 space-y-4">
                {governanceHighlights.map((item) => (
                  <div key={item} className="rounded-xl border border-border-subtle bg-bg-base px-4 py-3 text-sm text-text-main">
                    {item}
                  </div>
                ))}
              </div>
            </section>

            <section className="panel p-8">
              <h2 className="text-sm font-semibold text-text-main">Proximo salto</h2>
              <p className="mt-3 text-sm leading-6 text-text-muted">
                A shell do mission control fica pronta nesta sprint. A seguir entra o menu
                de support com estrategia, metodos, metricas, tracking e reunioes.
              </p>
            </section>
          </aside>
        </section>
      </div>
    </Layout>
  );
}
