# Validação territorial dos processos simulados

Esta revisão compara os polígonos sintéticos dos 15 cenários com os quatro GeoJSON carregados pelo mapa: APP hídrica simulada, UC de Proteção Integral, UC de Uso Sustentável e Terras Indígenas. As interseções foram verificadas geometricamente. Os valores de área abaixo são aproximações planas locais, úteis apenas para conferir a coerência da demonstração. Não substituem análise geodésica ou validação institucional.

| Processo | Local | Resultado nas camadas exibidas | Tratamento do documento simulado |
| --- | --- | --- | --- |
| 0512 | Bebedouro | Polígono integralmente na APP sintética, aproximadamente 605 ha | Área de APP corrigida. A divergência de 36% refere-se à área de intervenção declarada e à imagem, não à área total do polígono. |
| 0513 | Assis | Interseção com Estação Ecológica de Assis, aproximadamente 120 ha | Área de interseção corrigida; revisão especializada mantida. |
| 0514 | Ibiúna | Polígono na APA Itupararanga, aproximadamente 130 ha | Área e texto de “baixa extensão” corrigidos. |
| 0515 | Cananéia | Polígono na TI Pindoty/Araçá-Mirim, aproximadamente 168 ha | Área de interseção corrigida; revisão especializada mantida. |
| 0516 | Franca | Nenhuma interseção nas quatro camadas | Sem evidência espacial desenhada. A legenda do popup mostra o polígono do processo em verde. |
| 0517 | Bauru | Nenhuma interseção | Pendência cadastral e documental; não há conclusão territorial positiva. |
| 0518 | São José do Rio Preto | Nenhuma interseção | O texto distingue a geometria inválida recebida da geometria ilustrativa válida exibida no mapa. |
| 0519 | Campinas | Nenhuma interseção | Alerta de ZEE tratado como informação documental simulada, pois não existe camada de ZEE no mapa. |
| 0520 | Ribeirão Preto | Nenhuma interseção | Recarga e drenagem permanecem indícios documentais, sujeitos a conferência cartográfica. |
| 0521 | Presidente Prudente | Nenhuma interseção | A mudança de cobertura depende das imagens sintéticas citadas no documento, que não são camadas deste mapa. |
| 0522 | Santos | Nenhuma interseção | Manguezal e inundação permanecem indícios documentais, sem área de sobreposição afirmada. |
| 0523 | Sorocaba | Polígono na APA Cabreúva | A interseção passou a constar no cenário. A vigência da fonte continua em revisão. |
| 0524 | Vale do Paraíba | Nenhuma interseção | Quatro municípios são informação do memorial sintético; limites municipais não estão no mapa. |
| 0525 | Botucatu | Interseção com APA Cuesta Guarani após ajuste do polígono sintético | Cenário passa a tratar da UC efetivamente exibida, sem afirmar corredor ecológico não cartografado. |
| 0526 | Registro | Nenhuma interseção | Duplicidade é evidência administrativa sintética, sem conclusão territorial positiva. |

O catálogo contém 15 cenários. A configuração atual da demonstração ativa os 12 primeiros no portfólio, preservando o recorte já presente na árvore de trabalho. O teste `tests/scenario-territorial-consistency.test.ts` verifica todos os 15, inclusive os três fora do recorte ativo.

As camadas GeoJSON são simplificadas. Os valores de área e os casos administrativos continuam simulados; as afirmações espaciais do documento devem ser lidas apenas em relação às feições mostradas nesta demonstração.
