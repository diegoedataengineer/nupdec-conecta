import type { Feature, FeatureCollection, Geometry, MultiPolygon, Polygon, Position } from "geojson";
import { featureCollection, polygon as turfPolygon } from "@turf/helpers";
import { union } from "@turf/union";

/** Vale Sereno – SP (seed). Usado só até o limite do município carregar. */
export const CENTRO_PADRAO: [number, number] = [-45.9, -23.2];

/** Polígono GeoJSON → EWKT aceito pela coluna `area` (geometry(Polygon, 4326)). */
export function polygonParaEwkt(poligono: Polygon): string {
  const aneis = poligono.coordinates
    .map((anel) => "(" + anel.map(([lon, lat]) => `${lon} ${lat}`).join(", ") + ")")
    .join(", ");
  return `SRID=4326;POLYGON(${aneis})`;
}

/** Garante que cada anel fecha no ponto inicial (o terra-draw já fecha; o PostGIS exige). */
export function fecharPoligono(poligono: Polygon): Polygon {
  return {
    type: "Polygon",
    coordinates: poligono.coordinates.map((anel) => {
      const [a] = anel;
      const z = anel[anel.length - 1];
      return a[0] === z[0] && a[1] === z[1] ? anel : [...anel, a];
    }),
  };
}

/**
 * União de vários polígonos (áreas de risco selecionadas) em uma geometria só.
 * Cai para MultiPolygon simples se o turf falhar (geometria degenerada).
 */
export function unirPoligonos(poligonos: Polygon[]): Polygon | MultiPolygon | null {
  if (poligonos.length === 0) return null;
  if (poligonos.length === 1) return poligonos[0];
  try {
    const fc = featureCollection(poligonos.map((p) => turfPolygon(p.coordinates)));
    const resultado = union(fc);
    if (resultado?.geometry) return resultado.geometry;
  } catch (e) {
    console.warn("união de polígonos falhou; usando MultiPolygon", e);
  }
  return { type: "MultiPolygon", coordinates: poligonos.map((p) => p.coordinates) };
}

export function bboxDe(geometrias: (Geometry | null | undefined)[]): [number, number, number, number] | null {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  const visitar = (c: Position | Position[] | Position[][] | Position[][][]) => {
    if (typeof c[0] === "number") {
      const [x, y] = c as Position;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    } else {
      (c as Position[]).forEach(visitar);
    }
  };
  for (const g of geometrias) {
    if (!g) continue;
    if (g.type === "GeometryCollection") g.geometries.forEach((gg) => visitar((gg as Polygon).coordinates));
    else visitar((g as Polygon).coordinates);
  }
  return Number.isFinite(minX) ? [minX, minY, maxX, maxY] : null;
}

export function paraFeatureCollection<P extends Record<string, unknown>>(
  itens: { geometria: Geometry | null | undefined; propriedades: P; id?: string }[],
): FeatureCollection<Geometry, P> {
  const features: Feature<Geometry, P>[] = [];
  for (const item of itens) {
    if (!item.geometria) continue;
    features.push({ type: "Feature", id: item.id, geometry: item.geometria, properties: item.propriedades });
  }
  return { type: "FeatureCollection", features };
}

/** Centroide grosseiro (média dos vértices) — suficiente para posicionar um rótulo. */
export function centroDe(g: Geometry): [number, number] {
  const b = bboxDe([g]);
  if (!b) return CENTRO_PADRAO;
  return [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2];
}
