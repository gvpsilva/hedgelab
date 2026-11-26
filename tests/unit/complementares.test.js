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
describe('taxa a termo (paridade coberta de juros)', () => {
  test('é igual ao spot quando os juros dos dois países são iguais', () => {
    expect(calcularTaxaForward(5.2, 0.05, 0.05, 2)).toBeCloseTo(5.2, 10);
  });

  test('fica abaixo do spot quando os juros dos EUA são maiores que os do Brasil', () => {
    expect(calcularTaxaForward(5.2, 0.03, 0.08, 1)).toBeLessThan(5.2);
  });

  test('é igual ao spot quando o prazo é zero', () => {
    expect(calcularTaxaForward(5.2, 0.1075, 0.045, 0)).toBe(5.2);
  });
});
describe('opção de compra', () => {
  test('não altera o prêmio quando os juros brasileiros são zero', () => {
    expect(calcularPremioCapitalizado(0.18, 0, 1)).toBe(0.18);
  });

  test('custo da call nunca passa do teto (strike + prêmio) em nenhum cenário', () => {
    const entrada = {
      exposicaoUSD: 1000000,
      spot: 5.2,
      taxaForward: 5.5,
      strike: 5.3,
      premioCapitalizado: 0.2
    };
    const teto = entrada.exposicaoUSD * (entrada.strike + entrada.premioCapitalizado);

    gerarCenarios(entrada).forEach((cenario) => {
      expect(cenario.custoCall).toBeLessThanOrEqual(teto + 1e-6);
    });
  });
});
