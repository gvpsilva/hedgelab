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
describe('validação e relatórios', () => {
  test('lista de uma vez os erros dos nove campos quando o formulário está vazio', () => {
    expect(validarParametros({})).toHaveLength(9);
  });

  test('considera empate entre call e termo como vantagem da opção', () => {
    const resultado = descreverVantagem(0);
    expect(resultado.classe).toBe('best-option');
    expect(resultado.texto).toMatch(/^Opção economiza R\$\s0$/);
  });
});

const Formatacao = require('../../public/js/formatacao');
const Calculos = require('../../public/js/calculos');
const Relatorio = require('../../public/js/relatorio');

const exemploPratico = {
  exposicaoUSD: 2500000,
  spot: 5.25,
  jurosBR: 0.1125,
  jurosEUA: 0.0475,
  prazoMeses: 12,
  strike: 5.35,
  premio: 0.22,
  principalSwap: 15000000,
  taxaPreSwap: 0.118
};

describe('simulação completa', () => {
  test('converte o prazo de meses para anos', () => {
    expect(Calculos.simular({ ...exemploPratico, prazoMeses: 6 }).prazoAnos).toBe(0.5);
  });

  test('calcula o custo máximo da call como exposição x (strike + prêmio capitalizado)', () => {
    const resultado = Calculos.simular(exemploPratico);
    expect(resultado.custoTetoCall).toBeCloseTo(exemploPratico.exposicaoUSD * resultado.tetoCall, 6);
  });

  test('indica que a call não domina o termo e mostra o spot de equilíbrio no exemplo prático', () => {
    const resultado = Calculos.simular(exemploPratico);
    expect(resultado.callDominaTermo).toBe(false);
    expect(resultado.spotEquilibrio).toBeCloseTo(5.331, 3);
  });
});

describe('swap e cenários', () => {
  test('não gera economia nem custo quando a taxa pré é igual à flutuante', () => {
    expect(Calculos.calcularSwap(1000000, 0.1, 0.1, 1).diferenca).toBeCloseTo(0, 6);
  });

  test('simula apenas as variações informadas, quando passadas', () => {
    const cenarios = Calculos.gerarCenarios({
      exposicaoUSD: 1000,
      spot: 5,
      taxaForward: 5.2,
      strike: 5.1,
      premioCapitalizado: 0.1
    }, [-0.1, 0.1]);
    expect(cenarios.map((c) => c.spotFinal)).toEqual([4.5, 5.5]);
  });

  test('não permite alterar a lista padrão de variações de câmbio', () => {
    expect(Object.isFrozen(Calculos.VARIACOES_CENARIO)).toBe(true);
  });
});

describe('formatação para a tela e para o CSV', () => {
  test('formata taxa zero como 0,00%', () => {
    expect(Formatacao.formatarPercentual(0)).toBe('0,00%');
  });

  test('usa duas casas decimais no CSV quando nenhuma é informada', () => {
    expect(Formatacao.formatarDecimal(3)).toBe('3,00');
  });
});

describe('relatórios', () => {
  test('inclui o principal e a despesa travada na análise do swap', () => {
    const swap = { jurosFlutuante: 537500, jurosFixo: 560000, diferenca: -22500 };
    const texto = Relatorio.textoSwap({ ...exemploPratico, principalSwap: 5000000 }, swap);
    expect(texto).toMatch(/R\$\s5\.000\.000/);
    expect(texto).toMatch(/R\$\s560\.000/);
  });

  test('completa mês e dia com zero à esquerda no nome do arquivo CSV', () => {
    expect(Relatorio.nomeArquivoCSV(new Date(2026, 2, 7))).toBe('relatorio_hedgelab_2026-03-07.csv');
  });
});
