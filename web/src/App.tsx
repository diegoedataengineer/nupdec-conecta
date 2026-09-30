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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster position="top-right" richColors closeButton />
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
              </Route>
            </Route>

            <Route path="/download" element={<Navigate to="/" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
