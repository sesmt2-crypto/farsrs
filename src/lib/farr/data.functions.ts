import { createServerFn } from '@tanstack/react-start';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { useSession } from '@tanstack/react-start/server';
import { createHash, timingSafeEqual } from 'node:crypto';
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

function sessionConfig() {
  return {
    password: process.env['SESSION_SECRET']!,
    name: 'farr-admin',
    maxAge: 60 * 60 * 12,
    cookie: { httpOnly: true, secure: true, sameSite: 'lax' as const, path: '/' },
  };
}

async function isUnlocked() {
  const session = await useSession<{ unlocked?: boolean }>(sessionConfig());
  return !!session.data.unlocked;
}

async function requireAdmin() {
  if (!(await isUnlocked())) throw new Error('Acesso restrito. Informe a senha do painel.');
}

export const adminStatus = createServerFn({ method: 'GET' }).handler(async () => ({ unlocked: await isUnlocked() }));

export const unlockAdmin = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ password: z.string().max(200) }))
  .handler(async ({ data }) => {
    const expected = process.env['ADMIN_PASSWORD'];
    if (!expected) throw new Error('Senha não configurada.');
    const a = createHash('sha256').update(data.password).digest();
    const b = createHash('sha256').update(expected).digest();
    if (!timingSafeEqual(a, b)) return { ok: false as const };
    const session = await useSession<{ unlocked?: boolean }>(sessionConfig());
    await session.update({ unlocked: true });
    return { ok: true as const };
  });

export const lockAdmin = createServerFn({ method: 'POST' }).handler(async () => {
  const session = await useSession<{ unlocked?: boolean }>(sessionConfig());
  await session.clear();
  return { ok: true as const };
});

export const updateFarr = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.string().uuid(), values: farrSchema }))
  .handler(async ({ data }) => {
    await requireAdmin();
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data: row, error } = await supabaseAdmin
      .from('far_records')
      .update(data.values)
      .eq('id', data.id)
      .select('*')
      .single();
    if (error) throw new Error('Não foi possível salvar as alterações.');
    return row;
  });

export const deleteFarr = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    await requireAdmin();
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { error } = await supabaseAdmin.from('far_records').delete().eq('id', data.id);
    if (error) throw new Error('Não foi possível excluir o FARR.');
    return { success: true };
  });
