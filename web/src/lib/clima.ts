import { useQuery } from "@tanstack/react-query";

/**
 * Tempo e chuva pela API aberta do Open-Meteo (sem chave, CORS liberado,
 * uso não comercial). A variável que importa para a Defesa Civil é a chuva
 * acumulada: o Cemaden usa acumulados de 24 h/72 h como gatilho de alerta
 * geo-hidrológico, e o painel colore o cartão pelos mesmos patamares.
 */

export interface Clima {
  atualizadoEm: string;
  temperatura: number;
  codigo: number;
  vento: number;
  chuvaAgora: number;
  /** mm nas últimas 24 h (horas passadas) */
  acumulado24h: number;
  /** mm nas últimas 72 h */
  acumulado72h: number;
  /** próximas 24 h, mm previstos */
  previsto24h: number;
  dias: { data: string; chuva: number; probabilidade: number; codigo: number }[];
}

const BASE = "https://api.open-meteo.com/v1/forecast";

export async function buscarClima(lat: number, lon: number): Promise<Clima> {
  const p = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lon.toFixed(4),
    current: "temperature_2m,precipitation,weather_code,wind_speed_10m",
    hourly: "precipitation",
    daily: "precipitation_sum,precipitation_probability_max,weather_code",
    timezone: "America/Sao_Paulo",
    past_days: "3",
    forecast_days: "4",
  });
  const r = await fetch(`${BASE}?${p}`);
  if (!r.ok) throw new Error(`Open-Meteo ${r.status}`);
  const d = await r.json();

  const horas: string[] = d.hourly.time;
  const chuva: number[] = d.hourly.precipitation.map((v: number | null) => v ?? 0);
  const agora = new Date(d.current.time);
  const idxAgora = Math.max(0, horas.findIndex((h) => new Date(h) > agora) - 1);
  const soma = (ini: number, fim: number) => chuva.slice(Math.max(0, ini), Math.max(0, fim)).reduce((a, b) => a + b, 0);

  // os 3 "past_days" são os três primeiros dias; hoje é o 4º (índice 3)
  const dias = (d.daily.time as string[]).map((data, i) => ({
    data,
    chuva: d.daily.precipitation_sum[i] ?? 0,
    probabilidade: d.daily.precipitation_probability_max[i] ?? 0,
    codigo: d.daily.weather_code[i] ?? 0,
  })).slice(3);

  return {
    atualizadoEm: d.current.time,
    temperatura: d.current.temperature_2m,
    codigo: d.current.weather_code,
    vento: d.current.wind_speed_10m,
    chuvaAgora: d.current.precipitation ?? 0,
    acumulado24h: Math.round(soma(idxAgora - 24, idxAgora) * 10) / 10,
    acumulado72h: Math.round(soma(idxAgora - 72, idxAgora) * 10) / 10,
    previsto24h: Math.round(soma(idxAgora, idxAgora + 24) * 10) / 10,
    dias,
  };
}

export function useClima(lat: number | null | undefined, lon: number | null | undefined) {
  return useQuery({
    queryKey: ["clima", lat?.toFixed(3), lon?.toFixed(3)],
    enabled: lat != null && lon != null,
    staleTime: 15 * 60 * 1000,
    refetchInterval: 15 * 60 * 1000,
    retry: 1,
    queryFn: () => buscarClima(lat!, lon!),
  });
}

/** Código WMO → rótulo curto em português. */
export function descricaoTempo(codigo: number): string {
  if (codigo === 0) return "Céu limpo";
  if (codigo <= 2) return "Poucas nuvens";
  if (codigo === 3) return "Nublado";
  if (codigo <= 48) return "Nevoeiro";
  if (codigo <= 57) return "Garoa";
  if (codigo <= 67) return "Chuva";
  if (codigo <= 77) return "Neve";
  if (codigo <= 82) return "Pancadas de chuva";
  if (codigo <= 86) return "Pancadas de neve";
  return "Tempestade";
}

/**
 * Patamar da chuva acumulada em 24 h, inspirado nos limiares operacionais
 * usados em alertas geo-hidrológicos (variam por região; valores de referência).
 */
export function patamarChuva(acum24h: number): { nivel: "normal" | "observacao" | "atencao" | "alerta"; rotulo: string } {
  if (acum24h >= 80) return { nivel: "alerta", rotulo: "Alerta — acumulado alto" };
  if (acum24h >= 50) return { nivel: "atencao", rotulo: "Atenção — monitorar encostas" };
  if (acum24h >= 25) return { nivel: "observacao", rotulo: "Observação" };
  return { nivel: "normal", rotulo: "Dentro do normal" };
}

export function diaCurto(data: string): string {
  const d = new Date(data + "T12:00:00");
  const hoje = new Date();
  if (d.toDateString() === hoje.toDateString()) return "Hoje";
  return d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
}
