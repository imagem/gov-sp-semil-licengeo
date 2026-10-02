import { ArrowRight, Database, MapPin, Robot, WarningCircle, X } from "@phosphor-icons/react";
import { AGENTS, EXPLANATION_RULES } from "../../app/operation-data";
import { pendingPopupDetails } from "../../app/pending-popup";
import { pendingExplanation } from "../../app/pending-trace";
import { SPECIALISTS } from "../../app/specialists";
import type { ProcessExecutionProjection } from "../../domain/model";
import type { MapAnalysisLegendItem } from "./map-analysis-legend";

export function PendingMapPopup({ process, legend, onClose }: { readonly process: ProcessExecutionProjection; readonly legend: readonly MapAnalysisLegendItem[]; readonly onClose: () => void }) {
  const explanation = pendingExplanation(process, EXPLANATION_RULES, SPECIALISTS);
  const details = pendingPopupDetails(process);
  const agent = AGENTS.find((item) => item.stage === "territorial-analysis");

  return <section className="pending-map-popup" role="dialog" aria-modal="false" aria-labelledby="pending-map-popup-title">
    <header className="pending-map-popup__header">
      <span className="pending-map-popup__badge"><WarningCircle weight="fill" /> Revisão humana</span>
      <button type="button" className="pending-map-popup__close" aria-label="Fechar detalhes da pendência" onClick={onClose}><X /></button>
      <small>{process.scenario.id} · {process.scenario.municipality}</small>
      <h2 id="pending-map-popup-title">Por que esta área está pendente?</h2>
      <p>{process.scenario.title}</p>
    </header>

    <div className="pending-map-popup__body">
      <ol className="pending-map-popup__trail" aria-label="Trilha da triagem">
        <li><span><MapPin /></span><strong>Área</strong><small>Polígono recebido</small></li>
        <li><span><Database /></span><strong>Fontes</strong><small>{details.sources.length ? `${details.sources.length} registrada${details.sources.length > 1 ? "s" : ""}` : "Sem registro"}</small></li>
        <li><span><Robot /></span><strong>Agente</strong><small>Análise territorial</small></li>
        <li><span><WarningCircle /></span><strong>Pendência</strong><small>Revisão humana</small></li>
      </ol>

      <div className="pending-map-popup__section">
        <h3>Fontes e camadas consultadas</h3>
        {details.highlightLayer ? <span className="pending-map-popup__layer">Camada em destaque · {details.highlightLayer}</span> : null}
        {details.sources.length ? <ul className="pending-map-popup__sources">{details.sources.map((source) => <li key={source}><Database />{source}</li>)}</ul> : <p>Nenhuma fonte de evidência registrada nesta triagem.</p>}
        <div className="pending-map-popup__legend" aria-label="Legenda da análise no mapa">
          <h4>Legenda desta análise no mapa</h4>
          <ul>{legend.map((item) => <li key={item.label}>
            <i className={`pending-map-popup__legend-swatch pending-map-popup__legend-swatch--${item.pattern}`} style={{ borderColor: item.color, backgroundColor: `${item.color}26` }} aria-hidden="true" />
            <span>{item.label}</span>
          </li>)}</ul>
        </div>
      </div>

      <div className="pending-map-popup__section pending-map-popup__section--reason">
        <h3>Resultado da triagem</h3>
        <p><strong>{explanation.ruleCode} · {explanation.ruleTitle}</strong></p>
        {process.evidence.length ? <ul className="pending-map-popup__evidence">{process.evidence.map((item) => <li key={item.id}><strong>{item.title} · {item.measure}</strong><span>{item.detail}</span></li>)}</ul> : <p>Nenhuma evidência registrada.</p>}
        <p>{explanation.reason}</p>
      </div>

      <div className="pending-map-popup__agent">
        <Robot /><span><small>Agente responsável</small><strong>Fase 3 · {agent?.shortName ?? "Análise territorial"}</strong></span>
      </div>
      {explanation.specialists.length ? <p className="pending-map-popup__specialists">Especialistas convocados: {explanation.specialists.map((item) => `${item.id} · ${item.name}`).join("; ")}</p> : null}
      <p className="pending-map-popup__footer"><ArrowRight /> {explanation.action}</p>
    </div>
  </section>;
}
