import { ChangeEvent, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Download, FileUp, Save } from "lucide-react";
import { Layout } from "../components/Layout";
import {
  downloadZeroSeedData,
  uploadZeroSeedData,
  type ApiZeroSeedData,
} from "../lib/workspace-api";

export default function SeedData() {
  const [seedData, setSeedData] = useState<ApiZeroSeedData | null>(null);
  const [fileName, setFileName] = useState("");

  const uploadMutation = useMutation({
    mutationFn: uploadZeroSeedData,
  });

  const summary = useMemo(() => {
    if (!seedData) return null;
    return {
      users: seedData.users.length,
      llms: seedData.llmConfigs.length,
      roles: seedData.tenantRoleDefinitions.length,
      permissions: seedData.permissionDefinitions.length,
    };
  }, [seedData]);

  const download = async () => {
    const payload = await downloadZeroSeedData();
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `kanobi-zero-seed-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const raw = typeof reader.result === "string" ? reader.result : "";
      try {
        const parsed = JSON.parse(raw) as ApiZeroSeedData;
        setSeedData(parsed);
        setFileName(file.name);
      } catch {
        window.alert("O ficheiro selecionado nao contem seed data valida.");
      }
    };
    reader.readAsText(file);
  };

  const upload = () => {
    if (!seedData) return;
    uploadMutation.mutate(seedData);
  };

  return (
    <Layout section="Seed Data" sectionLabel="Mission Control">
      <div className="space-y-6">
        <section className="panel p-8">
          <div className="context-chip mb-4 inline-flex">Zero Setup</div>
          <h1 className="text-3xl font-semibold tracking-tight text-text-main">
            Seed data da empresa Zero
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-text-muted">
            Faz download de toda a informacao estrutural da empresa Zero ou faz upload
            de um ficheiro para criar ou atualizar essa configuracao, garantindo que
            so existe uma empresa Zero.
          </p>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <div className="panel p-8">
            <h2 className="text-sm font-semibold text-text-main">Download</h2>
            <p className="mt-2 text-sm leading-6 text-text-muted">
              Exporta empresa, setup, users, permissoes, tipos de user, tipos de
              permissao, configuracoes de LLM e email da Zero.
            </p>
            <button
              type="button"
              onClick={download}
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-bg-inverse px-4 py-3 text-sm font-semibold text-text-inverse transition-opacity hover:opacity-85"
            >
              <Download className="h-4 w-4" />
              Download
            </button>
          </div>

          <div className="panel p-8">
            <h2 className="text-sm font-semibold text-text-main">Upload</h2>
            <p className="mt-2 text-sm leading-6 text-text-muted">
              Importa o ficheiro de seed data e cria ou atualiza a empresa Zero sem
              permitir duplicacao.
            </p>

            <label className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border-subtle px-4 py-3 text-sm font-semibold text-text-main transition-colors hover:bg-bg-hover">
              <FileUp className="h-4 w-4" />
              Escolher ficheiro
              <input type="file" accept="application/json" onChange={handleUpload} className="hidden" />
            </label>

            {fileName ? (
              <p className="mt-3 text-sm text-text-muted">Ficheiro carregado: {fileName}</p>
            ) : null}

            {summary ? (
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-border-subtle bg-bg-base px-4 py-3 text-sm text-text-main">
                  {summary.users} users
                </div>
                <div className="rounded-lg border border-border-subtle bg-bg-base px-4 py-3 text-sm text-text-main">
                  {summary.llms} LLMs
                </div>
                <div className="rounded-lg border border-border-subtle bg-bg-base px-4 py-3 text-sm text-text-main">
                  {summary.roles} tipos de user
                </div>
                <div className="rounded-lg border border-border-subtle bg-bg-base px-4 py-3 text-sm text-text-main">
                  {summary.permissions} tipos de permissao
                </div>
              </div>
            ) : null}

            <button
              type="button"
              onClick={upload}
              disabled={!seedData || uploadMutation.isPending}
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-bg-inverse px-4 py-3 text-sm font-semibold text-text-inverse transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              Upload
            </button>

            {uploadMutation.isSuccess ? (
              <p className="mt-3 text-sm text-emerald-600 dark:text-emerald-300">
                Seed data importada com sucesso.
              </p>
            ) : null}
            {uploadMutation.error ? (
              <p className="mt-3 text-sm text-red-600 dark:text-red-300">
                {uploadMutation.error instanceof Error
                  ? uploadMutation.error.message
                  : "Nao foi possivel importar a seed data."}
              </p>
            ) : null}
          </div>
        </section>
      </div>
    </Layout>
  );
}
