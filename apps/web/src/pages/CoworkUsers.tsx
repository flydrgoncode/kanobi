import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, PencilLine, Plus, Save, Trash2 } from "lucide-react";
import { Layout } from "../components/Layout";
import { useTenantSelection } from "../context/tenant-selection";
import {
  createWorkspaceUser,
  deleteWorkspaceUser,
  getCurrentUser,
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

export default function CoworkUsers() {
  const { selectedTenantId, selectedTenantName, isHydrating } = useTenantSelection();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [draft, setDraft] = useState(emptyDraft);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const { data: currentUserData } = useQuery({
    queryKey: ["cowork-current-user", selectedTenantId],
    queryFn: () => getCurrentUser(),
    retry: false,
  });

  const currentRole =
    currentUserData?.user.role === "god" ? "superuser" : currentUserData?.user.role ?? "member";
  const canManage = currentRole === "support" || currentRole === "superuser";

  const { data, error, isLoading } = useQuery({
    queryKey: ["cowork-users", selectedTenantId],
    queryFn: () => getWorkspaceUsers(),
    enabled: Boolean(selectedTenantId) && canManage,
    retry: false,
  });

  const createMutation = useMutation({
    mutationFn: createWorkspaceUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cowork-users", selectedTenantId] }),
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cowork-users", selectedTenantId] }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteWorkspaceUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cowork-users", selectedTenantId] }),
  });

  const users = data?.users ?? [];
  const selectedUser = users.find((user) => user.id === selectedUserId) ?? null;

  const visibleUsers = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();

    return users.filter((user) => {
      const matchesStatus = statusFilter === "all" ? true : user.status === statusFilter;
      const matchesSearch = searchTerm
        ? [user.name, user.email, roleLabels[user.role], user.jobTitle ?? ""].some((value) =>
            value.toLowerCase().includes(searchTerm)
          )
        : true;
      return matchesStatus && matchesSearch;
    });
  }, [search, statusFilter, users]);

  const closeEditor = () => {
    setSelectedUserId(null);
    setIsEditorOpen(false);
    setDraft(emptyDraft);
  };

  const openCreate = () => {
    if (!selectedTenantId) return;
    setSelectedUserId(null);
    setDraft(emptyDraft);
    setIsEditorOpen(true);
  };

  const openEdit = (userId: string) => {
    const user = users.find((entry) => entry.id === userId);
    if (!user) return;
    setSelectedUserId(userId);
    setDraft({
      firstName: user.firstName || user.name.split(" ")[0] || "",
      lastName: user.lastName || user.name.split(" ").slice(1).join(" "),
      email: user.email,
      jobTitle: user.jobTitle || "",
      phone: user.phone || "",
      avatarUrl: user.avatarUrl || "",
      password: "",
      role: user.role,
    });
    setIsEditorOpen(true);
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

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedTenantId) return;
    if (!draft.firstName.trim() || !draft.lastName.trim() || !draft.email.trim()) return;

    if (selectedUserId) {
      await updateMutation.mutateAsync({
        membershipId: selectedUserId,
        payload: {
          name: `${draft.firstName.trim()} ${draft.lastName.trim()}`.trim(),
          email: draft.email.trim(),
          firstName: draft.firstName.trim(),
          lastName: draft.lastName.trim(),
          jobTitle: draft.jobTitle.trim() || null,
          phone: draft.phone.trim() || null,
          avatarUrl: draft.avatarUrl.trim() || null,
          role: draft.role,
          ...(draft.password.trim() ? { password: draft.password.trim() } : {}),
        },
      });
      closeEditor();
      return;
    }

    await createMutation.mutateAsync({
      tenantId: selectedTenantId,
      name: `${draft.firstName.trim()} ${draft.lastName.trim()}`.trim(),
      email: draft.email.trim(),
      role: draft.role,
    });
    closeEditor();
  };

  const deleteUser = async (userId: string) => {
    if (!window.confirm("Apagar este utilizador do workspace?")) return;
    await deleteMutation.mutateAsync(userId);
    if (selectedUserId === userId) closeEditor();
  };

  return (
    <Layout section="Utilizadores" sectionLabel="Cowork" context="cowork" role={currentRole}>
      <div className="space-y-6">
        <section className="panel p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <div className="context-chip mb-4 inline-flex">Support</div>
              <h1 className="text-3xl font-semibold tracking-tight text-text-main">
                Utilizadores de {selectedTenantName || "uma empresa"}
              </h1>
              {selectedTenantId ? (
                <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-[var(--context-accent)] bg-[var(--context-soft)] px-3 py-2 text-sm font-semibold text-[var(--context-accent)]">
                  <span>Empresa ativa</span>
                  <span className="text-text-main">{selectedTenantName}</span>
                </div>
              ) : null}
              <p className="mt-3 max-w-2xl text-sm leading-6 text-text-muted">
                Lista filtrada pela empresa em contexto, com criacao, edicao e remocao diretamente
                no Postgres.
              </p>
            </div>

            {canManage ? (
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--context-accent)] px-4 py-3 text-sm font-semibold text-white shadow-card transition-transform hover:-translate-y-0.5"
              >
                <Plus className="h-4 w-4" />
                Novo utilizador
              </button>
            ) : null}
          </div>
        </section>

        {isHydrating ? (
          <section className="panel p-8">
            <p className="text-sm text-text-muted">A carregar contexto do tenant...</p>
          </section>
        ) : !selectedTenantId ? (
          <section className="panel p-8">
            <p className="text-sm text-text-muted">
              Escolhe primeiro uma empresa no Mission Control para entrares no Cowork.
            </p>
          </section>
        ) : !canManage ? (
          <section className="panel p-8">
            <p className="text-sm text-text-muted">
              Este menu Support so esta disponivel para utilizadores com role `support` ou
              `superuser`.
            </p>
          </section>
        ) : error ? (
          <section className="panel p-8">
            <p className="text-sm text-red-600 dark:text-red-300">
              {error instanceof Error ? error.message : "Nao foi possivel ler utilizadores."}
            </p>
          </section>
        ) : (
          <section className="panel overflow-hidden">
            <div className="border-b border-border-subtle px-8 py-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-sm font-semibold text-text-main">Lista de utilizadores</h2>
                  <p className="mt-1 text-sm text-text-muted">
                    O nome abre um popup compacto para alterar os campos e gravar.
                  </p>
                </div>
                <div className="rounded-lg bg-[var(--context-soft)] px-4 py-2 text-xs font-semibold text-[var(--context-accent)]">
                  {visibleUsers.length} utilizadores
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Procurar por nome, email ou role..."
                  className="min-w-[260px] flex-1 rounded-lg border border-border-subtle bg-bg-base px-4 py-2.5 text-sm text-text-main outline-none transition-all focus:border-border-strong focus:ring-1 focus:ring-border-strong"
                />
                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value as "all" | "active" | "disabled")
                  }
                  className="rounded-lg border border-border-subtle bg-bg-base px-3 py-2.5 text-xs font-semibold text-text-main outline-none"
                >
                  <option value="all">Todos os estados</option>
                  <option value="active">Ativos</option>
                  <option value="disabled">Desativados</option>
                </select>
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
                  className="grid items-center gap-4 px-8 py-4 xl:grid-cols-[minmax(280px,1.1fr)_minmax(220px,0.9fr)_120px_190px]"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 flex-none items-center justify-center rounded-lg bg-bg-base font-semibold text-text-main">
                      {user.avatarUrl ? (
                        <img
                          src={user.avatarUrl}
                          alt={user.name}
                          className="h-full w-full rounded-lg object-cover"
                        />
                      ) : (
                        <span>{initials(user.name)}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => openEdit(user.id)}
                        className="truncate text-left text-sm font-semibold text-[var(--context-accent)] transition-opacity hover:opacity-80"
                      >
                        {user.name} ({roleLabels[user.role]})
                      </button>
                      <div className="truncate text-xs text-text-muted">{user.email}</div>
                    </div>
                  </div>

                  <div className="min-w-0 text-sm text-text-muted">
                    <div className="truncate">{user.jobTitle || "Sem funcao"}</div>
                    <div className="truncate text-xs">{user.phone || "Sem telefone"}</div>
                  </div>

                  <div className="flex items-center">
                    <div className="inline-flex items-center rounded-lg border border-border-subtle px-3 py-2 text-xs font-semibold text-text-main">
                      {user.status === "active" ? "Ativo" : "Desativado"}
                    </div>
                  </div>

                  <div className="ml-auto flex min-w-0 flex-nowrap items-center justify-end gap-2 overflow-x-auto">
                    <button
                      type="button"
                      onClick={() => openEdit(user.id)}
                      className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg border border-border-subtle px-3 py-2 text-xs font-semibold text-text-main transition-colors hover:bg-bg-hover"
                    >
                      <PencilLine className="h-3.5 w-3.5" />
                      Alterar
                    </button>
                    {!user.isPrimarySuperuser ? (
                      <button
                        type="button"
                        onClick={() => void deleteUser(user.id)}
                        className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg border border-border-subtle px-3 py-2 text-xs font-semibold text-text-main transition-colors hover:bg-bg-hover"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Apagar
                      </button>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>

      {isEditorOpen ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/35 p-4">
          <form
            onSubmit={submit}
            className="panel modal-surface max-h-[88vh] w-full max-w-[38rem] overflow-y-auto p-4 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                  Utilizador
                </div>
                <h2 className="mt-1 text-xl font-semibold text-text-main">
                  {selectedUser ? "Alterar utilizador" : "Novo utilizador"}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeEditor}
                className="rounded-lg border border-border-subtle px-3 py-2 text-xs font-semibold text-text-main transition-colors hover:bg-bg-hover"
              >
                Cancelar
              </button>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                  Primeiro nome
                </span>
                <input
                  value={draft.firstName}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, firstName: event.target.value }))
                  }
                  className="w-full rounded-lg border border-border-subtle bg-bg-base px-4 py-3 text-sm text-text-main outline-none transition-all focus:border-border-strong focus:ring-1 focus:ring-border-strong"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                  Ultimo nome
                </span>
                <input
                  value={draft.lastName}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, lastName: event.target.value }))
                  }
                  className="w-full rounded-lg border border-border-subtle bg-bg-base px-4 py-3 text-sm text-text-main outline-none transition-all focus:border-border-strong focus:ring-1 focus:ring-border-strong"
                />
              </label>

              <label className="block md:col-span-2">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                  Email
                </span>
                <input
                  value={draft.email}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, email: event.target.value }))
                  }
                  className="w-full rounded-lg border border-border-subtle bg-bg-base px-4 py-3 text-sm text-text-main outline-none transition-all focus:border-border-strong focus:ring-1 focus:ring-border-strong"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                  Job title
                </span>
                <input
                  value={draft.jobTitle}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, jobTitle: event.target.value }))
                  }
                  className="w-full rounded-lg border border-border-subtle bg-bg-base px-4 py-3 text-sm text-text-main outline-none transition-all focus:border-border-strong focus:ring-1 focus:ring-border-strong"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                  Phone
                </span>
                <input
                  value={draft.phone}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, phone: event.target.value }))
                  }
                  className="w-full rounded-lg border border-border-subtle bg-bg-base px-4 py-3 text-sm text-text-main outline-none transition-all focus:border-border-strong focus:ring-1 focus:ring-border-strong"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                  Role
                </span>
                <select
                  value={draft.role}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, role: event.target.value as Role }))
                  }
                  className="w-full rounded-lg border border-border-subtle bg-bg-base px-4 py-3 text-sm text-text-main outline-none transition-all focus:border-border-strong focus:ring-1 focus:ring-border-strong"
                >
                  <option value="member">Member</option>
                  <option value="support">Support</option>
                  <option value="superuser">Superuser</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                  Password
                </span>
                <input
                  type="password"
                  value={draft.password}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, password: event.target.value }))
                  }
                  placeholder={selectedUser ? "Alterar password (opcional)" : "Password inicial"}
                  className="w-full rounded-lg border border-border-subtle bg-bg-base px-4 py-3 text-sm text-text-main outline-none transition-all focus:border-border-strong focus:ring-1 focus:ring-border-strong"
                />
              </label>

              <div className="md:col-span-2">
                <div className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                  Foto
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg border border-border-subtle bg-bg-base">
                    {draft.avatarUrl ? (
                      <img
                        src={draft.avatarUrl}
                        alt="Avatar"
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <span className="text-sm font-semibold text-text-muted">
                        {initials(`${draft.firstName} ${draft.lastName}`.trim() || "User")}
                      </span>
                    )}
                  </div>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border-subtle px-3 py-2 text-xs font-semibold text-text-main transition-colors hover:bg-bg-hover">
                    <Camera className="h-4 w-4" />
                    Upload
                    <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={closeEditor}
                className="rounded-lg border border-border-subtle px-4 py-3 text-sm font-semibold text-text-main transition-colors hover:bg-bg-hover"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-lg bg-[var(--context-accent)] px-4 py-3 text-sm font-semibold text-white"
              >
                <Save className="h-4 w-4" />
                Gravar
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </Layout>
  );
}
