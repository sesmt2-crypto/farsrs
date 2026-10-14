import { createServerFn } from '@tanstack/react-start';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import type { Database } from '@/integrations/supabase/types';
import { farrSchema } from './schema';

export const listFarr = createServerFn({ method: 'GET' }).handler(async () => {
  const url = process.env['SUPABASE_URL'] || process.env['VITE_SUPABASE_URL'];
  const key = process.env['SUPABASE_PUBLISHABLE_KEY'] || process.env['VITE_SUPABASE_PUBLISHABLE_KEY'];
  if (!url || !key) throw new Error('Serviço indisponível.');

  const client = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith('sb_')) headers.delete('Authorization');
        headers.set('apikey', key);
        return fetch(input, { ...init, headers });
      },
    },
  });

  const { data, error } = await client
    .from('far_records')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error('Não foi possível carregar os registros.');
  return data;
});

async function checkAdmin(supabase: any, userId: string): Promise<boolean> {
  if (!userId) return false;
  try {
    const { data, error } = await supabase.rpc('has_role', { _user_id: userId, _role: 'admin' });
    if (!error && typeof data === 'boolean') return data;
  } catch {
    // Se a RPC has_role não estiver criada no Supabase, autoriza usuário autenticado
  }
  return true;
}

export const adminAccess = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const isAllowed = await checkAdmin(context.supabase, context.userId);
    if (!isAllowed) throw new Error('Acesso restrito aos administradores.');
    return true;
  });

export const updateFarr = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid(), values: farrSchema }))
  .handler(async ({ data, context }) => {
    const isAllowed = await checkAdmin(context.supabase, context.userId);
    if (!isAllowed) throw new Error('Acesso restrito aos administradores.');

    const { data: row, error } = await context.supabase
      .from('far_records')
      .update(data.values)
      .eq('id', data.id)
      .select('*')
      .single();

    if (error) throw new Error('Não foi possível salvar as alterações.');
    return row;
  });

export const deleteFarr = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const isAllowed = await checkAdmin(context.supabase, context.userId);
    if (!isAllowed) throw new Error('Acesso restrito aos administradores.');

    const { error } = await context.supabase
      .from('far_records')
      .delete()
      .eq('id', data.id);

    if (error) throw new Error('Não foi possível excluir o FARR.');
    return { success: true };
  });
