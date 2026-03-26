import { useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Ban,
  BarChart3,
  Building2,
  ChevronDown,
  ChevronRight,
  DatabaseZap,
  KeySquare,
  LifeBuoy,
  LogOut,
  Orbit,
  RadioTower,
  Shield,
  Target,
  TriangleAlert,
  UserCog,
  Users,
} from "lucide-react";
import type { ShellContext, WorkspaceRole } from "./Layout";

type SidebarProps = {
  context: ShellContext;
  role: WorkspaceRole;
};

type LeafItem = {
  to: string;
  icon: any;
  label: string;
};

type GroupItem = {
  label: string;
  icon: any;
  children: LeafItem[];
  roles?: WorkspaceRole[];
};

type NavItem = LeafItem | GroupItem;

const WORKSPACE_VERSION = "v0.1.0";

const workspaceSections: Array<{ title: string; items: NavItem[] }> = [
  {
    title: "Mission Control",
    items: [
      { to: "/workspace/users", icon: Users, label: "Users" },
      { to: "/workspace/requests", icon: UserCog, label: "Convites" },
      { to: "/workspace/companies", icon: Building2, label: "Companies" },
      { to: "/workspace/permissions", icon: KeySquare, label: "Permissions" },
      {
        label: "Funcional",
        icon: RadioTower,
        children: [{ to: "/workspace/functional/meeting-types", icon: RadioTower, label: "Cadencia" }],
      },
      {
        label: "Zero Setup",
        icon: RadioTower,
        children: [
          { to: "/workspace/integrations", icon: RadioTower, label: "Platform" },
          { to: "/workspace/seed-data", icon: DatabaseZap, label: "Seed Data" },
          { to: "/workspace/danger-zone", icon: TriangleAlert, label: "Danger Zone" },
        ],
      },
    ],
  },
];

const missionControlSections = [
  {
    title: "Mission Control",
    items: [{ to: "/mission-control", icon: Orbit, label: "Global Overview" }],
  },
];

const coworkSections: Array<{ title: string; items: NavItem[] }> = [
  {
    title: "Cowork",
    items: [
      { to: "/cowork/overview", icon: BarChart3, label: "Overview" },
      { to: "/cowork/metrics", icon: BarChart3, label: "Metricas" },
      { to: "/cowork/methods", icon: Target, label: "Metodos" },
      {
        label: "Support",
        icon: LifeBuoy,
        roles: ["support", "superuser", "god"],
        children: [
          { to: "/cowork/support/strategy", icon: Ban, label: "Strategy" },
          { to: "/cowork/support/groups", icon: Users, label: "Grupos" },
          { to: "/cowork/support/users", icon: UserCog, label: "Utilizadores" },
          { to: "/cowork/support/meetings", icon: RadioTower, label: "Reunioes" },
        ],
      },
    ],
  },
];

function isGroupItem(item: NavItem): item is GroupItem {
  return "children" in item;
}

export function Sidebar({ context, role }: SidebarProps) {
  const location = useLocation();
  const sections =
    context === "mission-control"
      ? missionControlSections
      : context === "cowork"
        ? coworkSections
        : workspaceSections;

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const isGroupExpanded = (item: GroupItem) => {
    const hasActiveChild = item.children.some((child) =>
      location.pathname.startsWith(child.to.split("?")[0] ?? child.to)
    );
    return openGroups[item.label] ?? hasActiveChild;
  };

  const toggleGroup = (label: string) => {
    setOpenGroups((current) => ({ ...current, [label]: !(current[label] ?? false) }));
  };

  return (
    <aside className="sidebar-shell flex h-screen w-[292px] shrink-0 flex-col">
      <div className="px-7 pb-6 pt-7">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-[1.1rem] border border-white/10 bg-white/10 text-sm font-semibold text-white">
            {context === "mission-control" ? "MC" : context === "cowork" ? "CW" : "K"}
          </div>
          <div>
            <div className="text-sm font-semibold tracking-tight text-white">
              {context === "mission-control"
                ? "Mission Control"
                : context === "cowork"
                  ? "Cowork"
                  : "kanobi"}
            </div>
            <div className="text-xs text-white/55">
              {context === "mission-control"
                ? "Global platform console"
                : context === "cowork"
                  ? "Company workspace"
                  : "Mission Control"}
            </div>
            {context === "workspace" ? (
              <div className="mt-2 inline-flex rounded-full border border-white/12 bg-white/8 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/75">
                {WORKSPACE_VERSION}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 pb-6 pt-6">
        {sections.map((section) => (
          <div key={section.title} className="mb-6">
            <div className="px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/35">
              {section.title}
            </div>
            <div className="mt-3 space-y-1.5">
              {section.items
                .filter((item) => !isGroupItem(item) || !item.roles || item.roles.includes(role))
                .map((item) =>
                  isGroupItem(item) ? (
                    <div key={item.label} className="space-y-1.5">
                      <button
                        type="button"
                        onClick={() => toggleGroup(item.label)}
                        className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm transition-all ${
                          isGroupExpanded(item)
                            ? "bg-white/10 text-white"
                            : "text-white/65 hover:bg-white/7 hover:text-white"
                        }`}
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <item.icon className="h-[18px] w-[18px]" strokeWidth={1.65} />
                          <span className="font-medium">{item.label}</span>
                        </div>
                        {isGroupExpanded(item) ? (
                          <ChevronDown className="h-4 w-4 text-white/70" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-white/55" />
                        )}
                      </button>

                      {isGroupExpanded(item) ? (
                        <div className="ml-4 space-y-1.5 pl-3">
                          {item.children.map(({ to, icon: Icon, label }) => (
                            <NavLink
                              key={to}
                              to={to}
                              end={to === "/" || to === "/mission-control"}
                              className={({ isActive }) =>
                                `group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition-all ${
                                  isActive
                                    ? "bg-white text-slate-950 shadow-lg shadow-black/10"
                                    : "text-white/65 hover:bg-white/7 hover:text-white"
                                }`
                              }
                            >
                              {({ isActive }) => (
                                <>
                                  <Icon
                                    className={`h-[18px] w-[18px] ${
                                      isActive ? "text-slate-950" : "text-white/60"
                                    }`}
                                    strokeWidth={isActive ? 2 : 1.65}
                                  />
                                  <span className="font-medium">{label}</span>
                                </>
                              )}
                            </NavLink>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === "/" || item.to === "/mission-control"}
                      className={({ isActive }) =>
                        `group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition-all ${
                          isActive
                            ? "bg-white text-slate-950 shadow-lg shadow-black/10"
                            : "text-white/65 hover:bg-white/7 hover:text-white"
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <item.icon
                            className={`h-[18px] w-[18px] ${
                              isActive ? "text-slate-950" : "text-white/60"
                            }`}
                            strokeWidth={isActive ? 2 : 1.65}
                          />
                          <span className="font-medium">{item.label}</span>
                        </>
                      )}
                    </NavLink>
                  )
                )}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 p-4">
        <button className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm text-white/65 transition-colors hover:bg-white/7 hover:text-white">
          <LogOut className="h-[18px] w-[18px]" strokeWidth={1.65} />
          <span className="font-medium">Terminar sessao</span>
        </button>
      </div>
    </aside>
  );
}
