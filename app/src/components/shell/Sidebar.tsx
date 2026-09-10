import {
  CaretLeft,
  CaretRight,
  ChartLineUp,
  ClipboardText,
  Database,
  FileMagnifyingGlass,
  Gauge,
  MapPinArea,
  Robot,
  Scales,
} from "@phosphor-icons/react";

export type NavigationId =
  | "operation"
  | "processes"
  | "process"
  | "agents"
  | "data"
  | "performance"
  | "indicators"
  | "reports"
  | "layers"
  | "audit";

interface NavigationItem {
  readonly id: NavigationId;
  readonly label: string;
}

const NAVIGATION_ITEMS: readonly NavigationItem[] = [
  { id: "operation", label: "Centro de Controle" },
  { id: "processes", label: "Processos" },
  { id: "agents", label: "Agentes" },
  { id: "data", label: "Dados e regras" },
  { id: "performance", label: "Desempenho e indicadores" },
  { id: "reports", label: "Relatórios" },
  { id: "layers", label: "Camadas" },
  { id: "audit", label: "Auditoria" },
];

interface SidebarProps {
  readonly active: NavigationId;
  readonly collapsed: boolean;
  readonly onToggle: () => void;
  readonly onNavigate: (id: NavigationId) => void;
}

export function Sidebar({ active, collapsed, onToggle, onNavigate }: SidebarProps) {
  return (
    <aside className={collapsed ? "sidebar sidebar--collapsed" : "sidebar"} aria-label="Navegação principal">
      <button className="sidebar__menu" type="button" aria-label={collapsed ? "Expandir navegação" : "Recolher navegação"} aria-expanded={!collapsed} onClick={onToggle}>
        {collapsed ? <CaretRight aria-hidden="true" /> : <CaretLeft aria-hidden="true" />}
      </button>
      <nav>
        {NAVIGATION_ITEMS.map((item) => (
          <button
            className={item.id === active ? "nav-item nav-item--active" : "nav-item"}
            type="button"
            key={item.id}
            aria-current={item.id === active ? "page" : undefined}
            onClick={() => onNavigate(item.id)}
          >
            {navigationIcon(item.id)}
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
      <div className="sidebar__status" aria-label="Estado dos agentes">
        <i aria-hidden="true" />
        <span><strong>Sistema online</strong><small>20 especialistas disponíveis</small></span>
      </div>
    </aside>
  );
}

function navigationIcon(id: NavigationId) {
  switch (id) {
    case "operation":
      return <Gauge aria-hidden="true" />;
    case "processes":
      return <MapPinArea aria-hidden="true" />;
    case "process":
      return <FileMagnifyingGlass aria-hidden="true" />;
    case "agents":
      return <Robot aria-hidden="true" />;
    case "data":
      return <Database aria-hidden="true" />;
    case "performance":
    case "indicators":
      return <ChartLineUp aria-hidden="true" />;
    case "audit":
    case "reports":
      return <ClipboardText aria-hidden="true" />;
    case "layers": return <MapPinArea aria-hidden="true" />;
    default: {
      const exhaustive: never = id;
      return exhaustive;
    }
  }
}
