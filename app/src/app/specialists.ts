import type { SpecialistDefinition } from "../domain/model";

export const SPECIALISTS = [
  specialist("ESP-01", "entry-quality", "Protocolo e completude documental", 3, ["novo protocolo", "documento ausente"]),
  specialist("ESP-02", "entry-quality", "Cadastro, CAR e vínculos administrativos", 2, ["divergência cadastral", "processo relacionado"]),
  specialist("ESP-03", "entry-quality", "Geometria, projeção e topologia", 2, ["polígono recebido", "geometria inválida"]),
  specialist("ESP-04", "entry-quality", "Qualidade e vigência das fontes", 2, ["fonte desatualizada", "fonte indisponível"]),
  specialist("ESP-05", "territorial-intelligence", "Hidrografia e APP", 2, ["proximidade de drenagem", "interseção com APP"]),
  specialist("ESP-06", "territorial-intelligence", "UC de Proteção Integral", 2, ["interseção com UC PI", "proximidade de UC PI"]),
  specialist("ESP-07", "territorial-intelligence", "UC de Uso Sustentável e amortecimento", 2, ["interseção com UC US", "zona de amortecimento"]),
  specialist("ESP-08", "territorial-intelligence", "Terras Indígenas", 1, ["interseção com Terra Indígena", "proximidade de Terra Indígena"]),
  specialist("ESP-09", "territorial-intelligence", "Sensoriamento remoto e mudança de cobertura", 2, ["divergência com imagem", "supressão recente"]),
  specialist("ESP-10", "territorial-intelligence", "ZEE, uso do solo e compatibilidade locacional", 2, ["conflito de zoneamento", "expansão urbana"]),
  specialist("ESP-11", "territorial-intelligence", "Biodiversidade, fauna e conectividade", 1, ["fragmentação", "corredor ecológico"]),
  specialist("ESP-12", "territorial-intelligence", "Risco ambiental, inundação e estabilidade", 2, ["área inundável", "risco geotécnico"]),
  specialist("ESP-13", "regulation-coordination", "Direito ambiental", 1, ["regra conflitante", "restrição crítica"]),
  specialist("ESP-14", "regulation-coordination", "Articulação e fiscalização federal", 1, ["competência federal", "ativo sob tutela federal"]),
  specialist("ESP-15", "regulation-coordination", "Fiscalização ambiental estadual", 2, ["alerta de supressão", "vistoria"]),
  specialist("ESP-16", "regulation-coordination", "Interface municipal e uso do solo local", 2, ["restrição municipal", "compatibilidade urbanística"]),
  specialist("ESP-17", "regulation-coordination", "Resolução administrativa", 2, ["cadastro inconsistente", "duplicidade"]),
  specialist("ESP-18", "decision-operation", "Encaminhamento, capacidade e SLA", 3, ["score concluído", "redistribuição de carga"]),
  specialist("ESP-19", "decision-operation", "Síntese técnica e minuta", 2, ["dossiê consolidado", "revisão de parecer"]),
  specialist("ESP-20", "decision-operation", "Notificações e comunicações", 4, ["complemento", "decisão", "prazo"]),
] satisfies readonly SpecialistDefinition[];

function specialist(
  id: SpecialistDefinition["id"],
  department: SpecialistDefinition["department"],
  name: string,
  capacity: number,
  triggers: readonly string[],
): SpecialistDefinition {
  return { id, department, name, capacity, triggers };
}
