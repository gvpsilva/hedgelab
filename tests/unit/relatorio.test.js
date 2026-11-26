const { formatarDecimal, formatarMoeda, formatarPercentual, formatarTaxa } = require('../../public/js/formatacao');
const { simular } = require('../../public/js/calculos');
const { gerarCSV, htmlLinhaCenario, itensResumo, nomeArquivoCSV, textoParecer, textoSwap } = require('../../public/js/relatorio');

const parametros = {
  exposicaoUSD: 1000, spot: 5, jurosBR: 0, jurosEUA: 0, prazoMeses: 12,
  strike: 5.5, premio: 0.25, principalSwap: 10000, taxaPreSwap: 0.05
};

test('formata valores brasileiros para a interface e o CSV', () => {
  expect(formatarMoeda(5511004.78)).toMatch(/^R\$\s5\.511\.005$/);
  expect(formatarTaxa(5.511)).toBe('R$ 5,5110');
  expect(formatarPercentual(0.1075)).toBe('10,75%');
  expect(formatarDecimal(5511004.78)).toBe('5511004,78');
});

test('identifica qual hedge é mais barato na matriz', () => {
  const { cenarios } = simular(parametros);
  expect(htmlLinhaCenario(cenarios[0])).toContain('(-25,0%)');
  expect(htmlLinhaCenario(cenarios[0])).toContain('class="best-option">Opção economiza');
  expect(htmlLinhaCenario(cenarios[12])).toContain('(+35,0%)');
  expect(htmlLinhaCenario(cenarios[12])).toContain('class="forward-better">Termo economiza');
});

test('gera o parecer para os dois resultados de comparação cambial e de swap', () => {
  const resultado = simular(parametros);
  expect(textoParecer(parametros, resultado)).toContain('A Call só supera o Termo');
  expect(textoSwap(parametros, resultado.swap)).toContain('custará um diferencial');

  const alternativa = { ...parametros, strike: 4.5, jurosBR: 0.10 };
  const resultadoAlternativo = simular(alternativa);
  expect(textoParecer(alternativa, resultadoAlternativo)).toContain('<strong>todos</strong> os cenários');
  expect(textoSwap(alternativa, resultadoAlternativo.swap)).toContain('economia de juros');
  expect(itensResumo(parametros)).toHaveLength(9);
  expect(itensResumo(parametros)).toContainEqual(['Prazo', '12 meses']);
});

test('exporta parâmetros, indicadores e todos os cenários em CSV para Excel', () => {
  const data = new Date(2026, 0, 2, 12);
  const csv = gerarCSV(parametros, simular(parametros), data);
  const linhas = csv.split('\r\n');
  expect(csv.charCodeAt(0)).toBe(0xfeff);
  expect(linhas).toContain('Exposição (US$);1000,00');
  expect(linhas).toContain('Spot de equilíbrio Call x Termo (R$/US$);4,7500');
  expect(linhas.slice(linhas.indexOf('MATRIZ DE CENÁRIOS') + 2)).toHaveLength(13);
  expect(linhas.at(-1)).toBe('35,0;6,7500;6750,00;5000,00;5750,00;-750,00');
  expect(gerarCSV(parametros, simular({ ...parametros, strike: 4.5 }), data))
    .toContain('Call vence em todos os cenários');
  expect(nomeArquivoCSV(data)).toBe('relatorio_hedgelab_2026-01-02.csv');
});
