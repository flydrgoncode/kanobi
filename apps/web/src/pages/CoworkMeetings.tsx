import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PencilLine, Plus, Save, Trash2 } from "lucide-react";
import { Layout } from "../components/Layout";
import { useTenantSelection } from "../context/tenant-selection";
import {
  createCoworkMeeting,
  deleteCoworkMeeting,
  getCurrentUser,
  getCoworkMeetings,
  getWorkspaceUsers,
  updateCoworkMeeting,
  type ApiCoworkMeeting,
} from "../lib/workspace-api";

type DraftState = {
  meetingTypeId: string;
  name: string;
  scheduledAt: string;
  durationMinutes: number;
  status: "scheduled" | "completed" | "cancelled";
  focus: string;
  outcome: string;
  notes: string;
  groupIds: string[];
  participantMembershipIds: string[];
};

const emptyDraft: DraftState = {
  meetingTypeId: "",
  name: "",
  scheduledAt: "",
  durationMinutes: 60,
  status: "scheduled",
  focus: "",
  outcome: "",
  notes: "",
  groupIds: [],
  participantMembershipIds: [],
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function CoworkMeetings() {
  const { selectedTenantId, selectedTenantName, isHydrating } = useTenantSelection();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
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
    queryKey: ["cowork-meetings", selectedTenantId],
    queryFn: () => getCoworkMeetings(),
    enabled: Boolean(selectedTenantId) && canManage,
    retry: false,
  });

  const { data: usersData } = useQuery({
    queryKey: ["cowork-meetings-users", selectedTenantId],
    queryFn: () => getWorkspaceUsers(),
    enabled: Boolean(selectedTenantId) && canManage,
    retry: false,
  });

  const createMutation = useMutation({
    mutationFn: createCoworkMeeting,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cowork-meetings", selectedTenantId] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: DraftState }) =>
      updateCoworkMeeting(id, {
        ...payload,
        focus: payload.focus || null,
        outcome: payload.outcome || null,
        notes: payload.notes || null,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cowork-meetings", selectedTenantId] }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCoworkMeeting,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cowork-meetings", selectedTenantId] }),
  });

  const meetings = data?.meetings ?? [];
  const groups = data?.groups ?? [];
  const meetingTypes = data?.meetingTypes ?? [];
  const users = usersData?.users ?? [];

  const visibleMeetings = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return meetings;
    return meetings.filter((meeting) =>
      [meeting.name, meeting.focus ?? "", meeting.status].some((value) =>
        value.toLowerCase().includes(term)
      )
    );
  }, [meetings, search]);

  const selectedMeeting = meetings.find((meeting) => meeting.id === selectedMeetingId) ?? null;

  const openCreate = () => {
    setSelectedMeetingId(null);
    setDraft({
      ...emptyDraft,
      meetingTypeId: meetingTypes[0]?.id ?? "",
      scheduledAt: new Date().toISOString().slice(0, 16),
    });
    setIsEditorOpen(true);
  };

  const openEdit = (meeting: ApiCoworkMeeting) => {
    setSelectedMeetingId(meeting.id);
    setDraft({
      meetingTypeId: meeting.meetingTypeId,
      name: meeting.name,
      scheduledAt: new Date(meeting.scheduledAt).toISOString().slice(0, 16),
      durationMinutes: meeting.durationMinutes,
      status: meeting.status,
      focus: meeting.focus ?? "",
      outcome: meeting.outcome ?? "",
      notes: meeting.notes ?? "",
      groupIds: meeting.groups.map((group) => group.groupId),
      participantMembershipIds: meeting.participants.map((participant) => participant.membershipId),
    });
    setIsEditorOpen(true);
  };

  const closeEditor = () => {
    setSelectedMeetingId(null);
    setDraft(emptyDraft);
    setIsEditorOpen(false);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft.meetingTypeId || !draft.name.trim() || !draft.scheduledAt) return;

    if (selectedMeetingId) {
      await updateMutation.mutateAsync({ id: selectedMeetingId, payload: draft });
    } else {
      await createMutation.mutateAsync({
        ...draft,
        focus: draft.focus || null,
        outcome: draft.outcome || null,
        notes: draft.notes || null,
      });
    }
    closeEditor();
  };

  const deleteMeeting = async (meetingId: string) => {
    if (!window.confirm("Apagar esta reuniao?")) return;
    await deleteMutation.mutateAsync(meetingId);
    if (selectedMeetingId === meetingId) closeEditor();
  };

  return (
    <Layout section="Reunioes" sectionLabel="Cowork" context="cowork" role={currentRole}>
      <div className="space-y-6">
        <section className="panel p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <div className="context-chip mb-4 inline-flex">Support</div>
              <h1 className="text-3xl font-semibold tracking-tight text-text-main">
                Reunioes de {selectedTenantName || "uma empresa"}
              </h1>
              <p className="mt-3 text-sm leading-6 text-text-muted">
                Gestão de reuniões do tenant, com grupos e participantes associados.
              </p>
            </div>
            {canManage ? (
              <button type="button" onClick={openCreate} className="inline-flex items-center gap-2 rounded-xl bg-[var(--context-accent)] px-4 py-3 text-sm font-semibold text-white">
                <Plus className="h-4 w-4" />
                Nova reuniao
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
          <section className="panel p-8"><p className="text-sm text-red-600 dark:text-red-300">{error instanceof Error ? error.message : "Nao foi possivel ler reunioes."}</p></section>
        ) : (
          <section className="panel overflow-hidden">
            <div className="border-b border-border-subtle px-8 py-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-sm font-semibold text-text-main">Lista de reunioes</h2>
                  <p className="mt-1 text-sm text-text-muted">Cada reunião pode ligar-se a grupos e participantes.</p>
                </div>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Pesquisar reunioes..."
                  className="min-w-[260px] rounded-lg border border-border-subtle bg-bg-base px-4 py-2.5 text-sm text-text-main outline-none"
                />
              </div>
            </div>

            <div className="divide-y divide-border-subtle">
              {visibleMeetings.map((meeting) => (
                <article key={meeting.id} className="grid items-center gap-4 px-8 py-4 xl:grid-cols-[minmax(220px,1fr)_minmax(240px,1fr)_minmax(180px,0.8fr)_170px]">
                  <div className="min-w-0">
                    <button type="button" onClick={() => openEdit(meeting)} className="truncate text-left text-sm font-semibold text-[var(--context-accent)]">
                      {meeting.name}
                    </button>
                    <div className="truncate text-xs text-text-muted">{formatDateTime(meeting.scheduledAt)}</div>
                  </div>
                  <div className="truncate text-sm text-text-muted">
                    {meeting.groups.length ? meeting.groups.map((group) => group.groupName).join(", ") : "Sem grupos"}
                  </div>
                  <div className="truncate text-sm text-text-muted">
                    {meeting.participants.length ? meeting.participants.map((participant) => participant.name).join(", ") : "Sem participantes"}
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    <button type="button" onClick={() => openEdit(meeting)} className="inline-flex items-center gap-2 rounded-lg border border-border-subtle px-3 py-2 text-xs font-semibold text-text-main">
                      <PencilLine className="h-3.5 w-3.5" />
                      Alterar
                    </button>
                    <button type="button" onClick={() => void deleteMeeting(meeting.id)} className="inline-flex items-center gap-2 rounded-lg border border-border-subtle px-3 py-2 text-xs font-semibold text-text-main">
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
          <form onSubmit={submit} className="panel modal-surface w-full max-w-[54rem] p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">Reuniao</div>
                <h2 className="mt-1 text-xl font-semibold text-text-main">{selectedMeeting ? "Alterar reuniao" : "Nova reuniao"}</h2>
              </div>
              <button type="button" onClick={closeEditor} className="rounded-lg border border-border-subtle px-3 py-2 text-xs font-semibold text-text-main">Cancelar</button>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">Tipo</span>
                <select value={draft.meetingTypeId} onChange={(event) => setDraft((current) => ({ ...current, meetingTypeId: event.target.value }))} className="w-full rounded-lg border border-border-subtle bg-bg-base px-4 py-3 text-sm text-text-main outline-none">
                  {meetingTypes.map((type) => (
                    <option key={type.id} value={type.id}>{type.name}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">Estado</span>
                <select value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value as DraftState["status"] }))} className="w-full rounded-lg border border-border-subtle bg-bg-base px-4 py-3 text-sm text-text-main outline-none">
                  <option value="scheduled">Agendada</option>
                  <option value="completed">Concluida</option>
                  <option value="cancelled">Cancelada</option>
                </select>
              </label>
              <label className="block md:col-span-2">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">Nome</span>
                <input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} className="w-full rounded-lg border border-border-subtle bg-bg-base px-4 py-3 text-sm text-text-main outline-none" />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">Data e hora</span>
                <input type="datetime-local" value={draft.scheduledAt} onChange={(event) => setDraft((current) => ({ ...current, scheduledAt: event.target.value }))} className="w-full rounded-lg border border-border-subtle bg-bg-base px-4 py-3 text-sm text-text-main outline-none" />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">Duracao (min)</span>
                <input type="number" min={15} value={draft.durationMinutes} onChange={(event) => setDraft((current) => ({ ...current, durationMinutes: Number(event.target.value) || 60 }))} className="w-full rounded-lg border border-border-subtle bg-bg-base px-4 py-3 text-sm text-text-main outline-none" />
              </label>
              <label className="block md:col-span-2">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">Focus</span>
                <input value={draft.focus} onChange={(event) => setDraft((current) => ({ ...current, focus: event.target.value }))} className="w-full rounded-lg border border-border-subtle bg-bg-base px-4 py-3 text-sm text-text-main outline-none" />
              </label>
              <label className="block md:col-span-2">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">Outcome</span>
                <textarea rows={2} value={draft.outcome} onChange={(event) => setDraft((current) => ({ ...current, outcome: event.target.value }))} className="w-full rounded-lg border border-border-subtle bg-bg-base px-4 py-3 text-sm text-text-main outline-none" />
              </label>
              <label className="block md:col-span-2">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">Notas</span>
                <textarea rows={3} value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} className="w-full rounded-lg border border-border-subtle bg-bg-base px-4 py-3 text-sm text-text-main outline-none" />
              </label>
              <div>
                <div className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">Grupos</div>
                <div className="max-h-52 space-y-2 overflow-y-auto rounded-lg border border-border-subtle bg-bg-base p-3">
                  {groups.map((group) => (
                    <label key={group.id} className="flex items-center gap-3 text-sm text-text-main">
                      <input type="checkbox" checked={draft.groupIds.includes(group.id)} onChange={(event) => setDraft((current) => ({ ...current, groupIds: event.target.checked ? [...current.groupIds, group.id] : current.groupIds.filter((id) => id !== group.id) }))} />
                      <span>{group.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">Participantes</div>
                <div className="max-h-52 space-y-2 overflow-y-auto rounded-lg border border-border-subtle bg-bg-base p-3">
                  {users.map((user) => (
                    <label key={user.id} className="flex items-center gap-3 text-sm text-text-main">
                      <input type="checkbox" checked={draft.participantMembershipIds.includes(user.id)} onChange={(event) => setDraft((current) => ({ ...current, participantMembershipIds: event.target.checked ? [...current.participantMembershipIds, user.id] : current.participantMembershipIds.filter((id) => id !== user.id) }))} />
                      <span>{user.name}</span>
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
