// Configurações iniciais
const URL_GEOJSON =
	"https://raw.githubusercontent.com/jaidnaalmeida/geojson/main/geojson_municipios_reduzido_alt.geojson";
let geojsonData = null;
let layerGeojson = null;
let selectedLayer = null;
let charts = {
	municipio: null,
	risco: null
};
let ctx = null;

// Inicialização do mapa
const map = L.map("map").setView([-14, -55], 4);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
	attribution: "© OpenStreetMap contributors"
}).addTo(map);

// Cores para os riscos
function getRiskColor(risco) {
	const cores = {
		"Muito Baixo": "#31A354",
		Baixo: "#A1D99B",
		Médio: "#FED976",
		Alto: "#FD8D3C",
		"Muito Alto": "#E31A1C"
	};
	return cores[risco] || "#777";
}

// Estilos do mapa
function getDefaultStyle(feature) {
	return {
		fillColor: getRiskColor(feature.properties.CLASSE_RISCO),
		weight: 1,
		opacity: 1,
		color: "#333",
		fillOpacity: 0.7,
		dashArray: null,
		lineCap: "round",
		lineJoin: "round"
	};
}

function getHighlightStyle() {
	return {
		weight: 3,
		color: "#fff",
		fillOpacity: 0.9,
		opacity: 1
	};
}

// Destaque do polígono
function createHighlightBorder(layer) {
	if (layer._highlightBorder) return;

	layer._highlightBorder = L.polygon(layer.getLatLngs(), {
		color: "#fff",
		weight: 6,
		opacity: 0.7,
		fillOpacity: 0,
		className: "highlight-border"
	}).addTo(map);
}

function removeHighlight(layer) {
	if (!layer) return;

	layerGeojson.resetStyle(layer);
	if (layer._highlightBorder) {
		map.removeLayer(layer._highlightBorder);
		layer._highlightBorder = null;
	}
}

// Popup customizado (MANTIDO SIMILAR AO ORIGINAL)
function createCustomPopup(feature) {
	const p = feature.properties;
	return `
    <div class="custom-popup">
      <div class="popup-header">
        <h3>${p.MUN_NM_MUN}-${p.MUN_UF}</h3>
        <span class="risco-tag ${p.CLASSE_RISCO.toLowerCase().replace(
									" ",
									"-"
								)}">
          ${p.CLASSE_RISCO}
        </span>
      </div>
      <div class="popup-body">
        <p><strong>Bioma:</strong> ${p.BMA_NM || "Não informado"}</p>
        <p><strong>Risco Total:</strong> ${p.RISCO_TOTAL} (${
		p.CLASSE_RISCO
	})</p>
      </div>
    </div>
  `;
}

// Exibir informações na sidebar
function exibirInfo(feature) {
	const p = feature.properties;

	document.getElementById(
		"titulo-sidebar"
	).textContent = `${p.MUN_NM_MUN} - ${p.MUN_UF}`;

	const riscoTag = document.getElementById("risco-tag");
	riscoTag.textContent = p.CLASSE_RISCO;
	riscoTag.className =
		"risco-tag " + p.CLASSE_RISCO.toLowerCase().replace(" ", "-");

	document.getElementById("info-bioma").textContent =
		p.BMA_NM || "Não informado";
	document.getElementById("info-populacao").textContent = p.POP
		? p.POP.toLocaleString("pt-BR")
		: "-";
	document.getElementById(
		"info-sem-atendimento"
	).textContent = p.INDICE_SEM_ATENDIMENTO
		? (p.INDICE_SEM_ATENDIMENTO * 100).toFixed(1) + "%"
		: "-";
	document.getElementById("info-diluicao").textContent =
		p.CAP_DILUICAO_DESC || "-";

	atualizarGraficoMunicipio(p);
}

// Gráfico do município
function atualizarGraficoMunicipio(props) {
	const ctx = document.getElementById("graficoMunicipio").getContext("2d");

	if (charts.municipio) charts.municipio.destroy();

	charts.municipio = new Chart(ctx, {
		type: "bar",
		data: {
			labels: ["Sem atendimento", "Diluição", "Risco total"],
			datasets: [
				{
					data: [
						props.INDICE_SEM_ATENDIMENTO || 0,
						converterDiluicaoParaValor(props.CAP_DILUICAO_DESC),
						props.RISCO_TOTAL ? props.RISCO_TOTAL / 10 : 0
					],
					backgroundColor: [
						"rgba(231, 76, 60, 0.7)",
						"rgba(52, 152, 219, 0.7)",
						"rgba(46, 204, 113, 0.7)"
					]
				}
			]
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			scales: { y: { beginAtZero: true, max: 1 } },
			plugins: { legend: { display: false } }
		}
	});
}

function converterDiluicaoParaValor(diluicao) {
	if (!diluicao) return 0;
	const valores = {
		Ótima: 0.2,
		Boa: 0.4,
		Regular: 0.6,
		Ruim: 0.8,
		Péssima: 1.0,
		Nula: 1.0
	};
	return valores[diluicao] || 0;
}

// Atualizar estatísticas dos filtros
function atualizarEstatisticasFiltro() {
	if (!layerGeojson) return;

	const features = layerGeojson.toGeoJSON().features;
	const contagemRisco = {};

	features.forEach((f) => {
		const risco = f.properties.CLASSE_RISCO;
		contagemRisco[risco] = (contagemRisco[risco] || 0) + 1;
	});

	atualizarGraficoRisco(contagemRisco, features.length);
}

function atualizarGraficoRisco(contagem, total) {
	const ctx = document.getElementById("graficoRisco").getContext("2d");
	const ordem = ["Muito Baixo", "Baixo", "Médio", "Alto", "Muito Alto"];
	const labels = ordem.filter((r) => contagem[r]);
	const data = labels.map((r) => contagem[r]);
	const cores = labels.map((r) => getRiskColor(r));

	if (charts.risco) charts.risco.destroy();

	charts.risco = new Chart(ctx, {
		type: "pie",
		data: {
			labels: labels,
			datasets: [{ data, backgroundColor: cores }]
		},
		options: {
			responsive: true,
			plugins: {
				tooltip: {
					callbacks: {
						label: function (ctx) {
							return `${ctx.label}: ${ctx.raw} (${Math.round(
								(ctx.raw / total) * 100
							)}%)`;
						}
					}
				}
			}
		}
	});
}

// Filtragem do mapa
function atualizarMapaFiltrado() {
	const termoBusca = document
		.getElementById("buscaMunicipio")
		.value.toLowerCase();
	const biomasSelecionados = Array.from(
		document.getElementById("filtro-bioma").selectedOptions
	).map((o) => o.value);
	const ufsSelecionadas = Array.from(
		document.getElementById("filtro-uf").selectedOptions
	).map((o) => o.value);

	if (layerGeojson) map.removeLayer(layerGeojson);

	const filtrados = geojsonData.features.filter((f) => {
		const p = f.properties;
		const matchNome = p.MUN_NM_MUN.toLowerCase().includes(termoBusca);
		const matchBioma =
			biomasSelecionados.length === 0 || biomasSelecionados.includes(p.BMA_NM);
		const matchUF =
			ufsSelecionadas.length === 0 || ufsSelecionadas.includes(p.MUN_UF);
		return matchNome && matchBioma && matchUF;
	});

	layerGeojson = L.geoJSON(
		{ type: "FeatureCollection", features: filtrados },
		{
			style: getDefaultStyle,
			onEachFeature: (feature, layer) => {
				layer.bindPopup(createCustomPopup(feature), {
					className: "custom-popup-container",
					maxWidth: 300
				});

				layer.on({
					mouseover: function (e) {
						const layer = e.target;
						layer.setStyle(getHighlightStyle());
						createHighlightBorder(layer);
						layer.bringToFront();
					},
					mouseout: function (e) {
						if (selectedLayer !== e.target) {
							removeHighlight(e.target);
						}
					},
					click: function (e) {
						if (selectedLayer) {
							removeHighlight(selectedLayer);
						}
						selectedLayer = e.target;
						selectedLayer.setStyle(getHighlightStyle());
						createHighlightBorder(selectedLayer);
						selectedLayer.bringToFront();
						exibirInfo(feature);
					}
				});
			}
		}
	).addTo(map);

	atualizarEstatisticasFiltro();
}

// Exportar para Excel
function exportarParaExcel() {
	if (!layerGeojson) return;

	const dados = layerGeojson.toGeoJSON().features.map((f) => f.properties);
	const wb = XLSX.utils.book_new();
	const ws = XLSX.utils.json_to_sheet(dados);
	XLSX.utils.book_append_sheet(wb, ws, "Dados");

	// Nome personalizado baseado nos filtros
	let nome = "Risco_Contaminacao";
	const biomas = Array.from(
		document.getElementById("filtro-bioma").selectedOptions
	).map((o) => o.value);
	const ufs = Array.from(
		document.getElementById("filtro-uf").selectedOptions
	).map((o) => o.value);

	if (biomas.length > 0) nome += "_Bioma_" + biomas.join("_");
	if (ufs.length > 0) nome += "_UF_" + ufs.join("_");

	XLSX.writeFile(wb, nome + ".xlsx");
}

// Inicialização
document.addEventListener("DOMContentLoaded", async (event) => {
	// Mostrar popup inicial
	document.getElementById("welcome-popup").style.display = "flex";

	document.querySelector(".close-modal").addEventListener("click", function () {
		document.getElementById("welcome-popup").style.display = "none";
	});

	document.getElementById("start-btn").addEventListener("click", function () {
		document.getElementById("welcome-popup").style.display = "none";
	});

	// Carregar dados
	try {
		const response = await fetch(URL_GEOJSON);

		if (!response.ok) throw new Error(await response.text());

		geojsonData = await response.json();

		// Preencher filtros
		const biomas = [
			...new Set(geojsonData.features.map((f) => f.properties.BMA_NM))
		]
			.filter((b) => b)
			.sort();
		const ufs = [
			...new Set(geojsonData.features.map((f) => f.properties.MUN_UF))
		].sort();

		const biomaSelect = document.getElementById("filtro-bioma");
		const ufSelect = document.getElementById("filtro-uf");

		biomas.forEach((b) => {
			const opt = document.createElement("option");
			opt.value = b;
			opt.textContent = b;
			biomaSelect.appendChild(opt);
		});

		ufs.forEach((uf) => {
			const opt = document.createElement("option");
			opt.value = uf;
			opt.textContent = uf;
			ufSelect.appendChild(opt);
		});

		// Configurar eventos
		document
			.getElementById("buscaMunicipio")
			.addEventListener("input", atualizarMapaFiltrado);
		document
			.getElementById("filtro-bioma")
			.addEventListener("change", atualizarMapaFiltrado);
		document
			.getElementById("filtro-uf")
			.addEventListener("change", atualizarMapaFiltrado);

		document.getElementById("btnLimpar").addEventListener("click", function () {
			document.getElementById("buscaMunicipio").value = "";
			document.getElementById("filtro-bioma").selectedIndex = -1;
			document.getElementById("filtro-uf").selectedIndex = -1;
			atualizarMapaFiltrado();
		});

		document.getElementById("btnLimpar").click();

		document
			.getElementById("btnExportar")
			.addEventListener("click", exportarParaExcel);

		// Carregar mapa inicial
		atualizarMapaFiltrado();
	} catch (error) {
		console.error("Erro ao carregar dados:", error);
		// alert("Erro ao carregar dados do mapa. Por favor, tente recarregar a página.");
	}
});

/* charts.risco = new Chart(ctx, {
	type: "pie",
	data: {
		labels: ["Muito Baixo", "Baixo", "Médio", "Alto", "Muito Alto"],
		datasets: [
			{
				data: [
					contagem["Muito Baixo"] || 0,
					contagem["Baixo"] || 0,
					contagem["Médio"] || 0,
					contagem["Alto"] || 0,
					contagem["Muito Alto"] || 0
				],
				backgroundColor: ["#31A354", "#A1D99B", "#FED976", "#FD8D3C", "#E31A1C"]
			}
		]
	},
	options: {
		responsive: true,
		maintainAspectRatio: false,
		plugins: {
			legend: {
				display: true
			}
		}
	}
}); */
