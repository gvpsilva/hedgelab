# HedgeLab

Simulador web de gestão de riscos financeiros: compara estratégias de **hedge cambial** (contrato a termo e opção de compra) e analisa um **swap de taxa de juros**.



## Integrantes
Estêvão Felipe da Fonseca  
Gabriel Vieira Pereira da Silva

## Sobre o sistema

Uma empresa importadora tem uma dívida em dólar a pagar no futuro e uma dívida em reais indexada a juros flutuantes (CDI). O HedgeLab ajuda a decidir como se proteger, comparando três estratégias para o risco cambial e uma para o risco de juros:

| Estratégia | Como funciona |
|---|---|
| **Sem hedge** | Paga o dólar do dia do vencimento (fica exposta à variação do câmbio). |
| **Contrato a termo (forward)** | Trava hoje a taxa futura do dólar, calculada pela paridade coberta de juros. |
| **Opção de compra (call)** | Paga um prêmio e garante um preço máximo (strike); se o dólar cair, aproveita a queda. |
| **Swap de juros** | Troca a taxa flutuante da dívida por uma taxa pré-fixada. |

**Funcionalidades**

- Formulário com 9 parâmetros de mercado, validação de campos vazios e fora dos limites;
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

**Organização do código** (`public/js`), em módulos com responsabilidades separadas:

| Arquivo | Responsabilidade |
|---|---|
| `formatacao.js` | Formatação de valores no padrão brasileiro (R$, vírgula decimal, percentuais). |
| `calculos.js` | Modelos financeiros puros: forward, opção, swap, cenários e validação. |
| `relatorio.js` | Geração dos textos, linhas da tabela e do arquivo CSV. |
| `app.js` | Única camada que acessa a página: captura os dados e exibe os relatórios. |

Separar os cálculos da interface permite testar quase todo o sistema com testes unitários rápidos, sem navegador.

### Uso de ferramentas de Inteligência Artificial

Durante o desenvolvimento, foram utilizadas ferramentas de Inteligência Artificial como apoio às atividades de programação, revisão de código, elaboração de testes e documentação.

A equipe foi responsável pela definição dos requisitos, validação das funcionalidades, conferência dos cálculos financeiros, revisão dos resultados e decisões de implementação, assegurando a adequação da solução aos objetivos da disciplina.


## Execução dos testes


Com Node.js 20 ou superior, instale as dependências com `npm ci`.

- `npm run test:coverage` executa os testes unitários e exige 80% de cobertura global de instruções, ramificações, funções e linhas.
- `npx playwright install chromium` instala o navegador. No Linux, use `npx playwright install --with-deps chromium` para instalar também as dependências do sistema.
- `npm run test:e2e` inicia o servidor local e testa a simulação, a validação do formulário, o gráfico e a exportação em CSV.

## CI/CD e releases



**Configuração (uma única vez)**

1. Na Vercel, importe o repositório (Add New → Project) para criar o projeto.
2. Crie um token em *Account Settings → Tokens*.
3. Obtenha os IDs: rode `npx vercel login` e `npx vercel link` na pasta do projeto; os valores `orgId` e `projectId` ficam em `.vercel/project.json`.
4. No GitHub, em *Settings → Secrets and variables → Actions*, cadastre os segredos `VERCEL_TOKEN`, `VERCEL_ORG_ID` e `VERCEL_PROJECT_ID`.

O `vercel.json` desliga o deploy automático da integração Git da Vercel (`git.deploymentEnabled: false`), para que só o GitHub Actions publique, e sempre depois dos testes.
