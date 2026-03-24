import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

type LayoutProps = {
  section: string;
  children: React.ReactNode;
};

export function Layout({ section, children }: LayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-bg-base">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header section={section} />
        <main className="flex-1 overflow-y-auto p-10">
          {children}
        </main>
      </div>
    </div>
  );
}
