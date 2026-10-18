import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import PainelLayout from "@/components/layout/PainelLayout";
import Download from "./pages/Download";
import NotFound from "./pages/NotFound";
import Entrar from "./pages/painel/Entrar";
import VisaoGeral from "./pages/painel/VisaoGeral";
import Nucleos from "./pages/painel/Nucleos";
import NucleoDetalhe from "./pages/painel/NucleoDetalhe";
import AreasRisco from "./pages/painel/AreasRisco";
import Alertas from "./pages/painel/Alertas";
import NovoAlerta from "./pages/painel/NovoAlerta";
import AlertaAcompanhamento from "./pages/painel/AlertaAcompanhamento";
import Ocorrencias from "./pages/painel/Ocorrencias";
import ChatNucleos from "./pages/painel/ChatNucleos";
import VisaoDiretoria from "./pages/diretoria/VisaoDiretoria";
import Coordenacoes from "./pages/diretoria/Coordenacoes";
import CoordenacaoDetalhe from "./pages/diretoria/CoordenacaoDetalhe";
import Gestores from "./pages/diretoria/Gestores";
import AppCelular from "./app-celular/AppCelular";
import QuadCelulares from "./app-celular/QuadCelulares";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
});

// /demo tem quatro MemoryRouters (um por celular); o React Router não aceita
// Router aninhado, então essa rota é decidida antes do BrowserRouter.
const ehDemo = window.location.pathname.replace(/\/+$/, "") === "/demo";

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster position="top-right" richColors closeButton />
      {ehDemo ? <QuadCelulares /> : (
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* públicas */}
            <Route path="/" element={<Download />} />
            <Route path="/painel/entrar" element={<Entrar />} />

            {/* painel: sessão + papel agente/coordenador */}
            <Route element={<ProtectedRoute />}>
              <Route path="/painel" element={<PainelLayout />}>
                <Route index element={<VisaoGeral />} />
                <Route path="nucleos" element={<Nucleos />} />
                <Route path="nucleos/:id" element={<NucleoDetalhe />} />
                <Route path="areas-risco" element={<AreasRisco />} />
                <Route path="alertas" element={<Alertas />} />
                <Route path="alertas/novo" element={<NovoAlerta />} />
                <Route path="alertas/:id" element={<AlertaAcompanhamento />} />
                <Route path="ocorrencias" element={<Ocorrencias />} />
                <Route path="chat" element={<ChatNucleos />} />
              </Route>
            </Route>

            {/* diretoria: só papel diretor */}
            <Route element={<ProtectedRoute somenteDiretor />}>
              <Route path="/diretoria" element={<PainelLayout modo="diretoria" />}>
                <Route index element={<VisaoDiretoria />} />
                <Route path="coordenacoes" element={<Coordenacoes />} />
                <Route path="coordenacoes/:id" element={<CoordenacaoDetalhe />} />
                <Route path="gestores" element={<Gestores />} />
              </Route>
            </Route>

            {/* simulador do app Android (sessão própria do membro) */}
            <Route path="/app/*" element={<AppCelular />} />

            <Route path="/download" element={<Navigate to="/" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
      )}
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
