import Graphic from "@arcgis/core/Graphic";
import GeoJSONLayer from "@arcgis/core/layers/GeoJSONLayer";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";
import ArcGISMap from "@arcgis/core/Map";
import Polygon from "@arcgis/core/geometry/Polygon";
import Point from "@arcgis/core/geometry/Point";
import MapView from "@arcgis/core/views/MapView";
import {
  CaretDown,
  Eye,
  EyeSlash,
  House,
  Minus,
  Plus,
  Stack,
  X,
} from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";

import { OPERATION_SCENARIOS } from "../../app/operation-scenarios";
import type { AgentStage, EnvironmentalLayerId, OperationScenario, ProcessExecutionProjection } from "../../domain/model";
import { pendingMarkerSpecs } from "./pending-markers";
import { PendingMapPopup } from "./PendingMapPopup";
import { EVIDENCE_ALERT_COLOR, EVIDENCE_CLEAR_COLOR, pendingMapLegend, PROCESS_HIGH_COLOR, PROCESS_LOW_COLOR } from "./map-analysis-legend";

type LayerId = Exclude<EnvironmentalLayerId, "none"> | "processes";
export type MapFocus = "overview" | "process" | LayerId;

interface OperationMapProps {
  readonly catalogOpen: boolean;
  readonly onCatalogChange: (open: boolean) => void;
  readonly focus: MapFocus;
  readonly scenario: OperationScenario;
  readonly stage: AgentStage;
  readonly pinnedProcessId: string | null;
  readonly pendingProcesses: readonly ProcessExecutionProjection[];
  readonly popupProcessId: string | null;
  readonly onClosePopup: () => void;
  readonly onSelectPending: (processId: string) => void;
}

interface LayerRegistry {
  readonly processes: GraphicsLayer;
  readonly activeProcess: GraphicsLayer;
  readonly evidence: GraphicsLayer;
  readonly app: GeoJSONLayer;
  readonly ucPi: GeoJSONLayer;
  readonly ucUs: GeoJSONLayer;
  readonly terrasIndigenas: GeoJSONLayer;
}

interface LayerDefinition {
  readonly id: LayerId;
  readonly label: string;
  readonly color: string;
  readonly supplied: boolean;
}

const PROCESS_LAYER = { id: "processes", label: "Processos do catálogo", color: "#7257ff", supplied: false } satisfies LayerDefinition;

const LAYERS = [
  PROCESS_LAYER,
  { id: "app", label: "APP hídrica simulada", color: "#2f80ed", supplied: false },
  { id: "ucPi", label: "UC estadual, Proteção Integral", color: "#16803c", supplied: true },
  { id: "ucUs", label: "UC estadual, Uso Sustentável", color: "#4f8a3c", supplied: true },
  { id: "terrasIndigenas", label: "Terras Indígenas", color: "#c06b16", supplied: true },
] satisfies readonly LayerDefinition[];

const BASEMAPS = [
  { id: "hybrid", label: "Híbrido", image: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/3/3/2" },
  { id: "satellite", label: "Satélite", image: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/3/3/2" },
  { id: "streets-vector", label: "Ruas", image: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/3/3/2" },
  { id: "topo-vector", label: "Topográfico", image: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/3/3/2" },
  { id: "gray-vector", label: "Cinza claro", image: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/3/3/2" },
  { id: "dark-gray-vector", label: "Cinza escuro", image: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/3/3/2" },
] as const;

const DEFAULT_VISIBILITY: Readonly<Record<LayerId, boolean>> = {
  processes: true,
  app: true,
  ucPi: true,
  ucUs: true,
  terrasIndigenas: true,
};

export function OperationMap({ focus, scenario, stage, pinnedProcessId, pendingProcesses, popupProcessId, onClosePopup, onSelectPending, catalogOpen, onCatalogChange: setCatalogOpen }: OperationMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<MapView | null>(null);
  const mapRef = useRef<ArcGISMap | null>(null);
  const layersRef = useRef<LayerRegistry | null>(null);
  const pendingIdsRef = useRef(new Set(pendingProcesses.map((process) => process.scenario.id)));
  const selectPendingRef = useRef(onSelectPending);
  const previousScenarioId = useRef<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [catalogTab, setCatalogTab] = useState<"layers" | "basemaps">("layers");
  const [visibility, setVisibility] = useState(DEFAULT_VISIBILITY);
  const [basemap, setBasemap] = useState("hybrid");
  const [featureCounts, setFeatureCounts] = useState<Partial<Record<LayerId, number>>>({ processes: OPERATION_SCENARIOS.length });
  const popupProcess = pendingProcesses.find((process) => process.scenario.id === popupProcessId);
  const popupFocusLayer = LAYERS.find((layer) => layer.id === popupProcess?.scenario.focusLayer);
  pendingIdsRef.current = new Set(pendingProcesses.map((process) => process.scenario.id));
  selectPendingRef.current = onSelectPending;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const registry = createLayerRegistry();
    const map = new ArcGISMap({
      basemap: "hybrid",
      layers: [registry.ucUs, registry.ucPi, registry.terrasIndigenas, registry.app, registry.processes, registry.evidence, registry.activeProcess],
    });
    const view = new MapView({
      container,
      center: [-48.50, -22.60],
      zoom: 7,
      constraints: { snapToZoom: false, minZoom: 6, maxZoom: 18 },
      popupEnabled: false,
    });
    view.set("map", map);

    mapRef.current = map;
    layersRef.current = registry;
    viewRef.current = view;
    registry.processes.addMany(createProcessCatalogGraphics());
    view.ui.remove("zoom");
    const extentWatch = view.watch("extent", () => syncMapOverlays(view, container.parentElement));
    const sizeWatch = view.watch("size", () => syncMapOverlays(view, container.parentElement));
    const clickHandle = view.on("click", (event) => {
      void view.hitTest(event, { include: [registry.processes, registry.activeProcess] }).then(({ results }) => {
        const result = results.find((candidate) => candidate.type === "graphic" && pendingIdsRef.current.has(String(candidate.graphic.attributes.id)));
        if (result?.type === "graphic") selectPendingRef.current(String(result.graphic.attributes.id));
      }).catch(() => undefined);
    });
    void view.when().then(() => syncMapOverlays(view, container.parentElement));

    void view.when().then(async () => {
      const [app, ucPi, ucUs, terrasIndigenas] = await Promise.all([
        registry.app.queryFeatureCount(),
        registry.ucPi.queryFeatureCount(),
        registry.ucUs.queryFeatureCount(),
        registry.terrasIndigenas.queryFeatureCount(),
      ]);
      setFeatureCounts((current) => ({ ...current, app, ucPi, ucUs, terrasIndigenas }));
    }).catch(() => {
      setError("O mapa não pôde carregar todas as camadas. Os dados do processo continuam disponíveis nos painéis.");
    });

    return () => {
      viewRef.current = null;
      mapRef.current = null;
      layersRef.current = null;
      extentWatch.remove();
      sizeWatch.remove();
      clickHandle.remove();
      view.destroy();
    };
  }, []);

  useEffect(() => {
    const view = viewRef.current;
    const registry = layersRef.current;
    if (!view || !registry) return;

    registry.activeProcess.removeAll();
    registry.evidence.removeAll();
    const polygon = polygonFromScenario(scenario);
    registry.activeProcess.addMany(createActiveProcessGraphics(scenario, polygon));

    if (scenario.focusLayer !== "none") {
      registry[scenario.focusLayer].visible = true;
      setVisibility((current) => ({ ...current, [scenario.focusLayer]: true }));
    }

    if (stageReached(stage, "territorial-analysis")) {
      registry.evidence.add(createEvidenceGraphic(scenario, polygon));
    }

    if (previousScenarioId.current !== scenario.id) {
      previousScenarioId.current = scenario.id;
      void view.goTo(
        { center: [...scenario.center], zoom: scenario.mapZoom },
        { duration: pinnedProcessId || prefersReducedMotion() ? 0 : 1400 },
      ).catch(() => undefined);
    }
    syncMapOverlays(view, containerRef.current?.parentElement ?? null);
  }, [scenario, stage]);

  useEffect(() => {
    if (viewRef.current) syncMapOverlays(viewRef.current, containerRef.current?.parentElement ?? null);
  }, [pendingProcesses]);

  useEffect(() => {
    const view = viewRef.current;
    const registry = layersRef.current;
    if (!view || !registry) return;

    if (pinnedProcessId) return;
    let cancelled = false;

    if (focus === "overview") {
      void view.goTo({ center: [-48.50, -22.60], zoom: 7 }, { duration: prefersReducedMotion() ? 0 : 1000 }).catch(() => undefined);
      return;
    }

    if (focus === "process") {
      void view.goTo({ center: [...scenario.center], zoom: scenario.mapZoom }, { duration: prefersReducedMotion() ? 0 : 900 }).catch(() => undefined);
      return;
    }

    const layer = registry[focus];
    layer.visible = true;
    setVisibility((current) => ({ ...current, [focus]: true }));
    void layer.when().then(() => {
      if (!cancelled && layer.fullExtent) {
        void view.goTo(layer.fullExtent.expand(1.1), { duration: prefersReducedMotion() ? 0 : 1000 }).catch(() => undefined);
      }
    });
    return () => { cancelled = true; };
  }, [focus, scenario, pinnedProcessId]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view || pinnedProcessId !== scenario.id) return;
    void view.goTo({ center: [...scenario.center], zoom: scenario.mapZoom }, { duration: 0 }).catch(() => undefined);
  }, [pinnedProcessId, scenario]);

  function toggleLayer(id: LayerId) {
    const layer = layersRef.current?.[id];
    if (!layer) return;
    const nextVisible = !layer.visible;
    layer.visible = nextVisible;
    setVisibility((current) => ({ ...current, [id]: nextVisible }));
  }

  function selectBasemap(id: string) {
    const map = mapRef.current;
    if (!map) return;
    map.basemap = id;
    setBasemap(id);
  }

  return (
    <div className="map-region" aria-label="Mapa do processo e das evidências territoriais" data-process-id={scenario.id}>
      <div className="map-view" ref={containerRef} />
      <svg className="map-process-overlay" aria-hidden="true"><polygon data-process-outline={scenario.id} data-coordinates={JSON.stringify(scenario.polygon)} /></svg>
      <div className="map-pending-overlays">{pendingMarkerSpecs(pendingProcesses).map((marker) => <button type="button" className="map-pending-marker" data-longitude={marker.center[0]} data-latitude={marker.center[1]} key={marker.id} title={`${marker.id}: ${marker.label}`} aria-label={`Abrir ${marker.label}`} onClick={() => onSelectPending(marker.id)}>!</button>)}</div>
      {popupProcess ? createPortal(<PendingMapPopup process={popupProcess} legend={pendingMapLegend(popupProcess.scenario, popupFocusLayer, popupFocusLayer ? visibility[popupFocusLayer.id] : false)} onClose={onClosePopup} />, document.querySelector(".app") ?? document.body) : null}
      {error ? <div className="map-error" role="alert">{error}</div> : null}
      <div className="map-tools" aria-label="Ferramentas do mapa">
        <button type="button" aria-label="Visão estadual" onClick={() => moveHome(viewRef.current)}><House /></button>
        <button type="button" aria-label="Aumentar zoom" onClick={() => changeZoom(viewRef.current, 1)}><Plus /></button>
        <button type="button" aria-label="Diminuir zoom" onClick={() => changeZoom(viewRef.current, -1)}><Minus /></button>
        <button
          className={catalogOpen ? "map-tool-button map-tool-button--active" : "map-tool-button"}
          type="button"
          aria-label={catalogOpen ? "Fechar camadas e basemaps" : "Abrir camadas e basemaps"}
          aria-expanded={catalogOpen}
          onClick={() => setCatalogOpen(!catalogOpen)}
        >
          <Stack /> Camadas &amp; basemaps
        </button>
      </div>
      {catalogOpen ? (
        <aside className="map-catalog" aria-label="Camadas e basemaps">
          <header>
            <div className="map-catalog__tabs" role="tablist">
              <button type="button" role="tab" aria-selected={catalogTab === "layers"} onClick={() => setCatalogTab("layers")}>Camadas</button>
              <button type="button" role="tab" aria-selected={catalogTab === "basemaps"} onClick={() => setCatalogTab("basemaps")}>Basemaps</button>
            </div>
            <button type="button" aria-label="Fechar camadas e basemaps" onClick={() => setCatalogOpen(false)}><X /></button>
          </header>
          {catalogTab === "layers" ? (
            <div className="map-catalog__body">
              <LayerGroup title="Processos" open>
                <LayerToggle definition={PROCESS_LAYER} visible={visibility.processes} count={featureCounts.processes} onToggle={toggleLayer} />
                <div className="map-catalog__legend" aria-label="Legenda de complexidade">
                  <span><i className="tone-low" /> Baixa</span><span><i className="tone-medium" /> Média</span><span><i className="tone-high" /> Alta</span>
                </div>
              </LayerGroup>
              <LayerGroup title="Camadas ambientais e territoriais" open>
                {LAYERS.slice(1).map((definition) => <LayerToggle key={definition.id} definition={definition} visible={visibility[definition.id]} count={featureCounts[definition.id]} onToggle={toggleLayer} />)}
              </LayerGroup>
              <LayerGroup title="Análise" open>
                <div className="map-catalog__analysis"><i /> Processo em foco e evidências produzidas</div>
              </LayerGroup>
            </div>
          ) : (
            <div className="basemap-grid">
              {BASEMAPS.map((item) => (
                <button className={basemap === item.id ? "basemap-card basemap-card--selected" : "basemap-card"} type="button" key={item.id} onClick={() => selectBasemap(item.id)}>
                  <span style={{ backgroundImage: `url(${item.image})` }} />
                  <strong>{item.label}</strong>
                </button>
              ))}
            </div>
          )}
        </aside>
      ) : null}
    </div>
  );
}

function LayerGroup({ title, open, children }: { readonly title: string; readonly open: boolean; readonly children: ReactNode }) {
  return <details className="map-catalog__group" open={open}><summary><CaretDown />{title}</summary><div>{children}</div></details>;
}

function LayerToggle({ definition, visible, count, onToggle }: { readonly definition: LayerDefinition; readonly visible: boolean; readonly count: number | undefined; readonly onToggle: (id: LayerId) => void }) {
  return (
    <button className={visible ? "layer-toggle" : "layer-toggle layer-toggle--off"} type="button" aria-pressed={visible} onClick={() => onToggle(definition.id)}>
      <i style={{ backgroundColor: definition.color }} />
      <span><strong>{definition.label}</strong><small>{definition.supplied ? "Camada fornecida" : "Dado sintético"}{count === undefined ? " · carregando" : ` · ${count} ${count === 1 ? "feição" : "feições"}`}</small></span>
      {visible ? <Eye aria-label="Visível" /> : <EyeSlash aria-label="Oculta" />}
    </button>
  );
}

function createLayerRegistry(): LayerRegistry {
  return {
    processes: new GraphicsLayer({ title: "Processos do catálogo", visible: true }),
    activeProcess: new GraphicsLayer({ title: "Processo em foco", visible: true }),
    evidence: new GraphicsLayer({ title: "Evidências da análise", visible: true }),
    app: createGeoJsonLayer("/assets/layers/demo-simplified/app-hidrica-simulada.geojson", "APP hídrica simulada", [47, 128, 237, 0.18], [47, 128, 237, 0.95]),
    ucPi: createGeoJsonLayer("/assets/layers/demo-simplified/uc-protecao-integral.geojson", "UC estadual, Proteção Integral", [22, 128, 61, 0.2], [22, 128, 61, 0.9]),
    ucUs: createGeoJsonLayer("/assets/layers/demo-simplified/uc-uso-sustentavel.geojson", "UC estadual, Uso Sustentável", [79, 138, 60, 0.16], [79, 138, 60, 0.85]),
    terrasIndigenas: createGeoJsonLayer("/assets/layers/demo-simplified/terras-indigenas.geojson", "Terras Indígenas", [192, 107, 22, 0.18], [192, 107, 22, 0.9]),
  };
}

function createGeoJsonLayer(url: string, title: string, fill: number[], outline: number[]): GeoJSONLayer {
  return new GeoJSONLayer({
    url,
    title,
    visible: true,
    outFields: ["*"],
    renderer: {
      type: "simple",
      symbol: { type: "simple-fill", color: fill, outline: { color: outline, width: 1.2 } },
    },
  });
}

function createProcessCatalogGraphics(): Graphic[] {
  return OPERATION_SCENARIOS.flatMap((scenario) => {
    const polygon = polygonFromScenario(scenario);
    return [new Graphic({
      geometry: polygon,
      attributes: { id: scenario.id, title: scenario.title, municipality: scenario.municipality },
      symbol: { type: "simple-fill", color: [114, 87, 255, 0.08], outline: { color: [114, 87, 255, 0.72], width: 1.2 } },
    })];
  });
}

function createActiveProcessGraphics(scenario: OperationScenario, polygon: Polygon): Graphic[] {
  const high = scenario.recommendation.score >= 35;
  const color = high ? PROCESS_HIGH_COLOR : PROCESS_LOW_COLOR;
  return [
    new Graphic({
      geometry: polygon,
      attributes: { id: scenario.id, title: scenario.title, municipality: scenario.municipality },
      symbol: { type: "simple-fill", color: [...color, 0.24], outline: { color: [...color, 1], width: 2.5 } },
    }),
    new Graphic({
      geometry: { type: "point", longitude: scenario.center[0], latitude: scenario.center[1], spatialReference: { wkid: 4326 } },
      attributes: { id: scenario.id },
      symbol: { type: "simple-marker", color: [...color, 1], size: 13, outline: { color: [255, 255, 255, 1], width: 2 } },
    }),
  ];
}

function createEvidenceGraphic(scenario: OperationScenario, polygon: Polygon): Graphic {
  const clear = scenario.focusLayer === "none";
  const color = clear ? EVIDENCE_CLEAR_COLOR : EVIDENCE_ALERT_COLOR;
  return new Graphic({
    geometry: extentOrPolygon(polygon, 1.6),
    attributes: { process: scenario.id, result: scenario.focusLayerLabel },
    symbol: {
      type: "simple-fill",
      color: [...color, clear ? 0.04 : 0.08],
      outline: { color: [...color, clear ? 0.9 : 0.95], width: 2, style: "dash" },
    },
  });
}

function polygonFromScenario(scenario: OperationScenario): Polygon {
  const ring = scenario.polygon.map(([longitude, latitude]) => [longitude, latitude]);
  return new Polygon({ rings: [ring], spatialReference: { wkid: 4326 } });
}

function syncMapOverlays(view: MapView, container: HTMLElement | null) {
  if (!container || !view.ready) return;
  const outline = container.querySelector<SVGPolygonElement>("[data-process-outline]");
  if (outline) {
    const coordinates = JSON.parse(outline.dataset.coordinates ?? "[]") as [number, number][];
    const points = coordinates.map(([longitude, latitude]) => {
      const screen = view.toScreen(new Point({ longitude, latitude, spatialReference: { wkid: 4326 } }));
      return screen ? `${screen.x},${screen.y}` : "";
    }).filter(Boolean);
    outline.setAttribute("points", points.join(" "));
  }
  container.querySelectorAll<HTMLElement>(".map-pending-marker").forEach((marker) => {
    const longitude = Number(marker.dataset.longitude);
    const latitude = Number(marker.dataset.latitude);
    const screen = view.toScreen(new Point({ longitude, latitude, spatialReference: { wkid: 4326 } }));
    if (!screen) return;
    marker.style.left = `${screen.x}px`;
    marker.style.top = `${screen.y}px`;
  });
}

function extentOrPolygon(polygon: Polygon, factor: number) {
  return polygon.extent?.expand(factor) ?? polygon;
}

function moveHome(view: MapView | null) {
  if (!view) return;
  void view.goTo({ center: [-48.50, -22.60], zoom: 7 }, { duration: prefersReducedMotion() ? 0 : 1000 }).catch(() => undefined);
}

function changeZoom(view: MapView | null, amount: number) {
  if (!view) return;
  void view.goTo({ zoom: Math.min(18, Math.max(6, view.zoom + amount)) }, { duration: prefersReducedMotion() ? 0 : 240 }).catch(() => undefined);
}

function stageReached(current: AgentStage, target: AgentStage) {
  const order: readonly AgentStage[] = ["receiving", "geometry", "territorial-analysis", "conformity", "routing", "opinion"];
  return order.indexOf(current) >= order.indexOf(target);
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
