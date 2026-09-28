import {
  Bell,
  CaretDown,
  Moon,
  Sun,
} from "@phosphor-icons/react";
import { useEffect, useState } from "react";

interface AppHeaderProps {
  readonly notificationCount: number;
  readonly title: string;
  readonly clock: string;
  readonly darkTheme: boolean;
  readonly onToggleTheme: () => void;
  readonly onToggleNotifications: () => void;
}

export function AppHeader({
  title,
  clock,
  darkTheme,
  onToggleTheme,
  onToggleNotifications,
  notificationCount,
}: AppHeaderProps) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <header className="app-header">
      <div className="brand-lockup">
        <img
          className="brand-lockup__logo"
          src={darkTheme ? "/assets/logo-app/logo-app-light.png" : "/assets/logo-app/logo-app-dark.png"}
          alt="LicenGeo SP"
        />
        <span className="brand-lockup__divider" aria-hidden="true" />
          <h1>{title}</h1>
      </div>

      <time className="app-header__clock" dateTime={now.toISOString()}>{formatClock(now)}</time>

      <div className="app-header__actions">
        <span className="simulation-disclosure">
          Ambiente demonstrativo <span aria-hidden="true">·</span> dados simulados
        </span>
        <button
          className="icon-button"
          type="button"
          aria-label={darkTheme ? "Ativar tema claro" : "Ativar tema escuro"}
          onClick={onToggleTheme}
        >
          {darkTheme ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
        </button>
        <button
          className="icon-button notification-button"
          type="button"
          aria-label={`Abrir ${notificationCount} notificações`}
          onClick={onToggleNotifications}
        >
          <Bell aria-hidden="true" />
          {notificationCount > 0 ? <span className="notification-button__count">{notificationCount}</span> : null}
        </button>
        <button className="profile-button" type="button" aria-label="Abrir menu do perfil">
          <span className="avatar" aria-hidden="true">AS</span>
          <span className="profile-button__copy">
            <strong>Analista Simulado</strong>
            <small>Perfil demonstrativo</small>
          </span>
          <CaretDown aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}

function formatClock(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(value).replace(",", " ·");
}
