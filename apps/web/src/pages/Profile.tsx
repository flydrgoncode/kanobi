import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Camera, Save } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { Layout } from "../components/Layout";
import { getCurrentUser, saveCurrentUser } from "../lib/workspace-api";

type ProfileDraft = {
  name: string;
  email: string;
  jobTitle: string;
  phone: string;
  avatarUrl: string;
};

const profileFieldPairs: Array<{
  label: string;
  key: keyof Omit<ProfileDraft, "avatarUrl">;
}> = [
  { label: "Nome", key: "name" },
  { label: "Funcao", key: "jobTitle" },
  { label: "Email", key: "email" },
  { label: "Telefone", key: "phone" },
];

export default function Profile() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const returnState = location.state as
    | { returnTo?: string; useTenantContext?: boolean }
    | null;
  const returnTo = returnState?.returnTo ?? "/";
  const [draft, setDraft] = useState<ProfileDraft>({
    name: "",
    email: "",
    jobTitle: "",
    phone: "",
    avatarUrl: "",
  });

  const { data, error } = useQuery({
    queryKey: ["current-user-profile"],
    queryFn: () => getCurrentUser(),
    retry: false,
  });

  const mutation = useMutation({
    mutationFn: (payload: Parameters<typeof saveCurrentUser>[0]) => saveCurrentUser(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["current-user"] });
      queryClient.invalidateQueries({ queryKey: ["current-user-profile"] });
    },
  });

  useEffect(() => {
    const source = data?.user;
    if (!source) return;

    setDraft({
      name: source.name,
      email: source.email,
      jobTitle: source.jobTitle ?? "",
      phone: source.phone ?? "",
      avatarUrl: source.avatarUrl ?? "",
    });
  }, [data]);

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

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    mutation.mutate(draft, {
      onSuccess: () => navigate(returnTo),
    });
  };

  return (
    <Layout section="Perfil" sectionLabel="Conta">
      <div className="space-y-6">
        {error ? (
          <section className="panel p-6">
            <p className="text-sm text-red-600 dark:text-red-300">
              {error instanceof Error
                ? error.message
                : "Nao foi possivel ler os detalhes do utilizador."}
            </p>
          </section>
        ) : null}

        <section className="panel p-8">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-2xl">
              <div className="context-chip mb-4 inline-flex">Perfil do utilizador</div>
              <h1 className="text-3xl font-semibold tracking-tight text-text-main">
                Atualizar detalhes pessoais
              </h1>
              <p className="mt-3 text-sm leading-6 text-text-muted">
                Altera a tua fotografia, nome, funcao, email e telefone. Ao gravar,
                regressas automaticamente para a pagina anterior.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate(returnTo)}
              className="inline-flex items-center gap-2 rounded-lg border border-border-subtle px-4 py-3 text-sm font-semibold text-text-main transition-colors hover:bg-bg-hover"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </button>
          </div>
        </section>

        <form onSubmit={submit} className="grid gap-6 xl:grid-cols-[0.75fr_1.25fr]">
          <aside className="panel p-8">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-xl border border-border-subtle bg-bg-surface">
                {draft.avatarUrl ? (
                  <img
                    src={draft.avatarUrl}
                    alt={draft.name}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <span className="text-3xl font-semibold text-text-main">
                    {draft.name
                      .split(" ")
                      .slice(0, 2)
                      .map((part) => part[0] ?? "")
                      .join("")
                      .toUpperCase()}
                  </span>
                )}
              </div>
              <label className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border-subtle px-4 py-3 text-sm font-semibold text-text-main transition-colors hover:bg-bg-hover">
                <Camera className="h-4 w-4" />
                Carregar foto
                <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
              </label>
            </div>
          </aside>

          <section className="panel p-8">
            <div className="grid gap-4 md:grid-cols-2">
              {profileFieldPairs.map(({ label, key }) => (
                <label key={key} className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                    {label}
                  </span>
                  <input
                    value={draft[key]}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        [key]: event.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-border-subtle bg-bg-base px-4 py-3 text-sm text-text-main outline-none transition-all focus:border-border-strong focus:ring-1 focus:ring-border-strong"
                  />
                </label>
              ))}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-lg bg-bg-inverse px-4 py-3 text-sm font-semibold text-text-inverse transition-opacity hover:opacity-85"
              >
                <Save className="h-4 w-4" />
                Gravar alteracoes
              </button>
            </div>
            {mutation.isPending ? (
              <p className="mt-3 text-sm text-text-muted">A gravar perfil no Postgres...</p>
            ) : null}
          </section>
        </form>
      </div>
    </Layout>
  );
}
