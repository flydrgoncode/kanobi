import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bell, ChevronRight, Moon, Search, Sun, UserRound } from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "../context/theme";
import { useTenantSelection } from "../context/tenant-selection";
import { getCompanyCatalog, getCurrentUser } from "../lib/workspace-api";
import type { ShellContext, WorkspaceRole } from "./Layout";

type HeaderProps = {
  section: string;
  sectionLabel?: string;
  context: ShellContext;
  role: WorkspaceRole;
};

export function Header({ section, sectionLabel, context }: HeaderProps) {
  const { theme, toggle } = useTheme();
  const { selectedTenantId, selectedTenantName, activateTenant, activateGodMode } = useTenantSelection();
  const navigate = useNavigate();
  const location = useLocation();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [isCompanyPickerOpen, setIsCompanyPickerOpen] = useState(false);
  const showMissionControlControls = sectionLabel === "Mission Control";

  const { data } = useQuery({
    queryKey: [
      "current-user",
      context === "workspace" || context === "cowork" ? selectedTenantId : "mission-control",
    ],
    queryFn: () => getCurrentUser(),
    retry: false,
  });

  const { data: companiesData } = useQuery({
    queryKey: ["mission-control-company-selector"],
    queryFn: () => getCompanyCatalog(),
    retry: false,
  });

  const currentUser = data?.user ?? null;
  const companies = companiesData?.companies ?? [];
  const selectedCompany = companies.find((company) => company.id === selectedTenantId) ?? null;
  const companyMatches = useMemo(() => {
    const term = searchValue.trim().toLowerCase();
    if (!term) return companies.slice(0, 8);

    return companies
      .filter((company) =>
        [company.displayName, company.legalName, company.taxId]
          .some((value) => value.toLowerCase().includes(term))
      )
      .slice(0, 8);
  }, [companies, searchValue]);

  const avatarLabel =
    currentUser?.name
      ?.split(" ")
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || (context === "mission-control" ? "G" : "K");
  const rootLabel =
    context === "cowork" ? "Cowork" : context === "mission-control" ? "Mission Control" : "Mission Control";
  const rootPath =
    context === "mission-control"
      ? "/mission-control"
      : context === "cowork"
        ? "/cowork/overview"
        : "/";

  return (
    <header className="sticky top-0 z-10 border-b border-border-subtle bg-bg-base/82 backdrop-blur-2xl">
      <div className="flex min-h-20 items-center justify-between gap-6 px-6 sm:px-8 lg:px-10">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[13px] font-medium text-text-light">
            <NavLink
              to={rootPath}
              className="transition-colors hover:text-text-main"
            >
              {rootLabel}
            </NavLink>
            <ChevronRight className="h-3.5 w-3.5 opacity-40" />
            <span className="truncate text-text-main">{section}</span>
          </div>
          {selectedTenantId && selectedTenantName ? (
            <div className="mt-2 inline-flex max-w-full items-center gap-2 rounded-lg border border-[var(--context-accent)] bg-[var(--context-soft)] px-3 py-2 text-sm font-semibold text-[var(--context-accent)]">
              <span className="text-text-muted">Empresa</span>
              <span className="truncate text-text-main">{selectedTenantName}</span>
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-4">
          <div className="relative hidden lg:block">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              onFocus={() => {
                if (showMissionControlControls) {
                  setIsCompanyPickerOpen(true);
                }
              }}
              placeholder={
                showMissionControlControls
                  ? "Pesquisar empresa por nome ou NIF..."
                  : context === "mission-control"
                    ? "Procurar tenant, NIF ou evento..."
                    : "Procurar users, convites ou companies..."
              }
              className="w-72 rounded-full border border-border-subtle bg-bg-surface py-2.5 pl-11 pr-4 text-sm text-text-main outline-none transition-all focus:border-border-strong focus:ring-1 focus:ring-border-strong"
            />

            {showMissionControlControls && isCompanyPickerOpen ? (
              <div className="modal-surface absolute left-0 right-0 top-14 z-20 overflow-hidden rounded-2xl border border-border-subtle shadow-2xl">
                <div className="max-h-80 overflow-y-auto py-2">
                  {companyMatches.length ? (
                    companyMatches.map((company) => (
                      <button
                        key={company.id}
                        type="button"
                        onClick={async () => {
                          await activateTenant({ id: company.id, name: company.displayName });
                          setSearchValue(company.displayName);
                          setIsCompanyPickerOpen(false);
                        }}
                        className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors hover:bg-bg-hover"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-text-main">
                            {company.displayName}
                          </div>
                          <div className="truncate text-xs text-text-muted">
                            {company.taxId} · {company.countryCode || "Sem pais"}
                          </div>
                        </div>
                        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted">
                          Escolher
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-4 text-sm text-text-muted">
                      Nenhuma empresa encontrada.
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>

          {showMissionControlControls ? (
            <div className="hidden items-center gap-2 lg:flex">
              {selectedCompany ? (
                <div className="inline-flex items-center gap-2 rounded-lg border border-border-subtle bg-bg-surface px-3 py-2 text-xs font-semibold text-text-main">
                  <span className="text-text-muted">Empresa</span>
                  <span className="max-w-[180px] truncate">{selectedCompany.displayName}</span>
                </div>
              ) : null}

              <button
                type="button"
                onClick={async () => {
                  await activateGodMode();
                  setIsCompanyPickerOpen(false);
                  setSearchValue("");
                }}
                className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                  selectedTenantId
                    ? "border border-border-subtle bg-bg-surface text-text-main hover:bg-bg-hover"
                    : "border border-[var(--context-accent)] bg-[var(--context-soft)] text-[var(--context-accent)]"
                }`}
              >
                Modo GOD
              </button>
            </div>
          ) : null}

          <button
            onClick={toggle}
            className="text-text-muted transition-colors hover:text-text-main"
          >
            {theme === "dark" ? (
              <Sun className="h-5 w-5" strokeWidth={1.5} />
            ) : (
              <Moon className="h-5 w-5" strokeWidth={1.5} />
            )}
          </button>

          <button className="relative text-text-muted transition-colors hover:text-text-main">
            <Bell className="h-5 w-5" strokeWidth={1.5} />
            <span className="absolute right-0 top-0 h-2 w-2 rounded-full bg-[var(--context-accent)] ring-2 ring-bg-base" />
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setIsUserMenuOpen((current) => !current)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-border-subtle bg-bg-surface font-semibold text-text-main shadow-card transition-colors hover:bg-bg-hover"
            >
              {currentUser?.avatarUrl ? (
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.name}
                  className="h-full w-full rounded-xl object-cover"
                />
              ) : (
                <span>{avatarLabel}</span>
              )}
            </button>

            {isUserMenuOpen && currentUser ? (
              <div className="modal-surface absolute right-0 top-14 z-30 w-80 rounded-xl border border-border-subtle p-5 shadow-2xl">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border-subtle bg-bg-surface text-text-main">
                    {currentUser.avatarUrl ? (
                      <img
                        src={currentUser.avatarUrl}
                        alt={currentUser.name}
                        className="h-full w-full rounded-xl object-cover"
                      />
                    ) : (
                      <UserRound className="h-5 w-5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-text-main">
                      {currentUser.name}
                    </div>
                    <div className="truncate text-sm text-text-muted">{currentUser.email}</div>
                    <div className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                      {currentUser.role}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    navigate("/profile", {
                      state: {
                        returnTo: `${location.pathname}${location.search}`,
                        useTenantContext: context === "workspace",
                      },
                    });
                  }}
                  className="mt-4 inline-flex w-full items-center justify-center rounded-lg border border-border-subtle px-4 py-3 text-sm font-semibold text-text-main transition-colors hover:bg-bg-hover"
                >
                  Editar perfil
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
