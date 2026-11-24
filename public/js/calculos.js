(function (raiz) {
  'use strict';

  /**
   * Taxa a termo pela paridade coberta de juros (Lei do Preço Único):
   *   F = S0 * (1 + r_BRL)^t / (1 + r_USD)^t
   *
   * @param {number} spot          Cotação à vista inicial (S0, em R$/US$)
   * @param {number} rDomestico    Juros no Brasil (a.a., decimal)
   * @param {number} rEstrangeiro  Juros nos EUA (a.a., decimal)
   * @param {number} prazoAnos     Prazo em anos (meses / 12)
   * @returns {number} Taxa a termo de equilíbrio (R$/US$)
   */
  function calcularTaxaForward(spot, rDomestico, rEstrangeiro, prazoAnos) {
    const fatorDomestico = Math.pow(1 + rDomestico, prazoAnos);
    const fatorEstrangeiro = Math.pow(1 + rEstrangeiro, prazoAnos);
    return spot * (fatorDomestico / fatorEstrangeiro);
  }

  /**
   * Valor futuro do prêmio da opção. O prêmio é pago hoje (t = 0); para
   * compará-lo com valores do vencimento, capitaliza-se por (1 + r_BRL)^t,
   * refletindo o custo de oportunidade do dinheiro.
   *
   * @param {number} premio     Prêmio pago por dólar (R$/US$)
   * @param {number} rDomestico Juros no Brasil (a.a., decimal)
   * @param {number} prazoAnos  Prazo em anos
   * @returns {number} Prêmio por dólar na data do vencimento
   */
  function calcularPremioCapitalizado(premio, rDomestico, prazoAnos) {
    return premio * Math.pow(1 + rDomestico, prazoAnos);
  }

  /**
   * Custo por dólar de quem comprou uma call, no vencimento:
   *   - Spot > K: exerce e compra a K;
   *   - Spot <= K: deixa expirar e compra no mercado à vista.
   * Em ambos os casos soma-se o prêmio capitalizado.
   *
   * @param {number} spotFinal           Cotação no vencimento
   * @param {number} strike              Preço de exercício (K)
   * @param {number} premioCapitalizado  Prêmio por dólar no vencimento
   * @returns {number} Custo efetivo por dólar (R$/US$)
   */
  function calcularTaxaEfetivaCall(spotFinal, strike, premioCapitalizado) {
    return Math.min(spotFinal, strike) + premioCapitalizado;
  }

  /**
   * Swap de taxa de juros: a empresa tem dívida pós-fixada e passa a pagar
   * uma taxa pré-fixada. Compara os juros compostos das duas pontas no prazo.
   *
   * @param {number} principal     Principal (notional) da dívida em R$
   * @param {number} taxaFlutuante Taxa flutuante projetada (a.a., decimal)
   * @param {number} taxaFixa      Taxa pré-fixada do swap (a.a., decimal)
   * @param {number} prazoAnos     Prazo em anos
   * @returns {{jurosFlutuante:number, jurosFixo:number, diferenca:number}}
   *          diferenca > 0 significa economia com o swap
   */
  function calcularSwap(principal, taxaFlutuante, taxaFixa, prazoAnos) {
    const jurosFlutuante = principal * (Math.pow(1 + taxaFlutuante, prazoAnos) - 1);
    const jurosFixo = principal * (Math.pow(1 + taxaFixa, prazoAnos) - 1);
    return {
      jurosFlutuante,
      jurosFixo,
      diferenca: jurosFlutuante - jurosFixo
    };
  }

  /**
   * Variações do dólar simuladas em torno do spot inicial: de -25% a +35%.
   */
  const VARIACOES_CENARIO = Object.freeze(
    [-0.25, -0.2, -0.15, -0.1, -0.05, 0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35]
  );

  /**
   * Monta a matriz de cenários: para cada variação do dólar, o desembolso
   * total em R$ de cada estratégia (sem hedge, termo e call).
   *
   * @param {object} entrada
   * @param {number} entrada.exposicaoUSD       Valor a pagar em dólares
   * @param {number} entrada.spot               Cotação inicial (S0)
   * @param {number} entrada.taxaForward        Taxa a termo (R$/US$)
   * @param {number} entrada.strike             Strike da call (K)
   * @param {number} entrada.premioCapitalizado Prêmio por dólar no vencimento
   * @param {number[]} [variacoes]              Variações a simular
   * @returns {Array<object>} Um objeto por cenário
   */
  function gerarCenarios(entrada, variacoes = VARIACOES_CENARIO) {
    const custoForward = entrada.exposicaoUSD * entrada.taxaForward;

    return variacoes.map((variacao) => {
      const spotFinal = entrada.spot * (1 + variacao);
      const custoCall = entrada.exposicaoUSD *
        calcularTaxaEfetivaCall(spotFinal, entrada.strike, entrada.premioCapitalizado);

      return {
        variacao,
        spotFinal,
        custoSemHedge: entrada.exposicaoUSD * spotFinal,
        custoForward,
        custoCall,
        // Positivo: a call custou menos que o termo neste cenário
        vantagemCall: custoForward - custoCall
      };
    });
  }

  /**
   * Regras de validação de cada parâmetro: rótulo exibido, mínimo, máximo e
   * se precisa ser inteiro. Taxas estão em decimal (máximo 1 = 100% a.a.).
   */
  const REGRAS = Object.freeze({
    exposicaoUSD: { rotulo: 'Exposição cambial', min: 1000, max: Infinity },
    spot: { rotulo: 'Cotação spot', min: 0.1, max: Infinity },
    jurosBR: { rotulo: 'Juros Brasil', min: 0, max: 1 },
    jurosEUA: { rotulo: 'Juros EUA', min: 0, max: 1 },
    prazoMeses: { rotulo: 'Prazo', min: 1, max: 60, inteiro: true },
    strike: { rotulo: 'Strike', min: 0.1, max: Infinity },
    premio: { rotulo: 'Prêmio da opção', min: 0, max: Infinity },
    principalSwap: { rotulo: 'Principal do swap', min: 10000, max: Infinity },
    taxaPreSwap: { rotulo: 'Taxa pré do swap', min: 0, max: 1 }
  });

  /**
   * Valida os parâmetros da simulação.
   * @param {object} parametros
   * @returns {string[]} Lista de mensagens de erro (vazia se tudo estiver certo)
   */
  function validarParametros(parametros) {
    const erros = [];

    Object.entries(REGRAS).forEach(([campo, regra]) => {
      const valor = parametros[campo];

      if (typeof valor !== 'number' || !Number.isFinite(valor)) {
        erros.push(`${regra.rotulo}: informe um número.`);
      } else if (valor < regra.min || valor > regra.max) {
        erros.push(`${regra.rotulo}: valor fora do intervalo permitido.`);
      } else if (regra.inteiro && !Number.isInteger(valor)) {
        erros.push(`${regra.rotulo}: informe um número inteiro de meses.`);
      }
    });

    return erros;
  }

  /**
   * Executa a simulação completa a partir dos parâmetros do formulário.
   *
   * @param {object} p Parâmetros (ver REGRAS; taxas em decimal)
   * @returns {object} Indicadores, cenários e resultado do swap
   */
  function simular(p) {
    const prazoAnos = p.prazoMeses / 12;

    const taxaForward = calcularTaxaForward(p.spot, p.jurosBR, p.jurosEUA, prazoAnos);
    const premioCapitalizado = calcularPremioCapitalizado(p.premio, p.jurosBR, prazoAnos);
    const tetoCall = p.strike + premioCapitalizado;

    return {
      prazoAnos,
      taxaForward,
      custoForward: p.exposicaoUSD * taxaForward,
      premioCapitalizado,
      tetoCall,
      custoTetoCall: p.exposicaoUSD * tetoCall,
      // Se o teto da call já é menor que o termo, a call vence em todos os cenários
      callDominaTermo: tetoCall <= taxaForward,
      // Abaixo deste spot final, a call custa menos que o termo
      spotEquilibrio: taxaForward - premioCapitalizado,
      cenarios: gerarCenarios({
        exposicaoUSD: p.exposicaoUSD,
        spot: p.spot,
        taxaForward,
        strike: p.strike,
        premioCapitalizado
      }),
      swap: calcularSwap(p.principalSwap, p.jurosBR, p.taxaPreSwap, prazoAnos)
    };
  }

  const api = {
    VARIACOES_CENARIO,
    validarParametros,
    simular,
    calcularTaxaForward,
    calcularPremioCapitalizado,
    calcularTaxaEfetivaCall,
    calcularSwap,
    gerarCenarios
  };

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  } else {
    raiz.HedgeLab = Object.assign(raiz.HedgeLab || {}, api);
  }
})(typeof window !== 'undefined' ? window : globalThis);
