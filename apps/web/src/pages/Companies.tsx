import { FormEvent, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Building2, Plus, Search, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Layout } from "../components/Layout";
import { useTenantSelection } from "../context/tenant-selection";
import {
  createCompany,
  deleteCompany,
  getCompanies,
  getWorkspaceUsers,
  updateCompany,
  type ApiCompany,
} from "../lib/workspace-api";

type CompanyDraft = {
  legalName: string;
  displayName: string;
  taxId: string;
  websiteUrl: string;
  countryCode: string;
  status: "active" | "suspended";
};

const companyFieldPairs: Array<{
  label: string;
  key: keyof Omit<CompanyDraft, "status">;
}> = [
  { label: "Nome legal", key: "legalName" },
  { label: "Nome de apresentacao", key: "displayName" },
  { label: "NIF", key: "taxId" },
  { label: "Website", key: "websiteUrl" },
  { label: "Pais", key: "countryCode" },
];

function toDraft(company: ApiCompany): CompanyDraft {
  return {
    legalName: company.legalName,
    displayName: company.displayName,
    taxId: company.taxId,
    websiteUrl: company.websiteUrl ?? "",
    countryCode: company.countryCode ?? "",
    status: company.status === "active" ? "active" : "suspended",
  };
}

function statusLabel(status: "active" | "suspended" | "archived") {
  return status === "active" ? "Ativa" : status === "suspended" ? "Desativada" : "Arquivada";
}

function companyRowClassName(isProtected: boolean) {
  return isProtected
    ? "bg-amber-50/80 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:ring-amber-500/30"
    : "";
}

export default function Companies() {
  const { selectedTenantId, selectedTenantName, activateTenant, activateGodMode } =
    useTenantSelection();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [draft, setDraft] = useState<CompanyDraft | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "suspended">("all");

  const { data, error, isLoading } = useQuery({
    queryKey: ["workspace-companies", selectedTenantId],
    queryFn: () => getCompanies(),
    retry: false,
  });
  const { data: usersData } = useQuery({
    queryKey: ["mission-control-users", selectedTenantId],
    queryFn: () => getWorkspaceUsers(),
    retry: false,
  });

  const mutation = useMutation({
    mutationFn: ({
      tenantId,
      payload,
    }: {
      tenantId: string;
      payload: CompanyDraft;
    }) =>
      updateCompany(tenantId, {
        legalName: payload.legalName,
        displayName: payload.displayName,
        taxId: payload.taxId,
        websiteUrl: payload.websiteUrl,
        countryCode: payload.countryCode,
        primaryContactName: "",
        primaryContactEmail: "",
        billingEmail: "",
        companySummary: "",
        status: payload.status,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace-companies"] });
      queryClient.invalidateQueries({ queryKey: ["workspace-summary"] });
      queryClient.invalidateQueries({ queryKey: ["workspace-company-setup"] });
    },
  });

  const createMutation = useMutation({
    mutationFn: (payload: CompanyDraft) =>
      createCompany({
        legalName: payload.legalName,
        displayName: payload.displayName,
        taxId: payload.taxId,
        websiteUrl: payload.websiteUrl,
        countryCode: payload.countryCode,
        primaryContactName: "",
        primaryContactEmail: "",
        billingEmail: "",
        companySummary: "",
        status: payload.status,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace-companies"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCompany,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace-companies"] });
      queryClient.invalidateQueries({ queryKey: ["workspace-summary"] });
    },
  });

  const companies = data?.companies ?? [];
  const users = usersData?.users ?? [];
  const visibleCompanies = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();
    return companies.filter((company) => {
      const matchesStatus = statusFilter === "all" ? true : company.status === statusFilter;
      const matchesSearch = searchTerm
        ? [
            company.displayName,
            company.legalName,
            company.taxId,
          ].some((value) => value.toLowerCase().includes(searchTerm))
        : true;
      return matchesStatus && matchesSearch;
    });
  }, [companies, search, statusFilter]);

  const selectedCompany = useMemo(
    () => companies.find((company) => company.id === selectedCompanyId) ?? null,
    [companies, selectedCompanyId]
  );
  const selectedCompanySuperusers = useMemo(
    () =>
      selectedCompany
        ? users.filter(
            (user) => user.companyId === selectedCompany.id && user.role === "superuser"
          )
        : [],
    [selectedCompany, users]
  );
  const isZeroReadOnly = Boolean(selectedCompany?.isProtected && selectedTenantId === selectedCompany.id);

  useEffect(() => {
    if (selectedCompany) {
      setDraft(toDraft(selectedCompany));
    }
  }, [selectedCompany]);

  const emptyDraft: CompanyDraft = {
    legalName: "",
    displayName: "",
    taxId: "",
    websiteUrl: "",
    countryCode: "",
    status: "active",
  };

  const openCreate = () => {
    setSelectedCompanyId(null);
    setDraft(emptyDraft);
    setIsEditorOpen(true);
  };

  const openEdit = (companyId: string) => {
    setSelectedCompanyId(companyId);
    setIsEditorOpen(true);
  };

  const closeEditor = () => {
    setSelectedCompanyId(null);
    setDraft(null);
    setIsEditorOpen(false);
  };

  const chooseCompany = async (company: ApiCompany) => {
    await activateTenant({ id: company.id, name: company.displayName });
    navigate("/cowork/overview");
  };

  const deleteCurrentCompany = (companyId: string) => {
    const company = companies.find((entry) => entry.id === companyId);
    if (company?.isProtected) return;
    if (!window.confirm("Apagar esta empresa e todo o seu workspace?")) return;

    deleteMutation.mutate(companyId, {
      onSuccess: () => {
        if (selectedTenantId === companyId) {
          void activateGodMode();
        }
        if (selectedCompanyId === companyId) {
          setSelectedCompanyId(null);
        }
      },
    });
  };

  const toggleStatus = (company: ApiCompany) => {
    if (company.isProtected) return;
    const nextStatus = company.status === "active" ? "suspended" : "active";

    mutation.mutate({
      tenantId: company.id,
      payload: {
        ...toDraft(company),
        status: nextStatus,
      },
    });
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isZeroReadOnly) return;
    if (!draft) return;

    if (!selectedCompany) {
      createMutation.mutate(draft, {
        onSuccess: () => closeEditor(),
      });
      return;
    }

    mutation.mutate(
      {
        tenantId: selectedCompany.id,
        payload: draft,
      },
      {
        onSuccess: () => {
          if (selectedTenantId === selectedCompany.id) {
            void activateTenant({ id: selectedCompany.id, name: draft.displayName });
          }
          closeEditor();
        },
      }
    );
  };

  return (
    <Layout section="Companies" sectionLabel="Mission Control">
      <div className="space-y-6">
        {error ? (
          <section className="panel p-6">
            <p className="text-sm text-red-600 dark:text-red-300">
              {error instanceof Error
                ? error.message
                : "Nao foi possivel ler as empresas da base de dados."}
            </p>
          </section>
        ) : null}

        <section className="panel p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-2xl">
              <div className="context-chip mb-4 inline-flex">Companies</div>
              <h1 className="text-3xl font-semibold tracking-tight text-text-main">
                {selectedTenantId
                  ? `Gerir a empresa ${selectedTenantName || "selecionada"}`
                  : "Gerir empresas e escolher o workspace ativo"}
              </h1>
              {selectedTenantId ? (
                <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-[var(--context-accent)] bg-[var(--context-soft)] px-3 py-2 text-sm font-semibold text-[var(--context-accent)]">
                  <span>Empresa ativa</span>
                  <span className="text-text-main">{selectedTenantName}</span>
                </div>
              ) : null}
                <p className="mt-3 text-sm leading-6 text-text-muted">
                  {selectedTenantId
                    ? "Vista contextualizada por empresa, mantendo edição completa e acesso direto ao respetivo workspace."
                    : "Esta area lista as empresas criadas no Postgres e permite editar os seus dados principais, ativar ou desativar cada entidade e escolher imediatamente o workspace em que o utilizador God vai entrar."}
                </p>
                {selectedTenantId && selectedTenantName === "Zero" ? (
                  <p className="mt-3 text-sm font-semibold text-amber-700 dark:text-amber-300">
                    A empresa Zero só permite alterar detalhes em Modo GOD.
                  </p>
                ) : null}
              </div>
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-lg bg-bg-inverse px-4 py-3 text-sm font-semibold text-text-inverse transition-opacity hover:opacity-85"
            >
              <Plus className="h-4 w-4" />
              Nova empresa
            </button>
          </div>
        </section>

        <section className="panel overflow-hidden">
          <div className="border-b border-border-subtle px-8 py-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold text-text-main">Lista de empresas</h2>
                <p className="mt-1 text-sm text-text-muted">
                  O nome abre um popup com todos os campos editaveis e a lista mostra
                  o estado atual de cada empresa. A Zero aparece protegida e sempre ativa.
                </p>
              </div>
              <div className="rounded-lg bg-[var(--context-soft)] px-4 py-2 text-xs font-semibold text-[var(--context-accent)]">
                {visibleCompanies.length} empresas
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <div className="relative min-w-[260px] flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Procurar por nome ou NIF..."
                  className="w-full rounded-lg border border-border-subtle bg-bg-base py-2.5 pl-10 pr-4 text-sm text-text-main outline-none transition-all focus:border-border-strong focus:ring-1 focus:ring-border-strong"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as "all" | "active" | "suspended")
                }
                className="rounded-lg border border-border-subtle bg-bg-base px-3 py-2.5 text-xs font-semibold text-text-main outline-none"
              >
                <option value="all">Todos os estados</option>
                <option value="active">Ativas</option>
                <option value="suspended">Desativadas</option>
              </select>
            </div>
          </div>

          <div className="border-b border-border-subtle px-8 py-3">
            <div className="grid items-center gap-4 xl:grid-cols-[minmax(320px,1.25fr)_minmax(260px,1fr)_130px_210px]">
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted">Empresa</div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted">Dados base</div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted">Estado</div>
              <div className="text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted">Ações</div>
            </div>
          </div>
          <div className="divide-y divide-border-subtle">
            {isLoading ? (
              <div className="px-8 py-6 text-sm text-text-muted">
                A carregar empresas do Postgres...
              </div>
            ) : null}

            {visibleCompanies.map((company) => {
              return (
                <article
                  key={company.id}
                  className={`grid items-center gap-4 px-8 py-4 xl:grid-cols-[minmax(320px,1.25fr)_minmax(260px,1fr)_130px_210px] ${companyRowClassName(company.isProtected)}`}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="flex h-11 w-11 flex-none items-center justify-center rounded-lg bg-bg-base">
                      <Building2 className="h-5 w-5 text-text-main" />
                    </div>
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => openEdit(company.id)}
                        className="inline-flex items-center text-sm font-semibold text-text-main underline-offset-4 transition-colors hover:text-[var(--context-accent)] hover:underline"
                      >
                        {company.displayName}
                      </button>
                      <div className="truncate text-xs text-text-muted">
                        {company.legalName}
                        {company.isProtected ? " · Protegida" : ""}
                      </div>
                    </div>
                  </div>

                  <div className="min-w-0 text-sm text-text-muted">
                    <div className="truncate">NIF {company.taxId}</div>
                    <div className="truncate text-xs">
                      {company.websiteUrl || "Sem website"} · {company.countryCode || "Sem pais"}
                    </div>
                  </div>

                  <div className="flex items-center">
                    {company.isProtected ? (
                      <div className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg border border-amber-300 bg-amber-100/80 px-3 py-2 text-xs font-semibold text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                        <span>Sempre ativa</span>
                      </div>
                    ) : (
                      <label className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg border border-border-subtle px-3 py-2 text-xs font-semibold text-text-main">
                        <span>{statusLabel(company.status)}</span>
                        <button
                          type="button"
                          onClick={() => toggleStatus(company)}
                          className={`relative h-6 w-11 rounded-full transition-colors ${
                            company.status === "active"
                              ? "bg-emerald-500/80"
                              : "bg-slate-300 dark:bg-slate-700"
                          }`}
                          aria-label={`Alternar estado de ${company.displayName}`}
                        >
                          <span
                            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                              company.status === "active" ? "translate-x-5" : "translate-x-0.5"
                            }`}
                          />
                        </button>
                      </label>
                    )}
                  </div>

                  <div className="ml-auto flex min-w-0 flex-nowrap items-center justify-end gap-2 overflow-x-auto">
                    <button
                      type="button"
                      onClick={() => chooseCompany(company)}
                      className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg border border-border-subtle px-3 py-2 text-xs font-semibold text-text-main transition-colors hover:bg-bg-hover"
                    >
                      Cowork
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                    {!company.isProtected ? (
                      <button
                        type="button"
                        onClick={() => deleteCurrentCompany(company.id)}
                        className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg border border-border-subtle px-3 py-2 text-xs font-semibold text-text-main transition-colors hover:bg-bg-hover"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Apagar
                      </button>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {isEditorOpen && draft ? (
          <div
            className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/45 px-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="company-modal-title"
          >
            <form
              onSubmit={submit}
              className="panel modal-surface max-h-[88vh] w-full max-w-[54rem] overflow-y-auto p-5 shadow-2xl"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2
                    id="company-modal-title"
                    className="text-2xl font-semibold tracking-tight text-text-main"
                  >
                    {selectedCompany?.displayName ?? "Nova empresa"}
                  </h2>
                  <p className="mt-2 text-xs text-text-muted">
                    {selectedCompany
                      ? "Edita todos os campos principais da empresa e grava diretamente na base de dados."
                      : "Cria uma nova empresa diretamente na base de dados."}
                  </p>
                  {selectedCompany?.isProtected ? (
                    <p className="mt-2 text-xs font-semibold text-amber-700 dark:text-amber-300">
                      {isZeroReadOnly
                        ? "A empresa Zero esta em leitura apenas neste contexto. Usa o Modo GOD para alterar."
                        : "A empresa Zero e protegida. Mantem-se sempre ativa e nao pode ser apagada."}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={closeEditor}
                  className="rounded-lg border border-border-subtle px-3 py-2 text-xs font-semibold text-text-main transition-colors hover:bg-bg-hover"
                >
                  Cancelar
                </button>
              </div>

              <div className="mt-6 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    {companyFieldPairs.map(({ label, key }) => (
                      <label key={key} className="block">
                        <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                          {label}
                        </span>
                        <input
                          value={draft[key]}
                          readOnly={isZeroReadOnly}
                          onChange={(event) =>
                            setDraft((current) =>
                              current
                                ? {
                                    ...current,
                                    [key]: event.target.value,
                                  }
                                : current
                            )
                          }
                          className="w-full rounded-lg border border-border-subtle bg-bg-base px-4 py-3 text-sm text-text-main outline-none transition-all focus:border-border-strong focus:ring-1 focus:ring-border-strong"
                        />
                      </label>
                    ))}
                  </div>

                </div>

                {selectedCompany ? (
                  <div className="rounded-lg border border-border-subtle bg-bg-base px-4 py-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted">
                      Superusers
                    </div>
                    <div className="mt-3 space-y-2">
                      {selectedCompanySuperusers.length ? (
                        selectedCompanySuperusers.map((user) => (
                          <div
                            key={user.id}
                            className="flex items-center justify-between gap-4 rounded-lg border border-border-subtle px-3 py-2"
                          >
                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold text-text-main">
                                {user.name}
                              </div>
                              <div className="truncate text-xs text-text-muted">{user.email}</div>
                            </div>
                            {user.isPrimarySuperuser ? (
                              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--context-accent)]">
                                Principal
                              </div>
                            ) : null}
                          </div>
                        ))
                      ) : (
                        <div className="text-sm text-text-muted">Sem superusers associados.</div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div />
                )}
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
                {selectedCompany?.isProtected ? (
                  <div className="inline-flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-100/80 px-4 py-3 text-sm font-semibold text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                    <span>Empresa sempre ativa</span>
                  </div>
                ) : (
                  <label className="inline-flex items-center gap-3 rounded-lg border border-border-subtle px-4 py-3 text-sm font-semibold text-text-main">
                    <span>Empresa ativa</span>
                    <button
                      type="button"
                      disabled={isZeroReadOnly}
                      onClick={() =>
                        setDraft((current) =>
                          current
                            ? {
                                ...current,
                                status: current.status === "active" ? "suspended" : "active",
                              }
                            : current
                        )
                      }
                      className={`relative h-6 w-11 rounded-full transition-colors ${
                        draft.status === "active"
                          ? "bg-emerald-500/80"
                          : "bg-slate-300 dark:bg-slate-700"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                          draft.status === "active" ? "translate-x-5" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </label>
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={closeEditor}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-border-subtle px-4 py-3 text-sm font-semibold text-text-main transition-colors hover:bg-bg-hover"
                  >
                    Cancelar
                  </button>
                  {!isZeroReadOnly ? (
                    <button
                      type="submit"
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-bg-inverse px-4 py-3 text-sm font-semibold text-text-inverse transition-opacity hover:opacity-85"
                    >
                      Guardar
                    </button>
                  ) : null}
                </div>
              </div>
            </form>
          </div>
        ) : null}
      </div>
    </Layout>
  );
}
