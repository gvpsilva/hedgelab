const { readFile } = require('node:fs/promises');
const { dirname, join } = require('node:path');
const { test, expect } = require('@playwright/test');

const chartBundle = join(dirname(require.resolve('chart.js')), 'chart.umd.js');

test.beforeEach(async ({ page }) => {
  // Usa a mesma versão do Chart.js instalada pelo npm ci durante os testes.
  await page.route('https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.js', (route) =>
    route.fulfill({ path: chartBundle, contentType: 'application/javascript' })
  );
  await page.goto('/', { waitUntil: 'domcontentloaded' });
});

test('carrega o exemplo, atualiza a matriz, o gráfico e os pareceres', async ({ page }) => {
  await expect(page.locator('#dispForwardRate')).toHaveText('R$ 5,5110');
  await page.getByRole('button', { name: 'Exemplo Prático' }).click();

  await expect(page.locator('#exposureUSD')).toHaveValue('2500000');
  await expect(page.locator('#dispForwardRate')).toHaveText('R$ 5,5758');
  await expect(page.locator('#scenariosBody tr')).toHaveCount(13);
  await expect(page.locator('#scenariosBody tr.linha-atual')).toContainText('R$ 5,25 (0,0%)');
  await expect(page.locator('#swapAnalysisText')).toContainText('custará um diferencial');
  await expect(page.locator('#executiveOpinionText')).toContainText('A Call só supera o Termo');
  await expect(page.locator('#payoffChart')).toBeVisible();
  const pontosPorSerie = await page.locator('#payoffChart').evaluate((canvas) =>
    window.Chart.getChart(canvas).data.datasets.map((serie) => serie.data.length)
  );
  expect(pontosPorSerie).toEqual([13, 13, 13]);
});

test('mostra o erro para cotação vazia e recalcula depois da correção', async ({ page }) => {
  const cotacao = page.locator('#spotRate');
  const alerta = page.getByRole('alert');
  await cotacao.fill('');
  await page.getByRole('button', { name: 'Calcular & Simular' }).click();
  await expect(alerta).toHaveText('Cotação spot: informe um número.');
  await expect(page.locator('#dispForwardRate')).toHaveText('R$ 5,5110');

  await cotacao.fill('6');
  await cotacao.press('Enter');
  await expect(alerta).toBeHidden();
  await expect(page.locator('#dispForwardRate')).toHaveText('R$ 6,3589');
});

test('exporta o CSV com os dados da simulação atual', async ({ page }) => {
  await page.getByRole('button', { name: 'Exemplo Prático' }).click();
  const downloadPendente = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar CSV (Excel)' }).click();
  const download = await downloadPendente;

  expect(download.suggestedFilename()).toMatch(/^relatorio_hedgelab_\d{4}-\d{2}-\d{2}\.csv$/);
  const csv = await readFile(await download.path(), 'utf8');
  expect(csv.charCodeAt(0)).toBe(0xfeff);
  expect(csv).toContain('Exposição (US$);2500000,00');
  expect(csv).toContain('MATRIZ DE CENÁRIOS');
});
test('mostra economia no swap quando a taxa pré é menor que a flutuante', async ({ page }) => {

  const taxaPre = page.locator('#swapFixedRate');
  await taxaPre.fill('9');
  await taxaPre.press('Enter');

  const analiseSwap = page.locator('#swapAnalysisText');
  await expect(analiseSwap).toContainText('economia de juros de R$');
  await expect(analiseSwap).toContainText('87.500');
  await expect(analiseSwap).toContainText('9,00% a.a.');

  await expect(page.locator('#reportParams')).toContainText('9,00% a.a.');
});
