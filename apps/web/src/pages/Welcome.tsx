import { useState } from "react";

const features = [
  {
    icon: "🧠",
    title: "AI-Native",
    description: "Built from the ground up with LLM integrations and autonomous agents at its core.",
  },
  {
    icon: "⚡",
    title: "Cross-Platform",
    description: "One codebase delivering native-quality experiences on web, mobile (iOS/Android), and desktop.",
  },
  {
    icon: "🔒",
    title: "Local-First",
    description: "Your data stays on your device. SQLite-powered offline-first architecture with optional sync.",
  },
  {
    icon: "🛠️",
    title: "Developer Ready",
    description: "TypeScript end-to-end, Hono API, Drizzle ORM, and a clean monorepo structure.",
  },
];

const stack = [
  { label: "Web", tech: "React 18 + Vite + Tailwind" },
  { label: "Mobile", tech: "Expo (React Native)" },
  { label: "Desktop", tech: "Tauri 2" },
  { label: "Backend", tech: "Hono + Node.js" },
  { label: "Database", tech: "SQLite + Drizzle ORM" },
  { label: "AI", tech: "Vercel AI SDK + Claude" },
];

export default function Welcome() {
  const [apiStatus, setApiStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");

  const pingApi = async () => {
    setApiStatus("loading");
    try {
      const res = await fetch("/api/health");
      if (res.ok) setApiStatus("ok");
      else setApiStatus("error");
    } catch {
      setApiStatus("error");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-brand-950 text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center font-bold text-sm">
            K
          </div>
          <span className="font-semibold tracking-tight">kanobi</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-white/50">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          v0.1.0
        </div>
      </nav>

      {/* Hero */}
      <section className="flex flex-col items-center justify-center text-center px-6 py-28">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-brand-500/30 bg-brand-500/10 text-brand-300 text-xs font-medium mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-400" />
          Early Preview — v0.1.0
        </div>

        <h1 className="text-5xl sm:text-7xl font-bold tracking-tight mb-6 bg-gradient-to-br from-white via-white to-white/50 bg-clip-text text-transparent">
          Kanobi
        </h1>

        <p className="text-xl text-white/60 max-w-2xl mb-10 leading-relaxed">
          A modern, AI-native platform that runs everywhere — web, mobile, and desktop.
          Powered by LLMs, built for humans.
        </p>

        <div className="flex flex-wrap gap-4 justify-center">
          <button
            onClick={pingApi}
            className="px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 font-medium transition-colors"
          >
            {apiStatus === "loading" ? "Pinging..." : "Ping API"}
          </button>
          <a
            href="https://github.com/ruipereira/kanobi"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 rounded-xl border border-white/20 hover:border-white/40 font-medium transition-colors"
          >
            View on GitHub →
          </a>
        </div>

        {apiStatus === "ok" && (
          <p className="mt-4 text-emerald-400 text-sm">✓ Backend is running</p>
        )}
        {apiStatus === "error" && (
          <p className="mt-4 text-red-400 text-sm">✗ Backend not reachable — run pnpm dev:backend</p>
        )}
      </section>

      {/* Features */}
      <section className="px-6 pb-20">
        <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="p-6 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/8 transition-colors"
            >
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-semibold mb-1">{f.title}</h3>
              <p className="text-sm text-white/50 leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stack */}
      <section className="px-6 pb-28">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-center text-xs font-semibold uppercase tracking-widest text-white/30 mb-8">
            Technology Stack
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {stack.map((s) => (
              <div
                key={s.label}
                className="flex flex-col gap-1 px-4 py-3 rounded-xl border border-white/10 bg-white/5"
              >
                <span className="text-xs text-white/40 font-medium">{s.label}</span>
                <span className="text-sm font-medium">{s.tech}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 px-8 py-6 text-center text-white/30 text-xs">
        Kanobi © {new Date().getFullYear()} — Built with ♥ and TypeScript
      </footer>
    </div>
  );
}
