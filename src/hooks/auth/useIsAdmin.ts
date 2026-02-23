import { useState, useEffect } from 'react';
import { supabase } from "@/lib/api/queries/client/supabase";

export function useIsAdmin() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setIsAdmin(!!data.session);
    });
  }, []);

  return isAdmin;
}