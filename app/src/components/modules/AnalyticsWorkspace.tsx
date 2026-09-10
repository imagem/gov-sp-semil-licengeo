import { useMemo, useState } from "react";
import type { EChartsOption } from "echarts";
import type { ProcessExecutionProjection } from "../../domain/model";
import { historicalRows, sessionRows } from "../../app/analytics-data";
import { useWorkspace } from "./workspace-context";
import { AnalysisChart } from "./AnalysisChart";
import { DEPARTMENT_LABELS } from "../operation/ProcessOwnership";
import { workflowFor } from "../../domain/workflow";
import { PHASES, PHASE_NAMES } from "../../app/workspace-data";

export function AnalyticsWorkspace({
  processes,
}: {
  readonly processes: readonly ProcessExecutionProjection[];
}) {
  const api = useWorkspace();
  const [period, setPeriod] = useState("session");
  const [selection, setSelection] = useState("");
  const [selectedSeries, setSelectedSeries] = useState("");
  const selectChart = (name: string, series: string) => {
    setSelection(name);
    setSelectedSeries(series);
  };
  const rows = useMemo(
    () =>
      period === "session"
        ? sessionRows(processes)
        : historicalRows(processes, period === "week" ? 7 : 30),
    [processes, period],
  );
  const completed = rows.filter((r) => r.duration !== null);
  const average = completed.length
    ? completed.reduce((sum, r) => sum + (r.duration ?? 0), 0) /
      completed.length
    : 0;
  const statuses = ["Aguardando", "Em triagem", "Bloqueado", "Concluído"];
  const chambers = [...new Set(rows.map((r) => r.chamber))];
  const dates = [
    ...new Set(rows.flatMap((r) => [r.date, r.completedAt]).filter(Boolean)),
  ].sort();
  const categoryOption: EChartsOption = {
    tooltip: { trigger: "axis" },
    legend: { bottom: 0 },
    grid: { left: 40, right: 16, top: 24, bottom: 70 },
    xAxis: {
      type: "category",
      data: chambers.map((c) => c.replace("Câmara de ", "")),
      axisLabel: { width: 75, overflow: "truncate", interval: 0 },
    },
    yAxis: { type: "value", minInterval: 1 },
    series: statuses.map((status) => ({
      type: "bar",
      name: status,
      stack: "volume",
      data: chambers.map(
        (chamber) =>
          rows.filter((r) => r.chamber === chamber && r.state === status)
            .length,
      ),
    })),
  };
  const trend: EChartsOption = {
    tooltip: { trigger: "axis" },
    legend: { bottom: 0 },
    grid: { left: 40, right: 16, bottom: 60 },
    xAxis: { type: "category", data: dates },
    yAxis: { type: "value", minInterval: 1 },
    series: [
      {
        type: "line",
        name: "Protocolos",
        data: dates.map(
          (d) =>
            rows.filter((r) =>
              period === "session" ? r.date && r.date <= d : r.date === d,
            ).length,
        ),
        step: period === "session" ? "end" : false,
      },
      {
        type: "line",
        name: "Concluídos",
        data: dates.map(
          (d) =>
            rows.filter((r) =>
              period === "session"
                ? r.completedAt && r.completedAt <= d
                : r.date === d && r.state === "Concluído",
            ).length,
        ),
        step: period === "session" ? "end" : false,
      },
    ],
  };
  const durations = completed.map((row) => row.duration ?? 0);
  const bucketStep = Math.max(1, Math.ceil((Math.max(...durations, 1) - Math.min(...durations, 0)) / 6));
  const buckets = period === "session"
    ? Array.from({ length: 6 }, (_, index) => (index + 1) * bucketStep)
    : [2, 4, 6, 8, 10, 14];
  const durationRanges = [...buckets, Infinity].map((max, index) => ({
    min: index === 0 ? -Infinity : buckets[index - 1] ?? 0,
    max,
    label: index === 0 ? `0–${max}` : Number.isFinite(max) ? `${buckets[index - 1]}–${max}` : `Acima de ${buckets[buckets.length - 1]}`,
  }));
  const distribution: EChartsOption = {
    tooltip: { trigger: "axis" },
    grid: { left: 48, right: 20, bottom: 65, top: 35 },
    xAxis: { type: "category", data: durationRanges.map((range) => range.label), axisLabel: { interval: 0, rotate: 25 } },
    yAxis: { type: "value", minInterval: 1, name: "Processos" },
    series: [
      {
        type: "bar",
        name: "Concluídos",
        label: { show: true, position: "top" },
        data: durationRanges.map(
          ({ min, max }) =>
            completed.filter(
              (r) =>
                r.duration !== null &&
                r.duration <= max &&
                r.duration > min,
            ).length,
        ),
      },
    ],
  };
  const departments = Object.entries(DEPARTMENT_LABELS);
  const heat: EChartsOption = {
    tooltip: { formatter: (params) => {
      const point = Array.isArray(params) ? params[0] : params;
      return `${point?.name ?? ""}: ${Array.isArray(point?.value) ? point.value[2] : 0} solicitações`;
    } },
    grid: { left: 145, right: 20, bottom: 100, top: 20 },
    xAxis: { type: "category", data: PHASE_NAMES, axisLabel: { interval: 0, rotate: 30, width: 85, overflow: "break" } },
    yAxis: {
      type: "category",
      data: departments.map(([, label]) => label),
      axisLabel: { width: 110, overflow: "truncate" },
    },
    visualMap: {
      min: 0,
      max: Math.max(3, processes.length),
      show: false,
      inRange: { color: ["#e8f4f3", "#087f8c"] },
    },
    series: [
      {
        type: "heatmap",
        label: { show: true },
        data: departments.flatMap(([id], y) =>
          PHASES.map((phase, x) => ({
            name: departments[y]?.[1] + " / " + PHASE_NAMES[x],
            value: [
              x,
              y,
              processes.reduce(
                (sum, p) =>
                  sum +
                  p.branches.filter(
                    (b) =>
                      b.originStage === phase &&
                      b.status !== "waiting" &&
                      api.portfolio.specialists.some(
                        (s) =>
                          s.specialist.id === b.specialistId &&
                          s.specialist.department === id,
                      ),
                  ).length,
                0,
              ),
            ],
          })),
        ),
      },
    ],
  };
  const filteredRows = selection
    ? rows.filter((r) => {
        const range = durationRanges.find((item) => item.label === selection);
        if (range) {
          return (
            r.duration !== null &&
            r.duration <= range.max &&
            r.duration > range.min
          );
        }
        if (selection.includes(" / ")) {
          const [label, phaseLabel] = selection.split(" / ");
          const department = departments.find(
            ([, name]) => name === label,
          )?.[0];
          const phase = PHASES[PHASE_NAMES.indexOf(phaseLabel ?? "")];
          return processes
            .find((p) => p.scenario.id === r.processId)
            ?.branches.some(
              (b) =>
                b.originStage === phase &&
                b.status !== "waiting" &&
                api.portfolio.specialists.some(
                  (s) =>
                    s.specialist.id === b.specialistId &&
                    s.specialist.department === department,
                ),
            );
        }
        if (dates.includes(selection))
          return period === "session"
            ? selectedSeries === "Concluídos"
              ? !!r.completedAt && r.completedAt <= selection
              : !!r.date && r.date <= selection
            : r.date === selection &&
                (selectedSeries !== "Concluídos" || r.state === "Concluído");
        return (
          r.state === selection ||
          (r.chamber.includes(selection) &&
            (!statuses.includes(selectedSeries) || r.state === selectedSeries))
        );
      })
    : rows;
  return (
    <div className="analytics-workspace">
      <div className="workspace-filterbar">
        <select
          aria-label="Período de análise"
          value={period}
          onChange={(e) => {
            setPeriod(e.target.value);
            setSelection("");
          }}
        >
          <option value="session">Sessão atual</option>
          <option value="week">Histórico sintético · 7 dias</option>
          <option value="month">Histórico sintético · 30 dias</option>
        </select>
        <strong>Operação no instante atual</strong>
        <span>
          {period === "session"
            ? "Fonte: diário desta simulação"
            : "Exemplos históricos fixos · agosto de 2026 · dados sintéticos"}
        </span>
        {selection ? (
          <button
            className="button button--secondary"
            onClick={() => setSelection("")}
          >
            Limpar seleção: {selection}
          </button>
        ) : null}
      </div>
      <div className="summary-metrics">
        <button onClick={() => setSelection("")}>
          <small>
            {period === "session" ? "Processos" : "Registros históricos"}
          </small>
          <strong>{rows.length}</strong>
        </button>
        <button onClick={() => setSelection("Concluído")}>
          <small>Concluídos</small>
          <strong>{completed.length}</strong>
        </button>
        <button onClick={() => setSelection("")}>
          <small>
            Duração média ·{" "}
            {period === "session" ? "s simulados" : "dias sintéticos"}
          </small>
          <strong>{average.toFixed(1)}</strong>
        </button>
        <button onClick={() => setSelection("Bloqueado")}>
          <small>Bloqueados</small>
          <strong>{rows.filter((r) => r.state === "Bloqueado").length}</strong>
        </button>
      </div>
      <div className="analysis-grid">
        <section>
          <h3>Estados por câmara / Fila por câmara</h3>
          <AnalysisChart
            title="Estados por câmara"
            option={categoryOption}
            onSelect={selectChart}
          />
        </section>
        <section>
          <h3>Volume ao longo do período</h3>
          <AnalysisChart
            title="Volume temporal"
            option={trend}
            onSelect={selectChart}
          />
        </section>
        <section>
          <h3>
            Distribuição da duração ·{" "}
            {period === "session" ? "segundos simulados" : "dias sintéticos"}
          </h3>
          {completed.length ? <AnalysisChart
            title="Distribuição da duração"
            option={distribution}
            onSelect={selectChart}
          /> : <p className="analysis-chart-empty">Nenhum processo concluído neste período. {rows.length} processos ainda sem duração final registrada.</p>}
          <p>{completed.length} durações concluídas · {rows.length - completed.length} sem duração final</p>
        </section>
        <section>
          <h3>Departamento × fase · solicitações acumuladas da sessão</h3>
          {period !== "session" ? <p className="analysis-chart-empty">O histórico sintético não contém solicitações por departamento e fase.</p> : processes.some((p) => p.branches.some((b) => b.status !== "waiting")) ? <AnalysisChart
            title="Solicitações acumuladas por departamento e fase"
            option={heat}
            onSelect={selectChart}
          /> : <p className="analysis-chart-empty">Nenhuma solicitação especializada registrada nesta sessão.</p>}
          {period === "session" ? <p>{processes.flatMap((p) => p.branches).filter((b) => b.status === "queued").length} em fila · {processes.flatMap((p) => p.branches).filter((b) => b.status === "active").length} ativas · {processes.flatMap((p) => p.branches).filter((b) => b.status === "resolved").length} concluídas</p> : null}
        </section>
        <section className="analysis-grid__compact">
          <h3>Qualidade e participação humana</h3>
          <div className="quality-summary">
            <strong>
              {rows.length
                ? Math.round(
                    rows.reduce((sum, r) => sum + r.quality, 0) / rows.length,
                  )
                : 0}
              %
            </strong>
            <p>Média dos índices documentais demonstrativos</p>
            <meter
              min={0}
              max={100}
              value={
                rows.length
                  ? rows.reduce((sum, r) => sum + r.quality, 0) / rows.length
                  : 0
              }
            />
            <p>
              {period === "session"
                ? processes.reduce(
                    (sum, p) =>
                      sum +
                      p.events.filter(
                        (e) => e.kind === "human-decision-recorded",
                      ).length,
                    0,
                  ) + " decisões humanas registradas"
                : "Participação humana não medida neste conjunto histórico"}
            </p>
            <p>
              {rows.reduce((sum, r) => sum + r.evidence, 0)} evidências
              territoriais
            </p>
          </div>
        </section>
        <section className="analysis-grid__wide">
          <h3>Capacidade dos especialistas</h3>
          <div className="capacity-register">
            {api.portfolio.specialists
              .map((load) => ({
                ...load,
                activeAssignments: load.activeAssignments.filter((a) =>
                  processes.some((p) => p.scenario.id === a.processId),
                ),
                queuedAssignments: load.queuedAssignments.filter((a) =>
                  processes.some((p) => p.scenario.id === a.processId),
                ),
              }))
              .filter(
                (load) =>
                  load.activeAssignments.some((a) =>
                    processes.some((p) => p.scenario.id === a.processId),
                  ) ||
                  load.queuedAssignments.some((a) =>
                    processes.some((p) => p.scenario.id === a.processId),
                  ),
              )
              .map((load) => (
                <div key={load.specialist.id}>
                  <strong>{load.specialist.name}</strong>
                  <meter
                    min={0}
                    max={load.specialist.capacity}
                    value={load.activeAssignments.length}
                  />
                  <span>
                    {load.activeAssignments.length}/{load.specialist.capacity}{" "}
                    ativos · {load.queuedAssignments.length} em fila
                  </span>
                  {load.queuedAssignments.map((a) => (
                    <button
                      className="record-title"
                      key={a.requestId}
                      onClick={() => api.openProcess(a.processId)}
                    >
                      {a.processId}
                    </button>
                  ))}
                </div>
              ))}
          </div>
        </section>
      </div>
      <section>
        <div className="register-heading">
          <h3>Registros contribuintes</h3>
          <span>{filteredRows.length}</span>
        </div>
        <div className="table-scroll">
          <table className="workspace-table">
            <thead>
              <tr>
                <th>Processo</th>
                <th>Estado</th>
                <th>Câmara</th>
                <th>Duração</th>
                <th>Espera / ação</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => {
                const p = processes.find(
                  (item) => item.scenario.id === row.processId,
                );
                return (
                  <tr key={row.id}>
                    <td>
                      <button
                        className="record-title"
                        onClick={() => api.openProcess(row.processId)}
                      >
                        {row.processId}
                      </button>
                      {period !== "session" ? (
                        <small>{row.date} · exemplo histórico</small>
                      ) : null}
                    </td>
                    <td>{row.state}</td>
                    <td>{row.chamber}</td>
                    <td>
                      {row.duration === null
                        ? "Em curso"
                        : row.duration + (period === "session" ? " s" : " dias")}
                    </td>
                    <td>
                      {p ? (
                        <>
                          <small>
                            {Math.max(
                              0,
                              api.portfolio.tick -
                                (p.events[p.events.length - 1]?.tick ?? 0),
                            ) * 3}
                            s desde o último evento
                          </small>
                          <small>
                            {workflowFor(p).missing.length
                              ? "Documentos pendentes"
                              : p.branches.some((b) => b.status === "queued")
                                ? "Capacidade especializada"
                                : "Fluxo regular"}
                          </small>
                          <button
                            className="record-title"
                            onClick={() => api.assign(row.processId)}
                          >
                            Rever atribuição
                          </button>
                        </>
                      ) : (
                        "Sem processo na sessão"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      <details className="indicator-method">
        <summary>Definições, fonte e cálculo</summary>
        <p>
          Volumes são contagens dos registros filtrados. Duração da sessão = fim
          da sexta fase menos recebimento, em segundos do relógio simulado.
          Histórico: registros sintéticos fixos em dias, independentes da
          sessão. Qualidade = média das quatro dimensões documentais; documentos
          sem avaliação contribuem zero para cobertura, sem aprovação implícita.
          Departamento × fase = solicitações em fila, ativas e concluídas na sessão, por fase de origem. Faixas de duração incluem o limite superior e excluem o inferior, exceto a primeira. Nenhum
          valor representa prazo institucional observado.
        </p>
      </details>
    </div>
  );
}
