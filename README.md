# HedgeLab

Simulador web de gestão de riscos financeiros: compara estratégias de **hedge cambial** (contrato a termo e opção de compra) e analisa um **swap de taxa de juros**.



## Integrantes


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
