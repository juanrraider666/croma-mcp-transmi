import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { ApiError, fetchBoard, fetchHealth, fetchRoute, searchRoutes } from "./api";
import { Header } from "./components/Header";
import { SearchPanel } from "./components/SearchPanel";
import { TrackingPanel } from "./components/TrackingPanel";
import { VehicleCard } from "./components/VehicleCard";
import type { Board, Health, RouteDetail, RouteSummary, StatusFilter } from "./types";

const FILTERS: Array<{ id: StatusFilter; label: string }> = [
  { id: "all", label: "Todos" },
  { id: "in_transit_to", label: "En camino" },
  { id: "stopped_at", label: "En parada" },
  { id: "incoming_at", label: "Entrando" },
];

function useNarrow() {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 979px)");
    const update = () => setNarrow(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return narrow;
}

export function App() {
  const inputRef = useRef<HTMLInputElement>(null);
  const shownRoute = useRef<string | null>(null);
  const narrow = useNarrow();
  const [health, setHealth] = useState<Health | null>(null);
  const [query, setQuery] = useState("");
  const [routes, setRoutes] = useState<RouteSummary[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [pinnedQuery, setPinnedQuery] = useState<string | null>(null);
  const [route, setRoute] = useState<RouteDetail | null>(null);
  const [board, setBoard] = useState<Board | null>(null);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [boardError, setBoardError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<StatusFilter>("all");

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      fetchHealth()
        .then((next) => {
          if (!cancelled) setHealth(next);
        })
        .catch(() => {
          if (!cancelled) setHealth({ connected: false, message: "Sin conexión con los datos" });
        });
    };
    load();
    const timer = window.setInterval(load, 45_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      event.preventDefault();
      inputRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setRoutes([]);
      setSearching(false);
      setSearchError(null);
      return;
    }
    if (trimmed === pinnedQuery) return;

    let cancelled = false;
    const handle = window.setTimeout(() => {
      setSearching(true);
      searchRoutes(trimmed)
        .then((result) => {
          if (cancelled) return;
          setRoutes(result.routes);
          setActiveIndex(0);
          setSearchError(result.routes.length === 0 ? "Ninguna ruta coincide con esa búsqueda." : null);
        })
        .catch((error: unknown) => {
          if (cancelled) return;
          setRoutes([]);
          setSearchError(error instanceof ApiError ? error.message : "No pudimos buscar rutas.");
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 280);

    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [pinnedQuery, query]);

  const refreshBoard = useCallback(async (routeId: string, quiet: boolean) => {
    if (!quiet) setRefreshing(true);
    try {
      const next = await fetchBoard(routeId);
      if (shownRoute.current !== routeId) return;
      setBoard(next);
      setBoardError(null);
    } catch (error: unknown) {
      if (shownRoute.current !== routeId) return;
      setBoardError(error instanceof ApiError ? error.message : "No pudimos actualizar los buses.");
    } finally {
      if (shownRoute.current === routeId) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!route) return;
    const timer = window.setInterval(() => {
      void refreshBoard(route.routeId, true);
    }, 20_000);
    return () => window.clearInterval(timer);
  }, [refreshBoard, route]);

  const chooseRoute = useCallback(async (summary: RouteSummary) => {
    shownRoute.current = summary.routeId;
    setPinnedQuery(query.trim());
    setLoadingRoute(true);
    setBoardError(null);
    setFilter("all");
    setSelectedId(null);
    setBoard(null);
    setRoute({ ...summary, patterns: [] });
    try {
      const [detail, nextBoard] = await Promise.all([fetchRoute(summary.routeId), fetchBoard(summary.routeId)]);
      if (shownRoute.current !== summary.routeId) return;
      setRoute(detail.route);
      setBoard(nextBoard);
    } catch (error: unknown) {
      if (shownRoute.current !== summary.routeId) return;
      setRoute(null);
      setBoard(null);
      setBoardError(error instanceof ApiError ? error.message : "No pudimos abrir esa ruta.");
    } finally {
      if (shownRoute.current === summary.routeId) setLoadingRoute(false);
    }
  }, [query]);

  const onSearchKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, Math.max(routes.length - 1, 0)));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter" && routes[activeIndex]) {
      event.preventDefault();
      void chooseRoute(routes[activeIndex]);
    } else if (event.key === "Escape") {
      setQuery("");
      setRoutes([]);
      setPinnedQuery(null);
      setSearchError(null);
    }
  };

  const visible = useMemo(() => {
    const vehicles = board?.vehicles ?? [];
    return vehicles
      .filter((vehicle) => filter === "all" || vehicle.stopStatus === filter)
      .slice()
      .sort((a, b) => {
        if (a.minutesAway === null && b.minutesAway === null) return 0;
        if (a.minutesAway === null) return 1;
        if (b.minutesAway === null) return -1;
        return a.minutesAway - b.minutesAway;
      });
  }, [board, filter]);

  const selected = visible.find((vehicle) => vehicle.vehicleId === selectedId)
    ?? board?.vehicles.find((vehicle) => vehicle.vehicleId === selectedId)
    ?? null;

  const resultsOpen = routes.length > 0 && query.trim() !== pinnedQuery;
  const tracking = route && selected ? (
    <TrackingPanel
      route={route}
      vehicle={selected}
      refreshing={refreshing}
      onRefresh={() => void refreshBoard(route.routeId, false)}
    />
  ) : null;

  return (
    <div className="app" style={route ? { ["--route" as string]: route.color, ["--route-ink" as string]: route.textColor } : undefined}>
      <Header health={health} />
      <main>
        <SearchPanel
          query={query}
          routes={routes}
          activeIndex={activeIndex}
          open={resultsOpen}
          loading={searching}
          inputRef={inputRef}
          onQuery={(value) => {
            setQuery(value);
            if (pinnedQuery && value.trim() !== pinnedQuery) setPinnedQuery(null);
          }}
          onKeyDown={onSearchKey}
          onHover={setActiveIndex}
          onSelect={(item) => void chooseRoute(item)}
          onTrySample={() => {
            setPinnedQuery(null);
            setQuery("B12");
            inputRef.current?.focus();
          }}
          showWelcome={!route}
        />

        {searchError ? <p className="notice">{searchError}</p> : null}
        {boardError ? (
          <div className="notice is-error" role="alert">
            <img src="/error.webp" alt="" />
            <div>
              <p>{boardError}</p>
              <button type="button" onClick={() => route && void refreshBoard(route.routeId, false)}>
                Reintentar
              </button>
            </div>
          </div>
        ) : null}

        {route ? (
          <section className="workspace" aria-label={`Buses de ${route.shortName}`}>
            <div className="fleet">
              <article className="blade" style={{ background: route.color, color: route.textColor }}>
                <p>{route.systemName || "TransMilenio"}</p>
                <h2>{route.shortName}</h2>
                <p>{route.longName}</p>
              </article>

              {board?.alerts.length ? (
                <div className="alerts">
                  {board.alerts.map((alert) => (
                    <p key={alert.alertId}>
                      <strong>{alert.header}</strong>
                      {alert.description ? <span>{alert.description}</span> : null}
                    </p>
                  ))}
                </div>
              ) : null}

              <div className="filters" role="toolbar" aria-label="Filtrar buses">
                {FILTERS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={filter === item.id ? "chip is-on" : "chip"}
                    aria-pressed={filter === item.id}
                    onClick={() => setFilter(item.id)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {loadingRoute && !board ? (
                <div className="cards" aria-hidden="true">
                  {Array.from({ length: 4 }, (_, index) => (
                    <div key={index} className="skeleton" />
                  ))}
                </div>
              ) : null}

              {board && board.vehicles.length === 0 ? (
                <figure className="empty-state">
                  <img src="/empty.webp" alt="" />
                  <figcaption>Ningún bus está reportando esta ruta.</figcaption>
                </figure>
              ) : null}

              {board && board.vehicles.length > 0 && visible.length === 0 ? (
                <div className="empty-state">
                  <p>Ningún bus en este estado.</p>
                  <button type="button" onClick={() => setFilter("all")}>
                    Ver todos
                  </button>
                </div>
              ) : null}

              <div className="cards">
                {visible.map((vehicle) => (
                  <div key={vehicle.vehicleId} className="card-slot">
                    <VehicleCard
                      vehicle={vehicle}
                      selected={vehicle.vehicleId === selectedId}
                      onSelect={setSelectedId}
                    />
                    {narrow && vehicle.vehicleId === selectedId ? tracking : null}
                  </div>
                ))}
              </div>
            </div>
            {narrow ? null : <div className="dock">{tracking ?? <FollowHint />}</div>}
          </section>
        ) : null}
      </main>
    </div>
  );
}

function FollowHint() {
  return (
    <aside className="tracking is-hint">
      <img src="/welcome.webp" alt="" />
      <p>Elige un bus para ver su placa, la próxima parada y el mapa.</p>
    </aside>
  );
}
