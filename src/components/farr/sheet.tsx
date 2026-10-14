import { useEffect, useRef, useState } from 'react';
import { FileDown, Printer, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import logo from '@/assets/srs-logo.png.asset.json';
import { Button } from '@/components/ui/button';
import { DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { dateLabel, type FarRecord } from '@/lib/farr/schema';

async function toDataUrl(url: string): Promise<string> {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Falha ao baixar imagem');
    const blob = await res.blob();
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => typeof reader.result === 'string' ? resolve(reader.result) : reject();
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return url;
  }
}

async function resolveImageUrl(value?: string | null): Promise<string> {
  if (!value) return '';
  if (value.startsWith('data:')) return value;

  let targetUrl = value;
  if (!value.startsWith('http') && !value.startsWith('/')) {
    const { data } = await supabase.storage.from('far-images').createSignedUrl(value, 7200);
    if (data?.signedUrl) targetUrl = data.signedUrl;
  } else if (value.startsWith('http') && value.includes('/far-images/')) {
    const parts = value.split('/far-images/');
    const path = parts[1]?.split('?')[0];
    if (path) {
      const { data } = await supabase.storage.from('far-images').createSignedUrl(path, 7200);
      if (data?.signedUrl) targetUrl = data.signedUrl;
    }
  }

  return toDataUrl(targetUrl);
}

export function FarrDetail({ record }: { record: FarRecord }) {
  const ref = useRef<HTMLDivElement>(null);
  const [photos, setPhotos] = useState<{ before: string; after: string; logo: string } | null>(null);
  const [loadingPhotos, setLoadingPhotos] = useState(true);
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    setLoadingPhotos(true);

    Promise.all([
      resolveImageUrl(record.before_image_url),
      resolveImageUrl(record.after_image_url),
      resolveImageUrl(logo.url || '/srs-logo.png'),
    ])
      .then(([before, after, logoImg]) => {
        if (active) {
          setPhotos({
            before,
            after,
            logo: logoImg || '/srs-logo.png',
          });
        }
      })
      .catch((err) => {
        console.error('Erro ao preparar fotos da ficha:', err);
        if (active) {
          setPhotos({
            before: record.before_image_url ?? '',
            after: record.after_image_url ?? '',
            logo: '/srs-logo.png',
          });
        }
      })
      .finally(() => {
        if (active) setLoadingPhotos(false);
      });

    return () => {
      active = false;
    };
  }, [record, retry]);

  async function exportPdf(print = false) {
    const node = ref.current;
    if (!node) return;

    const popup = print ? window.open('', '_blank') : null;
    setBusy(true);

    try {
      // Garantir renderização completa das imagens
      const imgElements = Array.from(node.querySelectorAll('img'));
      await Promise.all(
        imgElements.map((img) => {
          if (img.complete) return Promise.resolve();
          return new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
          });
        })
      );

      const [{ default: JsPDF }, html2canvasModule] = await Promise.all([
        import('jspdf'),
        // @ts-ignore
        import('html2canvas-pro').catch(() => import('html2canvas')),
      ]);
      const html2canvas = (html2canvasModule as any).default || html2canvasModule;

      const canvas = await html2canvas(node, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        windowWidth: 1000,
        logging: false,
      });

      const pdf = new JsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
      const margin = 8;
      const pdfWidth = 194;
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(canvas.toDataURL('image/png', 1.0), 'PNG', margin, margin, pdfWidth, pdfHeight);

      if (print) {
        if (!popup) throw new Error('Permita a abertura de popups para imprimir.');
        const blobUrl = URL.createObjectURL(pdf.output('blob'));
        popup.location.href = blobUrl;
        setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
      } else {
        pdf.save(`${record.far_number}.pdf`);
        toast.success(`Ficha ${record.far_number} exportada em PDF!`);
      }
    } catch (err) {
      popup?.close();
      toast.error(err instanceof Error ? err.message : 'Não foi possível gerar o PDF.');
    } finally {
      setBusy(false);
    }
  }

  const generationTime = new Date().toLocaleString('pt-BR');

  return (
    <DialogContent className="max-h-[96dvh] w-[calc(100%-1rem)] max-w-4xl overflow-y-auto p-0">
      <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b bg-card/95 p-4 backdrop-blur">
        <div>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <span>Ficha {record.far_number}</span>
            <span
              className={`text-xs px-2 py-0.5 rounded font-semibold ${
                record.status === 'CONCLUÍDO' ? 'status-success' : 'status-progress'
              }`}
            >
              {record.status}
            </span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-0.5">
            {record.setor} · Registrado em {dateLabel(record)}
          </DialogDescription>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {loadingPhotos && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground mr-1">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Carregando imagens...
            </span>
          )}
          <Button
            size="sm"
            disabled={busy}
            onClick={() => exportPdf(false)}
            className="bg-primary hover:bg-primary/90"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
            Baixar PDF
          </Button>

          <Button size="sm" variant="outline" disabled={busy} onClick={() => exportPdf(true)}>
            <Printer className="h-4 w-4" />
            Imprimir
          </Button>

          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-muted-foreground"
            title="Recarregar imagens"
            onClick={() => setRetry((n) => n + 1)}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto p-4 sm:p-6 bg-muted/20">
        <div ref={ref} className="farr-sheet">
          {/* Cabeçalho Oficial SGI */}
          <div className="sheet-header">
            <div className="sheet-logo">
              <img
                src={photos?.logo || '/srs-logo.png'}
                alt="SRS Prestadora de Serviços"
                crossOrigin="anonymous"
              />
            </div>
            <div className="sheet-title">
              <strong>SISTEMA DE GESTÃO INTEGRADO - SGI</strong>
              <strong>FARR - FORMULÁRIO DE APONTAMENTO E RESOLUÇÃO DE RISCOS</strong>
            </div>
            <div className="sheet-meta">
              <strong>FR-SSO-09</strong>
              <span>Rev.01</span>
              <span>Em: 07/07/2023</span>
              <span>Página 01 de 01</span>
            </div>
          </div>

          {/* Dados das Pessoas e Local */}
          <div className="sheet-pair">
            <Cell label="CIPEIRO" value={record.cipeiro} />
            <Cell label="SETOR" value={record.setor} />
          </div>
          <div className="sheet-pair">
            <Cell label="ENCARREGADO" value={record.encarregado} />
            <Cell label="SUPERVISOR" value={record.supervisor || '—'} />
          </div>

          {/* Tabela de Riscos, Ação e Status */}
          <div className="sheet-table">
            <div className="sheet-column">
              <h3>CONDIÇÃO DE RISCO / ATO INSEGURO</h3>
              <p>{record.risk_condition}</p>
            </div>
            <div className="sheet-column">
              <h3>AÇÃO CORRETIVA</h3>
              <p>{record.corrective_action}</p>
            </div>
            <div className="sheet-column">
              <h3>RESPONSÁVEL</h3>
              <p>{record.responsible}</p>
            </div>
            <div className="sheet-column">
              <h3>STATUS</h3>
              <p
                className={`sheet-status ${
                  record.status === 'CONCLUÍDO' ? 'status-success' : 'status-progress'
                }`}
              >
                {record.status}
              </p>
            </div>
          </div>

          {/* Registro Fotográfico Oficial */}
          <h3 className="sheet-band">REGISTRO FOTOGRÁFICO</h3>
          <div className="sheet-photos">
            <div>
              <h3 className="sheet-band">ANTES</h3>
              <div className="sheet-photo">
                {photos?.before ? (
                  <img src={photos.before} alt="Registro ANTES" crossOrigin="anonymous" />
                ) : (
                  <span className="text-xs text-muted-foreground italic">Sem foto registrada</span>
                )}
              </div>
            </div>
            <div>
              <h3 className="sheet-band">DEPOIS</h3>
              <div className="sheet-photo">
                {photos?.after ? (
                  <img src={photos.after} alt="Registro DEPOIS" crossOrigin="anonymous" />
                ) : (
                  <span className="text-xs text-muted-foreground italic">Sem foto registrada</span>
                )}
              </div>
            </div>
          </div>

          {/* Rodapé Oficial da Ficha */}
          <footer className="sheet-footer">
            Protocolo: {record.far_number} | Gerado em: {generationTime}
          </footer>
        </div>
      </div>
    </DialogContent>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="sheet-cell">
      <strong>{label}:</strong>
      <span>{value}</span>
    </div>
  );
}
