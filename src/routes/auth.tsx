import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { ShieldCheck, LogIn, Loader2, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSession } from '@/components/farr/session';
import logo from '@/assets/srs-logo.png.asset.json';

export const Route = createFileRoute('/auth')({
  head: () => ({
    meta: [
      { title: 'Acesso Administrativo · FARR SRS' },
      { name: 'description', content: 'Entre com sua conta autorizada para gerenciar os registros de FARR da SRS.' },
      { property: 'og:title', content: 'Acesso Administrativo — FARR SRS' },
      { property: 'og:description', content: 'Entrada restrita aos administradores do FARR SRS.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  component: Auth,
});

function Auth() {
  const navigate = useNavigate();
  const { user, ready } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (ready && user) {
      navigate({ to: '/admin', replace: true });
    }
  }, [ready, user, navigate]);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) throw new Error('E-mail ou senha inválidos.');
      await navigate({ to: '/admin', replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível entrar.');
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    setBusy(true);
    setError('');
    try {
      const result = await lovable.auth.signInWithOAuth('google', {
        redirect_uri: `${window.location.origin}/auth`,
      });
      if (result.error) setError('Não foi possível entrar com Google.');
    } catch {
      setError('Não foi possível entrar com Google.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <div className="mb-4">
        <Button variant="ghost" size="sm" asChild className="gap-1.5 text-xs text-muted-foreground">
          <Link to="/">
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Voltar ao formulário</span>
          </Link>
        </Button>
      </div>

      <div className="rounded-xl border bg-card p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col items-center text-center">
          <img
            src={logo.url || '/srs-logo.png'}
            alt="SRS Prestadora de Serviços"
            className="h-14 w-auto object-contain mb-3"
          />
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase text-primary tracking-wider">
            <ShieldCheck className="h-4 w-4" />
            <span>Área Restrita</span>
          </div>
          <h2 className="mt-1 text-2xl font-black text-foreground tracking-tight">Painel Administrativo</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Acesso para gestores do Sistema de Gestão Integrado (SGI).
          </p>
        </div>

        <form onSubmit={login} className="mt-6 space-y-4">
          <label className="block space-y-1.5">
            <span className="text-xs font-bold uppercase text-foreground/80">E-mail</span>
            <Input
              type="email"
              autoComplete="username"
              maxLength={255}
              required
              placeholder="seu.email@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-bold uppercase text-foreground/80">Senha</span>
            <Input
              type="password"
              autoComplete="current-password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          {error && (
            <p role="alert" className="rounded-md bg-destructive/10 p-2.5 text-xs font-semibold text-destructive">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full gap-2" size="lg" disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
            <span>Entrar no Sistema</span>
          </Button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground font-semibold">ou</span>
            </div>
          </div>

          <Button type="button" variant="outline" className="w-full" disabled={busy} onClick={google}>
            Entrar com conta Google
          </Button>
        </form>
      </div>
    </main>
  );
}
