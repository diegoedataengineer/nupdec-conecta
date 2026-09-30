import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404: rota inexistente:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted px-6">
      <div className="text-center space-y-4">
        <p className="font-mono text-6xl font-bold text-primary">404</p>
        <p className="text-xl text-muted-foreground">Esta página não existe.</p>
        <div className="flex gap-2 justify-center">
          <Button asChild variant="outline">
            <Link to="/">Página de download</Link>
          </Button>
          <Button asChild>
            <Link to="/painel">Ir para o painel</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
