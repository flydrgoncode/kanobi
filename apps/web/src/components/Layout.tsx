import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

export type ShellContext = "workspace" | "mission-control" | "cowork";
export type WorkspaceRole = "member" | "support" | "superuser" | "god";

type LayoutProps = {
  section: string;
  sectionLabel?: string;
  context?: ShellContext;
  role?: WorkspaceRole;
  children: React.ReactNode;
};

export function Layout({
  section,
  sectionLabel,
  context = "workspace",
  role = "superuser",
  children,
}: LayoutProps) {
  return (
    <div className={`app-shell app-context-${context} flex h-screen overflow-hidden bg-bg-base`}>
      <Sidebar context={context} role={role} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header section={section} sectionLabel={sectionLabel} context={context} role={role} />
        <main className="flex-1 overflow-y-auto px-6 py-6 sm:px-8 lg:px-10">
          {children}
        </main>
      </div>
    </div>
  );
}
