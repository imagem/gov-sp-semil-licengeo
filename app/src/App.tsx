import {
  CheckCircle,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";

import type { AgentStage, Evidence, HumanDecisionCommand } from "./domain/model";
import { useScenario } from "./app/use-scenario";
import type { TriageRule } from "./app/operation-data";
import { AppHeader } from "./components/shell/AppHeader";
import { Sidebar, type NavigationId } from "./components/shell/Sidebar";
import { HumanWorkPanel } from "./components/operation/HumanWorkPanel";
import { RulesPanel } from "./components/operation/RulesPanel";
import { ProcessInspector } from "./components/operation/ProcessInspector";
import { KpiStrip } from "./components/operation/KpiStrip";
import { AgentWorkbench } from "./components/operation/AgentWorkbench";
import { GeoAssistant } from "./components/operation/GeoAssistant";
import { ScenarioToolbar } from "./components/operation/ScenarioToolbar";
import { OperationMap, type MapFocus } from "./components/map/OperationMap";
import { DecisionDialog } from "./components/dialogs/DecisionDialog";
import { DossierDialog } from "./components/dialogs/DossierDialog";
import { RuleDetailsDialog } from "./components/dialogs/RuleDetailsDialog";
import {
  DEFAULT_RULE_CONFIGURATIONS,
  DEFAULT_TRIAGE_RULE,
  TRIAGE_RULES,
  type RuleConfiguration,
} from "./app/operation-data";
import { ModulePage } from "./components/modules/ModulePage";
import { pendingHumanWork } from "./app/work-queues";

type PanelId = "human" | "rules" | "inspector" | "agents";
type PanelState = Record<PanelId, boolean>;

const OPEN_PANELS: PanelState = {
  human: true,
  rules: false,
  inspector: false,
  agents: true,
};

const INITIAL_RULE_STATES = {
  app: true,
  ucPi: true,
  ucUs: true,
  terrasIndigenas: true,
  divergence: true,
  score: true,
} satisfies Readonly<Record<TriageRule["id"], boolean>>;

export default function App() {
  const scenario = useScenario();
  const pendingProcesses = scenario.portfolio.processes.filter(pendingHumanWork);
  const [darkTheme, setDarkTheme] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeNavigation, setActiveNavigation] = useState<NavigationId>("operation");
  const [panels, setPanels] = useState<PanelState>(OPEN_PANELS);
  const previousPanels = useRef<PanelState>(OPEN_PANELS);
  const [focusMode, setFocusMode] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [mapFocus, setMapFocus] = useState<MapFocus>("process");
  const [selectedRule, setSelectedRule] = useState<TriageRule["id"]>("app");
  const [enabledRules, setEnabledRules] = useState<Readonly<Record<TriageRule["id"], boolean>>>(INITIAL_RULE_STATES);
  const [ruleConfigurations, setRuleConfigurations] = useState<Readonly<Record<TriageRule["id"], RuleConfiguration>>>(DEFAULT_RULE_CONFIGURATIONS);
  const [selectedStage, setSelectedStage] = useState<AgentStage>("territorial-analysis");
  const [decisionOpen, setDecisionOpen] = useState(false);
  const [decisionKind, setDecisionKind] = useState<HumanDecisionCommand["kind"]>("approve-recommendation");
  const [dossierOpen, setDossierOpen] = useState(false);
  const [ruleDetailsOpen, setRuleDetailsOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setSelectedStage(scenario.projection.currentStage);
  }, [scenario.projection.currentStage]);

  useEffect(() => {
    const layer = scenario.projection.scenario.focusLayer;
    setSelectedRule(layer === "none" ? "score" : layer);
    setMapFocus("process");
  }, [scenario.projection.scenario]);

  function togglePanel(id: PanelId) {
    if (id === "agents") setCatalogOpen(false);
    else setAssistantOpen(false);
    setFocusMode(false);
    setPanels((current) => {
      if (id === "agents") return { ...current, agents: !current.agents };
      return {
        ...current,
        human: id === "human" ? !current.human : false,
        rules: id === "rules" ? !current.rules : false,
        inspector: id === "inspector" ? !current.inspector : false,
      };
    });
  }

  function toggleFocusMode() {
    if (focusMode) {
      setPanels(previousPanels.current);
      setFocusMode(false);
      return;
    }
    previousPanels.current = panels;
    setPanels({ human: false, rules: false, inspector: false, agents: false });
    setFocusMode(true);
  }

  function selectRule(rule: TriageRule) {
    setSelectedRule(rule.id);
    setMapFocus(rule.id === "score" || rule.id === "divergence" ? "process" : rule.id);
  }

  function toggleRule(rule: TriageRule) {
    setEnabledRules((current) => ({ ...current, [rule.id]: !current[rule.id] }));
    setToast(`${rule.title} ${enabledRules[rule.id] ? "desativada" : "ativada"}.`);
  }

  function configureRule(rule: TriageRule) {
    setSelectedRule(rule.id);
    setRuleDetailsOpen(true);
  }

  function selectEvidence(evidence: Evidence) {
    const focusLayer = scenario.projection.scenario.focusLayer;
    setMapFocus(focusLayer === "none" || evidence.kind === "attribute-divergence" ? "process" : focusLayer);
    setToast(`${evidence.title} localizada no mapa.`);
  }

  function openDecision(kind: HumanDecisionCommand["kind"]) {
    setDecisionKind(kind);
    setDecisionOpen(true);
  }

  return (
    <div className={["app", darkTheme ? "app--dark" : "", sidebarCollapsed ? "app--nav-collapsed" : ""].filter(Boolean).join(" ")}>
      <AppHeader
        notificationCount={pendingProcesses.length}
        title={navigationTitle(activeNavigation)}
        clock={scenario.projection.clock}
        darkTheme={darkTheme}
        onToggleTheme={() => setDarkTheme((current) => !current)}
        onToggleNotifications={() => setNotificationsOpen((current) => !current)}
      />
      <Sidebar active={activeNavigation} collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((current) => !current)} onNavigate={setActiveNavigation} />

      {activeNavigation === "operation" ? <main className="operation-page">
        <OperationMap focus={mapFocus} scenario={scenario.projection.scenario} stage={scenario.projection.currentStage} catalogOpen={catalogOpen} onCatalogChange={(open) => { setCatalogOpen(open); if (open) setPanels((current) => ({ ...current, agents: false })); }} />
        <div className={focusMode ? "operation-overlay operation-overlay--focus" : "operation-overlay"}>
          <ScenarioToolbar
            projection={scenario.projection}
            portfolio={scenario.portfolio}
            onToggleHuman={() => togglePanel("human")}
            onToggleRules={() => togglePanel("rules")}
            onToggleInspector={() => togglePanel("inspector")}
            onToggleAgents={() => togglePanel("agents")}
            onFocusMap={toggleFocusMode}
            humanOpen={panels.human}
            rulesOpen={panels.rules}
            inspectorOpen={panels.inspector}
            agentsOpen={panels.agents}
            focusMode={focusMode}
          />
          {panels.human ? <HumanWorkPanel
            projection={scenario.projection}
            portfolio={scenario.portfolio}
            collapsed={false}
            onToggle={() => togglePanel("human")}
            onResolve={() => openDecision("approve-recommendation")}
            onRequestComplement={() => openDecision("request-complement")}
            onOpenDossier={() => setDossierOpen(true)}
            onOpenProcesses={() => setActiveNavigation("processes")}
            onSelectProcess={scenario.selectProcess}
          /> : null}
          {panels.rules ? <RulesPanel
            collapsed={false}
            onToggle={() => togglePanel("rules")}
            selectedRule={selectedRule}
            enabledRules={enabledRules}
            configurations={ruleConfigurations}
            onSelectRule={selectRule}
            onToggleRule={toggleRule}
            onConfigureRule={configureRule}
          /> : null}
          {panels.inspector ? <ProcessInspector
            projection={scenario.projection}
            collapsed={false}
            onToggle={() => togglePanel("inspector")}
            onResolve={() => openDecision("approve-recommendation")}
            onOpenDossier={() => setDossierOpen(true)}
            onSelectEvidence={selectEvidence}
            onOpenProcess={() => setActiveNavigation("process")}
          /> : null}
          {panels.agents ? <AgentWorkbench
            projection={scenario.projection}
            portfolio={scenario.portfolio}
            selectedStage={selectedStage}
            onSelectStage={setSelectedStage}
            onSelectProcess={scenario.selectProcess}
            onToggle={() => togglePanel("agents")}
          /> : null}
        </div>


        <GeoAssistant projection={scenario.projection} portfolio={scenario.portfolio} open={assistantOpen} onOpenChange={(open) => { setAssistantOpen(open); if (open) setPanels((current) => ({ ...current, human: false, rules: false, inspector: false })); }} />

        <div className="app-footer">
          <div className="footer-queue-state" aria-label="Estado da fila automática">
            <i aria-hidden="true" />
            <span><small>Fila automática</small><strong>{scenario.projection.scenario.id}</strong></span>
            <b>{scenario.portfolio.activeProcesses.length} ativos · {scenario.portfolio.queuedProcesses.length} aguardando</b>
          </div>
          <KpiStrip projection={scenario.projection} portfolio={scenario.portfolio} />
          <span className="footer-health"><i /> Operação estável · {scenario.portfolio.specialists.filter((item) => item.status === "saturated").length} especialistas saturados</span>
        </div>
      </main> : <ModulePage module={activeNavigation} portfolio={scenario.portfolio} dark={darkTheme} onNavigate={setActiveNavigation} act={scenario.act} decide={scenario.decideFor} issue={scenario.issueFor} onSelectProcess={scenario.selectProcess} />}

        {notificationsOpen ? (
          <aside className="notifications-popover" aria-label="Notificações">
            <header><strong>Notificações</strong><button className="icon-button icon-button--small" type="button" aria-label="Fechar notificações" onClick={() => setNotificationsOpen(false)}><X /></button></header>
            {pendingProcesses.map((process) => <button type="button" key={process.scenario.id} onClick={() => { scenario.selectProcess(process.scenario.id); setActiveNavigation("operation"); setNotificationsOpen(false); setAssistantOpen(false); setPanels((current) => ({ ...current, human: true, rules: false, inspector: false })); }}><WarningCircle /><span><strong>Decisão humana necessária</strong><small>{process.scenario.id} · {process.scenario.municipality}</small></span></button>)}
            {!pendingProcesses.length ? <p className="work-empty">Nenhuma solicitação humana pendente.</p> : null}
          </aside>
        ) : null}
      <DecisionDialog
        open={decisionOpen}
        initialKind={decisionKind}
        projection={scenario.projection}
        onClose={() => setDecisionOpen(false)}
        onDecision={scenario.decide}
      />
      <DossierDialog
        open={dossierOpen}
        projection={scenario.projection}
        onClose={() => setDossierOpen(false)}
        onIssue={scenario.emitDossier}
      />
      <RuleDetailsDialog
        open={ruleDetailsOpen}
        rule={TRIAGE_RULES.find((rule) => rule.id === selectedRule) ?? DEFAULT_TRIAGE_RULE}
        configuration={ruleConfigurations[selectedRule]}
        onClose={() => setRuleDetailsOpen(false)}
        onSave={(configuration) => {
          setRuleConfigurations((current) => ({ ...current, [selectedRule]: configuration }));
          setRuleDetailsOpen(false);
          setToast("Configuração da regra salva para esta simulação.");
        }}
        onLocate={() => {
          const rule = TRIAGE_RULES.find((item) => item.id === selectedRule);
          if (rule) selectRule(rule);
          setRuleDetailsOpen(false);
        }}
      />

      <div className="sr-only" aria-live="polite">{toast}</div>
      {toast ? (
        <div className="toast" role="status">
          <CheckCircle aria-hidden="true" /> {toast}
          <button type="button" aria-label="Fechar mensagem" onClick={() => setToast(null)}><X /></button>
        </div>
      ) : null}
    </div>
  );
}

function navigationTitle(id: NavigationId) {
  switch (id) {
    case "operation": return "Centro de Controle";
    case "processes": return "Processos";
    case "process": return "Processo";
    case "agents": return "Agentes";
    case "data": return "Dados e regras";
    case "performance": return "Desempenho e indicadores";
    case "audit": return "Auditoria";
    case "indicators": return "Desempenho e indicadores";
    case "reports": return "Relatórios";
    case "layers": return "Camadas territoriais";
    default: { const exhaustive: never = id; return exhaustive; }
  }
}
