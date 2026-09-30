import { useEffect, useRef, useState } from "react";
import type maplibregl from "maplibre-gl";
import type { Polygon } from "geojson";
import { TerraDraw, TerraDrawPolygonMode, TerraDrawSelectMode } from "terra-draw";
import { TerraDrawMapLibreGLAdapter } from "terra-draw-maplibre-gl-adapter";
import { Eraser, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fecharPoligono } from "@/lib/geo";

/**
 * Desenho e edição de UM polígono sobre o mapa, com terra-draw.
 *
 * Escolhido no lugar do @mapbox/mapbox-gl-draw: o terra-draw tem adaptador
 * oficial para o MapLibre (sem hack de compatibilidade) e edição por arraste
 * de vértice pronta no modo select.
 *
 * Fluxo: "Desenhar" → clique em cada vértice → clique no primeiro ponto (ou
 * duplo clique) para fechar → o polígono entra em modo de seleção, onde dá
 * para arrastar vértices e pontos médios. "Limpar" apaga e volta ao início.
 */
interface DesenhoPoligonoProps {
  mapa: maplibregl.Map | null;
  valor: Polygon | null;
  onChange: (poligono: Polygon | null) => void;
  cor?: string;
  desabilitado?: boolean;
}

export function DesenhoPoligono({ mapa, valor, onChange, cor = "#17458c", desabilitado }: DesenhoPoligonoProps) {
  const drawRef = useRef<TerraDraw | null>(null);
  const [desenhando, setDesenhando] = useState(false);
  const [temPoligono, setTemPoligono] = useState(!!valor);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const valorInicialRef = useRef(valor);

  useEffect(() => {
    if (!mapa) return;
    const draw = new TerraDraw({
      adapter: new TerraDrawMapLibreGLAdapter({ map: mapa }),
      modes: [
        new TerraDrawPolygonMode({
          styles: {
            fillColor: cor as `#${string}`,
            fillOpacity: 0.2,
            outlineColor: cor as `#${string}`,
            outlineWidth: 2,
            closingPointColor: cor as `#${string}`,
            closingPointOutlineColor: "#ffffff",
            closingPointWidth: 5,
          },
        }),
        new TerraDrawSelectMode({
          flags: {
            polygon: {
              feature: {
                draggable: false,
                coordinates: { midpoints: true, draggable: true, deletable: true },
              },
            },
          },
          styles: {
            selectedPolygonColor: cor as `#${string}`,
            selectedPolygonFillOpacity: 0.25,
            selectedPolygonOutlineColor: cor as `#${string}`,
            selectedPolygonOutlineWidth: 2,
            selectionPointColor: "#ffffff",
            selectionPointOutlineColor: cor as `#${string}`,
            selectionPointOutlineWidth: 2,
            selectionPointWidth: 5,
            midPointColor: cor as `#${string}`,
            midPointOutlineColor: "#ffffff",
            midPointWidth: 4,
          },
        }),
      ],
    });
    draw.start();
    drawRef.current = draw;

    const emitir = () => {
      const poligonos = draw.getSnapshot().filter((f) => f.geometry.type === "Polygon" && f.properties.mode === "polygon");
      const f = poligonos[0];
      setTemPoligono(!!f);
      onChangeRef.current(f ? fecharPoligono(f.geometry as Polygon) : null);
    };

    draw.on("finish", (id, ctx) => {
      if (ctx.action === "draw") {
        // um polígono só: apaga os anteriores e entra em edição
        for (const f of draw.getSnapshot()) {
          if (f.id !== id && f.properties.mode === "polygon") draw.removeFeatures([f.id!]);
        }
        setDesenhando(false);
        draw.setMode("select");
        draw.selectFeature(id);
      }
      emitir();
    });
    draw.on("change", (_ids, tipo) => {
      if (tipo === "delete") emitir();
    });

    // polígono existente (edição)
    if (valorInicialRef.current) {
      const res = draw.addFeatures([
        { type: "Feature", geometry: valorInicialRef.current, properties: { mode: "polygon" } },
      ]);
      if (res.some((r) => !r.valid)) console.warn("polígono existente inválido para o terra-draw", res);
      draw.setMode("select");
    }

    return () => {
      try {
        draw.stop();
      } catch {
        /* mapa já removido */
      }
      drawRef.current = null;
    };
  }, [mapa, cor]);

  const iniciar = () => {
    const draw = drawRef.current;
    if (!draw) return;
    draw.setMode("polygon");
    setDesenhando(true);
  };

  const limpar = () => {
    const draw = drawRef.current;
    if (!draw) return;
    draw.clear();
    draw.setMode("select");
    setDesenhando(false);
    setTemPoligono(false);
    onChangeRef.current(null);
  };

  return (
    <div className="absolute top-3 left-3 z-[1] flex flex-col gap-2">
      <div className="flex gap-2">
        <Button type="button" size="sm" onClick={iniciar} disabled={!mapa || desabilitado || desenhando} className="shadow-bp-card">
          <PenLine className="h-4 w-4" />
          {temPoligono ? "Redesenhar" : "Desenhar"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={limpar}
          disabled={!mapa || desabilitado || (!temPoligono && !desenhando)}
          className="bg-card shadow-bp-card"
        >
          <Eraser className="h-4 w-4" />
          Limpar
        </Button>
      </div>
      {desenhando && (
        <p className="pointer-events-none rounded-md bg-card/95 border px-2.5 py-1.5 text-xs text-muted-foreground shadow-bp-card max-w-[260px]">
          Clique em cada vértice; clique no primeiro ponto para fechar. Depois, arraste os pontos para ajustar.
        </p>
      )}
    </div>
  );
}
