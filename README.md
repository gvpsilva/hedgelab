# HedgeLab
 
Simulador web de gestão de riscos financeiros: compara estratégias de **hedge cambial** (contrato a termo e opção de compra) e analisa um **swap de taxa de juros**.
 
[![CI/CD](https://github.com/gvpsilva/hedgelab/actions/workflows/ci.yml/badge.svg)](https://github.com/gvpsilva/hedgelab/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/gvpsilva/hedgelab)](https://github.com/gvpsilva/hedgelab/releases)
 
**Sistema em produção:** https://hedgelab-smoky.vercel.app/
 
---
 
## Integrantes
 
- Estêvão Felipe da Fonseca
- Gabriel Vieira Pereira da Silva
## Sobre o sistema
 
Uma empresa importadora tem uma dívida em dólar a pagar no futuro e uma dívida em reais indexada a juros flutuantes (CDI). O HedgeLab ajuda a decidir como se proteger, comparando três estratégias para o risco cambial e uma para o risco de juros:
 
| Estratégia | Como funciona |
|---|---|
| **Sem hedge** | Paga o dólar do dia do vencimento (fica exposta à variação do câmbio). |
| **Contrato a termo (forward)** | Trava hoje a taxa futura do dólar, calculada pela paridade coberta de juros. |
| **Opção de compra (call)** | Paga um prêmio e garante um preço máximo (strike); se o dólar cair, aproveita a queda. |
| **Swap de juros** | Troca a taxa flutuante da dívida por uma taxa pré-fixada. |
 
### Funcionalidades
 
- Formulário com 9 parâmetros de mercado e validação de campos vazios ou fora dos limites;
- Botão **Exemplo Prático**, que carrega um caso pronto;
- Indicadores: taxa a termo, custo travado no termo e custo máximo com a opção;
- Gráfico de payoff interativo das três estratégias;
- Matriz com 13 cenários de câmbio (de -25% a +35%) indicando a estratégia mais barata em cada um;
- Análise do swap e parecer técnico gerados automaticamente;
- Relatórios de saída: **exportação para CSV** (abre no Excel) e **impressão/PDF**.
## Tecnologias
 
| Tecnologia | Uso no projeto |
|---|---|
| **HTML, CSS e JavaScript** (sem frameworks) | Interface e lógica da aplicação, que roda inteira no navegador. |
| **Chart.js** | Biblioteca de gráficos usada no gráfico de payoff. |
| **Node.js** | Ambiente para rodar os testes e o servidor local (`scripts/servidor.js`). |
| **Jest + jsdom** | Testes unitários e medição de cobertura (Istanbul, embutido no Jest). O jsdom simula a página para testar a camada de interface. |
| **Playwright** | Testes end-to-end em navegador real (Chromium). |
| **GitHub Actions** | CI/CD: testes e cobertura em Linux, macOS e Windows a cada commit; deploy na Vercel e geração de release quando a `main` muda. |
| **Vercel** | Hospedagem em produção (plano gratuito Hobby). O deploy é feito pelo GitHub Actions com a Vercel CLI, só depois que os testes passam (configuração em `vercel.json`). |
 
### Organização do código
 
O código da aplicação (`public/js`) é dividido em módulos com responsabilidades separadas:
 
| Arquivo | Responsabilidade |
|---|---|
| `formatacao.js` | Formatação de valores no padrão brasileiro (R$, vírgula decimal, percentuais). |
| `calculos.js` | Modelos financeiros puros: forward, opção, swap, cenários e validação. |
| `relatorio.js` | Geração dos textos, das linhas da tabela e do arquivo CSV. |
| `app.js` | Única camada que acessa a página: captura os dados e exibe os relatórios. |
 
Separar os cálculos da interface permite testar quase todo o sistema com testes unitários rápidos, sem navegador.
 
## Uso de IA

Foram utilizadas as ferramentas **Claude (Anthropic)** e **Codex (OpenAI)**. O Claude apoiou a construção do simulador, a escrita dos testes unitários e e2e, a configuração do CI/CD e do deploy na Vercel e a documentação. O Codex foi usado em correções no workflow de CI/CD e na criação de testes adicionais.

A equipe definiu os requisitos, validou as funcionalidades, conferiu os cálculos financeiros e revisou os resultados, garantindo a adequação da solução aos objetivos da disciplina.

## Execução dos testes
 
**Pré-requisito:** [Node.js](https://nodejs.org/) 20 ou superior.
 
```bash
# 1. Instalar as dependências
npm ci
 
# 2. Testes unitários
npm test
 
# 3. Testes unitários com cobertura (mínimo de 80% de instruções, ramos, funções e linhas)
npm run test:coverage
#    -> relatório detalhado em coverage/index.html
 
# 4. Testes end-to-end (Playwright)
npx playwright install chromium   # apenas na primeira vez; no Linux use: --with-deps chromium
npm run test:e2e
```
 
Para abrir o sistema localmente: `npm start` e acessar http://localhost:4173.
 
### Resumo dos testes
 
| Tipo | Quantidade | Onde |
|---|---|---|
| Unitários | 30 | `tests/unit/` |
| End-to-end | 5 | `tests/e2e/simulacao.spec.js` |
| Cobertura | 96,8% das linhas e 81,5% dos ramos | Mínimo de 80% verificado automaticamente (`jest.config.js`) |
 
**Testes unitários por arquivo**
 
| Arquivo | Testes | O que cobre |
|---|---|---|
| `calculos.test.js` | 14 | Taxa a termo, custo da call, swap, cenários e validação dos parâmetros. |
| `complementares.test.js` | 9 | Casos-limite da formatação, da paridade de juros, da opção e da validação. |
| `relatorio.test.js` | 4 | Formatação, matriz de cenários, pareceres e arquivo CSV. |
| `app.test.js` | 3 | Interface: formulário, gráfico, exportação do CSV e impressão. |
 
**Testes end-to-end**
 
1. Carrega o exemplo, atualiza a matriz, o gráfico e os pareceres;
2. Mostra o erro para cotação vazia e recalcula depois da correção;
3. Exporta o CSV com os dados da simulação atual;
4. Mostra economia no swap quando a taxa pré é menor que a flutuante;
5. Imprime o relatório sem o formulário e com os parâmetros usados.
## CI/CD e releases
 
O workflow `.github/workflows/ci.yml` tem três etapas. Cada uma só roda se a anterior passar:
 
| Etapa | Quando roda | O que faz |
|---|---|---|
| **1. Testes** | Todo push e pull request | Testes unitários com cobertura e testes e2e em Linux, macOS e Windows. |
| **2. Deploy** | Push na `main` com os testes aprovados | Publica o site em produção na Vercel, usando a Vercel CLI. |
| **3. Release** | Depois do deploy | Cria uma release no GitHub (ex.: `v1.0.42`) com as notas geradas a partir dos commits, o endereço de produção, o site empacotado e o relatório de cobertura. |
 
A versão da release usa o `MAJOR.MINOR` do `package.json` mais o número da execução do workflow. Para lançar a versão 1.1, basta mudar `"version"` no `package.json` para `1.1.0`.
 
> **Por que o deploy é feito pelo GitHub Actions?**
> O `vercel.json` desliga o deploy automático da integração Git da Vercel (`git.deploymentEnabled: false`). Assim, só o GitHub Actions publica, e sempre depois de os testes passarem nos três sistemas operacionais. Uma versão com defeito não chega à produção.
 
### Configuração do deploy (uma única vez)
 
1. **Criar o projeto na Vercel:** em *Add New → Project*, importe o repositório `gvpsilva/hedgelab`.
2. **Criar o token:** em *Account Settings → Tokens → Create*, gere um token e copie o valor (ele só é exibido uma vez).
3. **Obter os IDs do projeto:** rode `npx vercel login` e `npx vercel link` na pasta do projeto. Os valores `orgId` (`team_...`) e `projectId` (`prj_...`) ficam em `.vercel/project.json`. Essa pasta está no `.gitignore` e não deve ir para o repositório.
4. **Cadastrar os segredos no GitHub:** em *Settings → Secrets and variables → Actions → New repository secret*, crie:
   | Segredo | Valor |
   |---|---|
   | `VERCEL_TOKEN` | Token criado no passo 2 |
   | `VERCEL_ORG_ID` | `orgId` do passo 3 |
   | `VERCEL_PROJECT_ID` | `projectId` do passo 3 |
## Estrutura do repositório
 
```
hedgelab/
├── public/                  # Site publicado em produção
│   ├── index.html
│   ├── favicon.svg
│   ├── css/style.css
│   └── js/                  # formatacao, calculos, relatorio, app
├── tests/
│   ├── unit/                # Testes unitários (Jest)
│   └── e2e/                 # Testes end-to-end (Playwright)
├── scripts/servidor.js      # Servidor local
├── .github/workflows/ci.yml # CI/CD
├── jest.config.js
├── playwright.config.js
└── vercel.json              # Configuração do deploy na Vercel
```

 
