import { Link, useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { ClipboardList, FilePlus2, LogOut, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import logo from '@/assets/srs-logo.png.asset.json';
import { Button } from '@/components/ui/button';
import { useSession } from './session';
export function FarrHeader() {
 const {user} = useSession(); const client = useQueryClient(); const navigate=useNavigate();
 async function logout(){await client.cancelQueries();client.clear();await supabase.auth.signOut();await navigate({to:'/auth',replace:true});}
 return <header className="border-b bg-card"><div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4"><Link to="/" className="flex min-w-0 items-center gap-4"><img src={logo.url} alt="SRS Prestadora de Serviços" className="h-16 w-24 object-contain"/><div><h1 className="text-xl font-bold">FARR · SRS</h1><p className="text-xs text-muted-foreground">Sistema de Gestão Integrado — SGI</p></div></Link><nav aria-label="Navegação principal" className="flex flex-wrap items-center gap-1"><Button variant="ghost" asChild><Link to="/" activeProps={{className:'bg-muted'}} activeOptions={{exact:true}}><FilePlus2/>Apontamento</Link></Button><Button variant="ghost" asChild><Link to="/registros" activeProps={{className:'bg-muted'}}><ClipboardList/>Registros</Link></Button><Button variant="outline" asChild><Link to={user?'/admin':'/auth'}><ShieldCheck/>Administração</Link></Button>{user && <Button variant="ghost" size="icon" title="Sair" aria-label="Sair" onClick={logout}><LogOut/></Button>}</nav></div></header>;
}
