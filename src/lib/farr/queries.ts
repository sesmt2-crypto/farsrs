import { queryOptions } from '@tanstack/react-query';
import { listFarr } from './data.functions';
export const farrQuery = () => queryOptions({queryKey:['farr'],queryFn:()=>listFarr()});
