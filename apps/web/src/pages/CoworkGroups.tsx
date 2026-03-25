import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PencilLine, Plus, Save, Trash2, Users } from "lucide-react";
import { Layout } from "../components/Layout";
import { useTenantSelection } from "../context/tenant-selection";
import {
  createCoworkGroup,
  deleteCoworkGroup,
  getCoworkGroups,
  getCurrentUser,
  getWorkspaceUsers,
  updateCoworkGroup,
  type ApiCoworkGroup,
} from "../lib/workspace-api";

type DraftState = {
  name: string;
  description: string;
  membershipIds: string[];
};

const emptyDraft: DraftState = {
  name: "",
  description: "",
  membershipIds: [],
};

export default function CoworkGroups() {
  const { selectedTenantId, selectedTenantName, isHydrating } = useTenantSelection();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftState>(emptyDraft);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const { data: currentUserData } = useQuery({
    queryKey: ["cowork-current-user", selectedTenantId],
    queryFn: () => getCurrentUser(),
    retry: false,
  });

  const currentRole =
    currentUserData?.user.role === "god" ? "superuser" : currentUserData?.user.role ?? "member";
  const canManage = currentRole === "support" || currentRole === "superuser";

  const { data, error } = useQuery({
    queryKey: ["cowork-groups", selectedTenantId],
    queryFn: () => getCoworkGroups(),
    enabled: Boolean(selectedTenantId) && canManage,
    retry: false,
  });

  const { data: usersData } = useQuery({
    queryKey: ["cowork-users-options", selectedTenantId],
    queryFn: () => getWorkspaceUsers(),
    enabled: Boolean(selectedTenantId) && canManage,
    retry: false,
  });

  const createMutation = useMutation({
    mutationFn: createCoworkGroup,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cowork-groups", selectedTenantId] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: DraftState }) =>
      updateCoworkGroup(id, {
        name: payload.name,
        description: payload.description || null,
        membershipIds: payload.membershipIds,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cowork-groups", selectedTenantId] }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCoworkGroup,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cowork-groups", selectedTenantId] }),
  });

  const groups = data?.groups ?? [];
  const users = usersData?.users ?? [];
  const visibleGroups = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return groups;
    return groups.filter((group) =>
      [group.name, group.description ?? "", ...group.members.map((member) => member.name)]
        .some((value) => value.toLowerCase().includes(term))
    );
  }, [groups, search]);

  const selectedGroup = groups.find((group) => group.id === selectedGroupId) ?? null;

  const openCreate = () => {
    setSelectedGroupId(null);
    setDraft(emptyDraft);
    setIsEditorOpen(true);
  };

  const openEdit = (group: ApiCoworkGroup) => {
    setSelectedGroupId(group.id);
    setDraft({
      name: group.name,
      description: group.description ?? "",
      membershipIds: group.members.map((member) => member.membershipId),
    });
    setIsEditorOpen(true);
  };

  const closeEditor = () => {
    setSelectedGroupId(null);
    setDraft(emptyDraft);
    setIsEditorOpen(false);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft.name.trim()) return;

    if (selectedGroupId) {
      await updateMutation.mutateAsync({
        id: selectedGroupId,
        payload: draft,
      });
    } else {
      await createMutation.mutateAsync({
        name: draft.name.trim(),
        description: draft.description.trim() || null,
        membershipIds: draft.membershipIds,
      });
    }
    closeEditor();
  };

  const deleteGroup = async (groupId: string) => {
    if (!window.confirm("Apagar este grupo?")) return;
    await deleteMutation.mutateAsync(groupId);
    if (selectedGroupId === groupId) closeEditor();
  };

  return (
    <Layout section="Grupos" sectionLabel="Cowork" context="cowork" role={currentRole}>
      <div className="space-y-6">
        <section className="panel p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <div className="context-chip mb-4 inline-flex">Support</div>
              <h1 className="text-3xl font-semibold tracking-tight text-text-main">
                Grupos de {selectedTenantName || "uma empresa"}
              </h1>
              <p className="mt-3 text-sm leading-6 text-text-muted">
                Gestão direta de grupos funcionais e respetivos membros no Postgres.
              </p>
            </div>
            {canManage ? (
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--context-accent)] px-4 py-3 text-sm font-semibold text-white"
              >
                <Plus className="h-4 w-4" />
                Novo grupo
              </button>
            ) : null}
          </div>
        </section>

        {isHydrating ? (
          <section className="panel p-8"><p className="text-sm text-text-muted">A carregar...</p></section>
        ) : !selectedTenantId ? (
          <section className="panel p-8"><p className="text-sm text-text-muted">Escolhe primeiro uma empresa.</p></section>
        ) : !canManage ? (
          <section className="panel p-8"><p className="text-sm text-text-muted">Acesso reservado a support e superuser.</p></section>
        ) : error ? (
          <section className="panel p-8"><p className="text-sm text-red-600 dark:text-red-300">{error instanceof Error ? error.message : "Nao foi possivel ler grupos."}</p></section>
        ) : (
          <section className="panel overflow-hidden">
            <div className="border-b border-border-subtle px-8 py-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-sm font-semibold text-text-main">Lista de grupos</h2>
                  <p className="mt-1 text-sm text-text-muted">O nome abre edição com associação de membros.</p>
                </div>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Pesquisar grupos ou membros..."
                  className="min-w-[260px] rounded-lg border border-border-subtle bg-bg-base px-4 py-2.5 text-sm text-text-main outline-none"
                />
              </div>
            </div>

            <div className="divide-y divide-border-subtle">
              {visibleGroups.map((group) => (
                <article
                  key={group.id}
                  className="grid items-center gap-4 px-8 py-4 xl:grid-cols-[minmax(260px,1fr)_minmax(240px,1.2fr)_170px]"
                >
                  <div className="min-w-0">
                    <button
                      type="button"
                      onClick={() => openEdit(group)}
                      className="truncate text-left text-sm font-semibold text-[var(--context-accent)]"
                    >
                      {group.name}
                    </button>
                    <div className="truncate text-xs text-text-muted">
                      {group.description || "Sem descricao"}
                    </div>
                  </div>
                  <div className="truncate text-sm text-text-muted">
                    {group.members.length
                      ? group.members.map((member) => member.name).join(", ")
                      : "Sem membros"}
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openEdit(group)}
                      className="inline-flex items-center gap-2 rounded-lg border border-border-subtle px-3 py-2 text-xs font-semibold text-text-main"
                    >
                      <PencilLine className="h-3.5 w-3.5" />
                      Alterar
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteGroup(group.id)}
                      className="inline-flex items-center gap-2 rounded-lg border border-border-subtle px-3 py-2 text-xs font-semibold text-text-main"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Apagar
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>

      {isEditorOpen ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/35 p-4">
          <form onSubmit={submit} className="panel modal-surface w-full max-w-[42rem] p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">Grupo</div>
                <h2 className="mt-1 text-xl font-semibold text-text-main">
                  {selectedGroup ? "Alterar grupo" : "Novo grupo"}
                </h2>
              </div>
              <button type="button" onClick={closeEditor} className="rounded-lg border border-border-subtle px-3 py-2 text-xs font-semibold text-text-main">Cancelar</button>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="block md:col-span-2">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">Nome</span>
                <input
                  value={draft.name}
                  onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                  className="w-full rounded-lg border border-border-subtle bg-bg-base px-4 py-3 text-sm text-text-main outline-none"
                />
              </label>
              <label className="block md:col-span-2">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">Descricao</span>
                <textarea
                  rows={3}
                  value={draft.description}
                  onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
                  className="w-full rounded-lg border border-border-subtle bg-bg-base px-4 py-3 text-sm text-text-main outline-none"
                />
              </label>
              <div className="md:col-span-2">
                <div className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">Membros</div>
                <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border border-border-subtle bg-bg-base p-3">
                  {users.map((user) => (
                    <label key={user.id} className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm text-text-main">
                      <input
                        type="checkbox"
                        checked={draft.membershipIds.includes(user.id)}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            membershipIds: event.target.checked
                              ? [...current.membershipIds, user.id]
                              : current.membershipIds.filter((id) => id !== user.id),
                          }))
                        }
                      />
                      <Users className="h-4 w-4 text-text-muted" />
                      <span className="truncate">{user.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-3">
              <button type="button" onClick={closeEditor} className="rounded-lg border border-border-subtle px-4 py-3 text-sm font-semibold text-text-main">Cancelar</button>
              <button type="submit" className="inline-flex items-center gap-2 rounded-lg bg-[var(--context-accent)] px-4 py-3 text-sm font-semibold text-white">
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
