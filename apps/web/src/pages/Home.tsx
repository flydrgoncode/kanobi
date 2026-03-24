import { motion } from "motion/react";
import { ArrowUpRight, MessageSquare, Zap, ShieldCheck, Code2 } from "lucide-react";
import { Layout } from "../components/Layout";
import { useQuery } from "@tanstack/react-query";

const features = [
  {
    icon: Zap,
    label: "AI-Native",
    desc: "LLMs e agentes autónomos integrados de raiz.",
  },
  {
    icon: MessageSquare,
    label: "Chat",
    desc: "Conversa com Claude diretamente na app.",
  },
  {
    icon: ShieldCheck,
    label: "Local-First",
    desc: "Os dados ficam no teu dispositivo com SQLite.",
  },
  {
    icon: Code2,
    label: "Open Platform",
    desc: "API aberta, TypeScript end-to-end, monorepo limpo.",
  },
];

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      className={`inline-block w-2 h-2 ${
        ok ? "bg-accent-positive" : "bg-accent-negative"
      }`}
    />
  );
}

export default function Home() {
  const { data, isSuccess } = useQuery({
    queryKey: ["health"],
    queryFn: () => fetch("/api/health").then((r) => r.json()),
    retry: false,
  });

  return (
    <Layout section="Home">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="bg-bg-surface rounded p-10 border border-border-subtle shadow-card mb-8"
      >
        <div className="text-[11px] font-bold text-accent-neutral tracking-[0.15em] uppercase mb-4">
          Early Preview · v0.1.0
        </div>
        <h1 className="text-[42px] font-bold text-text-main tracking-tight leading-none mb-4">
          Kanobi
        </h1>
        <p className="text-[15px] text-text-muted leading-relaxed max-w-xl mb-8">
          Uma plataforma moderna, AI-native, que corre em todo o lado —
          web, mobile e desktop. Construída com LLMs, feita para humanos.
        </p>

        <div className="flex items-center gap-3">
          <a
            href="/chat"
            className="flex items-center gap-2 px-5 py-2.5 bg-bg-inverse text-text-inverse text-[13px] font-semibold hover:opacity-80 transition-opacity"
          >
            Abrir Chat <ArrowUpRight className="w-3.5 h-3.5" />
          </a>
          <a
            href="https://github.com/flydrgoncode/kanobi"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-5 py-2.5 bg-bg-hover hover:bg-bg-active text-text-main text-[13px] font-semibold transition-colors border border-border-subtle"
          >
            GitHub →
          </a>
        </div>
      </motion.div>

      {/* Feature cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {features.map((f, i) => (
          <motion.div
            key={f.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: i * 0.05,
              type: "spring",
              stiffness: 400,
              damping: 30,
            }}
            className="bg-bg-surface rounded p-6 border border-border-subtle shadow-card hover:shadow-card-hover transition-shadow duration-500 flex flex-col gap-4"
          >
            <div className="w-9 h-9 bg-bg-hover flex items-center justify-center">
              <f.icon className="w-[18px] h-[18px] text-text-main" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="text-[13px] font-semibold text-text-main mb-1">
                {f.label}
              </h3>
              <p className="text-[12px] text-text-muted leading-relaxed">
                {f.desc}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* System status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, type: "spring", stiffness: 400, damping: 30 }}
        className="bg-bg-surface rounded p-8 border border-border-subtle shadow-card"
      >
        <h2 className="text-[11px] font-semibold text-text-muted uppercase tracking-[0.06em] mb-6">
          Estado do Sistema
        </h2>
        <div className="space-y-4">
          {[
            { label: "Web App", ok: true },
            { label: "Backend API", ok: isSuccess && data?.status === "ok" },
            { label: "Base de dados (SQLite)", ok: isSuccess && data?.status === "ok" },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between">
              <span className="text-[13px] text-text-main font-medium">
                {item.label}
              </span>
              <div className="flex items-center gap-2">
                <StatusDot ok={item.ok} />
                <span className="text-[12px] text-text-muted">
                  {item.ok ? "Operacional" : "Indisponível"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </Layout>
  );
}
