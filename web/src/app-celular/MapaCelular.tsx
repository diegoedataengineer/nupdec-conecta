import { useMemo } from "react";
import type { Geometry, Point } from "geojson";
import { Mapa, type CamadaMapa } from "@/components/mapa/Mapa";
import { NIVEIS_RISCO, SEVERIDADES } from "@/lib/rotulos";
import { bboxDe, paraFeatureCollection } from "@/lib/geo";
import { cn } from "@/lib/utils";
import type { NivelRisco, SeveridadeAlerta } from "@/integrations/supabase/types";

export interface AreaRiscoMapa { id: string; nome: string; nivel: NivelRisco; area_geojson: Geometry | null }
export interface PontoMapa { id: string; rotulo: string; geometria: Point; cor?: string }

interface Props {
  /** polígono do núcleo do membro (tracejado azul) */
  nucleo?: Geometry | null;
  /** áreas de risco do município (hachura por nível) */
  areasRisco?: AreaRiscoMapa[];
  /** área do alerta (preenchida na cor da severidade) */
  alerta?: { geometria: Geometry | null; severidade: SeveridadeAlerta } | null;
  /** pontos (ocorrências ou a posição do reporte) */
  pontos?: PontoMapa[];
  /** enquadra nestes elementos; padrão: alerta + núcleo + pontos */
  className?: string;
}

const PADROES = (Object.keys(NIVEIS_RISCO) as NivelRisco[]).map((n) => ({ nome: `hachura-${n}`, cor: NIVEIS_RISCO[n].cor }));

/**
 * Mapa do simulador: as mesmas camadas que o painel desenha (áreas de risco,
 * núcleo, área do alerta, pontos), em um componente só para as telas do celular.
 */
export function MapaCelular({ nucleo, areasRisco = [], alerta, pontos = [], className }: Props) {
  const camadas = useMemo<CamadaMapa[]>(() => {
    const lista: CamadaMapa[] = [];
    if (areasRisco.length) {
      const fc = paraFeatureCollection(areasRisco.map((a) => ({ geometria: a.area_geojson, propriedades: { nome: a.nome, nivel: a.nivel, padrao: `hachura-${a.nivel}` } })));
      lista.push({ id: "areas-risco", tipo: "fill", dados: fc, paint: { "fill-pattern": ["get", "padrao"], "fill-opacity": 0.8 }, popupHtml: (f) => `<b>${f.properties.nome}</b><br/>risco ${NIVEIS_RISCO[f.properties.nivel as NivelRisco].rotulo.toLowerCase()}` });
      lista.push({ id: "areas-risco-contorno", tipo: "line", dados: fc, paint: { "line-color": ["match", ["get", "nivel"], ...(Object.keys(NIVEIS_RISCO) as NivelRisco[]).flatMap((n) => [n, NIVEIS_RISCO[n].cor]), "#888"], "line-width": 1 } });
    }
    if (alerta?.geometria) {
      const cor = SEVERIDADES[alerta.severidade].cor;
      const fc = paraFeatureCollection([{ geometria: alerta.geometria, propriedades: {} }]);
      lista.push({ id: "alerta-fill", tipo: "fill", dados: fc, paint: { "fill-color": cor, "fill-opacity": 0.22 } });
      lista.push({ id: "alerta-linha", tipo: "line", dados: fc, paint: { "line-color": cor, "line-width": 3, "line-dasharray": [2, 1.5] } });
    }
    if (nucleo) {
      const fc = paraFeatureCollection([{ geometria: nucleo, propriedades: { nome: "Seu núcleo" } }]);
      lista.push({ id: "nucleo-fill", tipo: "fill", dados: fc, paint: { "fill-color": "hsl(212 72% 32%)", "fill-opacity": 0.12 } });
      lista.push({ id: "nucleo-linha", tipo: "line", dados: fc, paint: { "line-color": "hsl(212 72% 32%)", "line-width": 2.5 } });
    }
    if (pontos.length) {
      const fc = paraFeatureCollection(pontos.map((p) => ({ geometria: p.geometria, propriedades: { rotulo: p.rotulo, cor: p.cor ?? "hsl(351 70% 47%)" }, id: p.id })));
      lista.push({ id: "pontos-halo", tipo: "circle", dados: fc, paint: { "circle-radius": 11, "circle-color": ["get", "cor"], "circle-opacity": 0.25 } });
      lista.push({ id: "pontos", tipo: "circle", dados: fc, paint: { "circle-radius": 6, "circle-color": ["get", "cor"], "circle-stroke-color": "#fff", "circle-stroke-width": 2 }, popupHtml: (f) => `${f.properties.rotulo}` });
    }
    return lista;
  }, [nucleo, areasRisco, alerta, pontos]);

  const bounds = useMemo(
    () => bboxDe([alerta?.geometria, nucleo, ...pontos.map((p) => p.geometria)]) ?? bboxDe(areasRisco.map((a) => a.area_geojson)),
    [alerta, nucleo, pontos, areasRisco],
  );

  return (
    <div className={cn("rounded-2xl overflow-hidden border border-border", className)}>
      <Mapa camadas={camadas} bounds={bounds} padroes={PADROES} className="h-full w-full" />
    </div>
  );
}
