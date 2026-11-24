let payoffChartInstance = null;


let ultimaSimulacao = null;

const VARIACOES_CENARIO = [-0.25, -0.20, -0.15, -0.10, -0.05, 0.0, 0.05, 0.10, 0.15, 0.20, 0.25, 0.30, 0.35];

/**
 * Formatação padrão em Real Brasileiro (BRL), sem casas decimais
 */
function formatarMoeda(valor) {
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0
  });
}

/**
 * FUNÇÃO: formatarNumero
 * Número com casas decimais fixas e vírgula como separador (ex.: 5,5110)
 */
function formatarNumero(valor, casas) {
  return valor.toLocaleString('pt-BR', {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas
  });
}

function formatarTaxa(valor) {
  return 'R$ ' + formatarNumero(valor, 4);
}

/**
 *
 * @param {number} spot          Cotação à vista inicial (S0)
 * @param {number} rDomestico    Taxa de juros livre de risco no Brasil (a.a.)
 * @param {number} rEstrangeiro  Taxa de juros livre de risco nos EUA (a.a.)
 * @param {number} prazoAnos     Prazo da operação normalizado em anos (meses / 12)
 * @returns {number} Taxa a termo de equilíbrio teórico
 */
function calcularTaxaForward(spot, rDomestico, rEstrangeiro, prazoAnos) {
  const fatorDomestico = Math.pow(1 + rDomestico, prazoAnos);
  const fatorEstrangeiro = Math.pow(1 + rEstrangeiro, prazoAnos);
  return spot * (fatorDomestico / fatorEstrangeiro);
}

/**
 * Executa toda a modelagem a partir dos parâmetros (taxas já em forma decimal).
 * Separada do DOM para facilitar testes e conferência dos números.
 */
function calcularResultados(p) {
  const t = p.meses / 12; // Normalização para fração de ano

  const forwardRate = calcularTaxaForward(p.S0, p.r_BRL, p.r_USD, t);
  const forwardCostTotal = p.N_USD * forwardRate;

  const premioCapitalizadoUnitario = p.premioUnitario * Math.pow(1 + p.r_BRL, t);
  const tetoOpcaoPorDolar = p.K + premioCapitalizadoUnitario;
  const custoTetoOpcaoTotal = p.N_USD * tetoOpcaoPorDolar;


  const opcaoDominaTermo = tetoOpcaoPorDolar <= forwardRate;
  const spotEquilibrio = forwardRate - premioCapitalizadoUnitario;


  const cenarios = VARIACOES_CENARIO.map((v) => {
    const spotFinal = p.S0 * (1 + v);
    const custoUnhedged = p.N_USD * spotFinal;
    const custoForward = forwardCostTotal;

    const taxaEfetivaOpcao = Math.min(spotFinal, p.K) + premioCapitalizadoUnitario;
    const custoCall = p.N_USD * taxaEfetivaOpcao;
    return {
      variacao: v,
      spotFinal,
      custoUnhedged,
      custoForward,
      custoCall,
      diferencaTermoOpcao: custoForward - custoCall
    };
  });

  // Swap de juros: paga taxa pré-fixada, recebe a flutuante
  const jurosFlutuante = p.swapNotional * (Math.pow(1 + p.r_BRL, t) - 1);
  const jurosFixo = p.swapNotional * (Math.pow(1 + p.swapFixedRate, t) - 1);

  return {
    t,
    forwardRate,
    forwardCostTotal,
    premioCapitalizadoUnitario,
    tetoOpcaoPorDolar,
    custoTetoOpcaoTotal,
    opcaoDominaTermo,
    spotEquilibrio,
    cenarios,
    swap: {
      jurosFlutuante,
      jurosFixo,
      diferenca: jurosFlutuante - jurosFixo
    }
  };
}


function lerParametros() {
  const form = document.getElementById('hedgeForm');
  if (!form.checkValidity()) {
    form.reportValidity();
    return null;
  }

  const ler = (id) => parseFloat(document.getElementById(id).value);

  return {
    N_USD: ler('exposureUSD'),
    S0: ler('spotRate'),
    r_BRL: ler('interestBR') / 100,
    r_USD: ler('interestUS') / 100,
    meses: ler('tenorMonths'),
    K: ler('strikeRate'),
    premioUnitario: ler('optionPremium'),
    swapNotional: ler('swapNotional'),
    swapFixedRate: ler('swapFixedRate') / 100
  };
}


function carregarCasoPratico() {
  document.getElementById('exposureUSD').value = 2500000;     // Dívida de US$ 2,5 milhões
  document.getElementById('spotRate').value = 5.25;           // Câmbio spot de R$ 5,25
  document.getElementById('interestBR').value = 11.25;        // CDI / Selic a 11,25% a.a.
  document.getElementById('interestUS').value = 4.75;         // SOFR a 4,75% a.a.
  document.getElementById('tenorMonths').value = 12;          // Prazo de 12 meses
  document.getElementById('strikeRate').value = 5.35;         // Preço de exercício da Call
  document.getElementById('optionPremium').value = 0.22;      // Prêmio de R$ 0,22 por dólar
  document.getElementById('swapNotional').value = 15000000;   // Dívida em moeda local de R$ 15 milhões
  document.getElementById('swapFixedRate').value = 11.80;     // Trava pré-fixada em 11,80% a.a.

  executarSimulacao();
}


function executarSimulacao() {

  const p = lerParametros();
  if (!p) return;

  const r = calcularResultados(p);


  document.getElementById('dispForwardRate').innerText = formatarTaxa(r.forwardRate);
  document.getElementById('dispForwardCost').innerText = formatarMoeda(r.forwardCostTotal);
  document.getElementById('dispCallCeiling').innerText = formatarMoeda(r.custoTetoOpcaoTotal);


  renderizarTabela(r.cenarios);


  renderizarGrafico(
    r.cenarios.map((c) => 'R$ ' + formatarNumero(c.spotFinal, 2)),
    r.cenarios.map((c) => c.custoUnhedged),
    r.cenarios.map((c) => c.custoForward),
    r.cenarios.map((c) => c.custoCall)
  );


  atualizarModuloSwap(p.swapNotional, p.r_BRL, p.swapFixedRate, r.swap);


  atualizarParecerTecnico(p, r);


  ultimaSimulacao = { parametros: p, resultados: r, geradoEm: new Date() };
  renderizarResumo(ultimaSimulacao);
}


function renderizarResumo(sim) {
  const p = sim.parametros;

  document.getElementById('reportTimestamp').innerText =
    sim.geradoEm.toLocaleString('pt-BR', { dateStyle: 'full', timeStyle: 'short' });


  const itens = [
    ['Exposição cambial', 'US$ ' + formatarNumero(p.N_USD, 2)],
    ['Cotação spot (S₀)', formatarTaxa(p.S0)],
    ['Juros Brasil (r_BRL)', formatarNumero(p.r_BRL * 100, 2) + '% a.a.'],
    ['Juros EUA (r_USD)', formatarNumero(p.r_USD * 100, 2) + '% a.a.'],
    ['Prazo', p.meses + ' meses'],
    ['Strike da Call (K)', formatarTaxa(p.K)],
    ['Prêmio da Call', formatarTaxa(p.premioUnitario) + ' por US$'],
    ['Principal do swap', formatarMoeda(p.swapNotional)],
    ['Taxa pré do swap', formatarNumero(p.swapFixedRate * 100, 2) + '% a.a.']
  ];

  document.getElementById('reportParams').innerHTML = itens
    .map(([rotulo, valor]) => `<div><dt>${rotulo}</dt><dd>${valor}</dd></div>`)
    .join('');
}


function exportarCSV() {
  if (!ultimaSimulacao) return;
  const { parametros: p, resultados: r, geradoEm } = ultimaSimulacao;

  const num = (v, casas = 2) => v.toFixed(casas).replace('.', ',');

  const linhas = [
    ['Relatório - Simulador de Hedge Cambial e Swap de Juros'],
    ['Gerado em', geradoEm.toLocaleString('pt-BR')],
    [],
    ['PARÂMETROS'],
    ['Exposição (US$)', num(p.N_USD)],
    ['Spot S0 (R$/US$)', num(p.S0, 4)],
    ['Juros Brasil (% a.a.)', num(p.r_BRL * 100)],
    ['Juros EUA (% a.a.)', num(p.r_USD * 100)],
    ['Prazo (meses)', p.meses],
    ['Strike K (R$/US$)', num(p.K, 4)],
    ['Prêmio (R$/US$)', num(p.premioUnitario, 4)],
    ['Principal swap (R$)', num(p.swapNotional)],
    ['Taxa pré swap (% a.a.)', num(p.swapFixedRate * 100)],
    [],
    ['INDICADORES'],
    ['Taxa a termo (R$/US$)', num(r.forwardRate, 4)],
    ['Custo travado no termo (R$)', num(r.forwardCostTotal)],
    ['Teto efetivo da Call (R$/US$)', num(r.tetoOpcaoPorDolar, 4)],
    ['Custo teto da Call (R$)', num(r.custoTetoOpcaoTotal)],
    ['Spot de equilíbrio Call x Termo (R$/US$)', r.opcaoDominaTermo ? 'Call vence em todos os cenários' : num(r.spotEquilibrio, 4)],
    ['Juros swap - taxa pré (R$)', num(r.swap.jurosFixo)],
    ['Juros swap - taxa flutuante (R$)', num(r.swap.jurosFlutuante)],
    ['Resultado do swap (R$, positivo = economia)', num(r.swap.diferenca)],
    [],
    ['MATRIZ DE CENÁRIOS'],
    ['Variação (%)', 'Spot final (R$/US$)', 'Sem hedge (R$)', 'Termo (R$)', 'Call (R$)', 'Termo - Call (R$, positivo = Call melhor)'],
    ...r.cenarios.map((c) => [
      num(c.variacao * 100, 1),
      num(c.spotFinal, 4),
      num(c.custoUnhedged),
      num(c.custoForward),
      num(c.custoCall),
      num(c.diferencaTermoOpcao)
    ])
  ];

  const conteudo = '﻿' + linhas.map((l) => l.join(';')).join('\r\n');
  const blob = new Blob([conteudo], { type: 'text/csv;charset=utf-8' });


  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'relatorio_hedge_' + geradoEm.toISOString().slice(0, 10) + '.csv';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
}


function renderizarTabela(cenarios) {
  const scenariosBody = document.getElementById('scenariosBody');
  scenariosBody.innerHTML = ''; 
  cenarios.forEach((c) => {
    const tr = document.createElement('tr');
    if (c.variacao === 0) tr.classList.add('linha-atual'); 
    const varPercent = c.variacao * 100;
    const sinal = varPercent > 0 ? '+' : '';
    const opcaoVence = c.diferencaTermoOpcao >= 0;

    tr.innerHTML = `
      <td>R$ ${formatarNumero(c.spotFinal, 2)} (${sinal}${formatarNumero(varPercent, 1)}%)</td>
      <td>${formatarMoeda(c.custoUnhedged)}</td>
      <td>${formatarMoeda(c.custoForward)}</td>
      <td>${formatarMoeda(c.custoCall)}</td>
      <td class="${opcaoVence ? 'best-option' : 'forward-better'}">
        ${opcaoVence
          ? 'Opção economiza ' + formatarMoeda(c.diferencaTermoOpcao)
          : 'Termo economiza ' + formatarMoeda(Math.abs(c.diferencaTermoOpcao))}
      </td>
    `;
    scenariosBody.appendChild(tr);
  });
}


function renderizarGrafico(labels, unhedged, forward, call) {
  const canvas = document.getElementById('payoffChart');

  if (typeof Chart === 'undefined') {
    canvas.parentElement.innerHTML =
      '<p class="helper-text">Não foi possível carregar o Chart.js. Verifique a conexão com a internet.</p>';
    return;
  }

  if (payoffChartInstance) {
    payoffChartInstance.destroy();
  }

  payoffChartInstance = new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Sem Hedge (Descoberto)',
          data: unhedged,
          borderColor: '#e76f51',
          backgroundColor: '#e76f51',
          borderWidth: 2,
          borderDash: [5, 5],
          fill: false
        },
        {
          label: 'Contrato a Termo (Forward)',
          data: forward,
          borderColor: '#1b4965',
          backgroundColor: '#1b4965',
          borderWidth: 3,
          fill: false
        },
        {
          label: 'Opção de Compra (Call)',
          data: call,
          borderColor: '#2a9d8f',
          backgroundColor: '#2a9d8f',
          borderWidth: 3,
          fill: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false }, 
      plugins: {
        tooltip: {
          callbacks: {
            label: function (context) {
              return context.dataset.label + ': ' + formatarMoeda(context.raw);
            }
          }
        },
        legend: {
          position: 'top',
          labels: {
            boxWidth: 15,
            font: { size: 12 }
          }
        }
      },
      scales: {
        y: {
          ticks: {
            callback: function (value) {
              return 'R$ ' + formatarNumero(value / 1000000, 1) + 'M';
            }
          },
          title: {
            display: true,
            text: 'Desembolso Total em Reais (R$)'
          }
        },
        x: {
          title: {
            display: true,
            text: 'Cotação Spot no Vencimento (R$/US$)'
          }
        }
      }
    }
  });
}


function atualizarModuloSwap(notional, taxaFlutuante, taxaFixa, swap) {
  const conclusao = swap.diferenca > 0
    ? `Caso a taxa flutuante se concretize no patamar atual (juros de
       ${formatarMoeda(swap.jurosFlutuante)}), a operação de swap gera uma
       <strong>economia de juros de ${formatarMoeda(swap.diferenca)}</strong>, além de imunizar
       o fluxo de caixa contra choques na política monetária do Banco Central.`
    : `Caso a taxa flutuante se mantenha no patamar atual (juros de
       ${formatarMoeda(swap.jurosFlutuante)}), a operação custará um diferencial de
       <strong>${formatarMoeda(Math.abs(swap.diferenca))}</strong>, atuando como uma apólice
       de seguro contra altas repentinas de juros.`;

  const texto = `
    Para a carteira de dívida em moeda local de <strong>${formatarMoeda(notional)}</strong>:
    ao contratar um <em>Swap de Taxas de Juros</em> trocando a taxa flutuante projetada de
    ${formatarNumero(taxaFlutuante * 100, 2)}% a.a. por uma taxa pré-fixada de
    ${formatarNumero(taxaFixa * 100, 2)}% a.a., a empresa trava a sua despesa financeira em
    <strong>${formatarMoeda(swap.jurosFixo)}</strong>.
    ${conclusao}
  `;

  document.getElementById('swapAnalysisText').innerHTML = texto;
}


function atualizarParecerTecnico(p, r) {  const comparacao = r.opcaoDominaTermo
    ? `Com os parâmetros informados, o teto efetivo da Call (${formatarTaxa(r.tetoOpcaoPorDolar)})
       fica <strong>abaixo</strong> da taxa a termo (${formatarTaxa(r.forwardRate)}): a opção é
       mais barata que o Termo em <strong>todos</strong> os cenários. Na prática, isso indica um
       prêmio subavaliado ou um strike muito baixo, e a cotação deve ser conferida com o banco.`
    : `A Call só supera o Termo se o dólar fechar abaixo de
       <strong>${formatarTaxa(r.spotEquilibrio)}</strong> (taxa a termo menos o prêmio
       capitalizado). Para cenários com risco de desvalorização abrupta do câmbio, o contrato
       <em>Forward</em> oferece a melhor proteção de caixa sem desembolso inicial. Se a
       governança corporativa priorizar a captura de valor em eventuais valorizações do Real,
       a aquisição de <em>Calls</em> desponta como a estrutura ideal.`;

  const parecer = `
    1. <strong>Previsibilidade Absoluta (Forward):</strong> O Contrato a Termo permite à
    companhia eliminar 100% da volatilidade cambial, garantindo a liquidação da obrigação de
    US$ ${formatarNumero(p.N_USD / 1000000, 2)}M ao custo exato de
    <strong>${formatarMoeda(r.forwardCostTotal)}</strong> (taxa de ${formatarTaxa(r.forwardRate)}/US$).
    Trata-se da alternativa recomendada caso a empresa possua margens operacionais estreitas
    e não possa absorver oscilações orçamentárias.
    <br /><br />

    2. <strong>Assimetria e Participação em Quedas (Opção Call):</strong> A Opção de Compra
    limita o desembolso máximo ao teto de <strong>${formatarMoeda(r.custoTetoOpcaoTotal)}</strong>
    (taxa teto efetiva de ${formatarTaxa(r.tetoOpcaoPorDolar)}/US$). Caso o Real se valorize e o
    dólar recue abaixo de R$ ${formatarNumero(p.K, 2)}, a companhia abandona o exercício e capta
    o benefício da cotação spot reduzida, absorvendo apenas o custo do prêmio.
    <br /><br />

    3. <strong>Recomendação da Tesouraria:</strong> ${comparacao}
  `;

  document.getElementById('executiveOpinionText').innerHTML = parecer;
}

if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', function () {

    document.getElementById('hedgeForm').addEventListener('submit', function (evento) {
      evento.preventDefault();
      executarSimulacao();
    });

    executarSimulacao();
  });
}


if (typeof module !== 'undefined') {
  module.exports = { calcularTaxaForward, calcularResultados };
}
