import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Plus, FileDown, Image as ImageIcon, Loader2, Trash2, Camera, Images } from "lucide-react";
import jsPDF from "jspdf";
import srsLogo from "@/assets/srs-logo.png.asset.json";
import html2canvas from "html2canvas-pro";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FAR - Formulário de Apontamentos de Riscos" },
      { name: "description", content: "Sistema de registro de melhorias com antes e depois, status e exportação em PDF." },
    ],
  }),
  component: HomePage,
});

type FarRecord = {
  id: string;
  far_number: string;
  record_date: string;
  cipeiro: string;
  encarregado: string;
  supervisor: string | null;
  setor: string;
  risk_condition: string;
  corrective_action: string;
  responsible: string;
  status: string;
  before_image_url: string | null;
  after_image_url: string | null;
  created_at: string;
};

const STATUS_OPTIONS = ["CONCLUÍDO", "EM ANDAMENTO", "PENDENTE"];
const SETOR_OPTIONS = [
  "PRÉ-MONTAGEM",
  "EXPEDIÇÃO EMBARQUE",
  "MONTAGEM I",
  "EXPEDIÇÃO PÁTIO NOVO",
  "MOVIMENTAÇÃO",
];
const ENCARREGADO_OPTIONS = [
  "ELISEU BOUARD",
  "SILVÉRIO",
  "PAULO",
  "LUIZ",
];

function HomePage() {
  const [records, setRecords] = useState<FarRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [openNew, setOpenNew] = useState(false);
  const [selected, setSelected] = useState<FarRecord | null>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("far_records")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error("Erro ao carregar registros");
    setRecords((data as FarRecord[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="min-h-screen bg-muted/30">
      <Toaster richColors position="top-right" />
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Sistema de Gestão Integrado — SGI</h1>
            <p className="text-base text-muted-foreground">
              FAR — Formulário de Apontamentos de Riscos
            </p>
          </div>
          <Dialog open={openNew} onOpenChange={setOpenNew}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Novo registro
              </Button>
            </DialogTrigger>
            <NewRecordDialog
              onCreated={() => {
                setOpenNew(false);
                load();
              }}
            />
          </Dialog>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando...
          </div>
        ) : records.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground">
            Nenhum registro ainda. Clique em <strong>Novo registro</strong> para começar.
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {records.map((r) => (
              <Card
                key={r.id}
                className="cursor-pointer overflow-hidden p-0 transition hover:shadow-lg"
                onClick={() => setSelected(r)}
              >
                <div className="grid grid-cols-2 gap-px bg-border">
                  <ImgThumb url={r.before_image_url} label="ANTES" />
                  <ImgThumb url={r.after_image_url} label="DEPOIS" />
                </div>
                <div className="space-y-2 p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm text-muted-foreground">
                      {r.far_number}
                    </span>
                    <StatusBadge status={r.status} />
                  </div>
                  <p className="line-clamp-2 text-base font-medium">{r.risk_condition}</p>
                  <div className="text-sm text-muted-foreground">
                    {r.setor} · {new Date(r.record_date).toLocaleDateString("pt-BR")}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        {selected && (
          <DetailDialog
            record={selected}
            onClose={() => setSelected(null)}
            onDeleted={() => {
              setSelected(null);
              load();
            }}
          />
        )}
      </Dialog>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color =
    status === "CONCLUÍDO"
      ? "bg-green-600 text-white"
      : status === "EM ANDAMENTO"
        ? "bg-amber-500 text-white"
        : "bg-zinc-500 text-white";
  return <Badge className={color}>{status}</Badge>;
}

function ImgThumb({ url, label }: { url: string | null; label: string }) {
  return (
    <div className="relative aspect-square bg-muted">
      {url ? (
        <img src={url} alt={label} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full items-center justify-center text-muted-foreground">
          <ImageIcon className="h-8 w-8" />
        </div>
      )}
      <span className="absolute left-2 top-2 rounded bg-black/60 px-2 py-0.5 text-xs font-semibold tracking-wide text-white">
        {label}
      </span>
    </div>
  );
}

function NewRecordDialog({ onCreated }: { onCreated: () => void }) {
  const [submitting, setSubmitting] = useState(false);
  const [beforeFile, setBeforeFile] = useState<File | null>(null);
  const [afterFile, setAfterFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    record_date: new Date().toISOString().slice(0, 10),
    cipeiro: "",
    encarregado: "",
    supervisor: "",
    setor: "",
    risk_condition: "",
    corrective_action: "",
    responsible: "",
    status: "CONCLUÍDO",
  });

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  async function uploadImage(file: File): Promise<string> {
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from("far-images")
      .upload(path, file, { contentType: file.type });
    if (error) throw error;
    const { data } = supabase.storage.from("far-images").getPublicUrl(path);
    return data.publicUrl;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.cipeiro || !form.encarregado || !form.setor) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }
    setSubmitting(true);
    try {
      const { data: farData, error: farError } = await supabase.rpc("get_next_far_number");
      if (farError || !farData) throw new Error("Erro ao gerar número FAR");
      const far_number = farData as string;

      let before_image_url: string | null = null;
      let after_image_url: string | null = null;
      if (beforeFile) before_image_url = await uploadImage(beforeFile);
      if (afterFile) after_image_url = await uploadImage(afterFile);

      const { error } = await supabase.from("far_records").insert({
        ...form,
        far_number,
        supervisor: form.supervisor || null,
        before_image_url,
        after_image_url,
      });
      if (error) throw error;
      toast.success("Registro criado!");
      onCreated();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar registro");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
      <DialogHeader>
        <DialogTitle>REGISTRO DE FARR-SRS</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Nº FAR">
            <Input
              value="Gerado automaticamente ao salvar"
              readOnly
              className="bg-muted/50 text-muted-foreground"
            />
          </Field>
          <Field label="Data *">
            <Input
              type="date"
              value={form.record_date}
              onChange={(e) => set("record_date", e.target.value)}
            />
          </Field>
          <Field label="Status *">
            <Select value={form.status} onValueChange={(v) => set("status", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Cipeiro *">
            <Input value={form.cipeiro} onChange={(e) => set("cipeiro", e.target.value)} />
          </Field>
          <Field label="Setor *">
            <Select value={form.setor} onValueChange={(v) => set("setor", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o setor" />
              </SelectTrigger>
              <SelectContent>
                {SETOR_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Encarregado *">
            <Select value={form.encarregado} onValueChange={(v) => set("encarregado", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o encarregado" />
               </SelectTrigger>
              <SelectContent>
                {ENCARREGADO_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Supervisor">
            <Select value={form.supervisor} onValueChange={(v) => set("supervisor", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o supervisor" />
              </SelectTrigger>
              <SelectContent>
                {ENCARREGADO_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <Field label="Condição de risco / Ato inseguro *">
          <Textarea
            value={form.risk_condition}
            onChange={(e) => set("risk_condition", e.target.value)}
            rows={3}
          />
        </Field>
        <Field label="Ação corretiva *">
          <Textarea
            value={form.corrective_action}
            onChange={(e) => set("corrective_action", e.target.value)}
            rows={3}
          />
        </Field>
        <Field label="Responsável *">
          <Input
            value={form.responsible}
            onChange={(e) => set("responsible", e.target.value)}
          />
        </Field>

        <div className="grid gap-4 md:grid-cols-2">
          <FileField label="Foto ANTES" file={beforeFile} onChange={setBeforeFile} />
          <FileField label="Foto DEPOIS" file={afterFile} onChange={setAfterFile} />
        </div>

        <DialogFooter>
          <Button type="submit" disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar registro
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-base font-bold uppercase tracking-wide text-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

function FileField({
  label,
  file,
  onChange,
}: {
  label: string;
  file: File | null;
  onChange: (f: File | null) => void;
}) {
  const preview = file ? URL.createObjectURL(file) : null;
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-bold uppercase tracking-wide text-foreground">
        {label}
      </Label>
      <div className="flex aspect-video items-center justify-center overflow-hidden rounded-md border-2 border-dashed bg-muted/40">
        {preview ? (
          <img src={preview} alt={label} className="h-full w-full object-cover" />
        ) : (
          <div className="flex w-full flex-col items-center justify-center gap-3 px-4">
            <div className="text-center text-sm text-muted-foreground">
              <ImageIcon className="mx-auto mb-1 h-6 w-6" />
              Clique para anexar
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => galleryRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-md border bg-card px-3 py-1.5 text-sm font-medium hover:bg-accent"
              >
                <Images className="h-4 w-4" />
                Galeria
              </button>
              <button
                type="button"
                onClick={() => cameraRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-md border bg-card px-3 py-1.5 text-sm font-medium hover:bg-accent"
              >
                <Camera className="h-4 w-4" />
                Câmera
              </button>
            </div>
          </div>
        )}
      </div>
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
    </div>
  );
}

function DetailDialog({
  record,
  onClose,
  onDeleted,
}: {
  record: FarRecord;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  async function exportPdf() {
    if (!ref.current) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(ref.current, { scale: 2, useCORS: true, backgroundColor: "#fff" });
      const img = canvas.toDataURL("image/jpeg", 0.92);
      const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
      const w = pdf.internal.pageSize.getWidth();
      const h = (canvas.height * w) / canvas.width;
      pdf.addImage(img, "JPEG", 0, 0, w, h);
      pdf.save(`FAR-${record.far_number}.pdf`);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao gerar PDF");
    } finally {
      setExporting(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Excluir este registro?")) return;
    const { error } = await supabase.from("far_records").delete().eq("id", record.id);
    if (error) return toast.error("Erro ao excluir");
    toast.success("Registro excluído");
    onDeleted();
  }

  return (
    <DialogContent className="max-h-[95vh] max-w-4xl overflow-y-auto p-0">
      <div className="flex items-center justify-between border-b p-4">
        <DialogTitle>Registro {record.far_number}</DialogTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleDelete}>
            <Trash2 className="mr-2 h-4 w-4" /> Excluir
          </Button>
          <Button size="sm" onClick={exportPdf} disabled={exporting}>
            {exporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileDown className="mr-2 h-4 w-4" />
            )}
            Exportar PDF
          </Button>
        </div>
      </div>
      <div className="p-4">
        <FarSheet ref={ref} record={record} />
      </div>
    </DialogContent>
  );
}

const FarSheet = ({
  ref,
  record,
}: {
  ref: React.RefObject<HTMLDivElement | null>;
  record: FarRecord;
}) => {
  const statusColor =
    record.status === "CONCLUÍDO"
      ? "#16a34a"
      : record.status === "EM ANDAMENTO"
        ? "#f59e0b"
        : "#71717a";

  return (
    <div
      ref={ref}
      className="mx-auto border border-zinc-800 bg-white text-zinc-900"
      style={{ width: 800, fontFamily: "Arial, sans-serif", fontSize: 11 }}
    >
      {/* Header */}
      <div className="grid grid-cols-[120px_1fr_180px] border-b border-zinc-800">
        <div className="flex items-center justify-center border-r border-zinc-800 p-3">
          <img src={srsLogo.url} alt="SRS - Prestadora de Serviços" className="max-h-20 w-auto object-contain" crossOrigin="anonymous" />
        </div>
        <div className="flex flex-col items-center justify-center p-3 text-center font-bold">
          <div>SISTEMA DE GESTÃO INTEGRADO - SGI</div>
          <div>FAR - FORMULÁRIO DE APONTAMENTOS DE RISCOS</div>
        </div>
        <div className="border-l border-zinc-800 p-2 text-[10px]">
          <div className="font-bold">{record.far_number}</div>
          <div>Rev. 00</div>
          <div>Em {new Date(record.record_date).toLocaleDateString("pt-BR")}</div>
          <div>Página 01 de 01</div>
        </div>
      </div>

      {/* Cipeiro / Setor */}
      <Row>
        <Cell label="CIPEIRO" value={record.cipeiro} flex={1} />
        <Cell label="SETOR" value={record.setor} flex={1} />
      </Row>
      <Row>
        <Cell label="ENCARREGADO" value={record.encarregado} flex={1} />
        <Cell label="SUPERVISOR" value={record.supervisor || "—"} flex={1} />
      </Row>

      {/* Risco / Ação / Resp / Status */}
      <div className="grid grid-cols-4 border-b border-zinc-800 bg-zinc-100 text-center text-[10px] font-bold">
        <div className="border-r border-zinc-800 p-1.5">CONDIÇÃO DE RISCO / ATO INSEGURO</div>
        <div className="border-r border-zinc-800 p-1.5">AÇÃO CORRETIVA</div>
        <div className="border-r border-zinc-800 p-1.5">RESPONSÁVEL</div>
        <div className="p-1.5">STATUS</div>
      </div>
      <div className="grid grid-cols-4 border-b border-zinc-800">
        <div className="border-r border-zinc-800 p-2 text-[11px]">{record.risk_condition}</div>
        <div className="border-r border-zinc-800 p-2 text-[11px]">{record.corrective_action}</div>
        <div className="flex items-center justify-center border-r border-zinc-800 p-2 text-center font-semibold">
          {record.responsible}
        </div>
        <div
          className="flex items-center justify-center p-2 text-center font-bold text-white"
          style={{ backgroundColor: statusColor }}
        >
          {record.status}
        </div>
      </div>

      {/* Fotos */}
      <div className="border-b border-zinc-800 bg-zinc-100 p-1.5 text-center text-[10px] font-bold">
        REGISTRO FOTOGRÁFICO
      </div>
      <div className="grid grid-cols-2 border-b border-zinc-800 text-center font-bold">
        <div className="border-r border-zinc-800 p-1.5">ANTES</div>
        <div className="p-1.5">DEPOIS</div>
      </div>
      <div className="grid grid-cols-2">
        <div className="flex aspect-square items-center justify-center border-r border-zinc-800 bg-zinc-50">
          {record.before_image_url ? (
            <img
              src={record.before_image_url}
              alt="Antes"
              crossOrigin="anonymous"
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-zinc-400">Sem foto</span>
          )}
        </div>
        <div className="flex aspect-square items-center justify-center bg-zinc-50">
          {record.after_image_url ? (
            <img
              src={record.after_image_url}
              alt="Depois"
              crossOrigin="anonymous"
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-zinc-400">Sem foto</span>
          )}
        </div>
      </div>
    </div>
  );
};

function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex border-b border-zinc-800">{children}</div>;
}

function Cell({ label, value, flex }: { label: string; value: string; flex: number }) {
  return (
    <div className="flex border-r border-zinc-800 last:border-r-0" style={{ flex }}>
      <div className="border-r border-zinc-800 bg-zinc-100 p-2 text-[10px] font-bold">
        {label}
      </div>
      <div className="flex-1 p-2 text-center font-semibold">{value}</div>
    </div>
  );
}
