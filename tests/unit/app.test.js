/** @jest-environment jsdom */

const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const pagina = readFileSync(join(__dirname, '../../public/index.html'), 'utf8');
let app;

beforeEach(() => {
  jest.resetModules();
  app = require('../../public/js/app');
  document.body.innerHTML = new DOMParser().parseFromString(pagina, 'text/html').body.innerHTML;
});

afterEach(() => {
  delete window.Chart;
  delete URL.createObjectURL;
  delete URL.revokeObjectURL;
});

test('valida o formulário e recalcula ao carregar o exemplo', () => {
  app.iniciar();
  expect(app.lerParametros(document).jurosBR).toBeCloseTo(0.1075);
  expect(document.querySelectorAll('#scenariosBody tr')).toHaveLength(13);
  expect(document.querySelector('#scenariosBody tr.linha-atual')).not.toBeNull();
  expect(document.querySelector('#chartFallback').textContent).toContain('Chart.js indisponível');

  const simulacaoInicial = app.obterUltimaSimulacao();
  document.getElementById('spotRate').value = '';
  const submit = new Event('submit', { cancelable: true });
  expect(document.getElementById('hedgeForm').dispatchEvent(submit)).toBe(false);
  expect(document.getElementById('formError').hidden).toBe(false);
  expect(document.getElementById('formError').textContent).toContain('Cotação spot: informe um número.');
  expect(app.obterUltimaSimulacao()).toBe(simulacaoInicial);

  document.getElementById('btnExemplo').click();
  expect(document.getElementById('formError').hidden).toBe(true);
  expect(app.obterUltimaSimulacao().parametros.exposicaoUSD).toBe(2500000);
  expect(document.querySelectorAll('#reportParams dt')).toHaveLength(9);
});

test('atualiza as três séries do gráfico ao simular novamente', () => {
  const destroy = jest.fn();
  window.Chart = jest.fn().mockReturnValue({ destroy });

  app.executarSimulacao();
  app.carregarCasoPratico();

  expect(destroy).toHaveBeenCalledTimes(1);
  const [canvas, config] = window.Chart.mock.calls[1];
  expect(canvas.id).toBe('payoffChart');
  expect(config.data.labels).toHaveLength(13);
  expect(config.data.datasets.map((serie) => serie.data.length)).toEqual([13, 13, 13]);
  expect(config.options.scales.y.ticks.callback(2500000)).toBe('R$ 2,5M');
  expect(config.options.plugins.tooltip.callbacks.label({ dataset: { label: 'Termo' }, raw: 1000 }))
    .toMatch(/^Termo: R\$\s1\.000$/);
});

test('baixa o CSV da última simulação e aciona a impressão', () => {
  expect(app.baixarCSV()).toBeNull();
  URL.createObjectURL = jest.fn().mockReturnValue('blob:hedgelab');
  URL.revokeObjectURL = jest.fn();
  const clique = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () {
    expect(this.download).toMatch(/^relatorio_hedgelab_\d{4}-\d{2}-\d{2}\.csv$/);
  });
  const imprimir = jest.spyOn(window, 'print').mockImplementation(() => {});

  app.iniciar();
  document.getElementById('btnCSV').click();
  document.getElementById('btnImprimir').click();

  expect(clique).toHaveBeenCalledTimes(1);
  expect(URL.createObjectURL).toHaveBeenCalledWith(expect.objectContaining({ type: 'text/csv;charset=utf-8' }));
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:hedgelab');
  expect(imprimir).toHaveBeenCalledTimes(1);
});
