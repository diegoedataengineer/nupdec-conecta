import { NavLink, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  LayoutDashboard,
  LogOut,
  MapPinned,
  Mountain,
  Siren,
  Users,
  type LucideIcon,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import ThemeToggle from "@/components/ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";
import { PAPEIS, iniciais } from "@/lib/rotulos";
import { cn } from "@/lib/utils";

/**
 * Menu lateral do painel da Compdec — adaptado do AppSidebar/PortalSidebar do
 * portal NeuroAgora (shadcn Sidebar, colapsável em ícone).
 */

export interface ItemNavegacao {
  to: string;
  icon: LucideIcon;
  label: string;
  end?: boolean;
}

export const ITENS_PAINEL: ItemNavegacao[] = [
  { to: "/painel", icon: LayoutDashboard, label: "Visão geral", end: true },
  { to: "/painel/alertas", icon: Siren, label: "Alertas" },
  { to: "/painel/nucleos", icon: Users, label: "Núcleos" },
  { to: "/painel/areas-risco", icon: Mountain, label: "Áreas de risco" },
  { to: "/painel/ocorrencias", icon: MapPinned, label: "Ocorrências" },
];

function ItemNav({ item, colapsado }: { item: ItemNavegacao; colapsado: boolean }) {
  return (
    <SidebarMenuItem>
      <NavLink
        to={item.to}
        end={item.end}
        title={colapsado ? item.label : undefined}
        className={({ isActive }) =>
          cn(
            "flex items-center gap-3 py-2 pr-3 rounded-lg text-sm transition-all duration-150 w-full",
            isActive ? "nav-item-active" : "nav-item-base",
          )
        }
      >
        {({ isActive }) => (
          <>
            <item.icon className={cn("h-4 w-4 flex-shrink-0", isActive && "text-sidebar-primary")} />
            {!colapsado && <span className="truncate">{item.label}</span>}
          </>
        )}
      </NavLink>
    </SidebarMenuItem>
  );
}

export function PainelSidebar() {
  const { state } = useSidebar();
  const colapsado = state === "collapsed";
  const { perfil, signOut } = useAuth();
  const navigate = useNavigate();

  const nome = perfil?.nome ?? perfil?.email ?? "";
  const papel = perfil ? PAPEIS[perfil.papel] : "";

  const sair = async () => {
    await signOut();
    navigate("/painel/entrar");
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-16 justify-center px-4">
        <NavLink to="/painel" className="flex items-center gap-2.5 no-underline min-w-0">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <AlertTriangle className="h-4 w-4" />
          </span>
          {!colapsado && (
            <div className="min-w-0 leading-tight">
              <span className="font-display font-semibold text-lg text-sidebar-foreground block truncate">
                Nupdec Conecta
              </span>
              <span className="text-[11px] text-sidebar-foreground/60">Painel da Compdec</span>
            </div>
          )}
        </NavLink>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent className="px-3 py-2">
        <SidebarGroup>
          {!colapsado && (
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-sidebar-foreground/50 px-2 pb-2 pt-1">
              Navegação
            </p>
          )}
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {ITENS_PAINEL.map((item) => (
                <ItemNav key={item.to} item={item} colapsado={colapsado} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="px-3 pb-4">
        <SidebarSeparator className="mb-3" />
        <div className={cn("flex items-center gap-2 rounded-lg bg-sidebar-accent/50", colapsado ? "justify-center p-1" : "px-2 py-2")}>
          <div
            className="flex items-center justify-center w-8 h-8 rounded-full shrink-0 bg-primary text-primary-foreground text-xs font-bold"
            title={nome}
          >
            {iniciais(nome) || "?"}
          </div>
          {!colapsado && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-sidebar-foreground truncate leading-tight">{nome}</p>
                <p className="text-[11px] text-sidebar-foreground/60 truncate">{papel}</p>
              </div>
              <ThemeToggle />
              <button
                onClick={() => void sair()}
                aria-label="Sair"
                title="Sair"
                className="p-1.5 rounded-md text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
