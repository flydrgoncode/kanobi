import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  MessageSquare,
  Settings,
  LogOut,
} from "lucide-react";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Home" },
  { to: "/chat", icon: MessageSquare, label: "Chat" },
  { to: "/settings", icon: Settings, label: "Configuração" },
];

export function Sidebar() {
  return (
    <aside className="w-64 bg-bg-base flex flex-col h-screen shrink-0 border-r border-border-subtle">
      {/* Logo */}
      <div className="p-8 flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-bg-inverse flex items-center justify-center shrink-0 ring-1 ring-border-subtle">
          <span className="text-[13px] font-semibold text-text-inverse">K</span>
        </div>
        <span className="font-semibold text-text-main tracking-tight text-[15px]">
          kanobi
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl transition-all duration-200 ${
                isActive
                  ? "bg-bg-surface shadow-card text-text-main font-medium border border-border-subtle"
                  : "text-text-light hover:text-text-main hover:bg-bg-hover border border-transparent"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  className="w-[18px] h-[18px]"
                  strokeWidth={isActive ? 2 : 1.5}
                />
                <span className="text-[13px]">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-6">
        <div className="px-4 mb-6">
          <div className="h-px w-8 bg-gradient-to-r from-brand-400 to-brand-600 mb-3 rounded-full opacity-50" />
          <p className="text-[11px] font-bold tracking-widest uppercase text-text-main mb-1">
            Kanobi
          </p>
          <p className="text-[12px] text-text-muted italic leading-relaxed">
            AI-native. Built for humans.
          </p>
        </div>
        <button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl hover:bg-bg-hover transition-colors text-text-light hover:text-text-main border border-transparent">
          <LogOut className="w-[18px] h-[18px]" strokeWidth={1.5} />
          <span className="text-[13px] font-medium">Terminar Sessão</span>
        </button>
      </div>
    </aside>
  );
}
