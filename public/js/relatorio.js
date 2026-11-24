(function (raiz) {
  'use strict';

  const emNode = typeof module === 'object' && module.exports;
  const F = emNode ? require('./formatacao.js') : raiz.HedgeLab;

  /**
   * Descreve qual estratégia (call ou termo) saiu mais barata num cenário.
   * @param {number} vantagemCall Custo do termo menos custo da call (R$)
   * @returns {{classe:string, texto:string}} Classe CSS e texto da célula
   */
  function descreverVantagem(vantagemCall) {
    if (vantagemCall >= 0) {
      return { classe: 'best-option', texto: 'Opção economiza ' + F.formatarMoeda(vantagemCall) };
    }
    return { classe: 'forward-better', texto: 'Termo economiza ' + F.formatarMoeda(-vantagemCall) };
  }

  /**
   * Gera o conteúdo (células <td>) de uma linha da matriz de cenários.
   * @param {object} cenario Item retornado por gerarCenarios()
   * @returns {string} HTML das cinco células da linha
   */
  function htmlLinhaCenario(cenario) {
    const percentual = cenario.variacao * 100;
    const sinal = percentual > 0 ? '+' : '';
    const vantagem = descreverVantagem(cenario.vantagemCall);

    return [
      `<td>R$ ${F.formatarNumero(cenario.spotFinal, 2)} (${sinal}${F.formatarNumero(percentual, 1)}%)</td>`,
      `<td>${F.formatarMoeda(cenario.custoSemHedge)}</td>`,
      `<td>${F.formatarMoeda(cenario.custoForward)}</td>`,
      `<td>${F.formatarMoeda(cenario.custoCall)}</td>`,
      `<td class="${vantagem.classe}">${vantagem.texto}</td>`
    ].join('');
  }

  /**
   * Texto (HTML) da análise do swap de juros.
   * @param {object} p    Parâmetros da simulação
   * @param {object} swap Resultado de calcularSwap()
   * @returns {string}
   */
  function textoSwap(p, swap) {
    const conclusao = swap.diferenca > 0
      ? `Caso a taxa flutuante se concretize no patamar atual (juros de
         ${F.formatarMoeda(swap.jurosFlutuante)}), a operação de swap gera uma
         <strong>economia de juros de ${F.formatarMoeda(swap.diferenca)}</strong>, além de
         imunizar o fluxo de caixa contra choques na política monetária do Banco Central.`
      : `Caso a taxa flutuante se mantenha no patamar atual (juros de
         ${F.formatarMoeda(swap.jurosFlutuante)}), a operação custará um diferencial de
         <strong>${F.formatarMoeda(-swap.diferenca)}</strong>, atuando como uma apólice de
         seguro contra altas repentinas de juros.`;

    return `Para a carteira de dívida em moeda local de
      <strong>${F.formatarMoeda(p.principalSwap)}</strong>: ao contratar um
      <em>Swap de Taxas de Juros</em> trocando a taxa flutuante projetada de
      ${F.formatarPercentual(p.jurosBR)} a.a. por uma taxa pré-fixada de
      ${F.formatarPercentual(p.taxaPreSwap)} a.a., a empresa trava a sua despesa financeira em
      <strong>${F.formatarMoeda(swap.jurosFixo)}</strong>. ${conclusao}`;
  }

  /**
   * Parecer técnico automático (HTML) comparando termo e opção.
   * O item 3 muda conforme a call domine ou não o termo.
   * @param {object} p Parâmetros da simulação
   * @param {object} r Resultado de simular()
   * @returns {string}
   */
  function textoParecer(p, r) {
    const recomendacao = r.callDominaTermo
      ? `Com os parâmetros informados, o teto efetivo da Call (${F.formatarTaxa(r.tetoCall)})
         fica <strong>abaixo</strong> da taxa a termo (${F.formatarTaxa(r.taxaForward)}): a opção
         é mais barata que o Termo em <strong>todos</strong> os cenários. Na prática, isso indica
         um prêmio subavaliado ou um strike muito baixo, e a cotação deve ser conferida com o banco.`
      : `A Call só supera o Termo se o dólar fechar abaixo de
         <strong>${F.formatarTaxa(r.spotEquilibrio)}</strong> (taxa a termo menos o prêmio
         capitalizado). Para cenários com risco de desvalorização abrupta do câmbio, o contrato
         <em>Forward</em> oferece a melhor proteção de caixa sem desembolso inicial. Se a
         governança priorizar a captura de valor em eventuais valorizações do Real, a aquisição
         de <em>Calls</em> desponta como a estrutura ideal.`;

    return `1. <strong>Previsibilidade Absoluta (Forward):</strong> O Contrato a Termo elimina 100%
      da volatilidade cambial, garantindo a liquidação da obrigação de
      US$ ${F.formatarNumero(p.exposicaoUSD / 1000000, 2)}M ao custo exato de
      <strong>${F.formatarMoeda(r.custoForward)}</strong> (taxa de ${F.formatarTaxa(r.taxaForward)}/US$).
      É a alternativa indicada para empresas com margens estreitas, que não podem absorver
      oscilações orçamentárias.
      <br /><br />
      2. <strong>Assimetria e Participação em Quedas (Opção Call):</strong> A Opção de Compra
      limita o desembolso máximo a <strong>${F.formatarMoeda(r.custoTetoCall)}</strong>
      (taxa teto efetiva de ${F.formatarTaxa(r.tetoCall)}/US$). Se o dólar recuar abaixo de
      R$ ${F.formatarNumero(p.strike, 2)}, a empresa não exerce a opção e compra no mercado,
      absorvendo apenas o custo do prêmio.
      <br /><br />
      3. <strong>Recomendação da Tesouraria:</strong> ${recomendacao}`;
  }

  /**
   * Lista dos parâmetros usados, para o bloco "Relatório da Simulação".
   * @param {object} p Parâmetros da simulação
   * @returns {Array<[string, string]>} Pares [rótulo, valor formatado]
   */
  function itensResumo(p) {
    return [
      ['Exposição cambial', 'US$ ' + F.formatarNumero(p.exposicaoUSD, 2)],
      ['Cotação spot (S₀)', F.formatarTaxa(p.spot)],
      ['Juros Brasil (r_BRL)', F.formatarPercentual(p.jurosBR) + ' a.a.'],
      ['Juros EUA (r_USD)', F.formatarPercentual(p.jurosEUA) + ' a.a.'],
      ['Prazo', p.prazoMeses + ' meses'],
      ['Strike da Call (K)', F.formatarTaxa(p.strike)],
      ['Prêmio da Call', F.formatarTaxa(p.premio) + ' por US$'],
      ['Principal do swap', F.formatarMoeda(p.principalSwap)],
      ['Taxa pré do swap', F.formatarPercentual(p.taxaPreSwap) + ' a.a.']
    ];
  }

  /**
   * Conteúdo do arquivo CSV: parâmetros, indicadores e matriz de cenários.
   * Usa ";" como separador e vírgula decimal (padrão do Excel em português) e
   * começa com o BOM (﻿) para o Excel reconhecer os acentos em UTF-8.
   *
   * @param {object} p      Parâmetros da simulação
   * @param {object} r      Resultado de simular()
   * @param {Date}   geradoEm Data/hora da simulação
   * @returns {string}
   */
  function gerarCSV(p, r, geradoEm) {
    const d = F.formatarDecimal;

    const linhas = [
      ['Relatório - HedgeLab: Hedge Cambial e Swap de Juros'],
      ['Gerado em', geradoEm.toLocaleString('pt-BR')],
      [],
      ['PARÂMETROS'],
      ['Exposição (US$)', d(p.exposicaoUSD)],
      ['Spot S0 (R$/US$)', d(p.spot, 4)],
      ['Juros Brasil (% a.a.)', d(p.jurosBR * 100)],
      ['Juros EUA (% a.a.)', d(p.jurosEUA * 100)],
      ['Prazo (meses)', p.prazoMeses],
      ['Strike K (R$/US$)', d(p.strike, 4)],
      ['Prêmio (R$/US$)', d(p.premio, 4)],
      ['Principal swap (R$)', d(p.principalSwap)],
      ['Taxa pré swap (% a.a.)', d(p.taxaPreSwap * 100)],
      [],
      ['INDICADORES'],
      ['Taxa a termo (R$/US$)', d(r.taxaForward, 4)],
      ['Custo travado no termo (R$)', d(r.custoForward)],
      ['Teto efetivo da Call (R$/US$)', d(r.tetoCall, 4)],
      ['Custo teto da Call (R$)', d(r.custoTetoCall)],
      ['Spot de equilíbrio Call x Termo (R$/US$)',
        r.callDominaTermo ? 'Call vence em todos os cenários' : d(r.spotEquilibrio, 4)],
      ['Juros swap - taxa pré (R$)', d(r.swap.jurosFixo)],
      ['Juros swap - taxa flutuante (R$)', d(r.swap.jurosFlutuante)],
      ['Resultado do swap (R$, positivo = economia)', d(r.swap.diferenca)],
      [],
      ['MATRIZ DE CENÁRIOS'],
      ['Variação (%)', 'Spot final (R$/US$)', 'Sem hedge (R$)', 'Termo (R$)', 'Call (R$)',
        'Termo - Call (R$, positivo = Call melhor)'],
      ...r.cenarios.map((c) => [
        d(c.variacao * 100, 1),
        d(c.spotFinal, 4),
        d(c.custoSemHedge),
        d(c.custoForward),
        d(c.custoCall),
        d(c.vantagemCall)
      ])
    ];

    return '﻿' + linhas.map((linha) => linha.join(';')).join('\r\n');
  }

  /**
   * Nome do arquivo CSV com a data da simulação. Ex.: relatorio_hedgelab_2026-11-23.csv
   * @param {Date} data
   * @returns {string}
   */
  function nomeArquivoCSV(data) {
    const pad = (n) => String(n).padStart(2, '0');
    return `relatorio_hedgelab_${data.getFullYear()}-${pad(data.getMonth() + 1)}-${pad(data.getDate())}.csv`;
  }

  const api = {
    descreverVantagem,
    htmlLinhaCenario,
    textoSwap,
    textoParecer,
    itensResumo,
    gerarCSV,
    nomeArquivoCSV
  };

  if (emNode) {
    module.exports = api;
  } else {
    raiz.HedgeLab = Object.assign(raiz.HedgeLab || {}, api);
  }
})(typeof window !== 'undefined' ? window : globalThis);
