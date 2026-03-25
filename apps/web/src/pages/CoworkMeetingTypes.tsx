import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PencilLine, Plus, Save, Trash2 } from "lucide-react";
import { useLocation } from "react-router-dom";
import { Layout } from "../components/Layout";
import { useTenantSelection } from "../context/tenant-selection";
import {
  createCoworkMeetingType,
  deleteCoworkMeetingType,
  getCurrentUser,
  getCoworkMeetingTypes,
  updateCoworkMeetingType,
  type ApiCoworkMeetingType,
} from "../lib/workspace-api";

type DraftState = {
  code: string;
  name: string;
  description: string;
  cadence: "weekly" | "monthly" | "quarterly" | "semiannual";
  isActive: boolean;
};

const emptyDraft: DraftState = {
  code: "",
  name: "",
  description: "",
  cadence: "weekly",
  isActive: true,
};

const cadenceLabels: Record<DraftState["cadence"], string> = {
  weekly: "Semanal",
  monthly: "Mensal",
  quarterly: "Trimestral",
  semiannual: "Semestral",
};

export default function CoworkMeetingTypes() {
  const location = useLocation();
  const { selectedTenantId, isHydrating } = useTenantSelection();
  const isWorkspaceRoute = location.pathname.startsWith("/workspace/");
  const layoutContext = isWorkspaceRoute ? "workspace" : "cowork";
  const sectionLabel = isWorkspaceRoute ? "Workspace" : "Cowork";
  const meetingTypesQueryKey = [
    "cowork-meeting-types",
    isWorkspaceRoute ? "workspace-global" : selectedTenantId,
  ] as const;
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftState>(emptyDraft);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const { data: currentUserData } = useQuery({
    queryKey: ["cowork-current-user", selectedTenantId],
    queryFn: () => getCurrentUser(),
    retry: false,
  });

  const currentRole =
    currentUserData?.user.role === "god" ? "superuser" : currentUserData?.user.role ?? "member";
  const canManage =
    currentUserData?.user.role === "god" ||
    currentRole === "support" ||
    currentRole === "superuser";

  const { data, error } = useQuery({
    queryKey: meetingTypesQueryKey,
    queryFn: () => getCoworkMeetingTypes(),
    enabled: canManage,
    retry: false,
  });

  const createMutation = useMutation({
    mutationFn: createCoworkMeetingType,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: meetingTypesQueryKey }),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: DraftState }) =>
      updateCoworkMeetingType(id, {
        code: payload.code,
        name: payload.name,
        description: payload.description || null,
        cadence: payload.cadence,
        isActive: payload.isActive,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: meetingTypesQueryKey }),
  });
  const deleteMutation = useMutation({
    mutationFn: deleteCoworkMeetingType,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: meetingTypesQueryKey }),
  });

  const types = data?.meetingTypes ?? [];
  const visibleTypes = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return types;
    return types.filter((type) =>
      [type.name, type.code, type.description ?? "", cadenceLabels[type.cadence]]
        .some((value) => value.toLowerCase().includes(term))
    );
  }, [search, types]);

  const selectedType = types.find((type) => type.id === selectedTypeId) ?? null;

  const openCreate = () => {
    setSelectedTypeId(null);
    setDraft(emptyDraft);
    setIsEditorOpen(true);
  };

  const openEdit = (type: ApiCoworkMeetingType) => {
    setSelectedTypeId(type.id);
    setDraft({
      code: type.code,
      name: type.name,
      description: type.description ?? "",
      cadence: type.cadence,
      isActive: type.isActive ?? true,
    });
    setIsEditorOpen(true);
  };

  const closeEditor = () => {
    setSelectedTypeId(null);
    setDraft(emptyDraft);
    setIsEditorOpen(false);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft.code.trim() || !draft.name.trim()) return;
    if (selectedTypeId) {
      await updateMutation.mutateAsync({ id: selectedTypeId, payload: draft });
    } else {
      await createMutation.mutateAsync({
        code: draft.code.trim(),
        name: draft.name.trim(),
        description: draft.description.trim() || null,
        cadence: draft.cadence,
        isActive: draft.isActive,
      });
    }
    closeEditor();
  };

  const deleteType = async (meetingTypeId: string) => {
    if (!window.confirm("Apagar este tipo de reuniao?")) return;
    await deleteMutation.mutateAsync(meetingTypeId);
    if (selectedTypeId === meetingTypeId) closeEditor();
  };

  return (
    <Layout section="Cadencia" sectionLabel={sectionLabel} context={layoutContext} role={currentRole}>
      <div className="space-y-6">
        <section className="panel p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <div className="context-chip mb-4 inline-flex">Funcional</div>
              <h1 className="text-3xl font-semibold tracking-tight text-text-main">
                Cadencia de reuniao
              </h1>
              <p className="mt-3 text-sm leading-6 text-text-muted">
                Catálogo funcional global de cadências e definições base de reunião, ligado diretamente ao Postgres.
              </p>
            </div>
            {canManage ? (
              <button type="button" onClick={openCreate} className="inline-flex items-center gap-2 rounded-xl bg-[var(--context-accent)] px-4 py-3 text-sm font-semibold text-white">
                <Plus className="h-4 w-4" />
                Nova cadencia
              </button>
            ) : null}
          </div>
        </section>

        {isHydrating ? (
          <section className="panel p-8"><p className="text-sm text-text-muted">A carregar...</p></section>
        ) : !canManage ? (
          <section className="panel p-8"><p className="text-sm text-text-muted">Acesso reservado a support e superuser.</p></section>
        ) : error ? (
          <section className="panel p-8"><p className="text-sm text-red-600 dark:text-red-300">{error instanceof Error ? error.message : "Nao foi possivel ler cadencias."}</p></section>
        ) : (
          <section className="panel overflow-hidden">
            <div className="border-b border-border-subtle px-8 py-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-sm font-semibold text-text-main">Cadencias</h2>
                  <p className="mt-1 text-sm text-text-muted">Aqui geres as definições base. As reuniões reais vivem no Cowork.</p>
                </div>
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Pesquisar cadencias..." className="min-w-[260px] rounded-lg border border-border-subtle bg-bg-base px-4 py-2.5 text-sm text-text-main outline-none" />
              </div>
            </div>

            <div className="divide-y divide-border-subtle">
              {visibleTypes.map((type) => (
                <article key={type.id} className="grid items-center gap-4 px-8 py-4 xl:grid-cols-[minmax(220px,1fr)_140px_minmax(220px,1fr)_170px]">
                  <div className="min-w-0">
                    <button type="button" onClick={() => openEdit(type)} className="truncate text-left text-sm font-semibold text-[var(--context-accent)]">
                      {type.name}
                    </button>
                    <div className="truncate text-xs text-text-muted">{type.code}</div>
                  </div>
                  <div className="text-sm text-text-muted">{cadenceLabels[type.cadence]}</div>
                  <div className="truncate text-sm text-text-muted">{type.description || "Sem descricao"}</div>
                  <div className="ml-auto flex items-center gap-2">
                    <button type="button" onClick={() => openEdit(type)} className="inline-flex items-center gap-2 rounded-lg border border-border-subtle px-3 py-2 text-xs font-semibold text-text-main">
                      <PencilLine className="h-3.5 w-3.5" />
                      Alterar
                    </button>
                    <button type="button" onClick={() => void deleteType(type.id)} className="inline-flex items-center gap-2 rounded-lg border border-border-subtle px-3 py-2 text-xs font-semibold text-text-main">
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
          <form onSubmit={submit} className="panel modal-surface w-full max-w-[38rem] p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">Cadencia</div>
                <h2 className="mt-1 text-xl font-semibold text-text-main">{selectedType ? "Alterar cadencia" : "Nova cadencia"}</h2>
              </div>
              <button type="button" onClick={closeEditor} className="rounded-lg border border-border-subtle px-3 py-2 text-xs font-semibold text-text-main">Cancelar</button>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">Code</span>
                <input value={draft.code} onChange={(event) => setDraft((current) => ({ ...current, code: event.target.value }))} className="w-full rounded-lg border border-border-subtle bg-bg-base px-4 py-3 text-sm text-text-main outline-none" />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">Cadencia</span>
                <select value={draft.cadence} onChange={(event) => setDraft((current) => ({ ...current, cadence: event.target.value as DraftState["cadence"] }))} className="w-full rounded-lg border border-border-subtle bg-bg-base px-4 py-3 text-sm text-text-main outline-none">
                  <option value="weekly">Semanal</option>
                  <option value="monthly">Mensal</option>
                  <option value="quarterly">Trimestral</option>
                  <option value="semiannual">Semestral</option>
                </select>
              </label>
              <label className="block md:col-span-2">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">Nome</span>
                <input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} className="w-full rounded-lg border border-border-subtle bg-bg-base px-4 py-3 text-sm text-text-main outline-none" />
              </label>
              <label className="block md:col-span-2">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">Descricao</span>
                <textarea rows={3} value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} className="w-full rounded-lg border border-border-subtle bg-bg-base px-4 py-3 text-sm text-text-main outline-none" />
              </label>
              <label className="flex items-center gap-3 rounded-lg border border-border-subtle bg-bg-base px-4 py-3 text-sm font-semibold text-text-main md:col-span-2">
                <input type="checkbox" checked={draft.isActive} onChange={(event) => setDraft((current) => ({ ...current, isActive: event.target.checked }))} />
                Cadencia ativa
              </label>
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
