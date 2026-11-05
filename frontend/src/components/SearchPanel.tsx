import type { KeyboardEvent, RefObject } from "react";
import type { RouteSummary } from "../types";
import { clock } from "../format";

interface SearchPanelProps {
  query: string;
  routes: RouteSummary[];
  activeIndex: number;
  open: boolean;
  loading: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
  onQuery: (value: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onHover: (index: number) => void;
  onSelect: (route: RouteSummary) => void;
  onTrySample: () => void;
  showWelcome: boolean;
}

export function SearchPanel({
  query,
  routes,
  activeIndex,
  open,
  loading,
  inputRef,
  onQuery,
  onKeyDown,
  onHover,
  onSelect,
  onTrySample,
  showWelcome,
}: SearchPanelProps) {
  return (
    <section className={showWelcome ? "finder has-welcome" : "finder"} aria-label="Buscar ruta">
      <div className="finder-copy">
        <p className="eyebrow">En el andén</p>
        <h1>¿Qué ruta vas a tomar?</h1>
        <label className="search" htmlFor="buscar">
          <span className="sr-only">Código o destino</span>
          <input
            id="buscar"
            ref={inputRef}
            role="combobox"
            aria-expanded={open}
            aria-controls="route-results"
            aria-autocomplete="list"
            aria-activedescendant={open && routes[activeIndex] ? `route-${routes[activeIndex].routeId}` : undefined}
            placeholder="Código o destino, por ejemplo B12"
            value={query}
            onChange={(event) => onQuery(event.target.value)}
            onKeyDown={onKeyDown}
            autoComplete="off"
          />
          {loading ? <span className="search-state">Buscando</span> : null}
        </label>
        <div className="finder-actions">
          <button type="button" className="text-button" onClick={onTrySample}>
            Probar B12
          </button>
          <p>Escribe el código del bus o una estación de destino.</p>
        </div>
        {open ? (
          <ul id="route-results" className="signs" role="listbox" aria-label="Rutas encontradas">
            {routes.map((route, index) => (
              <li key={route.routeId} role="presentation">
                <button
                  id={`route-${route.routeId}`}
                  type="button"
                  role="option"
                  aria-selected={index === activeIndex}
                  className={index === activeIndex ? "sign is-active" : "sign"}
                  style={{ background: route.color, color: route.textColor }}
                  onMouseEnter={() => onHover(index)}
                  onClick={() => onSelect(route)}
                >
                  <strong>{route.shortName}</strong>
                  <span>{route.longName}</span>
                  <small>
                    {route.stopsCount} paradas · {clock(route.firstDeparture)}–{clock(route.lastDeparture)}
                  </small>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      {showWelcome ? (
        <figure className="welcome-art">
          <img src="/welcome.webp" alt="Andén de TransMilenio con un bus rojo junto al vagón" />
        </figure>
      ) : null}
    </section>
  );
}
