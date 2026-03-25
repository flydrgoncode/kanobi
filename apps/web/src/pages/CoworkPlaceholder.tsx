import { useQuery } from "@tanstack/react-query";
import { Layout } from "../components/Layout";
import { useTenantSelection } from "../context/tenant-selection";
import { getCurrentUser } from "../lib/workspace-api";

type CoworkPlaceholderProps = {
  section: string;
  title: string;
  description: string;
};

export function CoworkPlaceholder({ section, title, description }: CoworkPlaceholderProps) {
  const { selectedTenantId, selectedTenantName } = useTenantSelection();
  const { data } = useQuery({
    queryKey: ["cowork-current-user", selectedTenantId],
    queryFn: () => getCurrentUser(),
    retry: false,
  });

  const currentRole = data?.user.role === "god" ? "superuser" : data?.user.role ?? "member";

  return (
    <Layout section={section} sectionLabel="Cowork" context="cowork" role={currentRole}>
      <section className="panel p-8">
        <div className="max-w-3xl">
          <div className="context-chip mb-4 inline-flex">Cowork</div>
          <h1 className="text-3xl font-semibold tracking-tight text-text-main">{title}</h1>
          <p className="mt-3 text-sm leading-6 text-text-muted">{description}</p>
          <div className="mt-5 inline-flex items-center gap-2 rounded-lg border border-[var(--context-accent)] bg-[var(--context-soft)] px-3 py-2 text-sm font-semibold text-[var(--context-accent)]">
            <span>Empresa ativa</span>
            <span className="text-text-main">{selectedTenantName || "Sem tenant"}</span>
          </div>
        </div>
      </section>
    </Layout>
  );
}
