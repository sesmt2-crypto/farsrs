import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { ShieldAlert, FileSpreadsheet } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { FarrForm } from '@/components/farr/form';
import { FarrDetail } from '@/components/farr/sheet';
import type { FarRecord } from '@/lib/farr/schema';
import logo from '@/assets/srs-logo.png.asset.json';

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      { title: 'FARR SRS · Formulário de Apontamento e Resolução de Riscos' },
      { name: 'description', content: 'Registre condições de risco, atos inseguros e ações corretivas com fotos antes e depois.' },
      { property: 'og:title', content: 'FARR SRS — Novo Apontamento' },
      { property: 'og:description', content: 'Sistema de Gestão Integrado da SRS Prestadora de Serviços.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
    ],
  }),
  component: Home,
});

function Home() {
  const [sent, setSent] = useState<FarRecord | null>(null);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      {/* Banner Superior Institucional (Modelo FR-SSO-09) */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card p-5 shadow-xs">
        <div className="flex items-center gap-4">
          <img
            src={logo.url || '/srs-logo.png'}
            alt="SRS Prestadora de Serviços"
            className="h-14 w-auto max-w-[130px] object-contain"
          />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black tracking-tight text-foreground sm:text-2xl">FARR</h2>
              <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                SGI FR-SSO-09
              </span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground font-medium">
              Registro de Condição de Risco / Ato Inseguro
            </p>
          </div>
        </div>

        <div className="hidden sm:flex flex-col items-end text-right text-xs text-muted-foreground">
          <span className="font-bold text-foreground">SISTEMA DE GESTÃO INTEGRADO</span>
          <span>Rev. 01 · SRS Segurança</span>
        </div>
      </div>

      {/* Card do Formulário */}
      <div className="rounded-xl border bg-card p-5 sm:p-8 shadow-sm">
        <div className="mb-6 border-b pb-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
            <ShieldAlert className="h-4 w-4" />
            <span>Formulário de Apontamento</span>
          </div>
          <h3 className="mt-1 text-lg font-bold text-foreground">
            Identificação de Risco e Ação Corretiva
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Preencha os campos abaixo com atenção e anexe o registro fotográfico antes e depois.
          </p>
        </div>

        <FarrForm onSaved={setSent} />
      </div>

      {/* Modal da Ficha Gerada para visualização imediata e download de PDF */}
      <Dialog open={!!sent} onOpenChange={(o) => { if (!o) setSent(null); }}>
        {sent && <FarrDetail record={sent} />}
      </Dialog>
    </main>
  );
}
