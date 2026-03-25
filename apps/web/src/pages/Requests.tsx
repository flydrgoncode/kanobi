import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCheck, Clock3, Search, Trash2, X } from "lucide-react";
import { Layout } from "../components/Layout";
import { useTenantSelection } from "../context/tenant-selection";
import {
  decideWorkspaceRequest,
  deleteWorkspaceRequest,
  getWorkspaceRequests,
} from "../lib/workspace-api";

type FilterStatus = "all" | "pending" | "approved" | "rejected";
type SortMode = "recent" | "oldest";

function formatLongDate(value: string) {
  return new Date(value).toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default function Requests() {
  const { selectedTenantId, selectedTenantName } = useTenantSelection();
  const queryClient = useQueryClient();
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [sortMode, setSortMode] = useState<SortMode>("recent");
  const [search, setSearch] = useState("");

  const { data, error, isLoading } = useQuery({
    queryKey: ["mission-control-requests", selectedTenantId],
    queryFn: () => getWorkspaceRequests(),
    retry: false,
  });

  const mutation = useMutation({
    mutationFn: ({ requestId, status }: { requestId: string; status: "approved" | "rejected" }) =>
      decideWorkspaceRequest(requestId, status),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["mission-control-requests"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteWorkspaceRequest,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["mission-control-requests"] }),
  });

  const requests = data?.requests ?? [];
  const selectedRequest = requests.find((request) => request.id === selectedRequestId) ?? null;

  const visibleRequests = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();
    const filtered = requests.filter((request) => {
      const matchesStatus = filterStatus === "all" ? true : request.status === filterStatus;
      const matchesSearch = searchTerm
        ? [request.name, request.email, request.company].some((value) =>
            value.toLowerCase().includes(searchTerm)
          )
        : true;
      return matchesStatus && matchesSearch;
    });

    return [...filtered].sort((left, right) => {
      const leftPriority = left.status === "pending" ? 0 : 1;
      const rightPriority = right.status === "pending" ? 0 : 1;

      if (leftPriority !== rightPriority) {
        return leftPriority - rightPriority;
      }

      const leftDate = new Date(left.createdAt).getTime();
      const rightDate = new Date(right.createdAt).getTime();
      return sortMode === "recent" ? rightDate - leftDate : leftDate - rightDate;
    });
  }, [filterStatus, requests, search, sortMode]);

  const updateStatus = (id: string, status: "approved" | "rejected") => {
    mutation.mutate({ requestId: id, status });
  };

  const deleteRequest = (id: string) => {
    if (!window.confirm("Apagar este convite da fila?")) return;

    deleteMutation.mutate(id, {
      onSuccess: () => {
        if (selectedRequestId === id) setSelectedRequestId(null);
      },
    });
  };

  return (
    <Layout section="Convites" sectionLabel="Mission Control">
      <div className="space-y-6">
        {error ? (
          <section className="panel p-6">
            <p className="text-sm text-red-600 dark:text-red-300">
              {error instanceof Error ? error.message : "Nao foi possivel ler pedidos do Postgres."}
            </p>
          </section>
        ) : null}

        <section className="panel p-8">
          <div className="context-chip mb-4 inline-flex">Convites e pedidos</div>
          <h1 className="text-3xl font-semibold tracking-tight text-text-main">
            {selectedTenantId
              ? `Aprovar ou rejeitar convites de ${selectedTenantName || "uma empresa"}`
              : "Aprovar ou rejeitar convites de todas as empresas"}
          </h1>
          {selectedTenantId ? (
            <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-[var(--context-accent)] bg-[var(--context-soft)] px-3 py-2 text-sm font-semibold text-[var(--context-accent)]">
              <span>Empresa ativa</span>
              <span className="text-text-main">{selectedTenantName}</span>
            </div>
          ) : null}
          <p className="mt-3 max-w-2xl text-sm leading-6 text-text-muted">
            {selectedTenantId
              ? "Vista filtrada por empresa, com pendentes no topo e pesquisa por nome ou estado."
              : "Uma linha por registo, pesquisa por nome ou estado e ações rápidas sempre alinhadas à direita."}
          </p>
        </section>

        <section className="panel overflow-hidden">
          <div className="border-b border-border-subtle px-8 py-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold text-text-main">Fila de aprovacao</h2>
                <p className="mt-1 text-sm text-text-muted">
                  Pendentes no topo, com pesquisa por nome, email ou empresa.
                </p>
              </div>
              <div className="rounded-lg bg-[var(--context-soft)] px-4 py-2 text-xs font-semibold text-[var(--context-accent)]">
                {visibleRequests.length} registos
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <div className="relative min-w-[260px] flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Procurar por nome, email ou empresa..."
                  className="w-full rounded-lg border border-border-subtle bg-bg-base py-2.5 pl-10 pr-4 text-sm text-text-main outline-none transition-all focus:border-border-strong focus:ring-1 focus:ring-border-strong"
                />
              </div>
              <select
                value={filterStatus}
                onChange={(event) => setFilterStatus(event.target.value as FilterStatus)}
                className="rounded-lg border border-border-subtle bg-bg-base px-3 py-2.5 text-xs font-semibold text-text-main outline-none"
              >
                <option value="all">Todos os estados</option>
                <option value="pending">Pendentes</option>
                <option value="approved">Aprovados</option>
                <option value="rejected">Rejeitados</option>
              </select>
              <select
                value={sortMode}
                onChange={(event) => setSortMode(event.target.value as SortMode)}
                className="rounded-lg border border-border-subtle bg-bg-base px-3 py-2.5 text-xs font-semibold text-text-main outline-none"
              >
                <option value="recent">Mais recentes</option>
                <option value="oldest">Mais antigos</option>
              </select>
            </div>
          </div>

          <div className="divide-y divide-border-subtle">
            {isLoading ? (
              <div className="px-8 py-6 text-sm text-text-muted">
                A carregar pedidos do Postgres...
              </div>
            ) : null}

            {visibleRequests.map((request) => (
              <article
                key={request.id}
                className="grid items-center gap-4 px-8 py-4 xl:grid-cols-[minmax(340px,1.3fr)_minmax(180px,0.9fr)_220px_120px_260px]"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-bg-base">
                      <Clock3 className="h-4.5 w-4.5 text-text-main" />
                    </div>
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => setSelectedRequestId(request.id)}
                        className="truncate text-left text-sm font-semibold text-text-main underline-offset-4 transition-colors hover:text-[var(--context-accent)] hover:underline"
                      >
                        {request.name}
                      </button>
                      <div className="truncate text-xs text-text-muted">{request.email}</div>
                    </div>
                  </div>
                </div>

                <div className="truncate text-sm text-text-muted">{request.company}</div>

                <div className="truncate text-sm text-text-main">{formatLongDate(request.createdAt)}</div>

                <div>
                  <span
                    className={`inline-flex whitespace-nowrap rounded-lg px-3 py-1 text-[11px] font-semibold ${
                      request.status === "pending"
                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-300"
                        : request.status === "approved"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                          : "bg-red-500/10 text-red-600 dark:text-red-300"
                    }`}
                  >
                    {request.status === "pending"
                      ? "Pendente"
                      : request.status === "approved"
                        ? "Aprovado"
                        : "Rejeitado"}
                  </span>
                </div>

                <div className="flex min-w-0 flex-nowrap items-center justify-end gap-2 overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => updateStatus(request.id, "approved")}
                    disabled={request.status !== "pending"}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border-subtle px-3 py-2 text-xs font-semibold text-text-main transition-colors hover:bg-bg-hover disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    Aprovar
                  </button>
                  <button
                    type="button"
                    onClick={() => updateStatus(request.id, "rejected")}
                    disabled={request.status !== "pending"}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border-subtle px-3 py-2 text-xs font-semibold text-text-main transition-colors hover:bg-bg-hover disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <X className="h-3.5 w-3.5" />
                    Rejeitar
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteRequest(request.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border-subtle px-3 py-2 text-xs font-semibold text-text-main transition-colors hover:bg-bg-hover"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Apagar
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        {selectedRequest ? (
          <div
            className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/45 px-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="request-readonly-title"
          >
            <div className="panel modal-surface w-full max-w-[29rem] p-6 shadow-2xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2
                    id="request-readonly-title"
                    className="text-2xl font-semibold tracking-tight text-text-main"
                  >
                    {selectedRequest.name}
                  </h2>
                  <p className="mt-2 text-sm text-text-muted">{selectedRequest.email}</p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                    {selectedRequest.company}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedRequestId(null)}
                  className="rounded-lg border border-border-subtle px-3 py-2 text-xs font-semibold text-text-main transition-colors hover:bg-bg-hover"
                >
                  Fechar
                </button>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-border-subtle bg-bg-base px-4 py-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted">
                    Estado
                  </div>
                  <div className="mt-2 text-sm font-semibold text-text-main">
                    {selectedRequest.status === "pending"
                      ? "Pendente"
                      : selectedRequest.status === "approved"
                        ? "Aprovado"
                        : "Rejeitado"}
                  </div>
                </div>
                <div className="rounded-lg border border-border-subtle bg-bg-base px-4 py-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted">
                    Data do pedido
                  </div>
                  <div className="mt-2 text-sm font-semibold text-text-main">
                    {formatLongDate(selectedRequest.createdAt)}
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-lg border border-border-subtle bg-bg-base px-4 py-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted">
                  Mensagem do utilizador
                </div>
                <p className="mt-2 text-sm leading-6 text-text-main">
                  {selectedRequest.message || "Sem mensagem adicional."}
                </p>
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => updateStatus(selectedRequest.id, "approved")}
                  disabled={selectedRequest.status !== "pending"}
                  className="inline-flex items-center gap-2 rounded-lg border border-border-subtle px-4 py-3 text-sm font-semibold text-text-main transition-colors hover:bg-bg-hover disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <CheckCheck className="h-4 w-4" />
                  Aprovar
                </button>
                <button
                  type="button"
                  onClick={() => updateStatus(selectedRequest.id, "rejected")}
                  disabled={selectedRequest.status !== "pending"}
                  className="inline-flex items-center gap-2 rounded-lg border border-border-subtle px-4 py-3 text-sm font-semibold text-text-main transition-colors hover:bg-bg-hover disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <X className="h-4 w-4" />
                  Rejeitar
                </button>
                <button
                  type="button"
                  onClick={() => deleteRequest(selectedRequest.id)}
                  className="inline-flex items-center gap-2 rounded-lg border border-border-subtle px-4 py-3 text-sm font-semibold text-text-main transition-colors hover:bg-bg-hover"
                >
                  <Trash2 className="h-4 w-4" />
                  Apagar
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </Layout>
  );
}
