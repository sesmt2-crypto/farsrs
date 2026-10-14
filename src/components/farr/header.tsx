import { Link, useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { ClipboardList, FilePlus2, LogOut, ShieldCheck, User as UserIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import logo from '@/assets/srs-logo.png.asset.json';
import { Button } from '@/components/ui/button';
import { useSession } from './session';

export function FarrHeader() {
  const { user } = useSession();
  const client = useQueryClient();
  const navigate = useNavigate();

  async function logout() {
    await client.cancelQueries();
    client.clear();
    await supabase.auth.signOut();
    await navigate({ to: '/auth', replace: true });
  }

  return (
    <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-3">
        <Link to="/" className="flex min-w-0 items-center gap-3 transition-opacity hover:opacity-90">
          <img
            src={logo.url}
            alt="SRS Prestadora de Serviços"
            className="h-12 w-auto max-w-[120px] object-contain"
          />
          <div className="border-l pl-3">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black tracking-tight text-foreground">FARR</h1>
              <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">SGI</span>
            </div>
            <p className="text-xs text-muted-foreground">Registro de Risco / Ato Inseguro</p>
          </div>
        </Link>

        <nav aria-label="Navegação principal" className="flex flex-wrap items-center gap-1.5">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/" activeProps={{ className: 'bg-muted font-bold' }} activeOptions={{ exact: true }}>
              <FilePlus2 className="h-4 w-4" />
              <span>Novo FARR</span>
            </Link>
          </Button>

          <Button variant="ghost" size="sm" asChild>
            <Link to="/registros" activeProps={{ className: 'bg-muted font-bold' }}>
              <ClipboardList className="h-4 w-4" />
              <span>Registros</span>
            </Link>
          </Button>

          <Button variant={user ? "secondary" : "outline"} size="sm" asChild>
            <Link to="/admin" activeProps={{ className: 'ring-1 ring-primary' }}>
              <ShieldCheck className="h-4 w-4 text-primary" />
              <span>{user ? 'Painel Admin' : 'Admin'}</span>
            </Link>
          </Button>

          {user && (
            <div className="flex items-center gap-1 pl-2 border-l">
              <span className="hidden text-xs text-muted-foreground md:inline-flex items-center gap-1 max-w-[140px] truncate" title={user.email ?? ''}>
                <UserIcon className="h-3.5 w-3.5" />
                <span className="truncate">{user.email?.split('@')[0]}</span>
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:bg-destructive/10"
                title="Sair do sistema"
                aria-label="Sair"
                onClick={logout}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
