
(function (raiz) {
  'use strict';

  const emNode = typeof module === 'object' && module.exports;
  const H = emNode
    ? Object.assign(
      {},
      require('./formatacao.js'),
      require('./calculos.js'),
      require('./relatorio.js')
    )
    : raiz.HedgeLab;


  const CAMPOS = Object.freeze([
    { id: 'exposureUSD', parametro: 'exposicaoUSD' },
    { id: 'spotRate', parametro: 'spot' },
    { id: 'interestBR', parametro: 'jurosBR', percentual: true },
    { id: 'interestUS', parametro: 'jurosEUA', percentual: true },
    { id: 'tenorMonths', parametro: 'prazoMeses' },
    { id: 'strikeRate', parametro: 'strike' },
    { id: 'optionPremium', parametro: 'premio' },
    { id: 'swapNotional', parametro: 'principalSwap' },
    { id: 'swapFixedRate', parametro: 'taxaPreSwap', percentual: true }
  ]);

  /**
   * CAPTURA DE DADOS: lê os campos do formulário e converte para números.
   * Campos vazios viram NaN e são acusados por validarParametros().
   * @param {Document} doc
   * @returns {object} Parâmetros da simulação (taxas em decimal)
   */
  function lerParametros(doc) {
    const parametros = {};
    CAMPOS.forEach((campo) => {
      const valor = parseFloat(doc.getElementById(campo.id).value);
      parametros[campo.parametro] = campo.percentual ? valor / 100 : valor;
    });
    return parametros;
  }

  /**
   * Mostra (ou esconde, se a lista estiver vazia) a caixa de erros do formulário.
   * @param {Document} doc
   * @param {string[]} erros
   */
  function mostrarErros(doc, erros) {
    const caixa = doc.getElementById('formError');
    if (erros.length === 0) {
      caixa.hidden = true;
      caixa.innerHTML = '';
      return;
    }
    caixa.innerHTML = '<ul>' + erros.map((erro) => `<li>${erro}</li>`).join('') + '</ul>';
    caixa.hidden = false;
  }

  let ultimaSimulacao = null;


  let grafico = null;

  /**
   * Desenha o gráfico de payoff das três estratégias com o Chart.js.
   * Se a biblioteca não carregou (ex.: sem internet), mostra um aviso no lugar.
   * @param {Document} doc
   * @param {Array<object>} cenarios
   * @returns {boolean} true se o gráfico foi desenhado
   */
  function renderizarGrafico(doc, cenarios) {
    const canvas = doc.getElementById('payoffChart');
    const Chart = raiz.Chart;

    if (typeof Chart !== 'function') {
      // Em simulações seguintes o aviso já está na tela (e o canvas não existe mais)
      if (!canvas) return false;
      canvas.parentElement.innerHTML =
        '<p class="helper-text" id="chartFallback">Não foi possível carregar o gráfico ' +
        '(biblioteca Chart.js indisponível). Os demais relatórios seguem válidos.</p>';
      return false;
    }

    if (grafico) grafico.destroy();

    const serie = (rotulo, campo, cor, extra = {}) => Object.assign({
      label: rotulo,
      data: cenarios.map((c) => c[campo]),
      borderColor: cor,
      backgroundColor: cor,
      borderWidth: 3,
      fill: false
    }, extra);

    grafico = new Chart(canvas, {
      type: 'line',
      data: {
        labels: cenarios.map((c) => 'R$ ' + H.formatarNumero(c.spotFinal, 2)),
        datasets: [
          serie('Sem Hedge (Descoberto)', 'custoSemHedge', '#e76f51', { borderWidth: 2, borderDash: [5, 5] }),
          serie('Contrato a Termo (Forward)', 'custoForward', '#1b4965'),
          serie('Opção de Compra (Call)', 'custoCall', '#2a9d8f')
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          tooltip: {
            callbacks: {
              label: (contexto) => contexto.dataset.label + ': ' + H.formatarMoeda(contexto.raw)
            }
          },
          legend: { position: 'top', labels: { boxWidth: 15, font: { size: 12 } } }
        },
        scales: {
          y: {
            ticks: { callback: (valor) => 'R$ ' + H.formatarNumero(valor / 1000000, 1) + 'M' },
            title: { display: true, text: 'Desembolso Total em Reais (R$)' }
          },
          x: {
            title: { display: true, text: 'Cotação Spot no Vencimento (R$/US$)' }
          }
        }
      }
    });
    return true;
  }

  /**
   * Preenche os relatórios da página com o resultado de uma simulação.
   * @param {Document} doc
   * @param {object} p Parâmetros
   * @param {object} r Resultado de simular()
   * @param {Date} geradoEm
   */
  function exibirRelatorios(doc, p, r, geradoEm) {
    // Indicadores principais
    doc.getElementById('dispForwardRate').textContent = H.formatarTaxa(r.taxaForward);
    doc.getElementById('dispForwardCost').textContent = H.formatarMoeda(r.custoForward);
    doc.getElementById('dispCallCeiling').textContent = H.formatarMoeda(r.custoTetoCall);

    // Matriz de cenários (destaca a linha de câmbio estável)
    const corpo = doc.getElementById('scenariosBody');
    corpo.innerHTML = '';
    r.cenarios.forEach((cenario) => {
      const linha = doc.createElement('tr');
      if (cenario.variacao === 0) linha.classList.add('linha-atual');
      linha.innerHTML = H.htmlLinhaCenario(cenario);
      corpo.appendChild(linha);
    });


    doc.getElementById('swapAnalysisText').innerHTML = H.textoSwap(p, r.swap);
    doc.getElementById('executiveOpinionText').innerHTML = H.textoParecer(p, r);


    doc.getElementById('reportTimestamp').textContent =
      geradoEm.toLocaleString('pt-BR', { dateStyle: 'full', timeStyle: 'short' });
    doc.getElementById('reportParams').innerHTML = H.itensResumo(p)
      .map(([rotulo, valor]) => `<div><dt>${rotulo}</dt><dd>${valor}</dd></div>`)
      .join('');
  }

  /**
   * FLUXO PRINCIPAL: captura -> validação -> cálculo -> relatórios.
   * @param {Document} [doc=document]
   * @returns {object|null} Resultado da simulação, ou null se houver erros
   */
  function executarSimulacao(doc = document) {
    const p = lerParametros(doc);
    const erros = H.validarParametros(p);
    mostrarErros(doc, erros);
    if (erros.length > 0) return null;

    const r = H.simular(p);
    const geradoEm = new Date();
    exibirRelatorios(doc, p, r, geradoEm);
    renderizarGrafico(doc, r.cenarios);

    ultimaSimulacao = { parametros: p, resultados: r, geradoEm };
    return r;
  }

  /**
   * Valores do caso prático: importadora com dívida de US$ 2,5 milhões em 12
   * meses e dívida local de R$ 15 milhões indexada ao CDI.
   */
  const CASO_PRATICO = Object.freeze({
    exposureUSD: 2500000,
    spotRate: 5.25,
    interestBR: 11.25,
    interestUS: 4.75,
    tenorMonths: 12,
    strikeRate: 5.35,
    optionPremium: 0.22,
    swapNotional: 15000000,
    swapFixedRate: 11.8
  });

  /**
   * Preenche o formulário com o caso prático e já executa a simulação.
   * @param {Document} [doc=document]
   * @returns {object|null} Resultado da simulação
   */
  function carregarCasoPratico(doc = document) {
    Object.entries(CASO_PRATICO).forEach(([id, valor]) => {
      doc.getElementById(id).value = valor;
    });
    return executarSimulacao(doc);
  }

  /**
   * Baixa o relatório CSV da última simulação válida.
   * Cria um link temporário para o arquivo gerado em memória e clica nele.
   * @param {Document} [doc=document]
   * @returns {string|null} Nome do arquivo baixado, ou null se não houver simulação
   */
  function baixarCSV(doc = document) {
    if (!ultimaSimulacao) return null;
    const { parametros, resultados, geradoEm } = ultimaSimulacao;

    const conteudo = H.gerarCSV(parametros, resultados, geradoEm);
    const arquivo = new Blob([conteudo], { type: 'text/csv;charset=utf-8' });
    const nome = H.nomeArquivoCSV(geradoEm);

    const link = doc.createElement('a');
    link.href = URL.createObjectURL(arquivo);
    link.download = nome;
    doc.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(link.href);
    return nome;
  }

  /**
   * Liga os botões e o formulário às funções e executa a primeira simulação.
   *   - "Calcular & Simular" ou Enter em qualquer campo: recalcula;
   *   - "Exemplo Prático": carrega o caso pronto;
   *   - "Exportar CSV" e "Imprimir / PDF": geram os relatórios de saída.
   * @param {Document} [doc=document]
   */
  function iniciar(doc = document) {
    doc.getElementById('hedgeForm').addEventListener('submit', (evento) => {
      evento.preventDefault(); // Evita recarregar a página
      executarSimulacao(doc);
    });
    doc.getElementById('btnExemplo').addEventListener('click', () => carregarCasoPratico(doc));
    doc.getElementById('btnCSV').addEventListener('click', () => baixarCSV(doc));
    doc.getElementById('btnImprimir').addEventListener('click', () => doc.defaultView.print());

    executarSimulacao(doc);
  }

  const api = {
    CAMPOS,
    CASO_PRATICO,
    iniciar,
    baixarCSV,
    carregarCasoPratico,
    lerParametros,
    mostrarErros,
    executarSimulacao,
    renderizarGrafico,
    obterUltimaSimulacao: () => ultimaSimulacao
  };

  if (emNode) {
    module.exports = api;
  } else {
    raiz.HedgeLab = Object.assign(raiz.HedgeLab || {}, api);
    raiz.document.addEventListener('DOMContentLoaded', () => iniciar(raiz.document));
  }
})(typeof window !== 'undefined' ? window : globalThis);
