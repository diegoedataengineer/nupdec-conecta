import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ExternalLink, Smartphone } from "lucide-react";
import AppCelular from "./AppCelular";

/**
 * Modo de demonstração: quatro celulares lado a lado, cada um com sessão e
 * navegação próprias (MemoryRouter por aparelho), para mostrar o alerta
 * chegando a vários membros, o chat entre eles e o reporte de ocorrência
 * refletindo no núcleo — tudo sobre o mesmo backend.
 */
export default function QuadCelulares() {
  return (
    <div className="min-h-screen bg-muted/60 px-4 py-4">
      <div className="flex items-center justify-between gap-4 mb-3 max-w-[1500px] mx-auto">
        <div className="flex items-center gap-2 text-sm">
          <Smartphone className="h-4 w-4 text-primary" />
          <span className="font-semibold">Demonstração · quatro celulares</span>
          <span className="text-muted-foreground hidden md:inline">— cada aparelho tem sua própria sessão; entre com membros diferentes.</span>
        </div>
        <a href="/painel" target="_blank" rel="noreferrer" className="text-xs underline text-primary inline-flex items-center gap-1">
          abrir o painel <ExternalLink className="h-3 w-3" />
        </a>
      </div>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 max-w-[1500px] mx-auto items-start">
        {[1, 2, 3, 4].map((slot) => (
          <div key={slot} className="flex flex-col items-center">
            <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">celular {slot}</p>
            <div data-celular={slot} style={{ zoom: 0.78 }}>
              <MemoryRouter initialEntries={["/app/entrar"]}>
                <Routes>
                  <Route path="/app/*" element={<AppCelular slot={slot} />} />
                </Routes>
              </MemoryRouter>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
