import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Bot, LoaderCircle, SendHorizonal, Sparkles, User } from "lucide-react";
import { Layout } from "../components/Layout";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const starters = [
  "Resume o que o Kanobi pretende ser como produto.",
  "Que stack tecnologica esta por tras deste projeto?",
  "Sugere proximos passos para evoluir a app.",
];

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Sou o Kanobi. Posso ajudar-te a explorar ideias, resumir contexto do produto e preparar proximos passos.",
    },
  ]);
  const [prompt, setPrompt] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    viewportRef.current?.scrollTo({
      top: viewportRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const canSend = prompt.trim().length > 0 && !isSending;
  const emptyState = useMemo(
    () => messages.length === 1 && messages[0]?.id === "welcome",
    [messages]
  );

  const sendMessage = async (text: string) => {
    const content = text.trim();
    if (!content || isSending) return;

    const nextUserMessage: ChatMessage = {
      id: createId(),
      role: "user",
      content,
    };
    const assistantId = createId();
    const requestMessages = [...messages, nextUserMessage].map(({ role, content: body }) => ({
      role,
      content: body,
    }));

    setMessages((current) => [
      ...current,
      nextUserMessage,
      { id: assistantId, role: "assistant", content: "" },
    ]);
    setPrompt("");
    setError(null);
    setIsSending(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages: requestMessages }),
      });

      if (!response.ok || !response.body) {
        throw new Error("Nao foi possivel contactar o assistente.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        assistantText += decoder.decode(value, { stream: true });
        setMessages((current) =>
          current.map((message) =>
            message.id === assistantId
              ? { ...message, content: assistantText }
              : message
          )
        );
      }

      const finalChunk = decoder.decode();
      if (finalChunk) {
        assistantText += finalChunk;
        setMessages((current) =>
          current.map((message) =>
            message.id === assistantId
              ? { ...message, content: assistantText }
              : message
          )
        );
      }
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "Ocorreu um erro inesperado ao enviar a mensagem.";

      setError(message);
      setMessages((current) =>
        current.map((entry) =>
          entry.id === assistantId
            ? {
                ...entry,
                content:
                  "Nao consegui responder neste momento. Verifica se o backend esta a correr e se a chave do provider AI esta configurada.",
              }
            : entry
        )
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await sendMessage(prompt);
  };

  return (
    <Layout section="Chat">
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-6 h-full">
        <section className="min-h-0 flex flex-col bg-bg-surface rounded border border-border-subtle shadow-card overflow-hidden">
          <div className="px-8 py-6 border-b border-border-subtle">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-accent-neutral mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              Conversa
            </div>
            <h1 className="text-[28px] font-bold tracking-tight text-text-main mb-2">
              Fala com o Kanobi
            </h1>
            <p className="text-[14px] text-text-muted leading-relaxed max-w-2xl">
              Esta experiencia usa o endpoint local `/api/chat` para gerar respostas em streaming.
            </p>
          </div>

          <div ref={viewportRef} className="flex-1 overflow-y-auto px-8 py-6 space-y-5">
            {messages.map((message) => (
              <article
                key={message.id}
                className={`max-w-3xl ${
                  message.role === "user" ? "ml-auto" : ""
                }`}
              >
                <div
                  className={`rounded border px-5 py-4 ${
                    message.role === "user"
                      ? "bg-bg-inverse text-text-inverse border-border-strong"
                      : "bg-bg-base text-text-main border-border-subtle"
                  }`}
                >
                  <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] font-bold mb-3 opacity-70">
                    {message.role === "user" ? (
                      <User className="w-3.5 h-3.5" />
                    ) : (
                      <Bot className="w-3.5 h-3.5" />
                    )}
                    {message.role === "user" ? "Tu" : "Kanobi"}
                  </div>
                  <p className="text-[14px] leading-7 whitespace-pre-wrap">
                    {message.content || (isSending ? "A escrever..." : "")}
                  </p>
                </div>
              </article>
            ))}
          </div>

          <div className="border-t border-border-subtle px-6 py-5">
            <form onSubmit={handleSubmit} className="space-y-3">
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="Escreve a tua pergunta, pedido ou ideia..."
                className="w-full min-h-28 resize-none rounded border border-border-subtle bg-bg-base px-4 py-3 text-[14px] text-text-main outline-none transition-all focus:border-border-strong focus:ring-1 focus:ring-border-strong placeholder:text-text-muted"
              />
              <div className="flex items-center justify-between gap-4">
                <p className="text-[12px] text-text-muted">
                  {error ?? "Claude responde atraves do backend Hono local."}
                </p>
                <button
                  type="submit"
                  disabled={!canSend}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-bg-inverse text-text-inverse text-[13px] font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-85 transition-opacity"
                >
                  {isSending ? (
                    <LoaderCircle className="w-4 h-4 animate-spin" />
                  ) : (
                    <SendHorizonal className="w-4 h-4" />
                  )}
                  Enviar
                </button>
              </div>
            </form>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="bg-bg-surface rounded border border-border-subtle shadow-card p-6">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted mb-4">
              Arranque Rapido
            </h2>
            <div className="space-y-2">
              {starters.map((starter) => (
                <button
                  key={starter}
                  onClick={() => sendMessage(starter)}
                  disabled={isSending}
                  className="w-full text-left rounded border border-border-subtle bg-bg-base px-4 py-3 text-[13px] text-text-main hover:bg-bg-hover transition-colors disabled:opacity-50"
                >
                  {starter}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-bg-surface rounded border border-border-subtle shadow-card p-6">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted mb-4">
              Estado
            </h2>
            <ul className="space-y-3 text-[13px] text-text-main">
              <li className="flex items-start justify-between gap-4">
                <span>Streaming de resposta</span>
                <span className="text-text-muted">Ativo</span>
              </li>
              <li className="flex items-start justify-between gap-4">
                <span>Provider configurado</span>
                <span className="text-text-muted">Anthropic</span>
              </li>
              <li className="flex items-start justify-between gap-4">
                <span>Memoria persistente</span>
                <span className="text-text-muted">Ainda nao ligada</span>
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </Layout>
  );
}
