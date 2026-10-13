import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { FarrForm } from '@/components/farr/form';
import { FarrDetail } from '@/components/farr/sheet';
import type { FarRecord } from '@/lib/farr/schema';
export const Route=createFileRoute('/')({head:()=>({meta:[{title:'FARR SRS | Apontamento e Resolução de Riscos'},{name:'description',content:'Registre condições de risco, ações corretivas e fotos antes e depois no FARR SRS.'},{property:'og:title',content:'FARR SRS — Novo apontamento'},{property:'og:description',content:'Formulário de Apontamento e Resolução de Riscos da SRS.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary'}]}),component:Home});
function Home(){const [sent,setSent]=useState<FarRecord|null>(null);return <main className="mx-auto max-w-3xl px-4 py-8"><div className="mb-6 border-b pb-5"><p className="mb-2 text-xs font-bold uppercase text-muted-foreground">Registro de FARR-SRS</p><h2 className="text-2xl font-bold">Apontamento e Resolução de Riscos</h2></div><FarrForm onSaved={setSent}/><Dialog open={!!sent} onOpenChange={o=>{if(!o)setSent(null);}}>{sent&&<FarrDetail record={sent}/>}</Dialog></main>;}
