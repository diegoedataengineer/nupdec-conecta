import { LogOut, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { APP_VERSAO, tokenSimulado } from "../client";
import { useAppAuth } from "../AppAuthContext";
import { PAPEIS, STATUS_MEMBRO } from "@/lib/rotulos";
import type { StatusMembro } from "@/integrations/supabase/types";

export default function Perfil() {
  const { perfil, signOut } = useAppAuth();
  if (!perfil) return null;
  const st = perfil.membro_status ? STATUS_MEMBRO[perfil.membro_status as StatusMembro] : null;

  const linhas: [string, string][] = [
    ["Nome", perfil.nome],
    ["E-mail", perfil.email],
    ["Papel", PAPEIS[perfil.papel]],
    ["Município", perfil.municipio_nome ?? "—"],
    ["Núcleo", perfil.nucleo_nome ?? "—"],
    ["Situação", st?.rotulo ?? "—"],
    ["Versão do app", APP_VERSAO],
    ["Dispositivo (push)", tokenSimulado(perfil.id)],
  ];

  return (
    <div className="px-4 pt-3 pb-6 space-y-4">
      <header className="flex items-center gap-3">
        <span className="h-14 w-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center text-lg font-bold">
          {perfil.nome.split(" ").map((p) => p[0]).slice(0, 2).join("")}
        </span>
        <div>
          <h1 className="font-display text-xl font-bold leading-tight">{perfil.nome}</h1>
          <p className="text-xs text-muted-foreground">{perfil.nucleo_nome ?? PAPEIS[perfil.papel]}</p>
        </div>
      </header>

      <dl className="rounded-2xl border border-border divide-y divide-border">
        {linhas.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="font-medium text-right truncate font-mono text-xs">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="rounded-2xl bg-muted p-3 text-xs text-muted-foreground flex gap-2">
        <Smartphone className="h-4 w-4 shrink-0 mt-0.5" />
        <p>
          Este é o simulador do app Android. O APK real usa a mesma conta, o mesmo backend e recebe o alerta por push
          (Expo/FCM) em vez de Realtime. Localização e câmera aqui vêm do navegador.
        </p>
      </div>

      <Button variant="outline" className="w-full h-12" onClick={() => void signOut()}>
        <LogOut className="h-4 w-4" /> Sair
      </Button>
    </div>
  );
}
