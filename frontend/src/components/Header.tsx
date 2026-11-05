import type { Health } from "../types";

interface HeaderProps {
  health: Health | null;
}

export function Header({ health }: HeaderProps) {
  const connected = health?.connected === true;
  return (
    <header className="topbar">
      <a className="brand" href="#buscar">
        <img src="/mark.webp" alt="" width="42" height="42" />
        <span>
          <strong>Andén</strong>
          <small>TransMilenio · Bogotá</small>
        </span>
      </a>
      <p className={connected ? "pill is-live" : "pill"} role="status">
        <span className="dot" aria-hidden="true" />
        {connected ? "Datos en vivo" : health?.message ?? "Comprobando datos"}
      </p>
    </header>
  );
}
