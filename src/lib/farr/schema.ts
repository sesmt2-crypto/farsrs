import { z } from 'zod';
import type { Database } from '@/integrations/supabase/types';
export type FarRecord = Database['public']['Tables']['far_records']['Row'];
export const CIPEIROS = ['ALTAIR CESÁR CARNEIRO', 'ELIAS MACHADO', 'PAULO CÉSAR DO SANTOS', 'PAULO HENRIQUE QUINTOPE', 'JOSÉ SILVIO GONÇALVES', 'JOSÉ FERREIRA DOS SANTOS', 'ARLENE NOGUEIRA', 'GABRIELA NOGUEIRA', 'ADINELSON FERREIRA', 'RAIRY RAEQUEL', 'ADRIEL TONETTE', 'LUIS FERNANDES BRANDALIZE', 'RICARDO CARNEIRO'] as const;
const name = z.string().trim().min(1, 'Preencha os campos obrigatórios.').max(150);
export const farrSchema = z.object({
  record_datetime: z.string().datetime(), record_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  cipeiro: name, setor: name, encarregado: name, supervisor: z.string().trim().max(150),
  risk_condition: z.string().trim().min(1).max(5000), corrective_action: z.string().trim().min(1).max(5000),
  responsible: name, status: z.enum(['CONCLUÍDO', 'EM ANDAMENTO']),
});
export const photoSchema = z.object({before_image_url: z.string().trim().min(1), after_image_url: z.string().trim().min(1)});
export function validatePhoto(file: Pick<File, 'size' | 'type'>) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Escolha uma imagem JPG, PNG ou WEBP.');
  if (file.size > 20 * 1024 * 1024) throw new Error('A foto deve ter até 20 MB.');
}
export function localDatetime(date = new Date()) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0,16);
}
export function dateLabel(record: FarRecord) { return new Date(record.record_datetime).toLocaleString('pt-BR'); }
export function statusLabel(status: string) { return status === 'CONCLUÍDO' ? 'Concluída' : status === 'EM ANDAMENTO' ? 'Em Andamento' : 'Pendente'; }
