import { CaretDown, CaretUp } from "@phosphor-icons/react";
import type { ReactNode } from "react";

interface PanelFrameProps {
  readonly title: string;
  readonly subtitle?: string;
  readonly className?: string;
  readonly collapsed: boolean;
  readonly onToggle: () => void;
  readonly children: ReactNode;
}

export function PanelFrame({
  title,
  subtitle,
  className = "",
  collapsed,
  onToggle,
  children,
}: PanelFrameProps) {
  const classes = ["panel-frame", className, collapsed ? "panel-frame--collapsed" : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <section className={classes} aria-label={title}>
      <div className="panel-frame__header">
        <div>
          <h2>{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        <button
          className="icon-button icon-button--small"
          type="button"
          aria-label={collapsed ? `Expandir ${title}` : `Recolher ${title}`}
          aria-expanded={!collapsed}
          onClick={onToggle}
        >
          {collapsed ? <CaretDown aria-hidden="true" /> : <CaretUp aria-hidden="true" />}
        </button>
      </div>
      {collapsed ? null : <div className="panel-frame__body">{children}</div>}
    </section>
  );
}
