import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, PencilLine, Plus, Save, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Layout } from "../components/Layout";
import { useTenantSelection } from "../context/tenant-selection";
import {
  createWorkspaceUser,
  deleteWorkspaceUser,
  getCompanies,
  getWorkspaceUsers,
  updateWorkspaceUser,
  type ApiWorkspaceUser,
} from "../lib/workspace-api";

type Role = ApiWorkspaceUser["role"];
type StatusFilter = "all" | "active" | "disabled";

const roleLabels: Record<Role, string> = {
  member: "Member",
  support: "Support",
  superuser: "Superuser",
};

const emptyDraft = {
  tenantId: "",
  firstName: "",
  lastName: "",
  email: "",
  jobTitle: "",
  phone: "",
  avatarUrl: "",
  password: "",
  role: "member" as Role,
};

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((segment) => segment[0] ?? "")
    .join("")
    .toUpperCase();
}

export default function Users() {
  const { selectedTenantId, selectedTenantName, activateTenant } = useTenantSelection();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [draft, setDraft] = useState(emptyDraft);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data, error, isLoading } = useQuery({
    queryKey: ["mission-control-users", selectedTenantId],
    queryFn: () => getWorkspaceUsers(),
    retry: false,
  });
  const { data: companiesData } = useQuery({
    queryKey: ["workspace-companies", selectedTenantId],
    queryFn: () => getCompanies(),
    retry: false,
  });

  const createMutation = useMutation({
    mutationFn: createWorkspaceUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["mission-control-users"] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({
      membershipId,
      payload,
    }: {
      membershipId: string;
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
      >;
    }) => updateWorkspaceUser(membershipId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["mission-control-users"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteWorkspaceUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["mission-control-users"] }),
  });

  const users = data?.users ?? [];
  const companies = companiesData?.companies ?? [];
  const selectedUser = users.find((user) => user.id === selectedUserId) ?? null;
  const zeroCompanyId = companies.find((company) => company.isProtected)?.id ?? null;
  const isZeroTenantMode = Boolean(selectedTenantId && selectedTenantId === zeroCompanyId);
  const isUserLocked = (user: ApiWorkspaceUser) =>
    Boolean(isZeroTenantMode && user.companyId === zeroCompanyId);
  const selectedUserIsLocked = selectedUser ? isUserLocked(selectedUser) : false;

  const visibleUsers = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();

    return users.filter((user) => {
      const matchesStatus = statusFilter === "all" ? true : user.status === statusFilter;
      const matchesSearch = searchTerm
        ? [user.name, user.email, roleLabels[user.role], user.company ?? ""].some((value) =>
            value.toLowerCase().includes(searchTerm)
          )
        : true;
      return matchesStatus && matchesSearch;
    });
  }, [search, statusFilter, users]);

  const closeEditor = () => {
    setSelectedUserId(null);
    setIsCreateOpen(false);
    setDraft(emptyDraft);
  };

  const beginEdit = (id: string) => {
    const user = users.find((item) => item.id === id);
    if (!user) return;

    setSelectedUserId(id);
    setIsCreateOpen(true);
    setDraft({
      tenantId: user.companyId,
      firstName: user.firstName || user.name.split(" ")[0] || "",
      lastName: user.lastName || user.name.split(" ").slice(1).join(" "),
      email: user.email,
      jobTitle: user.jobTitle || "",
      phone: user.phone || "",
      avatarUrl: user.avatarUrl || "",
      password: "",
      role: user.role,
    });
  };

  const openCreate = () => {
    if (isZeroTenantMode) return;
    setSelectedUserId(null);
    setDraft({ ...emptyDraft, tenantId: selectedTenantId ?? "" });
    setIsCreateOpen(true);
  };

  const handleAvatarUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const nextAvatarUrl = typeof reader.result === "string" ? reader.result : "";
      setDraft((current) => ({ ...current, avatarUrl: nextAvatarUrl }));
    };
    reader.readAsDataURL(file);
  };

  const goToUserWorkspace = async (user: ApiWorkspaceUser) => {
    if (!user.companyId) return;
    await activateTenant({ id: user.companyId, name: user.company ?? "Workspace" });
    navigate("/");
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (selectedUserIsLocked) return;
    if (!draft.firstName.trim() || !draft.lastName.trim() || !draft.email.trim()) return;

    if (selectedUserId) {
      updateMutation.mutate(
        {
          membershipId: selectedUserId,
          payload: {
            name: `${draft.firstName.trim()} ${draft.lastName.trim()}`.trim(),
            email: draft.email.trim(),
            firstName: draft.firstName.trim(),
            lastName: draft.lastName.trim(),
            jobTitle: draft.jobTitle.trim() || null,
            phone: draft.phone.trim() || null,
            avatarUrl: draft.avatarUrl.trim() || null,
            ...(draft.password.trim() ? { password: draft.password.trim() } : {}),
          },
        },
        { onSuccess: closeEditor }
      );
      return;
    }

    createMutation.mutate(
      {
        tenantId: draft.tenantId,
        name: `${draft.firstName.trim()} ${draft.lastName.trim()}`.trim(),
        email: draft.email.trim(),
        role: draft.role,
      },
      { onSuccess: closeEditor }
    );
  };

  const deleteUser = (id: string) => {
    const user = users.find((entry) => entry.id === id);
    if (user && isUserLocked(user)) return;
    if (!window.confirm("Apagar este utilizador do workspace?")) return;
    deleteMutation.mutate(id, {
      onSuccess: () => {
        if (selectedUserId === id) closeEditor();
      },
    });
  };

  return (
    <Layout section="Users" sectionLabel="Mission Control">
      <div className="space-y-6">
        {error ? (
          <section className="panel p-6">
            <p className="text-sm text-red-600 dark:text-red-300">
              {error instanceof Error
                ? error.message
                : "Nao foi possivel ler utilizadores da base de dados."}
            </p>
          </section>
        ) : null}

        <section className="panel p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-2xl">
              <div className="context-chip mb-4 inline-flex">Administracao de utilizadores</div>
              <h1 className="text-3xl font-semibold tracking-tight text-text-main">
                {selectedTenantId
                  ? `Gerir utilizadores de ${selectedTenantName || "uma empresa"}`
                  : "Gerir utilizadores de todas as empresas"}
              </h1>
              {selectedTenantId ? (
                <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-[var(--context-accent)] bg-[var(--context-soft)] px-3 py-2 text-sm font-semibold text-[var(--context-accent)]">
                  <span>Empresa ativa</span>
                  <span className="text-text-main">{selectedTenantName}</span>
                </div>
              ) : null}
              <p className="mt-3 max-w-xl text-sm leading-6 text-text-muted">
                {selectedTenantId
                  ? "Vista filtrada por empresa, com pesquisa por nome ou email e edicao rapida pelo nome do utilizador."
                  : "Lista global do Mission Control, com pesquisa por nome, email, empresa e edição rápida pelo nome do utilizador."}
              </p>
              {isZeroTenantMode ? (
                <p className="mt-3 text-sm font-semibold text-amber-700 dark:text-amber-300">
                  A empresa Zero só permite alterar utilizadores em Modo GOD.
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={openCreate}
              disabled={isZeroTenantMode}
              className="inline-flex items-center gap-2 rounded-lg bg-bg-inverse px-4 py-3 text-sm font-semibold text-text-inverse transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Novo
            </button>
          </div>
        </section>

        <section className="panel overflow-hidden">
          <div className="border-b border-border-subtle px-8 py-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold text-text-main">Equipa atual</h2>
                <p className="mt-1 text-sm text-text-muted">
                  {selectedTenantId
                    ? "Pesquisa por nome ou email dentro da empresa selecionada."
                    : "Pesquisa por nome, email ou empresa e filtra por estado do acesso."}
                </p>
              </div>
              <div className="rounded-lg bg-[var(--context-soft)] px-4 py-2 text-xs font-semibold text-[var(--context-accent)]">
                {visibleUsers.length} registos
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Procurar por nome, email ou empresa..."
                className="min-w-[260px] flex-1 rounded-lg border border-border-subtle bg-bg-base px-4 py-2.5 text-sm text-text-main outline-none transition-all focus:border-border-strong focus:ring-1 focus:ring-border-strong"
              />
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                className="rounded-lg border border-border-subtle bg-bg-base px-3 py-2.5 text-xs font-semibold text-text-main outline-none"
              >
                <option value="all">Todos os estados</option>
                <option value="active">Ativos</option>
                <option value="disabled">Desativados</option>
              </select>
            </div>
          </div>

          <div className="border-b border-border-subtle px-8 py-3">
            <div className="grid items-center gap-4 xl:grid-cols-[minmax(420px,1.3fr)_140px_180px]">
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted">Utilizador</div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted">Estado</div>
              <div className="text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted">Ações</div>
            </div>
          </div>
          <div className="divide-y divide-border-subtle">
            {isLoading ? (
              <div className="px-8 py-6 text-sm text-text-muted">
                A carregar utilizadores do Postgres...
              </div>
            ) : null}

            {visibleUsers.map((user) => (
              <article
                key={user.id}
                className="grid items-center gap-4 px-8 py-4 xl:grid-cols-[minmax(420px,1.3fr)_140px_180px]"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-bg-base text-sm font-semibold text-text-main">
                      {initials(user.name)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex min-w-0 items-center gap-2">
                        <button
                          type="button"
                          onClick={() => beginEdit(user.id)}
                          className={`truncate text-left text-sm font-semibold underline-offset-4 transition-colors ${
                            isUserLocked(user)
                              ? "cursor-default text-text-main"
                              : "text-text-main hover:text-[var(--context-accent)] hover:underline"
                          }`}
                        >
                          {user.name} ({roleLabels[user.role]})
                        </button>
                        <button
                          type="button"
                          onClick={() => goToUserWorkspace(user)}
                          className="truncate text-left text-xs font-semibold text-text-muted underline-offset-4 transition-colors hover:text-[var(--context-accent)] hover:underline"
                        >
                          {user.company ?? "Sem empresa"}
                        </button>
                      </div>
                      <div className="truncate text-xs text-text-muted">
                        {user.email}
                        {user.isPrimarySuperuser ? " · principal" : ""}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="truncate text-sm font-semibold text-text-main">
                  {user.status === "active" ? "Ativo" : "Desativado"}
                </div>

                <div className="flex min-w-0 flex-nowrap items-center justify-end gap-2 overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => beginEdit(user.id)}
                    disabled={isUserLocked(user)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border-subtle px-3 py-2 text-xs font-semibold text-text-main transition-colors hover:bg-bg-hover disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <PencilLine className="h-3.5 w-3.5" />
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteUser(user.id)}
                    disabled={isUserLocked(user)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border-subtle px-3 py-2 text-xs font-semibold text-text-main transition-colors hover:bg-bg-hover disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Apagar
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        {isCreateOpen ? (
          <div
            className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/45 px-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="user-editor-title"
          >
            <form
              onSubmit={submit}
              className="panel modal-surface max-h-[88vh] w-full max-w-[40rem] overflow-y-auto p-4 shadow-2xl"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 id="user-editor-title" className="text-xl font-semibold text-text-main">
                    {selectedUser ? selectedUser.name : "Novo utilizador"}
                  </h2>
                  <p className="mt-1 text-xs text-text-muted">
                    {selectedUser
                      ? selectedUserIsLocked
                        ? "Leitura apenas. A empresa Zero só pode ser alterada em Modo GOD."
                        : "Editar os dados do utilizador e guardar as alteracoes."
                      : "Criar conta e associar imediatamente a uma empresa."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeEditor}
                  className="rounded-lg border border-border-subtle px-3 py-2 text-xs font-semibold text-text-main transition-colors hover:bg-bg-hover"
                >
                  Cancelar
                </button>
              </div>

              <div className="mt-4 grid gap-4 xl:grid-cols-[150px_1fr]">
                <aside className="space-y-3">
                  <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-xl border border-border-subtle bg-bg-surface">
                    {draft.avatarUrl ? (
                      <img
                        src={draft.avatarUrl}
                        alt={`${draft.firstName} ${draft.lastName}`.trim()}
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <span className="text-xl font-semibold text-text-main">
                        {initials(`${draft.firstName} ${draft.lastName}`.trim() || "User")}
                      </span>
                    )}
                  </div>
                  <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted">
                    Foto
                  </span>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border-subtle px-3 py-2.5 text-xs font-semibold text-text-main transition-colors hover:bg-bg-hover">
                    <Camera className="h-4 w-4" />
                    Carregar foto
                    <input
                      type="file"
                      accept="image/*"
                      disabled={selectedUserIsLocked}
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />
                  </label>
                </aside>

                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-lg border border-border-subtle bg-bg-base px-3 py-3">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted">
                        Role
                      </div>
                      <div className="mt-1.5 truncate text-sm font-semibold text-text-main">
                        {roleLabels[draft.role]}
                      </div>
                    </div>
                    <div className="rounded-lg border border-border-subtle bg-bg-base px-3 py-3">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted">
                        Last login
                      </div>
                      <div className="mt-1.5 truncate text-sm font-semibold text-text-main">
                        {selectedUser?.lastSeen
                          ? new Date(selectedUser.lastSeen).toLocaleDateString("pt-PT")
                          : "Sem registo"}
                      </div>
                    </div>
                    <div className="rounded-lg border border-border-subtle bg-bg-base px-3 py-3">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted">
                        Empresa
                      </div>
                      <div className="mt-1.5 truncate text-sm font-semibold text-text-main">
                        {selectedUser?.company ||
                          companies.find((company) => company.id === draft.tenantId)?.displayName ||
                          "Sem empresa"}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {!selectedUser ? (
                      <label className="block xl:col-span-3">
                        <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                          Empresa
                        </span>
                        <select
                          disabled={Boolean(selectedTenantId) || selectedUserIsLocked}
                          value={draft.tenantId}
                          onChange={(event) =>
                            setDraft((current) => ({ ...current, tenantId: event.target.value }))
                          }
                          className="w-full rounded-lg border border-border-subtle bg-bg-base px-4 py-2.5 text-sm text-text-main outline-none transition-all focus:border-border-strong focus:ring-1 focus:ring-border-strong disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          <option value="">Selecionar empresa...</option>
                          {companies.map((company) => (
                            <option key={company.id} value={company.id}>
                              {company.displayName}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : null}

                    <label className="block">
                      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                        Primeiro nome
                      </span>
                      <input
                        value={draft.firstName}
                        readOnly={selectedUserIsLocked}
                        onChange={(event) =>
                          setDraft((current) => ({ ...current, firstName: event.target.value }))
                        }
                        className="w-full rounded-lg border border-border-subtle bg-bg-base px-4 py-2.5 text-sm text-text-main outline-none transition-all focus:border-border-strong focus:ring-1 focus:ring-border-strong"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                        Ultimo nome
                      </span>
                      <input
                        value={draft.lastName}
                        readOnly={selectedUserIsLocked}
                        onChange={(event) =>
                          setDraft((current) => ({ ...current, lastName: event.target.value }))
                        }
                        className="w-full rounded-lg border border-border-subtle bg-bg-base px-4 py-2.5 text-sm text-text-main outline-none transition-all focus:border-border-strong focus:ring-1 focus:ring-border-strong"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                        Email
                      </span>
                      <input
                        value={draft.email}
                        readOnly={selectedUserIsLocked}
                        onChange={(event) =>
                          setDraft((current) => ({ ...current, email: event.target.value }))
                        }
                        className="w-full rounded-lg border border-border-subtle bg-bg-base px-4 py-2.5 text-sm text-text-main outline-none transition-all focus:border-border-strong focus:ring-1 focus:ring-border-strong"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                        Job title
                      </span>
                      <input
                        value={draft.jobTitle}
                        readOnly={selectedUserIsLocked}
                        onChange={(event) =>
                          setDraft((current) => ({ ...current, jobTitle: event.target.value }))
                        }
                        className="w-full rounded-lg border border-border-subtle bg-bg-base px-4 py-2.5 text-sm text-text-main outline-none transition-all focus:border-border-strong focus:ring-1 focus:ring-border-strong"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                        Phone
                      </span>
                      <input
                        value={draft.phone}
                        readOnly={selectedUserIsLocked}
                        onChange={(event) =>
                          setDraft((current) => ({ ...current, phone: event.target.value }))
                        }
                        className="w-full rounded-lg border border-border-subtle bg-bg-base px-4 py-2.5 text-sm text-text-main outline-none transition-all focus:border-border-strong focus:ring-1 focus:ring-border-strong"
                      />
                    </label>
                    <label className="block md:col-span-2 xl:col-span-2">
                      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                        Password
                      </span>
                      <input
                        type="password"
                        value={draft.password}
                        readOnly={selectedUserIsLocked}
                        onChange={(event) =>
                          setDraft((current) => ({ ...current, password: event.target.value }))
                        }
                        placeholder={
                          selectedUser
                            ? "Preenche so se quiseres alterar"
                            : "Password inicial"
                        }
                        className="w-full rounded-lg border border-border-subtle bg-bg-base px-4 py-2.5 text-sm text-text-main outline-none transition-all focus:border-border-strong focus:ring-1 focus:ring-border-strong"
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeEditor}
                  className="inline-flex items-center gap-2 rounded-lg border border-border-subtle px-4 py-3 text-sm font-semibold text-text-main transition-colors hover:bg-bg-hover"
                >
                  Cancelar
                </button>
                {!selectedUserIsLocked ? (
                  <button
                    type="submit"
                    disabled={!selectedUser && !draft.tenantId}
                    className="inline-flex items-center gap-2 rounded-lg bg-bg-inverse px-4 py-3 text-sm font-semibold text-text-inverse transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    Gravar
                  </button>
                ) : null}
              </div>
            </form>
          </div>
        ) : null}
      </div>
    </Layout>
  );
}
