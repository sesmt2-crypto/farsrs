import { createFileRoute, useRouter } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { useState } from 'react';
import { Lock, LogOut, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { adminStatus, unlockAdmin, lockAdmin } from '@/lib/farr/data.functions';
import { farrQuery } from '@/lib/farr/queries';
import { Records } from '@/components/farr/records';

export const Route = createFileRoute('/admin')({
  head: () => ({
    meta: [
      { title: 'Administração de FARRs | SRS' },
      { name: 'description', content: 'Área restrita de gestão, edição e atualização de FARRs da SRS.' },
      { property: 'og:title', content: 'Administração de FARRs — SRS' },
      { property: 'og:description', content: 'Gestão administrativa de apontamentos e resoluções de riscos.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  loader: async ({ context }) => {
    const status = await adminStatus();
    if (status.unlocked) await context.queryClient.ensureQueryData(farrQuery());
    return status;
  },
  component: Admin,
});

function Admin() {
  const { unlocked } = Route.useLoaderData();
  const router = useRouter();
  const unlock = useServerFn(unlockAdmin);
  const lock = useServerFn(lockAdmin);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (unlocked) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-4 flex justify-end">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={async () => { await lock(); await router.invalidate(); }}>
            <LogOut className="h-4 w-4" /> Sair do painel
          </Button>
        </div>
        <Records admin />
      </main>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await unlock({ data: { password } });
      if (!res.ok) setError('Senha incorreta.');
      else await router.invalidate();
    } catch {
      setError('Não foi possível verificar a senha.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-sm px-4 py-12">
      <form onSubmit={submit} className="space-y-4 rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-2 text-primary">
          <Lock className="h-5 w-5" />
          <h2 className="text-xl font-bold text-foreground">Painel Administrativo</h2>
        </div>
        <p className="text-xs text-muted-foreground">Digite a senha para acessar.</p>
        <Input type="password" aria-label="Senha" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p role="alert" className="text-xs font-semibold text-destructive">{error}</p>}
        <Button type="submit" className="w-full" disabled={busy}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Entrar
        </Button>
      </form>
    </main>
  );
}
