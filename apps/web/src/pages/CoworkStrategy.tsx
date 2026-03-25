import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PencilLine, Plus, Save, Trash2 } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { Layout } from "../components/Layout";
import { useTenantSelection } from "../context/tenant-selection";
import {
  createCoworkObstacle,
  createCoworkValue,
  deleteCoworkObstacle,
  deleteCoworkValue,
  deleteCoworkVision,
  getCoworkStrategy,
  getCurrentUser,
  saveCoworkVision,
  updateCoworkObstacle,
  updateCoworkValue,
  type ApiCoworkStrategyItem,
} from "../lib/workspace-api";

type StrategyTab = "vision" | "values" | "obstacles";
type StrategyKind = StrategyTab;

type DraftState = {
  shortName: string;
  description: string;
};

const emptyDraft: DraftState = {
  shortName: "",
  description: "",
};

const tabs: Array<{ id: StrategyTab; label: string }> = [
  { id: "vision", label: "Visao" },
  { id: "values", label: "Valores" },
  { id: "obstacles", label: "Obstaculos" },
];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export default function CoworkStrategy() {
  const { selectedTenantId, selectedTenantName, isHydrating } = useTenantSelection();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get("tab") as StrategyTab) || "vision";
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState<DraftState>(emptyDraft);
  const [editingItem, setEditingItem] = useState<ApiCoworkStrategyItem | null>(null);
  const [editingKind, setEditingKind] = useState<StrategyKind>("vision");
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: currentUserData } = useQuery({
    queryKey: ["cowork-current-user", selectedTenantId],
    queryFn: () => getCurrentUser(),
    retry: false,
  });

  const currentRole =
    currentUserData?.user.role === "god" ? "superuser" : currentUserData?.user.role ?? "member";
  const canManage = currentRole === "support" || currentRole === "superuser";

  const { data, error, isLoading } = useQuery({
    queryKey: ["cowork-strategy", selectedTenantId],
    queryFn: () => getCoworkStrategy(),
    enabled: Boolean(selectedTenantId) && canManage,
    retry: false,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["cowork-strategy", selectedTenantId] });

  const saveVisionMutation = useMutation({
    mutationFn: saveCoworkVision,
    onSuccess: () => invalidate(),
  });
  const deleteVisionMutation = useMutation({
    mutationFn: deleteCoworkVision,
    onSuccess: () => invalidate(),
  });
  const createValueMutation = useMutation({
    mutationFn: createCoworkValue,
    onSuccess: () => invalidate(),
  });
  const updateValueMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: DraftState }) => updateCoworkValue(id, payload),
    onSuccess: () => invalidate(),
  });
  const deleteValueMutation = useMutation({
    mutationFn: deleteCoworkValue,
    onSuccess: () => invalidate(),
  });
  const createObstacleMutation = useMutation({
    mutationFn: createCoworkObstacle,
    onSuccess: () => invalidate(),
  });
  const updateObstacleMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: DraftState }) =>
      updateCoworkObstacle(id, payload),
    onSuccess: () => invalidate(),
  });
  const deleteObstacleMutation = useMutation({
    mutationFn: deleteCoworkObstacle,
    onSuccess: () => invalidate(),
  });

  const values = data?.values ?? [];
  const obstacles = data?.obstacles ?? [];
  const filteredValues = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return values;
    return values.filter((item) =>
      [item.shortName, item.description].some((value) => value.toLowerCase().includes(term))
    );
  }, [search, values]);
  const filteredObstacles = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return obstacles;
    return obstacles.filter((item) =>
      [item.shortName, item.description].some((value) => value.toLowerCase().includes(term))
    );
  }, [search, obstacles]);

  const openEditor = (kind: StrategyKind, item?: ApiCoworkStrategyItem | null) => {
    setEditingKind(kind);
    setEditingItem(item ?? null);
    setDraft(
      item
        ? {
            shortName: item.shortName,
            description: item.description,
          }
        : emptyDraft
    );
    setIsEditorOpen(true);
  };

  const closeEditor = () => {
    setEditingItem(null);
    setDraft(emptyDraft);
    setIsEditorOpen(false);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload = {
      shortName: draft.shortName.trim(),
      description: draft.description.trim(),
    };
    if (!payload.shortName || !payload.description) return;

    if (editingKind === "vision") {
      await saveVisionMutation.mutateAsync(payload);
      closeEditor();
      return;
    }

    if (editingKind === "values" && editingItem) {
      await updateValueMutation.mutateAsync({ id: editingItem.id, payload });
      closeEditor();
      return;
    }

    if (editingKind === "values") {
      await createValueMutation.mutateAsync(payload);
      closeEditor();
      return;
    }

    if (editingItem) {
      await updateObstacleMutation.mutateAsync({ id: editingItem.id, payload });
      closeEditor();
      return;
    }

    await createObstacleMutation.mutateAsync(payload);
    closeEditor();
  };

  const handleDelete = async (kind: StrategyKind, item?: ApiCoworkStrategyItem | null) => {
    const label =
      kind === "vision"
        ? "esta visao"
        : kind === "values"
          ? "este valor"
          : "este obstaculo";
    if (!window.confirm(`Apagar ${label}?`)) return;

    if (kind === "vision") {
      await deleteVisionMutation.mutateAsync();
      return;
    }

    if (!item) return;
    if (kind === "values") {
      await deleteValueMutation.mutateAsync(item.id);
      return;
    }

    await deleteObstacleMutation.mutateAsync(item.id);
  };

  const list = activeTab === "values" ? filteredValues : filteredObstacles;

  return (
    <Layout section="Strategy" sectionLabel="Cowork" context="cowork" role={currentRole}>
      <div className="space-y-6">
        <section className="panel p-8">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <div className="context-chip mb-4 inline-flex">Support</div>
              <h1 className="text-3xl font-semibold tracking-tight text-text-main">
                Strategy de {selectedTenantName || "uma empresa"}
              </h1>
              {selectedTenantId ? (
                <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-[var(--context-accent)] bg-[var(--context-soft)] px-3 py-2 text-sm font-semibold text-[var(--context-accent)]">
                  <span>Empresa ativa</span>
                  <span className="text-text-main">{selectedTenantName}</span>
                </div>
              ) : null}
              <p className="mt-3 max-w-2xl text-sm leading-6 text-text-muted">
                CRUD de Visao, Valores e Obstaculos ligado diretamente ao Postgres e restrito a
                utilizadores `support` e `superuser`.
              </p>
            </div>
            {(activeTab === "values" || activeTab === "obstacles") && canManage ? (
              <button
                type="button"
                onClick={() => openEditor(activeTab)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--context-accent)] px-4 py-3 text-sm font-semibold text-white shadow-card transition-transform hover:-translate-y-0.5"
              >
                <Plus className="h-4 w-4" />
                <span>{activeTab === "values" ? "Novo valor" : "Novo obstaculo"}</span>
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
              {error instanceof Error ? error.message : "Nao foi possivel ler Strategy."}
            </p>
          </section>
        ) : (
          <>
            <section className="panel p-3">
              <div className="flex flex-wrap gap-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSearchParams({ tab: tab.id })}
                    className={`rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
                      activeTab === tab.id
                        ? "bg-[var(--context-accent)] text-white"
                        : "bg-bg-surface text-text-muted hover:bg-bg-hover hover:text-text-main"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </section>

            {activeTab === "vision" ? (
              <section className="panel p-8">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                      Visao do tenant
                    </div>
                    <div className="mt-1 text-sm text-text-muted">
                      Existe apenas uma visao por empresa.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => openEditor("vision", data?.vision ?? null)}
                    className="inline-flex items-center gap-2 rounded-lg border border-border-subtle px-3 py-2 text-xs font-semibold text-text-main transition-colors hover:bg-bg-hover"
                  >
                    <PencilLine className="h-4 w-4" />
                    <span>{data?.vision ? "Alterar" : "Criar"}</span>
                  </button>
                </div>

                {isLoading ? (
                  <p className="text-sm text-text-muted">A carregar visao...</p>
                ) : data?.vision ? (
                  <div className="flex items-start justify-between gap-4 rounded-xl border border-border-subtle bg-bg-surface px-5 py-4">
                    <div className="min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => openEditor("vision", data.vision)}
                        className="truncate text-left text-base font-semibold text-[var(--context-accent)] transition-opacity hover:opacity-80"
                      >
                        {data.vision.shortName}
                      </button>
                      <div className="mt-1 text-sm leading-6 text-text-muted">
                        {data.vision.description}
                      </div>
                      <div className="mt-2 text-xs text-text-muted">
                        Atualizado em {formatDate(data.vision.updatedAt)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete("vision")}
                      className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 dark:border-red-500/30 dark:hover:bg-red-500/10"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Apagar</span>
                    </button>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-border-strong px-5 py-8 text-sm text-text-muted">
                    Ainda nao existe visao para esta empresa.
                  </div>
                )}
              </section>
            ) : (
              <section className="panel p-8">
                <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                      {activeTab === "values" ? "Valores" : "Obstaculos"}
                    </div>
                    <div className="mt-1 text-sm text-text-muted">
                      Pesquisa por nome curto ou descricao.
                    </div>
                  </div>
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={`Pesquisar ${activeTab === "values" ? "valores" : "obstaculos"}...`}
                    className="w-full rounded-xl border border-border-subtle bg-bg-surface px-4 py-3 text-sm text-text-main outline-none transition-colors focus:border-border-strong lg:max-w-sm"
                  />
                </div>

                <div className="space-y-3">
                  {list.length ? (
                    list.map((item) => (
                      <div
                        key={item.id}
                        className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)_auto] items-center gap-4 rounded-xl border border-border-subtle bg-bg-surface px-4 py-3"
                      >
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => openEditor(activeTab, item)}
                            className="truncate text-left text-sm font-semibold text-[var(--context-accent)] transition-opacity hover:opacity-80"
                          >
                            {item.shortName}
                          </button>
                          <div className="truncate text-xs text-text-muted">
                            Atualizado em {formatDate(item.updatedAt)}
                          </div>
                        </div>
                        <div className="truncate text-sm text-text-muted">{item.description}</div>
                        <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => openEditor(activeTab, item)}
                            className="inline-flex items-center gap-2 rounded-lg border border-border-subtle px-3 py-2 text-xs font-semibold text-text-main transition-colors hover:bg-bg-hover"
                          >
                            <PencilLine className="h-4 w-4" />
                            <span>Alterar</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(activeTab, item)}
                            className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 dark:border-red-500/30 dark:hover:bg-red-500/10"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span>Apagar</span>
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-xl border border-dashed border-border-strong px-5 py-8 text-sm text-text-muted">
                      {activeTab === "values"
                        ? "Ainda nao existem valores para esta empresa."
                        : "Ainda nao existem obstaculos para esta empresa."}
                    </div>
                  )}
                </div>
              </section>
            )}
          </>
        )}
      </div>

      {isEditorOpen ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/35 p-4">
          <div className="panel modal-surface w-full max-w-[34rem] p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                  {editingKind === "vision"
                    ? "Visao"
                    : editingKind === "values"
                      ? "Valor"
                      : "Obstaculo"}
                </div>
                <h2 className="mt-1 text-xl font-semibold text-text-main">
                  {editingItem ? "Alterar registo" : "Novo registo"}
                </h2>
              </div>
            </div>

            <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                  Nome curto
                </label>
                <input
                  value={draft.shortName}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, shortName: event.target.value }))
                  }
                  className="w-full rounded-xl border border-border-subtle bg-bg-surface px-4 py-3 text-sm text-text-main outline-none transition-colors focus:border-border-strong"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                  Descricao
                </label>
                <textarea
                  rows={5}
                  value={draft.description}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, description: event.target.value }))
                  }
                  className="w-full rounded-xl border border-border-subtle bg-bg-surface px-4 py-3 text-sm text-text-main outline-none transition-colors focus:border-border-strong"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeEditor}
                  className="rounded-xl border border-border-subtle px-4 py-3 text-sm font-semibold text-text-main transition-colors hover:bg-bg-hover"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-xl bg-[var(--context-accent)] px-4 py-3 text-sm font-semibold text-white"
                >
                  <Save className="h-4 w-4" />
                  <span>Gravar</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </Layout>
  );
}
