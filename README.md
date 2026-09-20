# 📈 Otimizador de Mídia & Pesquisa Operacional

Aplicação web desenvolvida para automatizar e otimizar a alocação de orçamento de marketing digital. O sistema utiliza **Programação Linear (Pesquisa Operacional)** para maximizar o retorno em métricas (Visualizações, Alcance, Engajamento) respeitando limites orçamentários e regras táticas de diversificação.

---

## 🎯 Objetivo do Projeto

Substituir modelos manuais baseados em planilhas (como Excel Solver/OpenSolver) por uma plataforma web escalável que permite:
1. **Modelagem Matemática Automática:** Resolução em milissegundos usando algoritmos de otimização em Python.
2. **Diversificação Flexível:** Ajuste mensal do teto máximo de investimento por veículo/influenciador para mitigação de riscos.
3. **Escalabilidade:** Execução via API em nuvem, pronta para integração com dashboards e formulários dinâmicos.

---

## 🔬 Como Funciona a Pesquisa Operacional (Modelagem)

O motor matemático resolve um problema de **Maximização** estruturado da seguinte forma:

* **Variáveis de Decisão:**  
  $X_i$ = Valor em Reais (R$) a ser alocado no Canal/Influenciador $i$.

* **Função Objetivo:**  
  $$\text{Maximizar } Z = \sum (X_i \times \text{Taxa de Retorno}_i)$$  
  *(onde a taxa representa visualizações ou engajamento gerado por cada R$1,00 investido).*

* **Restrições:**
  1. **Orçamento Total:** $\sum X_i \le \text{Orçamento Máximo}$
  2. **Teto de Diversificação:** $X_i \le \text{Orçamento Máximo} \times \left(\frac{\text{Teto \%}}{100}\right), \forall i$
  3. **Não Negatividade:** $X_i \ge 0, \forall i$
