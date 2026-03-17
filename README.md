# Mapeamento do Risco de Contaminação Hídrica por Esgotamento Sanitário

Plataforma web interativa (Leaflet) para visualização e análise exploratória do **risco de contaminação hídrica** associado ao esgotamento sanitário em municípios brasileiros, a partir de dados do **Atlas Esgotos (ANA, 2017)** e informações ambientais (biomas).

A aplicação renderiza um mapa temático por município com classes de risco (**Muito Baixo → Muito Alto**), filtros (município, bioma e UF), painel lateral com indicadores e gráficos, e exportação de dados.


> Dica: em **Settings → Pages**, selecione a branch `main` e a pasta `/ (root)`.

## O que tem neste repositório
- `mapeamento-risco.html` — aplicação web (HTML + CSS + JS) com mapa interativo, filtros, sidebar e relatório embutido.
- `geojson_municipios_reduzido_alt.geojson` (referenciado remotamente) — camada municipal usada no mapa (GeoJSON).
- `img/logo-ppgecam.png` — imagem exibida na sidebar (se estiver presente no repo).

## Tecnologias e bibliotecas
- **Leaflet** — mapa e renderização do GeoJSON
- **OpenStreetMap** — camada base (tiles)
- **Chart.js** — gráficos (pizza para estatísticas e barra para indicadores)
- **SheetJS (xlsx)** — exportação para `.xlsx`
