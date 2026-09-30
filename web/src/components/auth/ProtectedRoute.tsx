import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Loader2, ShieldOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

/**
 * Guarda das rotas /painel/*: exige sessão e papel agente ou coordenador.
 * A verificação no cliente é só conforto de navegação — quem garante é a RLS.
 */
const ProtectedRoute = () => {
  const { session, perfil, loading, eGestor, signOut } = useAuth();
  const location = useLocation();

  if (loading || (session && !perfil)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/painel/entrar" replace state={{ de: location.pathname }} />;
  }

  if (!eGestor) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <div className="max-w-md text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-bp-rose-light">
            <ShieldOff className="h-7 w-7 text-bp-rose" />
          </div>
          <h1 className="font-display text-2xl font-semibold">Este painel é da Compdec</h1>
          <p className="text-sm text-muted-foreground">
            A conta <b>{perfil?.email}</b> é de membro de núcleo. Membros usam o aplicativo no
            celular; o painel é para agentes e coordenadores da Defesa Civil municipal.
          </p>
          <Button variant="outline" onClick={() => void signOut()}>
            Sair e entrar com outra conta
          </Button>
        </div>
      </div>
    );
  }

  return <Outlet />;
};

export default ProtectedRoute;
