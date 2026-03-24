import { Bell, Moon, Sun, Search, ChevronRight } from "lucide-react";
import { useTheme } from "../context/theme";

type HeaderProps = {
  section: string;
};

export function Header({ section }: HeaderProps) {
  const { theme, toggle } = useTheme();

  return (
    <header className="h-20 flex items-center justify-between px-10 sticky top-0 z-10 bg-bg-base/80 backdrop-blur-2xl border-b border-border-subtle">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[13px] text-text-light font-medium">
        <span className="hover:text-text-main cursor-pointer transition-colors">
          Kanobi
        </span>
        <ChevronRight className="w-3.5 h-3.5 opacity-40" />
        <span className="text-text-main">{section}</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-6">
        {/* Search */}
        <div className="relative group">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-text-main transition-colors" />
          <input
            type="text"
            placeholder="Search..."
            className="pl-10 pr-4 py-2 bg-bg-hover hover:bg-bg-active border border-transparent rounded-full text-[13px] focus:bg-bg-surface focus:ring-1 focus:ring-border-strong transition-all w-56 outline-none placeholder:text-text-muted text-text-main"
          />
        </div>

        {/* Dark mode */}
        <button
          onClick={toggle}
          className="text-text-muted hover:text-text-main transition-colors"
        >
          {theme === "dark" ? (
            <Sun className="w-[20px] h-[20px]" strokeWidth={1.5} />
          ) : (
            <Moon className="w-[20px] h-[20px]" strokeWidth={1.5} />
          )}
        </button>

        {/* Notifications */}
        <button className="relative text-text-muted hover:text-text-main transition-colors">
          <Bell className="w-[20px] h-[20px]" strokeWidth={1.5} />
          <span className="absolute top-0 right-0 w-2 h-2 bg-accent-negative rounded-full border-2 border-bg-base" />
        </button>

        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-bg-inverse flex items-center justify-center border border-border-subtle shadow-sm">
          <span className="text-[12px] font-semibold text-text-inverse">R</span>
        </div>
      </div>
    </header>
  );
}
