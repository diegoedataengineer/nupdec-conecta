import type { ReactNode } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EstadoVazio({ titulo, descricao, acao }: { titulo: string; descricao?: string; acao?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed p-10 text-center space-y-2">
      <p className="font-medium text-foreground">{titulo}</p>
      {descricao && <p className="text-sm text-muted-foreground max-w-md mx-auto">{descricao}</p>}
      {acao && <div className="pt-2">{acao}</div>}
    </div>
  );
}

export function ErroCarregamento({ erro, tentar }: { erro: unknown; tentar?: () => void }) {
  const msg = erro instanceof Error ? erro.message : String(erro);
  return (
    <div className="rounded-xl border border-destructive/30 bg-bp-rose-light/50 p-6 text-center space-y-2">
      <AlertCircle className="h-6 w-6 mx-auto text-destructive" />
      <p className="font-medium">Não foi possível carregar</p>
      <p className="text-xs text-muted-foreground font-mono break-all">{msg}</p>
      {tentar && (
        <Button variant="outline" size="sm" onClick={tentar}>
          Tentar de novo
        </Button>
      )}
    </div>
  );
}
