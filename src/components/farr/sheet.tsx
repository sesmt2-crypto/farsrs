import { useEffect, useRef, useState } from 'react';
import { FileDown, Printer, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import logo from '@/assets/srs-logo.png.asset.json';
import { Button } from '@/components/ui/button';
import { DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { dateLabel, type FarRecord } from '@/lib/farr/schema';
async function imageData(value:string){
 let url=value;
 if(!value.startsWith('data:') && !value.includes('/__l5e/')){
  let path=value;if(value.startsWith('http')){const index=value.indexOf('/far-images/');if(index>=0)path=value.slice(index+12).split('?')[0];}
  if(!path.startsWith('http')){const {data,error}=await supabase.storage.from('far-images').createSignedUrl(path,3600);if(error||!data)throw new Error('Não foi possível carregar a foto.');url=data.signedUrl;}
 }
 const response=await fetch(url);if(!response.ok)throw new Error('Não foi possível carregar a imagem.');const blob=await response.blob();
 return new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>typeof reader.result==='string'?resolve(reader.result):reject(new Error('Imagem inválida.'));reader.onerror=()=>reject(new Error('Imagem inválida.'));reader.readAsDataURL(blob);});
}
export function FarrDetail({record}:{record:FarRecord}){
 const ref=useRef<HTMLDivElement>(null);const [photos,setPhotos]=useState<{before:string;after:string;logo:string}|null>(null);const [error,setError]=useState('');const [busy,setBusy]=useState(false);const [retry,setRetry]=useState(0);
 useEffect(()=>{let active=true;setPhotos(null);setError('');Promise.all([record.before_image_url?imageData(record.before_image_url):Promise.resolve(''),record.after_image_url?imageData(record.after_image_url):Promise.resolve(''),imageData(logo.url)]).then(([before,after,logo])=>{if(active)setPhotos({before,after,logo});}).catch(()=>{if(active)setError('As imagens não carregaram. Tente novamente antes de baixar o PDF.');});return()=>{active=false;};},[record,retry]);
 async function exportPdf(print=false){const node=ref.current;if(!node||!photos)return;const popup=print?window.open('','_blank'):null;setBusy(true);try{
  await Promise.all(Array.from(node.querySelectorAll('img')).map(img=>img.decode()));
  const [{default:html2canvas},{default:JsPDF}]=await Promise.all([import('html2canvas-pro'),import('jspdf')]);
  const canvas=await html2canvas(node,{scale:2,useCORS:true,backgroundColor:getComputedStyle(node).backgroundColor,windowWidth:1000});
  const pdf=new JsPDF({unit:'mm',format:'a4'});const margin=10;const width=190;const availableHeight=277;const pagePixels=Math.floor(availableHeight*canvas.width/width);
  for(let y=0,page=0;y<canvas.height;y+=pagePixels,page++){
   if(page>0)pdf.addPage();const slice=document.createElement('canvas');slice.width=canvas.width;slice.height=Math.min(pagePixels,canvas.height-y);const ctx=slice.getContext('2d');if(!ctx)throw new Error();ctx.drawImage(canvas,0,y,canvas.width,slice.height,0,0,canvas.width,slice.height);pdf.addImage(slice.toDataURL('image/png'),'PNG',margin,margin,width,slice.height*width/canvas.width);
  }
  if(print){if(!popup)throw new Error('Permita abrir a janela de impressão.');const url=URL.createObjectURL(pdf.output('blob'));popup.location.href=url;setTimeout(()=>URL.revokeObjectURL(url),60000);}else pdf.save(`${record.far_number}.pdf`);
 }catch(err){popup?.close();toast.error(err instanceof Error?err.message:'Não foi possível gerar o PDF.');}finally{setBusy(false);}}
 return <DialogContent className="max-h-[95dvh] w-[calc(100%-1rem)] max-w-4xl overflow-y-auto p-0"><div className="space-y-3 border-b p-4 pr-10"><DialogTitle>FARR {record.far_number}</DialogTitle><DialogDescription>{record.setor} · {dateLabel(record)}</DialogDescription><div className="flex flex-wrap gap-2"><Button size="sm" disabled={!photos||busy} onClick={()=>exportPdf()}>{busy?<Loader2 className="animate-spin"/>:<FileDown/>}Baixar PDF</Button><Button size="sm" variant="outline" disabled={!photos||busy} onClick={()=>exportPdf(true)}><Printer/>Imprimir FARR</Button></div></div>{error?<div role="alert" className="p-4 text-sm text-destructive">{error}<Button variant="outline" onClick={()=>setRetry(n=>n+1)} className="ml-2">Tentar novamente</Button></div>:!photos?<p className="flex items-center gap-2 p-4 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin"/>Carregando fotos…</p>:null}<div className="overflow-x-auto p-4"><div ref={ref} className="farr-sheet"><div className="sheet-header"><div className="sheet-logo"><img src={photos?.logo??logo.url} alt="SRS Prestadora de Serviços"/></div><div className="sheet-title"><strong>SISTEMA DE GESTÃO INTEGRADO — SGI</strong><strong>FARR - FORMULÁRIO DE APONTAMENTO E RESOLUÇÃO DE RISCOS</strong></div><div className="sheet-meta"><strong>{record.far_number}</strong><span>Rev. 00</span><span>{dateLabel(record)}</span></div></div><div className="sheet-pair"><Cell label="CIPEIRO" value={record.cipeiro}/><Cell label="SETOR" value={record.setor}/></div><div className="sheet-pair"><Cell label="ENCARREGADO" value={record.encarregado}/><Cell label="SUPERVISOR" value={record.supervisor||'—'}/></div><div className="sheet-table"><div className="sheet-column"><h3>CONDIÇÃO DE RISCO / ATO INSEGURO</h3><p>{record.risk_condition}</p></div><div className="sheet-column"><h3>AÇÃO CORRETIVA</h3><p>{record.corrective_action}</p></div><div className="sheet-column"><h3>RESPONSÁVEL</h3><p>{record.responsible}</p></div><div className="sheet-column"><h3>STATUS</h3><p className={record.status==='CONCLUÍDO'?'sheet-status status-success':'sheet-status status-progress'}>{record.status}</p></div></div><h3 className="sheet-band">REGISTRO FOTOGRÁFICO</h3><div className="sheet-photos">{[['ANTES',photos?.before],['DEPOIS',photos?.after]].map(([label,url])=><div key={label}><h3 className="sheet-band">{label}</h3><div className="sheet-photo">{url?<img src={url} alt={`Foto ${label}`}/>:<span>{photos?'Sem foto':'Carregando…'}</span>}</div></div>)}</div><footer className="sheet-footer">Protocolo: {record.far_number} · Registro: {dateLabel(record)}</footer></div></div></DialogContent>;
}
function Cell({label,value}:{label:string;value:string}){return <div className="sheet-cell"><strong>{label}:</strong><span>{value}</span></div>;}
