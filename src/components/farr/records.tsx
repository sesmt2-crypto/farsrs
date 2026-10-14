import { useState } from 'react';
import { useSuspenseQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { Link } from '@tanstack/react-router';
import { Search, Pencil, FileText, Trash2, PlusCircle, CheckCircle2, Clock3 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { farrQuery } from '@/lib/farr/queries';
import { dateLabel, statusLabel, type FarRecord } from '@/lib/farr/schema';
import { deleteFarr } from '@/lib/farr/data.functions';
import { FarrForm } from './form';
import { FarrDetail } from './sheet';

function Thumbnail({ path, label }: { path: string | null; label: string }) {
  const { data } = useQuery({
    queryKey: ['photo', path],
    enabled: !!path,
    staleTime: 1800000,
    queryFn: async () => {
      if (!path) return null;
      if (path.startsWith('data:')) return path;

      let file = path;
      if (path.startsWith('http')) {
        const i = path.indexOf('/far-images/');
        if (i < 0) return path;
        file = path.slice(i + 12).split('?')[0];
      }
      try {
        const { data: res } = await supabase.storage.from('far-images').createSignedUrl(file, 3600);
        return res?.signedUrl ?? null;
      } catch {
        return null;
      }
    },
  });

  return (
    <div className="relative aspect-[4/3] bg-muted flex items-center justify-center overflow-hidden">
      {data ? (
        <img src={data} alt={label} className="h-full w-full object-contain" />
      ) : (
        <span className="text-[11px] text-muted-foreground italic">Sem foto</span>
      )}
      <span className="absolute bottom-1.5 left-1.5 rounded bg-black/75 px-1.5 py-0.5 text-[9px] font-bold text-white uppercase tracking-wider">
        {label}
      </span>
    </div>
  );
}

export function Records({ admin = false }: { admin?: boolean }) {
  const client = useQueryClient();
  const deleteFn = useServerFn(deleteFarr);
  const { data: records } = useSuspenseQuery(farrQuery());
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('TODOS');
  const [selected, setSelected] = useState<FarRecord | null>(null);
  const [editing, setEditing] = useState<FarRecord | null>(null);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return deleteFn({ data: { id } });
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['farr'] });
      toast.success('FARR excluído com sucesso.');
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Erro ao excluir FARR.');
    },
  });

  const filtered = records.filter(
    (r) =>
      (status === 'TODOS' || r.status === status) &&
      `${r.far_number} ${r.cipeiro} ${r.setor} ${r.risk_condition}`.toLowerCase().includes(search.toLowerCase())
  );

  const countConcluido = records.filter((r) => r.status === 'CONCLUÍDO').length;
  const countAndamento = records.filter((r) => r.status === 'EM ANDAMENTO').length;

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {admin ? 'Painel Administrativo de FARRs' : 'Registros de FARR'}
          </h2>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span>{records.length} registro{records.length === 1 ? '' : 's'} no total</span>
            <span className="text-border">·</span>
            <span className="flex items-center gap-1 text-emerald-600 font-semibold">
              <CheckCircle2 className="h-3.5 w-3.5" /> {countConcluido} concluída{countConcluido === 1 ? '' : 's'}
            </span>
            <span className="text-border">·</span>
            <span className="flex items-center gap-1 text-amber-600 font-semibold">
              <Clock3 className="h-3.5 w-3.5" /> {countAndamento} em andamento
            </span>
          </div>
        </div>

        <Button asChild size="sm" className="gap-1.5">
          <Link to="/">
            <PlusCircle className="h-4 w-4" />
            <span>Novo FARR</span>
          </Link>
        </Button>
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            aria-label="Buscar FARR"
            placeholder="Buscar por protocolo, cipeiro, setor ou risco..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          aria-label="Filtrar status"
          className="farr-select sm:w-48"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="TODOS">Todos os status</option>
          <option value="CONCLUÍDO">Concluída</option>
          <option value="EM ANDAMENTO">Em Andamento</option>
        </select>
      </div>

      {!filtered.length ? (
        <div className="rounded-xl border border-dashed py-16 text-center">
          <p className="text-muted-foreground text-sm">Nenhum registro FARR encontrado.</p>
          <Button asChild variant="outline" size="sm" className="mt-4">
            <Link to="/">Criar primeiro apontamento</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r) => (
            <article key={r.id} className="overflow-hidden rounded-xl border bg-card shadow-xs transition-shadow hover:shadow-md flex flex-col justify-between">
              <div>
                <div className="grid grid-cols-2 gap-px bg-border">
                  <Thumbnail path={r.before_image_url} label="ANTES" />
                  <Thumbnail path={r.after_image_url} label="DEPOIS" />
                </div>

                <div className="space-y-3 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <strong className="text-sm font-bold tracking-tight text-foreground">{r.far_number}</strong>
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-bold ${
                        r.status === 'CONCLUÍDO' ? 'status-success' : 'status-progress'
                      }`}
                    >
                      {statusLabel(r.status)}
                    </span>
                  </div>

                  <p className="line-clamp-2 min-h-[2.5rem] text-sm text-foreground/90">
                    {r.risk_condition}
                  </p>

                  <div className="rounded-md bg-muted/50 p-2.5 text-xs space-y-1">
                    <p className="font-semibold text-foreground/90">{r.cipeiro}</p>
                    <p className="text-muted-foreground">
                      {r.setor} · {dateLabel(r)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t p-3 bg-card flex items-center gap-2">
                <Button variant="default" size="sm" className="flex-1 gap-1.5" onClick={() => setSelected(r)}>
                  <FileText className="h-4 w-4" />
                  <span>Ver Ficha / PDF</span>
                </Button>

                {admin && (
                  <>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      aria-label={`Editar ${r.far_number}`}
                      title="Editar FARR"
                      onClick={() => setEditing(r)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>

                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:bg-destructive/10"
                      aria-label={`Excluir ${r.far_number}`}
                      title="Excluir FARR"
                      onClick={() => {
                        if (confirm(`Tem certeza que deseja excluir o ${r.far_number}?`)) {
                          deleteMutation.mutate(r.id);
                        }
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Modal Ficha Completa SGI com PDF */}
      <Dialog open={!!selected} onOpenChange={(o) => { if (!o) setSelected(null); }}>
        {selected && <FarrDetail record={selected} />}
      </Dialog>

      {/* Modal Edição Administrativa */}
      <Dialog open={!!editing} onOpenChange={(o) => { if (!o) setEditing(null); }}>
        {editing && (
          <DialogContent className="max-h-[92dvh] max-w-3xl overflow-y-auto">
            <DialogTitle>Editar {editing.far_number}</DialogTitle>
            <DialogDescription>
              Registro em {editing.setor} · {dateLabel(editing)}
            </DialogDescription>
            <FarrForm record={editing} onSaved={() => setEditing(null)} />
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}
