import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppAuthProvider, useAppAuth } from "./AppAuthContext";
import { AppClientContext, clienteApp } from "./client";
import { CelularFrame } from "./CelularFrame";
import Entrar from "./paginas/Entrar";
import Cadastrar from "./paginas/Cadastrar";
import Alertas from "./paginas/Alertas";
import AlertaDetalhe from "./paginas/AlertaDetalhe";
import Ocorrencias from "./paginas/Ocorrencias";
import Chat from "./paginas/Chat";
import OcorrenciaNova from "./paginas/OcorrenciaNova";
import Nucleo from "./paginas/Nucleo";
import Perfil from "./paginas/Perfil";

/** Tela "aguardando aprovação" (membro pendente), como no app real. */
function Aguardando() {
  const { perfil, signOut } = useAppAuth();
  return (
    <div className="min-h-full flex flex-col items-center justify-center text-center px-6 gap-4">
      <span className="h-16 w-16 rounded-3xl bg-sev-atencao-light text-sev-atencao flex items-center justify-center">
        <Clock className="h-8 w-8" />
      </span>
      <h1 className="font-display text-xl font-bold">{perfil?.membro_status === "rejeitado" ? "Cadastro não aprovado" : "Cadastro em análise"}</h1>
      {perfil?.membro_status === "pre_aprovado" ? (
        <p className="text-sm text-muted-foreground">
          O líder do núcleo <b>{perfil?.nucleo_nome}</b> já pré-aprovou seu cadastro. Falta a aprovação final da Defesa Civil de{" "}
          {perfil?.municipio_nome ?? "seu município"}. Você recebe uma notificação assim que for aprovado.
        </p>
      ) : perfil?.membro_status === "rejeitado" ? (
        <p className="text-sm text-muted-foreground">Seu cadastro no núcleo <b>{perfil?.nucleo_nome}</b> não foi aprovado. Procure o líder do núcleo ou a Defesa Civil para entender o motivo.</p>
      ) : (
        <p className="text-sm text-muted-foreground">
          Primeiro o <b>líder do núcleo {perfil?.nucleo_nome}</b> confirma que conhece você; depois a Defesa Civil de{" "}
          {perfil?.municipio_nome ?? "seu município"} dá a aprovação final. Você recebe uma notificação a cada etapa.
        </p>
      )}
      <Button variant="outline" onClick={() => void signOut()}>Sair</Button>
    </div>
  );
}

/** Guarda: exige sessão; gestor sem vínculo de membro é avisado; pendente vê "aguardando". */
function Guarda() {
  const { session, perfil, loading } = useAppAuth();
  const location = useLocation();
  if (loading || (session && !perfil)) {
    return <div className="min-h-full flex items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>;
  }
  if (!session) return <Navigate to="/app/entrar" replace state={{ de: location.pathname }} />;
  if (perfil && perfil.papel !== "membro") {
    return (
      <div className="min-h-full flex flex-col items-center justify-center text-center px-6 gap-3">
        <h1 className="font-display text-lg font-bold">Esta conta é da Compdec</h1>
        <p className="text-sm text-muted-foreground">O app é para membros dos núcleos. Use o painel para a conta <b>{perfil.email}</b>.</p>
        <Button asChild variant="outline"><a href="/painel">Abrir o painel</a></Button>
        <SairBotao />
      </div>
    );
  }
  if (perfil && perfil.membro_status !== "aprovado") return <Aguardando />;
  return <Outlet />;
}

function SairBotao() {
  const { signOut } = useAppAuth();
  return <Button variant="ghost" size="sm" onClick={() => void signOut()}>Sair</Button>;
}

/** Rotas do simulador (/app/*), espelhando as rotas do expo-router da spec 05. */
export default function AppCelular({ slot = 0 }: { slot?: number }) {
  return (
    <AppClientContext.Provider value={{ slot, sb: clienteApp(slot) }}>
    <AppAuthProvider>
      <Routes>
        <Route element={<CelularFrame comAbas={false} />}>
          <Route path="entrar" element={<Entrar />} />
          <Route path="cadastrar" element={<Cadastrar />} />
        </Route>
        <Route element={<CelularFrame />}>
          <Route element={<Guarda />}>
            <Route index element={<Alertas />} />
            <Route path="alerta/:id" element={<AlertaDetalhe />} />
            <Route path="chat" element={<Chat />} />
            <Route path="ocorrencias" element={<Ocorrencias />} />
            <Route path="ocorrencia/nova" element={<OcorrenciaNova />} />
            <Route path="nucleo" element={<Nucleo />} />
            <Route path="perfil" element={<Perfil />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/app" replace />} />
      </Routes>
    </AppAuthProvider>
    </AppClientContext.Provider>
  );
}
