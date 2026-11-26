const {
  calcularTaxaForward,
  calcularPremioCapitalizado,
  calcularTaxaEfetivaCall,
  calcularSwap,
  gerarCenarios,
  simular,
  validarParametros
} = require('../../public/js/calculos');

const parametros = {
  exposicaoUSD: 1000,
  spot: 5,
  jurosBR: 0.10,
  jurosEUA: 0,
  prazoMeses: 24,
  strike: 6,
  premio: 0.2,
  principalSwap: 10000,
  taxaPreSwap: 0.05
};

test('calcula a taxa a termo pela diferença de juros e capitaliza o prêmio', () => {
  expect(calcularTaxaForward(5, 0.21, 0, 0.5)).toBeCloseTo(5.5);
  expect(calcularTaxaForward(5, 0.10, 0.10, 2)).toBeCloseTo(5);
  expect(calcularPremioCapitalizado(0.2, 0.10, 2)).toBeCloseTo(0.242);
});

test.each([[4, 4.2], [5, 5.2], [6, 5.2]])('calcula o custo da call com spot final %s', (spot, custo) => {
  expect(calcularTaxaEfetivaCall(spot, 5, 0.2)).toBeCloseTo(custo);
});

test('calcula juros compostos e diferencia economia de custo no swap', () => {
  const swap = calcularSwap(10000, 0.10, 0.05, 2);
  expect(swap.jurosFlutuante).toBeCloseTo(2100);
  expect(swap.jurosFixo).toBeCloseTo(1025);
  expect(swap.diferenca).toBeCloseTo(1075);
  expect(calcularSwap(10000, 0.05, 0.10, 2).diferenca).toBeCloseTo(-1075);
});

test('compara os custos das três estratégias em cenários escolhidos', () => {
  const cenarios = gerarCenarios({
    exposicaoUSD: 1000, spot: 5, taxaForward: 5.5, strike: 6, premioCapitalizado: 0.25
  }, [-0.2, 0.4]);
  expect(cenarios).toEqual([
    { variacao: -0.2, spotFinal: 4, custoSemHedge: 4000, custoForward: 5500, custoCall: 4250, vantagemCall: 1250 },
    { variacao: 0.4, spotFinal: 7, custoSemHedge: 7000, custoForward: 5500, custoCall: 6250, vantagemCall: -750 }
  ]);
});

test('consolida os indicadores e 13 cenários da simulação', () => {
  const resultado = simular(parametros);
  expect(resultado.prazoAnos).toBe(2);
  expect(resultado.custoForward).toBeCloseTo(6050);
  expect(resultado.custoTetoCall).toBeCloseTo(6242);
  expect(resultado.spotEquilibrio).toBeCloseTo(5.808);
  expect(resultado.callDominaTermo).toBe(false);
  expect(simular({ ...parametros, strike: 5 }).callDominaTermo).toBe(true);
  expect(resultado.cenarios).toHaveLength(13);
  expect(resultado.cenarios[0].variacao).toBe(-0.25);
  expect(resultado.cenarios[12].variacao).toBe(0.35);
  expect(resultado.swap.diferenca).toBeCloseTo(1075);
});

test('aceita valores válidos e os limites do prazo e das taxas', () => {
  expect(validarParametros(parametros)).toEqual([]);
  expect(validarParametros({ ...parametros, prazoMeses: 1, jurosBR: 0 })).toEqual([]);
  expect(validarParametros({ ...parametros, prazoMeses: 60, jurosBR: 1 })).toEqual([]);
});

test.each([
  ['spot', NaN, 'Cotação spot: informe um número.'],
  ['spot', Infinity, 'Cotação spot: informe um número.'],
  ['spot', '5', 'Cotação spot: informe um número.'],
  ['exposicaoUSD', 999, 'Exposição cambial: valor fora do intervalo permitido.'],
  ['jurosBR', 1.01, 'Juros Brasil: valor fora do intervalo permitido.'],
  ['prazoMeses', 12.5, 'Prazo: informe um número inteiro de meses.']
])('rejeita %s com valor %p', (campo, valor, mensagem) => {
  expect(validarParametros({ ...parametros, [campo]: valor })).toEqual([mensagem]);
});
