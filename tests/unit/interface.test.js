const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { htmlLinhaCenario, itensResumo, nomeArquivoCSV } = require('../../public/js/relatorio');

const pagina = readFileSync(join(__dirname, '../../public/index.html'), 'utf8');
let app;

const texto = (id) => document.getElementById(id).textContent.replace(/\s+/g, ' ').trim();

const preencher = (id, valor) => {
  document.getElementById(id).value = valor;
};

beforeEach(() => {
  jest.resetModules(); 
  app = require('../../public/js/app');
  document.body.innerHTML = new DOMParser().parseFromString(pagina, 'text/html').body.innerHTML;
});

afterEach(() => {
  delete window.Chart;
});

describe('captura dos dados do formulário', () => {
  test('converte os campos em percentual para taxa decimal', () => {
    const parametros = app.lerParametros(document);
    expect(parametros.jurosBR).toBeCloseTo(0.1075, 10);
    expect(parametros.jurosEUA).toBeCloseTo(0.045, 10);
    expect(parametros.taxaPreSwap).toBeCloseTo(0.112, 10);
    expect(parametros.exposicaoUSD).toBe(1000000);
  });

  test('transforma campo vazio em NaN para ser barrado na validação', () => {
    preencher('strikeRate', '');
    expect(app.lerParametros(document).strike).toBeNaN();
  });
});

describe('caixa de erros', () => {
  test('mostra um item para cada erro', () => {
    app.mostrarErros(document, ['Erro A', 'Erro B', 'Erro C']);
    const caixa = document.getElementById('formError');
    expect(caixa.hidden).toBe(false);
    expect(caixa.querySelectorAll('li')).toHaveLength(3);
  });

  test('some e fica vazia quando não há mais erros', () => {
    app.mostrarErros(document, ['Erro A']);
    app.mostrarErros(document, []);
    const caixa = document.getElementById('formError');
    expect(caixa.hidden).toBe(true);
    expect(caixa.innerHTML).toBe('');
  });

  test('lista todos os campos com problema de uma vez', () => {
    preencher('spotRate', '');
    preencher('tenorMonths', '6.5');
    expect(app.executarSimulacao(document)).toBeNull();
    expect(document.querySelectorAll('#formError li')).toHaveLength(2);
    expect(texto('formError')).toContain('Prazo: informe um número inteiro de meses.');
  });
});

describe('relatórios na página', () => {
  test('destaca na matriz a linha do câmbio estável (variação de 0%)', () => {
    app.executarSimulacao(document);
    const destacadas = document.querySelectorAll('#scenariosBody tr.linha-atual');
    expect(destacadas).toHaveLength(1);
    expect(destacadas[0].textContent).toContain('(0,0%)');
  });

  test('preenche o resumo com os nove parâmetros usados e a data da simulação', () => {
    app.executarSimulacao(document);
    expect(document.querySelectorAll('#reportParams dt')).toHaveLength(9);
    expect(texto('reportParams')).toContain('12 meses');
    expect(texto('reportTimestamp')).not.toBe('—');
  });

  test('mostra um aviso no lugar do gráfico quando o Chart.js não carrega', () => {
    app.executarSimulacao(document);
    expect(document.getElementById('chartFallback')).not.toBeNull();
    // Os demais relatórios continuam funcionando
    expect(texto('dispForwardRate')).toBe('R$ 5,5110');
  });

  test('continua recalculando sem erro quando o aviso do gráfico já está na tela', () => {
    app.executarSimulacao(document);
    preencher('spotRate', '6.00');
    expect(() => app.executarSimulacao(document)).not.toThrow();
    expect(texto('dispForwardRate')).toBe('R$ 6,3589');
  });

  test('não exporta CSV antes da primeira simulação', () => {
    expect(app.baixarCSV(document)).toBeNull();
    expect(app.obterUltimaSimulacao()).toBeNull();
  });
});

describe('conteúdo dos relatórios', () => {
  test('gera as cinco colunas da matriz com sinal de mais nas altas do dólar', () => {
    const linha = htmlLinhaCenario({
      variacao: 0.1,
      spotFinal: 5.72,
      custoSemHedge: 5720000,
      custoForward: 5511005,
      custoCall: 5499350,
      vantagemCall: 11655
    });
    expect(linha.match(/<td/g)).toHaveLength(5);
    expect(linha).toContain('R$ 5,72 (+10,0%)');
  });

  test('formata o resumo dos parâmetros com unidades e o nome do CSV com a data', () => {
    const resumo = Object.fromEntries(itensResumo({
      exposicaoUSD: 1000000,
      spot: 5.2,
      jurosBR: 0.1075,
      jurosEUA: 0.045,
      prazoMeses: 12,
      strike: 5.3,
      premio: 0.18,
      principalSwap: 5000000,
      taxaPreSwap: 0.112
    }));
    expect(resumo['Exposição cambial']).toBe('US$ 1.000.000,00');
    expect(resumo['Juros Brasil (r_BRL)']).toBe('10,75% a.a.');
    expect(nomeArquivoCSV(new Date(2026, 0, 5))).toBe('relatorio_hedgelab_2026-01-05.csv');
  });
});

