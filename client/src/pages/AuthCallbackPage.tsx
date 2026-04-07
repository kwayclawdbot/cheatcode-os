import { useEffect } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

export default function AuthCallbackPage() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Supabase handles the hash fragment automatically via detectSessionInUrl
    // We just need to wait for the session to be established then redirect
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        subscription.unsubscribe();
        setLocation("/");
      } else if (event === "SIGNED_OUT") {
        subscription.unsubscribe();
        setLocation("/auth");
      }
    });

    // Fallback: if already signed in, redirect immediately
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        subscription.unsubscribe();
        setLocation("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [setLocation]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4">
        <Loader2 size={32} className="animate-spin mx-auto text-[#4DC820]" />
        <p className="text-sm text-muted-foreground">Completing sign in...</p>
      </div>
    </div>
  );
}
