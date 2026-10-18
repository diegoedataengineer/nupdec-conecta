import { Link, useSearchParams } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Camera, CheckCircle2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppAuth } from "../AppAuthContext";
import { useFotoApp, useOcorrenciasDoNucleo } from "../hooks";
import { STATUS_OCORRENCIA, TIPOS_OCORRENCIA } from "@/lib/rotulos";
import { cn } from "@/lib/utils";
import type { StatusOcorrencia } from "@/integrations/supabase/types";

function Miniatura({ path }: { path: string | null }) {
  const foto = useFotoApp(path);
  if (!path) return <span className="h-14 w-14 rounded-xl bg-muted flex items-center justify-center text-muted-foreground"><Camera className="h-5 w-5" /></span>;
  return foto.data ? <img src={foto.data} alt="" className="h-14 w-14 rounded-xl object-cover" /> : <span className="h-14 w-14 rounded-xl bg-muted animate-pulse" />;
}

export default function Ocorrencias() {
  const { perfil } = useAppAuth();
  const q = useOcorrenciasDoNucleo();
  const [params] = useSearchParams();
  const nova = params.get("nova");
  const aprovado = perfil?.membro_status === "aprovado";

  return (
    <div className="px-4 pt-3 pb-6 space-y-4">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{perfil?.nucleo_nome ?? "Nupdec"}</p>
          <h1 className="font-display text-2xl font-bold">Ocorrências</h1>
        </div>
        {aprovado && (
          <Button asChild size="sm">
            <Link to="/app/ocorrencia/nova"><Plus className="h-4 w-4" /> Reportar</Link>
          </Button>
        )}
      </header>

      {nova && (
        <div className="rounded-2xl bg-bp-emerald-light text-bp-emerald p-3 flex items-center gap-2 text-sm">
          <CheckCircle2 className="h-5 w-5 shrink-0" /> Ocorrência enviada. A Defesa Civil recebe na hora e faz a triagem.
        </div>
      )}

      {q.isLoading ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-20 rounded-2xl bg-muted animate-pulse" />)}</div>
      ) : (q.data?.length ?? 0) === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Nenhuma ocorrência do seu núcleo ainda.</p>
      ) : (
        <ul className="space-y-2">
          {q.data!.map((o) => {
            const st = STATUS_OCORRENCIA[o.status as StatusOcorrencia];
            const minha = o.membro_id === perfil?.membro_id;
            return (
              <li key={o.id} className={cn("rounded-2xl border border-border p-3 flex gap-3", o.id === nova && "ring-2 ring-bp-emerald")}>
                <Miniatura path={o.foto_path} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold truncate">{TIPOS_OCORRENCIA[o.tipo]}</p>
                    <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-medium whitespace-nowrap", st?.badge)}>{st?.rotulo ?? o.status}</span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{o.descricao ?? "—"}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {minha ? "você" : (o.membro?.perfil?.nome ?? "membro")} · há {formatDistanceToNow(new Date(o.criado_em), { locale: ptBR })}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
