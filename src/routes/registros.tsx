import { createFileRoute } from '@tanstack/react-router';
import { farrQuery } from '@/lib/farr/queries';
import { Records } from '@/components/farr/records';
export const Route=createFileRoute('/registros')({head:()=>({meta:[{title:'Registros de FARR | SRS'},{name:'description',content:'Consulte os FARRs da SRS, visualize fotos e baixe a ficha institucional em PDF.'},{property:'og:title',content:'Registros de FARR — SRS'},{property:'og:description',content:'Apontamentos e resoluções de riscos registrados na SRS.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary'}]}),loader:async({context})=>{await context.queryClient.ensureQueryData(farrQuery());},component:()=> <main className="mx-auto max-w-6xl px-4 py-8"><Records/></main>});
