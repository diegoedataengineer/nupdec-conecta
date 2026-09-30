import type { ReactNode } from "react";

interface CabecalhoPaginaProps {
  titulo: string;
  descricao?: ReactNode;
  etiqueta?: string;
  acoes?: ReactNode;
}

export function CabecalhoPagina({ titulo, descricao, etiqueta, acoes }: CabecalhoPaginaProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {etiqueta && <p className="tech-label mb-1">{etiqueta}</p>}
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">{titulo}</h1>
        {descricao && <div className="text-sm text-muted-foreground mt-1 max-w-2xl">{descricao}</div>}
      </div>
      {acoes && <div className="flex items-center gap-2 shrink-0">{acoes}</div>}
    </div>
  );
}
