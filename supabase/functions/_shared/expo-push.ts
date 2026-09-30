/** Envio de push pelo Expo Push Service (ADR-0007). Lotes de até 100 mensagens. */

export interface MensagemPush {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  channelId?: string;
  priority?: "default" | "normal" | "high";
  sound?: "default" | null;
}

export interface TicketPush {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: { error?: string };
}

const URL_ENVIO = "https://exp.host/--/api/v2/push/send";
const URL_RECIBOS = "https://exp.host/--/api/v2/push/getReceipts";

function cabecalhos() {
  const h: Record<string, string> = {
    "content-type": "application/json",
    accept: "application/json",
    "accept-encoding": "gzip, deflate",
  };
  const token = Deno.env.get("EXPO_ACCESS_TOKEN");
  if (token) h.authorization = `Bearer ${token}`;
  return h;
}

export function ehTokenExpo(token: string) {
  return /^Expo(nent)?PushToken\[.+\]$/.test(token);
}

export async function enviarLote(mensagens: MensagemPush[]): Promise<TicketPush[]> {
  const resp = await fetch(URL_ENVIO, {
    method: "POST",
    headers: cabecalhos(),
    body: JSON.stringify(mensagens),
  });
  if (!resp.ok) throw new Error(`Expo Push ${resp.status}: ${await resp.text()}`);
  const corpo = await resp.json();
  return corpo.data as TicketPush[];
}

export async function buscarRecibos(ids: string[]): Promise<Record<string, TicketPush>> {
  const resp = await fetch(URL_RECIBOS, {
    method: "POST",
    headers: cabecalhos(),
    body: JSON.stringify({ ids }),
  });
  if (!resp.ok) throw new Error(`Expo Receipts ${resp.status}: ${await resp.text()}`);
  const corpo = await resp.json();
  return corpo.data as Record<string, TicketPush>;
}

export function emLotes<T>(itens: T[], tamanho = 100): T[][] {
  const lotes: T[][] = [];
  for (let i = 0; i < itens.length; i += tamanho) lotes.push(itens.slice(i, i + tamanho));
  return lotes;
}
