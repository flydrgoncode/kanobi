import { FormEvent, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Crown, KeyRound, Mail, Save, Search, Trash2 } from "lucide-react";
import { Layout } from "../components/Layout";
import { getIntegrations, saveIntegrations, type ApiEmailConfig } from "../lib/workspace-api";

type IntegrationTopic = "llm" | "email" | "god";

const emailFields: Array<{
  label: string;
  key: keyof Pick<
    ApiEmailConfig,
    "provider" | "fromName" | "fromEmail" | "replyToEmail" | "smtpHost" | "smtpPort" | "smtpUsername"
  >;
}> = [
  { label: "Provider", key: "provider" },
  { label: "From name", key: "fromName" },
  { label: "From email", key: "fromEmail" },
  { label: "Reply-to", key: "replyToEmail" },
  { label: "SMTP host", key: "smtpHost" },
  { label: "SMTP port", key: "smtpPort" },
  { label: "SMTP username", key: "smtpUsername" },
];

export default function Integrations() {
  const queryClient = useQueryClient();
  const [providers, setProviders] = useState<
    { provider: string; model: string; configured: boolean; keyPreview: string }[]
  >([]);
  const [email, setEmail] = useState({
    provider: "SMTP",
    fromName: "",
    fromEmail: "",
    replyToEmail: "",
    smtpHost: "",
    smtpPort: 0,
    smtpUsername: "",
  });
  const [saved, setSaved] = useState(false);
  const [topic, setTopic] = useState<IntegrationTopic>("llm");
  const [activeProvider, setActiveProvider] = useState<string>("OpenAI");
  const [providerSearch, setProviderSearch] = useState("");
  const [godProfile, setGodProfile] = useState({
    name: "",
    email: "",
    phone: "",
  });

  const { data, error } = useQuery({
    queryKey: ["mission-control-integrations-zero"],
    queryFn: getIntegrations,
    retry: false,
  });

  const mutation = useMutation({
    mutationFn: saveIntegrations,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["mission-control-integrations-zero"] }),
  });

  useEffect(() => {
    if (data) {
      const nextProviders = data.llmConfigs.map((config) => ({
        provider:
          config.provider === "openai"
            ? "OpenAI"
            : config.provider === "anthropic"
              ? "Claude"
              : "Llama",
        model: config.defaultModel ?? "",
        configured: Boolean(config.apiKeyCiphertext),
        keyPreview: config.apiKeyCiphertext ?? "",
      }));

      setProviders(nextProviders);
      setActiveProvider(nextProviders[0]?.provider ?? "OpenAI");
      setEmail({
        provider: data.emailConfig.provider.toUpperCase(),
        fromName: data.emailConfig.fromName,
        fromEmail: data.emailConfig.fromEmail,
        replyToEmail: data.emailConfig.replyToEmail ?? "",
        smtpHost: data.emailConfig.smtpHost ?? "",
        smtpPort: data.emailConfig.smtpPort ?? 0,
        smtpUsername: data.emailConfig.smtpUsername ?? "",
      });
      setGodProfile({
        name: data.godProfile.name,
        email: data.godProfile.email,
        phone: data.godProfile.phone ?? "",
      });
    }
  }, [data]);

  const visibleProviders = useMemo(() => {
    const term = providerSearch.trim().toLowerCase();
    return providers.filter((provider) =>
      term
        ? [provider.provider, provider.model, provider.keyPreview].some((value) =>
            value.toLowerCase().includes(term)
          )
        : true
    );
  }, [providerSearch, providers]);

  const selectedProvider =
    visibleProviders.find((provider) => provider.provider === activeProvider) ??
    visibleProviders[0] ??
    null;

  useEffect(() => {
    if (selectedProvider && selectedProvider.provider !== activeProvider) {
      setActiveProvider(selectedProvider.provider);
    }
  }, [activeProvider, selectedProvider]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    mutation.mutate({
      llmConfigs: providers.map((provider) => ({
        provider:
          provider.provider === "OpenAI"
            ? "openai"
            : provider.provider === "Claude"
              ? "anthropic"
              : "llama",
        defaultModel: provider.model,
        apiKeyCiphertext: provider.keyPreview,
        isEnabled: provider.configured,
      })),
      emailConfig: {
        provider: email.provider.toLowerCase() as "smtp" | "ses" | "resend" | "custom",
        fromName: email.fromName,
        fromEmail: email.fromEmail,
        replyToEmail: email.replyToEmail,
        smtpHost: email.smtpHost,
        smtpPort: Number(email.smtpPort) || null,
        smtpUsername: email.smtpUsername,
        smtpPasswordCiphertext: null,
        isEnabled: Boolean(email.fromEmail),
      },
      godProfile,
    });
    setSaved(true);
  };

  const updateProvider = (
    providerName: string,
    changes: Partial<(typeof providers)[number]>
  ) => {
    setProviders((current) =>
      current.map((provider) =>
        provider.provider === providerName ? { ...provider, ...changes } : provider
      )
    );
  };

  return (
    <Layout section="Platform" sectionLabel="Mission Control">
      <div className="space-y-6">
        {error ? (
          <section className="panel p-6">
            <p className="text-sm text-red-600 dark:text-red-300">
              {error instanceof Error ? error.message : "Nao foi possivel ler integracoes do Postgres."}
            </p>
          </section>
        ) : null}

        <section className="panel p-8">
          <div className="context-chip mb-4 inline-flex">Platform</div>
          <h1 className="text-3xl font-semibold tracking-tight text-text-main">
            Configurar platform da empresa Zero
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-text-muted">
            Este menu representa sempre a empresa Zero, a empresa do Mission Control.
            O tab God continua global.
          </p>
        </section>

        <form onSubmit={submit} className="panel overflow-hidden">
          <div className="border-b border-border-subtle px-8 py-6">
            <div className="flex flex-wrap items-center gap-2">
              {[
                { id: "llm", label: "LLMs", icon: KeyRound },
                { id: "email", label: "Email", icon: Mail },
                { id: "god", label: "God", icon: Crown },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTopic(id as IntegrationTopic)}
                  className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors ${
                    topic === id
                      ? "border-[var(--context-accent)] bg-[var(--context-soft)] text-[var(--context-accent)]"
                      : "border-border-subtle text-text-main hover:bg-bg-hover"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {topic === "llm" ? (
            <div className="grid gap-0 xl:grid-cols-[320px_1fr]">
              <aside className="border-r border-border-subtle px-8 py-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-sm font-semibold text-text-main">Providers LLM</h2>
                    <p className="mt-1 text-sm text-text-muted">
                      Pesquisa e abre só o provider que queres editar.
                    </p>
                  </div>
                </div>

                <div className="relative mt-5">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                  <input
                    value={providerSearch}
                    onChange={(event) => setProviderSearch(event.target.value)}
                    placeholder="Procurar provider ou modelo..."
                    className="w-full rounded-lg border border-border-subtle bg-bg-base py-2.5 pl-10 pr-4 text-sm text-text-main outline-none transition-all focus:border-border-strong focus:ring-1 focus:ring-border-strong"
                  />
                </div>

                <div className="mt-5 space-y-2">
                  {visibleProviders.map((provider) => (
                    <button
                      key={provider.provider}
                      type="button"
                      onClick={() => setActiveProvider(provider.provider)}
                      className={`grid w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors xl:grid-cols-[minmax(0,1fr)_auto] ${
                        selectedProvider?.provider === provider.provider
                          ? "border-[var(--context-accent)] bg-[var(--context-soft)]"
                          : "border-border-subtle hover:bg-bg-hover"
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-text-main">{provider.provider}</div>
                        <div className="truncate text-xs text-text-muted">
                          {provider.model || "Sem modelo"}
                        </div>
                      </div>
                      <span
                        className={`justify-self-end whitespace-nowrap rounded-lg px-2.5 py-1 text-[11px] font-semibold ${
                          provider.configured
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-300"
                        }`}
                      >
                        {provider.configured ? "On" : "Off"}
                      </span>
                    </button>
                  ))}
                </div>
              </aside>

              <section className="px-8 py-6">
                {selectedProvider ? (
                  <div className="space-y-6">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <h2 className="text-xl font-semibold text-text-main">
                          {selectedProvider.provider}
                        </h2>
                        <p className="mt-1 text-sm text-text-muted">
                          Edita a chave e o modelo por defeito deste provider da empresa Zero.
                        </p>
                      </div>
                      <label className="inline-flex items-center gap-2 rounded-lg border border-border-subtle px-3 py-2 text-xs font-semibold text-text-main">
                        <span>{selectedProvider.configured ? "On" : "Off"}</span>
                        <button
                          type="button"
                          onClick={() =>
                            updateProvider(selectedProvider.provider, {
                              configured: !selectedProvider.configured,
                            })
                          }
                          className={`relative h-6 w-11 rounded-full transition-colors ${
                            selectedProvider.configured
                              ? "bg-emerald-500/80"
                              : "bg-slate-300 dark:bg-slate-700"
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                              selectedProvider.configured ? "translate-x-5" : "translate-x-0.5"
                            }`}
                          />
                        </button>
                      </label>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="block">
                        <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                          Chave
                        </span>
                        <input
                          value={selectedProvider.keyPreview}
                          onChange={(event) =>
                            updateProvider(selectedProvider.provider, {
                              keyPreview: event.target.value,
                              configured: event.target.value.trim().length > 0,
                            })
                          }
                          className="w-full rounded-lg border border-border-subtle bg-bg-base px-4 py-3 text-sm text-text-main outline-none transition-all focus:border-border-strong focus:ring-1 focus:ring-border-strong"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                          Modelo
                        </span>
                        <input
                          value={selectedProvider.model}
                          onChange={(event) =>
                            updateProvider(selectedProvider.provider, {
                              model: event.target.value,
                            })
                          }
                          className="w-full rounded-lg border border-border-subtle bg-bg-base px-4 py-3 text-sm text-text-main outline-none transition-all focus:border-border-strong focus:ring-1 focus:ring-border-strong"
                        />
                      </label>
                    </div>

                    <div className="flex min-w-0 flex-nowrap justify-end overflow-x-auto">
                      <button
                        disabled
                        type="button"
                        className="inline-flex items-center gap-2 rounded-lg border border-border-subtle px-3 py-2 text-xs font-semibold text-text-main opacity-40"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Apagar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-text-muted">
                    Nenhum provider corresponde ao filtro atual.
                  </div>
                )}
              </section>
            </div>
          ) : topic === "email" ? (
            <section className="px-8 py-6">
              <div className="max-w-3xl space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-text-main">Email setup</h2>
                  <p className="mt-1 text-sm text-text-muted">
                    Configura o canal de envio usado pela empresa Zero.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {emailFields.map(({ label, key }) => (
                    <label key={key} className="block">
                      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                        {label}
                      </span>
                      <input
                        value={String(email[key] ?? "")}
                        onChange={(event) =>
                          setEmail((current) => ({
                            ...current,
                            [key]:
                              key === "smtpPort"
                                ? Number(event.target.value)
                                : event.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-border-subtle bg-bg-base px-4 py-3 text-sm text-text-main outline-none transition-all focus:border-border-strong focus:ring-1 focus:ring-border-strong"
                      />
                    </label>
                  ))}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4">
                  <label className="inline-flex items-center gap-2 rounded-lg border border-border-subtle px-3 py-2 text-xs font-semibold text-text-main">
                    <span>{email.fromEmail ? "On" : "Off"}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setEmail((current) => ({
                          ...current,
                          fromEmail: current.fromEmail ? "" : data?.emailConfig.fromEmail ?? "",
                        }))
                      }
                      className={`relative h-6 w-11 rounded-full transition-colors ${
                        email.fromEmail ? "bg-emerald-500/80" : "bg-slate-300 dark:bg-slate-700"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                          email.fromEmail ? "translate-x-5" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </label>

                  <button
                    disabled
                    type="button"
                    className="inline-flex items-center gap-2 rounded-lg border border-border-subtle px-3 py-2 text-xs font-semibold text-text-main opacity-40"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Apagar
                  </button>
                </div>
              </div>
            </section>
          ) : (
            <section className="px-8 py-6">
              <div className="max-w-2xl space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-text-main">God</h2>
                  <p className="mt-1 text-sm text-text-muted">
                    Dados do operador global do Mission Control. Este utilizador não
                    pertence a nenhum workspace e faz impersonation do superuser ao entrar.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                      Nome
                    </span>
                    <input
                      value={godProfile.name}
                      onChange={(event) =>
                        setGodProfile((current) => ({ ...current, name: event.target.value }))
                      }
                      className="w-full rounded-lg border border-border-subtle bg-bg-base px-4 py-3 text-sm text-text-main outline-none transition-all focus:border-border-strong focus:ring-1 focus:ring-border-strong"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                      Email
                    </span>
                    <input
                      value={godProfile.email}
                      onChange={(event) =>
                        setGodProfile((current) => ({ ...current, email: event.target.value }))
                      }
                      className="w-full rounded-lg border border-border-subtle bg-bg-base px-4 py-3 text-sm text-text-main outline-none transition-all focus:border-border-strong focus:ring-1 focus:ring-border-strong"
                    />
                  </label>
                  <label className="block md:col-span-2">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                      Telefone
                    </span>
                    <input
                      value={godProfile.phone}
                      onChange={(event) =>
                        setGodProfile((current) => ({ ...current, phone: event.target.value }))
                      }
                      className="w-full rounded-lg border border-border-subtle bg-bg-base px-4 py-3 text-sm text-text-main outline-none transition-all focus:border-border-strong focus:ring-1 focus:ring-border-strong"
                    />
                  </label>
                </div>
              </div>
            </section>
          )}

          <div className="border-t border-border-subtle px-8 py-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="text-sm text-text-muted">
                {saved
                  ? "Configuracoes atualizadas nesta sessao."
                  : "Os dados apresentados sao sempre lidos diretamente do Postgres."}
              </p>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-lg bg-bg-inverse px-4 py-3 text-sm font-semibold text-text-inverse transition-opacity hover:opacity-85"
              >
                <Save className="h-4 w-4" />
                Gravar
              </button>
            </div>
            {mutation.isPending ? (
              <p className="mt-2 text-sm text-text-muted">A gravar integracoes no Postgres...</p>
            ) : null}
          </div>
        </form>
      </div>
    </Layout>
  );
}
