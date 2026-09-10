import ArcGISMap from "@arcgis/core/Map";
import Basemap from "@arcgis/core/Basemap";
import TileLayer from "@arcgis/core/layers/TileLayer";
import GeoJSONLayer from "@arcgis/core/layers/GeoJSONLayer";
import MapView from "@arcgis/core/views/MapView";
import { ArrowSquareOut, Stack } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";

const LAYERS = [
  { id: "ucPi", title: "Unidades de Conservação", category: "Proteção Integral", file: "uc-protecao-integral", color: "#19854d", source: "DataGEO · Sistema Ambiental Paulista", url: "https://datageo.ambiente.sp.gov.br/" },
  { id: "ucUs", title: "Unidades de Conservação", category: "Uso Sustentável", file: "uc-uso-sustentavel", color: "#538b3c", source: "DataGEO · Sistema Ambiental Paulista", url: "https://datageo.ambiente.sp.gov.br/" },
  { id: "terrasIndigenas", title: "Terras Indígenas", category: "Recorte territorial fornecido", file: "terras-indigenas", color: "#b9691b", source: "Arquivo territorial fornecido", url: "/assets/layers/demo-simplified/terras-indigenas.geojson" },
];
type LayerEntry = (typeof LAYERS)[number];

export function LayersContent({ query }: { readonly query: string }) {
  const layers = LAYERS.filter((layer) => (layer.title + " " + layer.category + " " + layer.source).toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR")));
  return <div className="layers-page"><div className="layer-intro"><Stack /><span><strong>Acervo territorial</strong><small>São Paulo · geometrias fornecidas, simplificadas para apresentação</small></span><b>{layers.length} camadas</b></div>
    <div className="layer-gallery">{layers.map((layer) => <article className="layer-entry" key={layer.id}><LayerPreview layer={layer} /><div className="layer-entry__content"><span className="layer-category">{layer.category}</span><h3>{layer.title}</h3><dl><div><dt>Origem</dt><dd>{layer.source}</dd></div><div><dt>Natureza</dt><dd>Dado fornecido · cópia local</dd></div><div><dt>Atualização</dt><dd>Data não informada no catálogo</dd></div></dl><a href={layer.url} target="_blank" rel="noreferrer">{layer.id === "terrasIndigenas" ? "Consultar arquivo fornecido" : "Consultar instituição"} <ArrowSquareOut /></a></div></article>)}</div>
    {!layers.length ? <p className="work-empty">Nenhuma camada corresponde à pesquisa.</p> : null}
  </div>;
}

function LayerPreview({ layer }: { readonly layer: LayerEntry }) {
  const ref = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState("Carregando camada");
  useEffect(() => {
    if (!ref.current) return;
    let disposed = false;
    const data = new GeoJSONLayer({ url: "/assets/layers/demo-simplified/" + layer.file + ".geojson", renderer: { type: "simple", symbol: { type: "simple-fill", color: layer.color + "55", outline: { color: layer.color, width: 1.3 } } }, popupEnabled: false });
    const map = new ArcGISMap({ layers: [data] });
    map.set("basemap", new Basemap({ baseLayers: [new TileLayer({ url: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer" })] }));
    const view = new MapView({ container: ref.current, center: [-48.5, -23], zoom: 6, ui: { components: [] }, constraints: { rotationEnabled: false } });
    view.set("map", map);
    const handles = [view.on("drag", (event) => event.stopPropagation()), view.on("double-click", (event) => event.stopPropagation()), view.on("key-down", (event) => event.stopPropagation()), view.on("mouse-wheel", (event) => event.stopPropagation())];
    void data.load().then(async () => {
      const count = await data.queryFeatureCount();
      if (disposed) return;
      setStatus(count + " feições · dado fornecido");
      await view.when();
      if (!disposed && data.fullExtent) await view.goTo(data.fullExtent.expand(1.15), { animate: false });
    }).catch(() => { if (!disposed) setStatus("Prévia indisponível. Consulte a fonte abaixo."); });
    return () => { disposed = true; handles.forEach((handle) => handle.remove()); view.destroy(); };
  }, [layer]);
  return <div className="layer-preview"><div className="layer-preview__map" ref={ref} aria-label={layer.title + " · " + layer.category} /><span role="status">{status}</span></div>;
}
