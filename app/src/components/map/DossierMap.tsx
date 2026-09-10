import ArcGISMap from "@arcgis/core/Map";
import Basemap from "@arcgis/core/Basemap";
import TileLayer from "@arcgis/core/layers/TileLayer";
import GeoJSONLayer from "@arcgis/core/layers/GeoJSONLayer";
import Graphic from "@arcgis/core/Graphic";
import Polygon from "@arcgis/core/geometry/Polygon";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";
import MapView from "@arcgis/core/views/MapView";
import { useEffect, useRef, useState } from "react";
import { House, Plus, Minus } from "@phosphor-icons/react";
import type { ProcessExecutionProjection } from "../../domain/model";

const SOURCES = [
  {
    id: "ucPi",
    title: "UC Proteção Integral",
    file: "uc-protecao-integral",
    color: "#16803c",
  },
  {
    id: "ucUs",
    title: "UC Uso Sustentável",
    file: "uc-uso-sustentavel",
    color: "#5e913d",
  },
  {
    id: "terrasIndigenas",
    title: "Terras Indígenas",
    file: "terras-indigenas",
    color: "#b9691b",
  },
];
const BASES = {
  streets: "World_Street_Map",
  imagery: "World_Imagery",
  topo: "World_Topo_Map",
};
type BaseId = keyof typeof BASES;
export function DossierMap({
  process,
  evidenceId,
}: {
  readonly process: ProcessExecutionProjection;
  readonly evidenceId: string | null;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const viewRef = useRef<MapView | null>(null);
  const layers = useRef<GeoJSONLayer[]>([]);
  const [base, setBase] = useState<BaseId>("streets");
  const [visible, setVisible] = useState<string[]>(
    SOURCES.map((source) => source.id),
  );
  const [error, setError] = useState("");
  const scenario = process.scenario;
  useEffect(() => {
    if (!ref.current) return;
    const boundary = new Polygon({
      rings: [scenario.polygon.map((point) => [...point])],
      spatialReference: { wkid: 4326 },
    });
    const footprint = new GraphicsLayer();
    footprint.add(
      new Graphic({
        geometry: boundary,
        symbol: {
          type: "simple-fill",
          color: [14, 121, 150, 0.15],
          outline: { color: "#087991", width: 3 },
        },
        attributes: { name: scenario.id },
        popupTemplate: {
          title: scenario.id,
          content:
            "Geometria sintética do empreendimento. " + scenario.municipality,
        },
      }),
    );
    layers.current = SOURCES.map(
      (source) =>
        new GeoJSONLayer({
          url: "/assets/layers/demo-simplified/" + source.file + ".geojson",
          title: source.title,
          renderer: {
            type: "simple",
            symbol: {
              type: "simple-fill",
              color: source.color + "44",
              outline: { color: source.color, width: 1 },
            },
          },
          popupTemplate: {
            title: "{nome}",
            content: [
              {
                type: "fields",
                fieldInfos: [
                  { fieldName: "categoria", label: "Categoria" },
                  { fieldName: "orgao_gestor", label: "Órgão gestor" },
                ],
              },
            ],
          },
        }),
    );
    const map = new ArcGISMap({ layers: [...layers.current, footprint] });
    const view = new MapView({
      container: ref.current,
      center: [...scenario.center],
      zoom: scenario.mapZoom,
      constraints: { snapToZoom: false },
    });
    view.set("map", map);
    map.set(
      "basemap",
      new Basemap({
        baseLayers: [
          new TileLayer({
            url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer",
          }),
        ],
      }),
    );
    view.ui.remove("zoom");
    viewRef.current = view;
    let active = true;
    void view
      .when()
      .then(() => {
        if (boundary.extent)
          return view.goTo(boundary.extent.expand(2), { animate: false });
      })
      .catch(() => {
        if (active)
          setError(
            "Mapa indisponível. A identificação territorial permanece no dossiê.",
          );
      });
    return () => {
      active = false;
      viewRef.current = null;
      view.destroy();
    };
  }, [scenario]);
  useEffect(() => {
    viewRef.current?.map?.set(
      "basemap",
      new Basemap({
        baseLayers: [
          new TileLayer({
            url:
              "https://server.arcgisonline.com/ArcGIS/rest/services/" +
              BASES[base] +
              "/MapServer",
          }),
        ],
      }),
    );
  }, [base, scenario]);
  useEffect(() => {
    layers.current.forEach((layer, index) => {
      const source = SOURCES[index];
      layer.visible = !!source && visible.includes(source.id);
    });
  }, [visible, scenario]);
  useEffect(() => {
    if (evidenceId)
      void viewRef.current
        ?.goTo({ center: [...scenario.center], zoom: scenario.mapZoom + 1 })
        .catch(() => undefined);
  }, [evidenceId, scenario]);
  return (
    <section className="dossier-map" aria-label="Mapa territorial do processo">
      <div className="dossier-map__canvas" ref={ref} />
      <div className="dossier-map__tools">
        <button
          type="button"
          title="Voltar ao processo"
          aria-label="Voltar ao processo"
          onClick={() => {
            void viewRef.current
              ?.goTo({ center: [...scenario.center], zoom: scenario.mapZoom })
              .catch(() => undefined);
          }}
        >
          <House />
        </button>
        <button
          type="button"
          aria-label="Aumentar zoom do dossiê"
          title="Aumentar zoom"
          onClick={() => {
            if (viewRef.current) viewRef.current.zoom += 1;
          }}
        >
          <Plus />
        </button>
        <button
          type="button"
          aria-label="Diminuir zoom do dossiê"
          title="Diminuir zoom"
          onClick={() => {
            if (viewRef.current) viewRef.current.zoom -= 1;
          }}
        >
          <Minus />
        </button>
        <select
          aria-label="Mapa base do dossiê"
          value={base}
          onChange={(e) => {
            if (
              e.target.value === "streets" ||
              e.target.value === "imagery" ||
              e.target.value === "topo"
            )
              setBase(e.target.value);
          }}
        >
          <option value="streets">Ruas</option>
          <option value="imagery">Imagem</option>
          <option value="topo">Topográfico</option>
        </select>
      </div>
      <details className="dossier-map__legend">
        <summary>Camadas e legenda</summary>
        <p>
          <i className="process-swatch" /> Empreendimento sintético
        </p>
        {SOURCES.map((source) => (
          <label key={source.id}>
            <input
              type="checkbox"
              checked={visible.includes(source.id)}
              onChange={(e) =>
                setVisible((items) =>
                  e.target.checked
                    ? [...items, source.id]
                    : items.filter((id) => id !== source.id),
                )
              }
            />
            <i style={{ background: source.color }} />
            {source.title}
          </label>
        ))}
      </details>
      {evidenceId ? (
        <div className="dossier-map__finding">
          {process.evidence.find((e) => e.id === evidenceId)?.title} · área do
          processo em foco
        </div>
      ) : null}
      {error ? (
        <p className="map-error" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
