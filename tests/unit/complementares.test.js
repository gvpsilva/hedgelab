const { formatarMoeda, formatarNumero } = require('../../public/js/formatacao');
const {
  calcularTaxaForward,
  calcularPremioCapitalizado,
  gerarCenarios,
  validarParametros
} = require('../../public/js/calculos');
const { descreverVantagem } = require('../../public/js/relatorio');

describe('formatação', () => {
  test('formata valores negativos em Reais com o sinal antes do símbolo', () => {
    expect(formatarMoeda(-22500)).toMatch(/^-R\$\s22\.500$/);
  });

  test('completa com zeros e arredonda para o número de casas pedido', () => {
    expect(formatarNumero(10, 4)).toBe('10,0000');
    expect(formatarNumero(5.49935, 4)).toBe('5,4994');
  });
});
