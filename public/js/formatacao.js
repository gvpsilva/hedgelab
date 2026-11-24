(function (raiz) {
  'use strict';

  const LOCALIDADE = 'pt-BR';

  /**
   * Formata um valor em Reais, sem centavos. Ex.: 5511004.78 -> "R$ 5.511.005"
   * @param {number} valor
   * @returns {string}
   */
  function formatarMoeda(valor) {
    return valor.toLocaleString(LOCALIDADE, {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0
    });
  }

  /**
   * Formata um número com quantidade fixa de casas decimais. Ex.: (5.511, 4) -> "5,5110"
   * @param {number} valor
   * @param {number} casas
   * @returns {string}
   */
  function formatarNumero(valor, casas) {
    return valor.toLocaleString(LOCALIDADE, {
      minimumFractionDigits: casas,
      maximumFractionDigits: casas
    });
  }

  /**
   * Formata uma cotação de câmbio em R$/US$ com 4 casas. Ex.: 5.511 -> "R$ 5,5110"
   * @param {number} valor
   * @returns {string}
   */
  function formatarTaxa(valor) {
    return 'R$ ' + formatarNumero(valor, 4);
  }

  /**
   * Converte uma taxa decimal em percentual com 2 casas. Ex.: 0.1075 -> "10,75%"
   * @param {number} taxaDecimal
   * @returns {string}
   */
  function formatarPercentual(taxaDecimal) {
    return formatarNumero(taxaDecimal * 100, 2) + '%';
  }

  /**
   * Número com vírgula decimal e SEM separador de milhar, para arquivos CSV
   * abertos no Excel em português. Ex.: (5511004.78, 2) -> "5511004,78"
   * @param {number} valor
   * @param {number} [casas=2]
   * @returns {string}
   */
  function formatarDecimal(valor, casas = 2) {
    return valor.toLocaleString(LOCALIDADE, {
      minimumFractionDigits: casas,
      maximumFractionDigits: casas,
      useGrouping: false
    });
  }

  const api = {
    formatarMoeda,
    formatarNumero,
    formatarTaxa,
    formatarPercentual,
    formatarDecimal
  };

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  } else {
    raiz.HedgeLab = Object.assign(raiz.HedgeLab || {}, api);
  }
})(typeof window !== 'undefined' ? window : globalThis);
