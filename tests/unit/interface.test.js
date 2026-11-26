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
  jest.resetModules(); // Cada teste começa sem simulação anterior
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

