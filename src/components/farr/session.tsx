import { createContext, useContext } from 'react';
import type { User } from '@supabase/supabase-js';
export const SessionContext = createContext<{user:User|null; ready:boolean}>({user:null,ready:false});
export const useSession = () => useContext(SessionContext);
