import { useState, useEffect, type ReactNode } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { Link } from '@tanstack/react-router';
import { Save, Loader2, CheckCircle2, Clock3, Camera, QrCode, Play, Copy, Check, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { CIPEIROS, ENCARREGADOS, farrSchema, photoSchema, localDatetime, type FarRecord } from '@/lib/farr/schema';
import { updateFarr } from '@/lib/farr/data.functions';
import { PhotoField } from './photo-field';

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block min-w-0 space-y-2">
      <span className="text-xs font-bold uppercase text-foreground/80">{label}</span>
      {children}
    </label>
  );
}

export function FarrForm({ record, onSaved }: { record?: FarRecord; onSaved?: (record: FarRecord) => void }) {
  const client = useQueryClient();
  const update = useServerFn(updateFarr);
  const [before, setBefore] = useState<File | null>(null);
  const [after, setAfter] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [showQr, setShowQr] = useState(false);
  const [copied, setCopied] = useState(false);
  const [currentDisplayTime, setCurrentDisplayTime] = useState('');

  const initial = {
    datetime: record ? localDatetime(new Date(record.record_datetime)) : localDatetime(),
    cipeiro: record?.cipeiro ?? '',
    setor: record?.setor ?? '',
    encarregado: record?.encarregado ?? '',
    risk_condition: record?.risk_condition ?? '',
    corrective_action: record?.corrective_action ?? '',
    responsible: record?.responsible ?? '',
    status: record?.status === 'EM ANDAMENTO' ? 'EM ANDAMENTO' : 'CONCLUÍDO',
  };

  const [form, setForm] = useState(initial);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentDisplayTime(now.toLocaleString('pt-BR'));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  function set(key: keyof typeof form, value: string) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  async function upload(file: File): Promise<string> {
    try {
      const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('far-images').upload(path, file, { contentType: file.type });
      
      if (uploadError) {
        console.warn('Storage upload warning, fallback to base64:', uploadError);
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      }
      return path;
    } catch {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    }
  }

  const mutation = useMutation({
    mutationFn: async () => {
      const values = farrSchema.parse({
        ...form,
        record_date: form.datetime.slice(0, 10),
        record_datetime: new Date(form.datetime).toISOString(),
      });

      if (record) {
        return update({ data: { id: record.id, values } });
      }

      if (!before || !after) {
        throw new Error('Anexe uma foto ANTES e uma foto DEPOIS.');
      }

      const [before_image_url, after_image_url] = await Promise.all([upload(before), upload(after)]);
      photoSchema.parse({ before_image_url, after_image_url });

      // Gerar número de protocolo padronizado
      let far_number = `FARR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      try {
        const { data: seq } = await supabase.rpc('get_next_far_number');
        if (seq && typeof seq === 'string') far_number = seq;
      } catch {
        // Fallback FARR-YYYY-XXXX
      }

      const { data, error: insertError } = await supabase
        .from('far_records')
        .insert({
          ...values,
          far_number,
          before_image_url,
          after_image_url,
        })
        .select('*')
        .single();

      if (insertError) {
        console.error('Erro ao salvar FARR:', insertError);
        throw new Error('Não foi possível enviar o FARR. Confira os campos e tente novamente.');
      }
      return data;
    },
    onSuccess: (row) => {
      client.invalidateQueries({ queryKey: ['farr'] });
      toast.success(record ? 'Alterações salvas com sucesso.' : `FARR registrado com sucesso: ${row.far_number}`);
      if (!record) {
        setForm({ ...initial, datetime: localDatetime() });
        setBefore(null);
        setAfter(null);
      }
      setError('');
      onSaved?.(row);
    },
    onError: (err) => {
      setError(err instanceof Error && err.name !== 'ZodError' ? err.message : 'Preencha todos os campos obrigatórios.');
    },
  });

  const formUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(formUrl)}`;

  function copyFormLink() {
    navigator.clipboard.writeText(formUrl);
    setCopied(true);
    toast.success('Link do formulário copiado!');
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setError('');
          if (!record && (!before || !after)) {
            setError('Anexe uma foto ANTES e uma foto DEPOIS.');
            return;
          }
          mutation.mutate();
        }}
        className="space-y-6"
      >
        {/* Barra superior de Código QR e Data/Hora atual */}
        {!record && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-3 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              <Calendar className="h-4 w-4 text-primary" />
              <span>Data/Hora: {currentDisplayTime}</span>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowQr(true)}
              className="h-8 gap-1.5 text-xs font-semibold shadow-xs"
            >
              <QrCode className="h-4 w-4" />
              <span>Código QR</span>
            </Button>
          </div>
        )}

        {/* Campos Principais */}
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Data / Hora *">
            <Input
              aria-label="Data / Hora"
              type="datetime-local"
              required
              value={form.datetime}
              onChange={(e) => set('datetime', e.target.value)}
            />
          </Field>

          <Field label="Cipeiro *">
            <select
              aria-label="Cipeiro"
              required
              className="farr-select"
              value={form.cipeiro}
              onChange={(e) => set('cipeiro', e.target.value)}
            >
              <option value="">Selecione o cipeiro</option>
              {record && !CIPEIROS.some((n) => n === record.cipeiro) && (
                <option value={record.cipeiro}>{record.cipeiro}</option>
              )}
              {CIPEIROS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Setor *">
            <Input
              aria-label="Setor"
              maxLength={150}
              required
              placeholder="Digite o setor"
              value={form.setor}
              onChange={(e) => set('setor', e.target.value)}
            />
          </Field>

          <Field label="Encarregado *">
            <select
              aria-label="Encarregado"
              required
              className="farr-select"
              value={form.encarregado}
              onChange={(e) => set('encarregado', e.target.value)}
            >
              <option value="">Selecione o encarregado</option>
              {record && record.encarregado && !ENCARREGADOS.some((n) => n === record.encarregado) && (
                <option value={record.encarregado}>{record.encarregado}</option>
              )}
              {ENCARREGADOS.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </Field>

          <Field label="Responsável pela Ação *">
            <Input
              aria-label="Responsável pela Ação"
              maxLength={150}
              required
              placeholder="Nome do responsável"
              value={form.responsible}
              onChange={(e) => set('responsible', e.target.value)}
            />
          </Field>
        </div>

        {/* Descrições */}
        <Field label="Condição de Risco / Ato Inseguro *">
          <Textarea
            aria-label="Condição de Risco / Ato Inseguro"
            maxLength={5000}
            required
            rows={4}
            placeholder="Descreva detalhadamente a condição ou ato inseguro identificado..."
            value={form.risk_condition}
            onChange={(e) => set('risk_condition', e.target.value)}
          />
        </Field>

        <Field label="Ação Corretiva *">
          <Textarea
            aria-label="Ação Corretiva"
            maxLength={5000}
            required
            rows={4}
            placeholder="Descreva a ação corretiva adotada ou recomendada..."
            value={form.corrective_action}
            onChange={(e) => set('corrective_action', e.target.value)}
          />
        </Field>

        {/* Seleção de Status */}
        <fieldset>
          <legend className="mb-2 text-xs font-bold uppercase text-foreground/80">Status *</legend>
          <div className="grid grid-cols-2 gap-3">
            {[
              ['CONCLUÍDO', 'Concluída', CheckCircle2],
              ['EM ANDAMENTO', 'Em Andamento', Clock3],
            ].map(([value, label, Icon]) => {
              const StatusIcon = Icon as typeof CheckCircle2;
              const active = form.status === value;
              return (
                <Button
                  type="button"
                  key={String(value)}
                  variant="outline"
                  aria-pressed={active}
                  onClick={() => set('status', String(value))}
                  className={`h-11 transition-all ${
                    active
                      ? value === 'CONCLUÍDO'
                        ? 'status-success ring-2 ring-emerald-500'
                        : 'status-progress ring-2 ring-amber-500'
                      : ''
                  }`}
                >
                  <StatusIcon className="h-4 w-4" />
                  <span>{String(label)}</span>
                </Button>
              );
            })}
          </div>
        </fieldset>

        {/* Registro Fotográfico */}
        {!record && (
          <section className="border-t pt-5">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wide">
              <Camera className="h-4 w-4 text-primary" />
              REGISTRO FOTOGRÁFICO
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <PhotoField label="Fotos ANTES" file={before} onChange={setBefore} />
              <PhotoField label="Fotos DEPOIS" file={after} onChange={setAfter} />
            </div>
          </section>
        )}

        {error && (
          <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm font-semibold text-destructive">
            {error}
          </p>
        )}

        {/* Botão de Envio de Destaque */}
        <Button
          type="submit"
          className={record ? "w-full" : "w-full btn-enviar-farr"}
          size="lg"
          disabled={mutation.isPending}
        >
          {mutation.isPending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : record ? (
            <Save className="h-5 w-5" />
          ) : (
            <Play className="h-5 w-5 fill-current" />
          )}
          <span>{record ? 'Salvar alterações' : 'ENVIAR FARR'}</span>
        </Button>

        {!record && (
          <div className="text-center pt-2">
            <Link to="/admin" className="text-xs text-muted-foreground hover:text-foreground transition-colors underline">
              Acessar Painel Administrativo
            </Link>
          </div>
        )}
      </form>

      {/* Modal com Código QR para leitura em campo */}
      <Dialog open={showQr} onOpenChange={setShowQr}>
        <DialogContent className="max-w-xs text-center">
          <DialogHeader>
            <DialogTitle className="text-center">Código QR do Formulário</DialogTitle>
            <DialogDescription className="text-center text-xs">
              Aponte a câmera do celular para abrir o formulário FARR diretamente no dispositivo.
            </DialogDescription>
          </DialogHeader>

          <div className="my-4 flex justify-center rounded-lg bg-white p-3 shadow-inner border">
            <img src={qrCodeUrl} alt="QR Code FARR" className="h-48 w-48 object-contain" />
          </div>

          <div className="space-y-2">
            <Button variant="outline" size="sm" className="w-full gap-2" onClick={copyFormLink}>
              {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              <span>{copied ? 'Copiado!' : 'Copiar Link'}</span>
            </Button>
            <p className="text-[11px] text-muted-foreground break-all">{formUrl}</p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
