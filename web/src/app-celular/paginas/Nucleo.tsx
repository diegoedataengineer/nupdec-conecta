import { Phone, Shield, Users } from "lucide-react";
import { useAppAuth } from "../AppAuthContext";
import { useAreasRiscoApp, useNucleoDoMembro, useOcorrenciasDoNucleo } from "../hooks";
import { MapaCelular } from "../MapaCelular";
import type { Geometry } from "geojson";
import { TIPOS_OCORRENCIA } from "@/lib/rotulos";
import { STATUS_MEMBRO } from "@/lib/rotulos";
import { cn } from "@/lib/utils";
import type { StatusMembro } from "@/integrations/supabase/types";

export default function Nucleo() {
  const { perfil } = useAppAuth();
  const q = useNucleoDoMembro();
  const areas = useAreasRiscoApp();
  const ocorrencias = useOcorrenciasDoNucleo();
  const n = q.data?.nucleo;
  const membros = q.data?.membros ?? [];
  const aprovados = membros.filter((m) => m.status === "aprovado");
  const outros = membros.filter((m) => m.status !== "aprovado");

  return (
    <div className="px-4 pt-3 pb-6 space-y-4">
      <header>
        <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{perfil?.municipio_nome ?? "Município"}</p>
        <h1 className="font-display text-2xl font-bold">{n?.nome ?? "Meu núcleo"}</h1>
        {n && <p className="text-sm text-muted-foreground">{n.comunidade}</p>}
      </header>

      {n && (
        <MapaCelular
          className="h-52"
          nucleo={n.area_geojson as Geometry | null}
          areasRisco={(areas.data ?? []) as never}
          pontos={(ocorrencias.data ?? []).filter((o) => o.local_geojson).map((o) => ({ id: o.id, rotulo: TIPOS_OCORRENCIA[o.tipo], geometria: o.local_geojson! }))}
        />
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border p-3">
          <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Membros ativos</p>
          <p className="text-2xl font-bold">{aprovados.length}</p>
        </div>
        <div className="rounded-2xl border border-border p-3">
          <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Líder</p>
          <p className="text-sm font-semibold leading-tight mt-1">
            {membros.find((m) => m.id === n?.responsavel_membro_id)?.perfil?.nome ?? "—"}
          </p>
        </div>
      </div>

      <section>
        <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2 inline-flex items-center gap-1">
          <Users className="h-3 w-3" /> Quem está na rede
        </p>
        <ul className="divide-y divide-border rounded-2xl border border-border">
          {aprovados.map((m) => (
            <li key={m.id} className="flex items-center gap-3 px-3 py-2.5">
              <span className="h-8 w-8 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-xs font-semibold">
                {(m.perfil?.nome ?? "?").split(" ").map((p) => p[0]).slice(0, 2).join("")}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">
                  {m.perfil?.nome ?? "—"}
                  {m.id === perfil?.membro_id && <span className="text-muted-foreground"> (você)</span>}
                </p>
                <p className="text-[11px] text-muted-foreground">{m.funcao ?? "apoio"}</p>
              </div>
              {m.perfil?.telefone && (
                <a href={`tel:${m.perfil.telefone}`} className="text-primary" aria-label="ligar"><Phone className="h-4 w-4" /></a>
              )}
              {m.id === n?.responsavel_membro_id && <Shield className="h-4 w-4 text-primary" aria-label="líder" />}
            </li>
          ))}
        </ul>
      </section>

      {outros.length > 0 && (
        <section>
          <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">Aguardando aprovação / desligados</p>
          <ul className="space-y-1">
            {outros.map((m) => (
              <li key={m.id} className="flex items-center justify-between text-xs px-1">
                <span className="truncate">{m.perfil?.nome ?? "—"}</span>
                <span className={cn("rounded-full px-2 py-0.5 border", STATUS_MEMBRO[m.status as StatusMembro]?.badge)}>
                  {STATUS_MEMBRO[m.status as StatusMembro]?.rotulo ?? m.status}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
