import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export const useAuth = (requireAuth = true) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const currentUser = session?.user || null;
        setUser(currentUser);
        
        if (requireAuth && !currentUser) {
          navigate("/auth");
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [requireAuth, navigate]);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      if (requireAuth && !user) {
        navigate("/auth");
      }
    } catch (error) {
      console.error("Auth error:", error);
      if (requireAuth) {
        navigate("/auth");
      }
    } finally {
      setLoading(false);
    }
  };

  return { user, loading };
};