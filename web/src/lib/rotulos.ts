import type {
  NivelRisco,
  Papel,
  SeveridadeAlerta,
  StatusEntrega,
  StatusMembro,
  StatusOcorrencia,
  TipoAlerta,
  TipoAreaRisco,
  TipoOcorrencia,
} from "@/integrations/supabase/types";

/**
 * Rótulos em português e cores de cada enumeração do schema.
 * As cores em `cor` (HSL cru) são para o MapLibre e o recharts, que não leem
 * classes do Tailwind; as classes servem para badges e cartões.
 */

export const PAPEIS: Record<Papel, string> = {
  membro: "Membro",
  agente: "Agente da Defesa Civil",
  coordenador: "Coordenador da Compdec",
};

export const SEVERIDADES: Record<
  SeveridadeAlerta,
  { rotulo: string; cor: string; corClara: string; badge: string; texto: string; fundo: string }
> = {
  observacao: {
    rotulo: "Observação",
    cor: "hsl(215 16% 40%)",
    corClara: "hsl(214 28% 94%)",
    badge: "bg-sev-observacao-light text-sev-observacao border-sev-observacao/30",
    texto: "text-sev-observacao",
    fundo: "bg-sev-observacao",
  },
  atencao: {
    rotulo: "Atenção",
    cor: "hsl(30 82% 42%)",
    corClara: "hsl(32 88% 94%)",
    badge: "bg-sev-atencao-light text-sev-atencao border-sev-atencao/30",
    texto: "text-sev-atencao",
    fundo: "bg-sev-atencao",
  },
  alerta: {
    rotulo: "Alerta",
    cor: "hsl(24 90% 48%)",
    corClara: "hsl(24 95% 94%)",
    badge: "bg-sev-alerta-light text-sev-alerta border-sev-alerta/30",
    texto: "text-sev-alerta",
    fundo: "bg-sev-alerta",
  },
  alerta_maximo: {
    rotulo: "Alerta máximo",
    cor: "hsl(351 70% 47%)",
    corClara: "hsl(351 80% 96%)",
    badge: "bg-sev-maximo-light text-sev-maximo border-sev-maximo/30",
    texto: "text-sev-maximo",
    fundo: "bg-sev-maximo",
  },
};

export const TIPOS_ALERTA: Record<TipoAlerta, string> = {
  deslizamento: "Deslizamento",
  inundacao: "Inundação",
  enxurrada: "Enxurrada",
  vendaval: "Vendaval",
  outro: "Outro",
};

/** Modelos de título e mensagem por tipo, oferecidos no formulário de novo alerta. */
export const MODELOS_ALERTA: Record<TipoAlerta, { titulo: string; mensagem: string }> = {
  deslizamento: {
    titulo: "Risco de deslizamento — chuva forte prevista",
    mensagem:
      "A Defesa Civil alerta para risco de deslizamento nas próximas horas. Se notar trincas no chão ou nas paredes, água barrenta ou árvores inclinadas, saia de casa e avise o líder do núcleo. Confirme o recebimento no aplicativo.",
  },
  inundacao: {
    titulo: "Risco de inundação — rio em elevação",
    mensagem:
      "O nível do rio está subindo. Moradores das áreas baixas devem retirar documentos, remédios e pertences de valor e procurar o ponto de apoio. Não atravesse ruas alagadas. Confirme o recebimento no aplicativo.",
  },
  enxurrada: {
    titulo: "Risco de enxurrada — chuva intensa em curso",
    mensagem:
      "Chuva intensa pode provocar enxurrada nas próximas horas. Evite ruas próximas a córregos e encostas e mantenha crianças em casa. Confirme o recebimento no aplicativo.",
  },
  vendaval: {
    titulo: "Alerta de vendaval",
    mensagem:
      "Previsão de ventos fortes. Recolha objetos soltos, afaste-se de árvores e postes e evite sair durante a rajada. Confirme o recebimento no aplicativo.",
  },
  outro: {
    titulo: "Aviso da Defesa Civil",
    mensagem: "A Defesa Civil municipal informa: ",
  },
};

export const TIPOS_AREA_RISCO: Record<TipoAreaRisco, string> = {
  deslizamento: "Deslizamento",
  inundacao: "Inundação",
  enxurrada: "Enxurrada",
  outro: "Outro",
};

export const NIVEIS_RISCO: Record<NivelRisco, { rotulo: string; cor: string; badge: string }> = {
  baixo: { rotulo: "Baixo", cor: "hsl(168 62% 30%)", badge: "bg-bp-emerald-light text-bp-emerald border-bp-emerald/30" },
  medio: { rotulo: "Médio", cor: "hsl(30 82% 42%)", badge: "bg-bp-amber-light text-bp-amber border-bp-amber/30" },
  alto: { rotulo: "Alto", cor: "hsl(24 90% 48%)", badge: "bg-sev-alerta-light text-sev-alerta border-sev-alerta/30" },
  muito_alto: { rotulo: "Muito alto", cor: "hsl(351 70% 47%)", badge: "bg-bp-rose-light text-bp-rose border-bp-rose/30" },
};

export const STATUS_MEMBRO: Record<StatusMembro, { rotulo: string; badge: string }> = {
  pendente: { rotulo: "Pendente", badge: "bg-bp-amber-light text-bp-amber border-bp-amber/30" },
  aprovado: { rotulo: "Aprovado", badge: "bg-bp-emerald-light text-bp-emerald border-bp-emerald/30" },
  rejeitado: { rotulo: "Rejeitado", badge: "bg-bp-rose-light text-bp-rose border-bp-rose/30" },
  desligado: { rotulo: "Desligado", badge: "bg-muted text-muted-foreground border-border" },
};

export const STATUS_ENTREGA: Record<StatusEntrega, string> = {
  sem_dispositivo: "Sem aplicativo",
  enviado: "Push enviado",
  entregue: "Push entregue",
  falha: "Falha no push",
};

export const TIPOS_OCORRENCIA: Record<TipoOcorrencia, string> = {
  trinca: "Trinca",
  deslizamento: "Deslizamento",
  alagamento: "Alagamento",
  arvore: "Árvore caída",
  bueiro: "Bueiro entupido",
  outro: "Outro",
};

export const STATUS_OCORRENCIA: Record<StatusOcorrencia, { rotulo: string; cor: string; badge: string }> = {
  nova: { rotulo: "Nova", cor: "hsl(351 70% 47%)", badge: "bg-bp-rose-light text-bp-rose border-bp-rose/30" },
  em_analise: { rotulo: "Em análise", cor: "hsl(30 82% 42%)", badge: "bg-bp-amber-light text-bp-amber border-bp-amber/30" },
  atendida: { rotulo: "Atendida", cor: "hsl(168 62% 30%)", badge: "bg-bp-emerald-light text-bp-emerald border-bp-emerald/30" },
  descartada: { rotulo: "Descartada", cor: "hsl(215 16% 55%)", badge: "bg-muted text-muted-foreground border-border" },
};

export function iniciais(nome: string): string {
  return nome
    .split(/\s+/)
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/** "PT1M30S" / "00:01:30" (interval do Postgres) → "1 min 30 s". */
export function formatarIntervalo(intervalo: string | null | undefined): string {
  if (!intervalo) return "—";
  const m = /^(?:(\d+) days? )?(\d{1,2}):(\d{2}):(\d{2})/.exec(intervalo);
  if (!m) return intervalo;
  const dias = Number(m[1] ?? 0);
  const h = Number(m[2]) + dias * 24;
  const min = Number(m[3]);
  const s = Number(m[4]);
  if (h > 0) return `${h} h ${min} min`;
  if (min > 0) return `${min} min ${s} s`;
  return `${s} s`;
}

export function pct(valor: number | null | undefined): string {
  return valor == null ? "—" : `${Number(valor).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}
