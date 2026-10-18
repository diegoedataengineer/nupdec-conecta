import { useEffect, useRef, useState, type ReactNode } from "react";
import { Map as MapIcon, Satellite } from "lucide-react";
import maplibregl, { type ExpressionSpecification, type MapGeoJSONFeature, type MapMouseEvent } from "maplibre-gl";
import type { FeatureCollection, Geometry } from "geojson";
import { MAP_STYLE_URL } from "@/integrations/supabase/client";
import { CENTRO_PADRAO } from "@/lib/geo";
import { cn } from "@/lib/utils";

/**
 * Mapa MapLibre com camadas declarativas. Cada `CamadaMapa` vira um source
 * GeoJSON + um layer; mudar `dados` só faz `setData`, sem recriar o mapa.
 *
 * Hachura: `fill-pattern` com imagens geradas em canvas (`padroes`), porque o
 * MapLibre não desenha listras nativamente.
 */

export interface CamadaMapa {
  id: string;
  tipo: "fill" | "line" | "circle" | "symbol";
  dados: FeatureCollection<Geometry, Record<string, unknown>>;
  paint?: Record<string, unknown>;
  layout?: Record<string, unknown>;
  /** clique numa feição desta camada */
  onClick?: (feature: MapGeoJSONFeature, lngLat: maplibregl.LngLat) => void;
  /** HTML do popup ao passar o mouse (opcional) */
  popupHtml?: (feature: MapGeoJSONFeature) => string;
}

export interface PadraoHachura {
  nome: string;
  cor: string;
}

interface MapaProps {
  camadas: CamadaMapa[];
  /** [oeste, sul, leste, norte]; quando muda, o mapa reenquadra */
  bounds?: [number, number, number, number] | null;
  centro?: [number, number];
  zoom?: number;
  padroes?: PadraoHachura[];
  className?: string;
  /** recebe o mapa depois do `load` (para o desenho de polígonos) */
  onCarregado?: (mapa: maplibregl.Map) => void;
  children?: ReactNode;
  /** mostra o botão Mapa/Satélite (desligar nos formulários de desenho) */
  alternarBase?: boolean;
}

/** Listras diagonais 45° em canvas, para `fill-pattern`. */
function gerarHachura(cor: string): ImageData {
  const tam = 12;
  const canvas = document.createElement("canvas");
  canvas.width = tam;
  canvas.height = tam;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, tam, tam);
  ctx.strokeStyle = cor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  // três linhas para a textura repetir sem costura
  ctx.moveTo(-tam / 2, tam / 2);
  ctx.lineTo(tam / 2, -tam / 2);
  ctx.moveTo(0, tam);
  ctx.lineTo(tam, 0);
  ctx.moveTo(tam / 2, tam * 1.5);
  ctx.lineTo(tam * 1.5, tam / 2);
  ctx.stroke();
  return ctx.getImageData(0, 0, tam, tam);
}

const TIPO_LAYER = { fill: "fill", line: "line", circle: "circle", symbol: "symbol" } as const;

/**
 * Mapa base: "mapa" (OpenFreeMap, vetorial) ou "satelite" (imagens Esri World
 * Imagery + rótulos de referência da Esri; uso livre com atribuição, sem chave).
 * A preferência fica no navegador e vale para painel, diretoria e celular.
 */
export type BaseMapa = "mapa" | "satelite";
const CHAVE_BASE = "nupdec-mapa-base";
export function lerBase(): BaseMapa {
  try { return localStorage.getItem(CHAVE_BASE) === "satelite" ? "satelite" : "mapa"; } catch { return "mapa"; }
}
const ESTILO_SATELITE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    satelite: {
      type: "raster",
      tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
      tileSize: 256,
      maxzoom: 19,
      attribution: "Imagens © Esri, Maxar, Earthstar Geographics, GIS User Community",
    },
    rotulos: {
      type: "raster",
      tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"],
      tileSize: 256,
      maxzoom: 19,
    },
  },
  layers: [
    { id: "satelite", type: "raster", source: "satelite" },
    { id: "rotulos", type: "raster", source: "rotulos", paint: { "raster-opacity": 0.9 } },
  ],
};
const estiloDe = (b: BaseMapa) => (b === "satelite" ? ESTILO_SATELITE : MAP_STYLE_URL);

export function Mapa({ camadas, bounds, centro, zoom, padroes, className, onCarregado, children, alternarBase = true }: MapaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapaRef = useRef<maplibregl.Map | null>(null);
  const [pronto, setPronto] = useState(false);
  const camadasRef = useRef<CamadaMapa[]>(camadas);
  camadasRef.current = camadas;
  const handlersRef = useRef(new Map<string, (e: MapMouseEvent & { features?: MapGeoJSONFeature[] }) => void>());
  const eventosRef = useRef(new Set<string>());
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const [base, setBase] = useState<BaseMapa>(lerBase);
  const [versaoEstilo, setVersaoEstilo] = useState(0);
  const padroesRef = useRef(padroes);
  padroesRef.current = padroes;

  // 1) cria o mapa uma vez
  useEffect(() => {
    if (!containerRef.current || mapaRef.current) return;
    const mapa = new maplibregl.Map({
      container: containerRef.current,
      style: estiloDe(lerBase()),
      center: centro ?? CENTRO_PADRAO,
      zoom: zoom ?? 12,
      attributionControl: { compact: true },
    });
    mapa.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    mapa.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-left");
    mapaRef.current = mapa;

    mapa.on("load", () => {
      for (const p of padroes ?? []) {
        if (!mapa.hasImage(p.nome)) mapa.addImage(p.nome, gerarHachura(p.cor), { pixelRatio: 1 });
      }
      setPronto(true);
      onCarregado?.(mapa);
    });

    return () => {
      mapa.remove();
      mapaRef.current = null;
      setPronto(false);
    };
    // criação única: props iniciais só valem no mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 1b) troca de base: setStyle apaga sources/layers; depois do style.load, reaplica
  const trocarBase = (nova: BaseMapa) => {
    const mapa = mapaRef.current;
    if (!mapa || nova === base) return;
    setBase(nova);
    try { localStorage.setItem(CHAVE_BASE, nova); } catch { /* sem storage */ }
    mapa.once("style.load", () => {
      for (const p of padroesRef.current ?? []) {
        if (!mapa.hasImage(p.nome)) mapa.addImage(p.nome, gerarHachura(p.cor), { pixelRatio: 1 });
      }
      setVersaoEstilo((v) => v + 1);
    });
    mapa.setStyle(estiloDe(nova));
  };

  // 2) sincroniza camadas
  useEffect(() => {
    const mapa = mapaRef.current;
    if (!mapa || !pronto) return;

    const idsAtuais = new Set(camadas.map((c) => c.id));

    // remove camadas que sumiram
    for (const [id, handler] of handlersRef.current) {
      if (!idsAtuais.has(id)) {
        mapa.off("click", id, handler);
        handlersRef.current.delete(id);
      }
    }
    const style = mapa.getStyle();
    for (const layer of style?.layers ?? []) {
      if (layer.id.startsWith("nc-") && !idsAtuais.has(layer.id.slice(3))) {
        mapa.removeLayer(layer.id);
        if (mapa.getSource(layer.id)) mapa.removeSource(layer.id);
      }
    }

    for (const c of camadas) {
      const idLayer = `nc-${c.id}`;
      const src = mapa.getSource(idLayer) as maplibregl.GeoJSONSource | undefined;
      if (src) {
        src.setData(c.dados);
        // paint pode mudar (ex.: seleção): aplica propriedade a propriedade
        for (const [k, v] of Object.entries(c.paint ?? {})) {
          mapa.setPaintProperty(idLayer, k, v as ExpressionSpecification);
        }
        for (const [k, v] of Object.entries(c.layout ?? {})) {
          mapa.setLayoutProperty(idLayer, k, v as ExpressionSpecification);
        }
        continue;
      }
      mapa.addSource(idLayer, { type: "geojson", data: c.dados });
      mapa.addLayer({
        id: idLayer,
        type: TIPO_LAYER[c.tipo],
        source: idLayer,
        paint: c.paint ?? {},
        layout: c.layout ?? {},
      } as maplibregl.AddLayerObject);

      if (eventosRef.current.has(c.id)) continue; // handlers sobrevivem ao setStyle; não duplicar
      eventosRef.current.add(c.id);
      if (c.onClick || c.popupHtml) {
        mapa.on("mouseenter", idLayer, () => (mapa.getCanvas().style.cursor = "pointer"));
        mapa.on("mouseleave", idLayer, () => {
          mapa.getCanvas().style.cursor = "";
          popupRef.current?.remove();
        });
      }
      if (c.popupHtml) {
        mapa.on("mousemove", idLayer, (e) => {
          const f = e.features?.[0];
          const atual = camadasRef.current.find((x) => x.id === c.id);
          if (!f || !atual?.popupHtml) return;
          popupRef.current?.remove();
          popupRef.current = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 10 })
            .setLngLat(e.lngLat)
            .setHTML(atual.popupHtml(f))
            .addTo(mapa);
        });
      }
      if (c.onClick) {
        const handler = (e: MapMouseEvent & { features?: MapGeoJSONFeature[] }) => {
          const f = e.features?.[0];
          const atual = camadasRef.current.find((x) => x.id === c.id);
          if (f && atual?.onClick) atual.onClick(f, e.lngLat);
        };
        handlersRef.current.set(c.id, handler);
        mapa.on("click", idLayer, handler);
      }
    }
  }, [camadas, pronto, versaoEstilo]);

  // 3) enquadra
  const chaveBounds = bounds ? bounds.join(",") : "";
  useEffect(() => {
    const mapa = mapaRef.current;
    if (!mapa || !pronto || !bounds) return;
    mapa.fitBounds([bounds[0], bounds[1], bounds[2], bounds[3]], { padding: 40, maxZoom: 15, duration: 400 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chaveBounds, pronto]);

  return (
    <div className={cn("relative w-full h-[420px] rounded-xl overflow-hidden border bg-muted", className)}>
      <div ref={containerRef} className="absolute inset-0" />
      {alternarBase && (
        <div className="absolute top-2 left-2 z-[1] inline-flex rounded-lg border bg-card/95 backdrop-blur shadow-bp-card overflow-hidden text-xs">
          <button type="button" onClick={() => trocarBase("mapa")} className={cn("px-2.5 py-1.5 inline-flex items-center gap-1", base === "mapa" ? "bg-primary text-primary-foreground" : "hover:bg-accent")} title="Mapa">
            <MapIcon className="h-3.5 w-3.5" /> Mapa
          </button>
          <button type="button" onClick={() => trocarBase("satelite")} className={cn("px-2.5 py-1.5 inline-flex items-center gap-1", base === "satelite" ? "bg-primary text-primary-foreground" : "hover:bg-accent")} title="Satélite">
            <Satellite className="h-3.5 w-3.5" /> Satélite
          </button>
        </div>
      )}
      {children}
    </div>
  );
}

/** Legenda flutuante padrão do painel. */
export function LegendaMapa({ itens, className }: { itens: { cor: string; rotulo: string; hachura?: boolean }[]; className?: string }) {
  return (
    <div
      className={cn(
        "absolute bottom-3 right-3 z-[1] rounded-lg border bg-card/95 backdrop-blur px-3 py-2 text-xs shadow-bp-card space-y-1",
        className,
      )}
    >
      {itens.map((i) => (
        <div key={i.rotulo} className="flex items-center gap-2">
          <span
            className="inline-block h-3 w-3 rounded-sm border"
            style={
              i.hachura
                ? { backgroundImage: `repeating-linear-gradient(45deg, ${i.cor} 0 2px, transparent 2px 5px)`, borderColor: i.cor }
                : { backgroundColor: i.cor, borderColor: i.cor }
            }
          />
          <span className="text-muted-foreground">{i.rotulo}</span>
        </div>
      ))}
    </div>
  );
}
