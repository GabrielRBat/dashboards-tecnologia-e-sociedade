# Cálculos do laboratório

Este documento registra **todas as fórmulas** que o sistema aplica, de onde elas
vieram e onde a implementação diverge da planilha original.

As fórmulas foram extraídas lendo diretamente as células da
"Planilha de Registro e cálculo" (aba *planilha de alimentação*, linha 11 —
a única linha com todos os ensaios preenchidos). Cada uma tem teste automatizado
em `apps/api/src/calculos/calculos.spec.ts`, conferido contra os números reais
daquela linha.

---

## 1. Fórmulas mantidas como na planilha

Nestes casos a planilha está correta e o sistema reproduz o mesmo resultado.

| Grandeza | Fórmula | Conferência (linha 11) |
|---|---|---|
| Densidade aparente | `(massa ÷ volume) × 1000` | 630 g ÷ 400,1 cm³ → **1.574,61 kg/m³** ✓ |
| Densidade no estado fresco | `(massa ÷ volume) × 1000` | 678,9 g ÷ 400,1 cm³ → **1.696,83 kg/m³** ✓ |
| Retenção de água | `(1 − (M1 − M2) ÷ (AF × (M1 − M0))) × 100`, com `AF = massa de água ÷ (massa de água + 2500)` | M0 1548,6 / M1 2700,2 / M2 2679,5 / água 400 g → **86,97 %** ✓ |
| Volume do corpo de prova | `média(L1,L2) × média(H1,H2) × média(C1,C2)` | → **265,523175 cm³** ✓ |
| Massa específica do CP | `(massa ÷ volume) × 1000` | 402 g ÷ 265,52 cm³ → **1.513,99 kg/m³** ✓ |
| Médias de resistência | média aritmética dos CPs (3 na flexão, 6 na compressão) | ✓ |
| Squeeze-flow | média das 3 curvas (deslocamento e carga) | 8,5 / 8,4 / 8,3 → **8,40 mm** ✓ |

> O valor **2500 g** na retenção de água é a massa de argamassa seca do ensaio,
> fixa na fórmula da planilha. Está exposta como `MASSA_SECA_PADRAO_G` em
> `calculos.ts` — se o laboratório usar outra massa, é o único lugar a mudar.

---

## 2. Divergências: onde a planilha está errada

Três fórmulas da planilha têm erro. O sistema aplica a versão correta e o
motivo está registrado aqui. **Isso significa que alguns números do dashboard
não vão bater com os da planilha** — a diferença é intencional.

### 2.1 Módulo de elasticidade dinâmico — erro grave

**Na planilha** (colunas 158–160 e 199–201):

```
Ed = ρ × V̄ × [ (1 + ν)(1 − ν) ÷ (1 − ν) ]
```

Dois problemas:

1. **A velocidade não está elevada ao quadrado.** O módulo dinâmico é
   proporcional a `V²`, não a `V`. Como está, o resultado não tem unidade de
   pressão — não é MPa, apesar do rótulo.
2. **O fator de Poisson se cancela.** `(1 + ν)(1 − ν) ÷ (1 − ν)` simplifica
   algebricamente para `(1 + ν)` = 1,2. O termo de Poisson que deveria estar ali
   é `(1 − 2ν)`, não `(1 − ν)`. Ou seja, o coeficiente de Poisson digitado na
   fórmula não tem efeito nenhum sobre o resultado.

**No sistema:**

```
Ed = ρ × V² × [ (1 + ν)(1 − 2ν) ÷ (1 − ν) ]      ν = 0,2  →  fator 0,9
```

com ρ em kg/m³ e V em m/s (as leituras chegam em km/s), resultado em MPa.

| CP 1, 14 dias | Valor |
|---|---|
| Planilha | 8.781 "MPa" |
| Sistema | **31.832 MPa** (31,8 GPa) |

A faixa esperada para argamassas é 10–40 GPa, o que confirma a ordem de grandeza
do valor corrigido. A fórmula antiga continua no código como
`moduloElasticidadeLegadoPlanilha()`, **apenas para conferência** — há um teste
provando que ela reproduz exatamente o 8.781,15 que a planilha exibe hoje, para
que a diferença seja rastreável e não pareça erro de leitura de dados.

**Coeficiente de Poisson:** adotamos ν = 0,2, o valor que estava digitado na
planilha. É um parâmetro da função (`POISSON_PADRAO`), fácil de trocar se o
laboratório usar outro.

### 2.2 Relação água/ligante — invertida

**Na planilha** (coluna 49): `=Soma(J:O) ÷ AT` — ou seja, soma dos ligantes
dividida pelo teor de água. Isso é **ligante/água**, o inverso do rótulo da
coluna.

**No sistema:** `teor de água ÷ soma dos ligantes` (cimentos + cales), a
definição usual.

### 2.3 Densidade média no estado endurecido — inconsistente entre idades

**Na planilha:**

- aos 14 dias (coluna 148): `média(massas) ÷ média(volumes) × 1000`
- aos 28 dias (coluna 189): `média das massas específicas individuais`

São dois métodos diferentes para a mesma grandeza. Dão resultados próximos, mas
diferentes (1.521,985 vs 1.522,040 na linha 11).

**No sistema:** padronizado no primeiro método (massa total ÷ volume total),
que é o correto — pondera pelo volume de cada CP em vez de tratar os três CPs
como se tivessem o mesmo tamanho.

---

## 3. Fórmulas quebradas na planilha (`#NAME?`)

As colunas 49 (relação água/ligante) e 50 (teor de finos) usam `=Soma(...)`.
`Soma` não é um nome de função válido no arquivo — por isso a planilha exibe
`#NAME?` em **todas as linhas**. Esses dois campos nunca chegaram a calcular.

No sistema ambos funcionam, a partir do cadastro de materiais de cada formulação.

---

## 4. Campos que o sistema calcula e a planilha não tinha

| Campo | Para que serve |
|---|---|
| Desvio padrão dos CPs | Mostra a dispersão entre corpos de prova de um mesmo ensaio — uma média de 6 CPs com desvio alto merece desconfiança. |
| Coeficiente de variação | Mesma ideia, em % da média (disponível em `calculos.ts`). |
| Preenchimento (%) | Quantos dos 15 ensaios previstos aquela formulação já tem — mede o quanto o registro está completo. |

---

## 5. Classificações e referências normativas

Ficam em `apps/api/src/calculos/normas.ts`, separadas das fórmulas de ensaio: uma
norma se revisa por conta própria, a fórmula de um ensaio não.

### 5.1 Classes da NBR 13281

Três famílias, sobre valores que o sistema já calcula: resistência à compressão
aos 28 dias (**P1–P6**), densidade de massa no estado fresco (**D1–D6**) e
retenção de água (**U1–U6**).

**As faixas da norma se sobrepõem de propósito.** P2 vai de 1,5 a 3,0 MPa e P3 de
2,5 a 4,5 MPa, porque na norma quem declara a classe do produto é o fabricante.
Um painel precisa de uma regra determinística, então adotamos:

> **Convenção:** a classe é a **mais alta que o valor alcança**. 2,8 MPa é P3,
> não P2.

Isso é decisão deste projeto, não da norma — se o laboratório preferir outra
convenção, muda em `classificar()` e nos testes de `normas.spec.ts`.

### 5.2 Zonas granulométricas da NBR 7211

A norma define, por peneira, os limites de **% retida acumulada** da zona ótima e
da zona utilizável. O gráfico desenha as duas faixas atrás das curvas.

Duas observações:

- A peneira de 9,5 mm tem os quatro limites em zero e por isso não entra — não
  separa uma curva da outra e só encolheria a escala.
- **As peneiras do ensaio e as da norma coincidem só em parte.** A planilha usa
  1,70 · 1,40 · 1,18 · 0,60 · 0,30 · 0,15 · 0,09 mm; a norma, 6,3 · 4,75 · 2,36 ·
  1,18 · 0,60 · 0,30 · 0,15 mm. Por isso o gráfico usa eixo numérico em escala
  logarítmica, e não de categorias: cada série é desenhada na sua própria
  abertura. O fundo (0 mm) fica de fora — não tem lugar numa escala log e a
  acumulada nele é 100% por definição.

### 5.3 Módulo de finura (NBR NM 248)

Soma das % retidas acumuladas nas peneiras da **série normal**, dividida por 100.

> **Atenção ao interpretar:** das peneiras da planilha, só 1,18 · 0,60 · 0,30 ·
> 0,15 mm são da série normal — 1,70 · 1,40 · 0,09 mm não são. O módulo sai
> portanto mais baixo do que sairia num ensaio feito com a série normal
> completa, e **não é comparável** com valores de referência da literatura (a
> zona ótima da NBR 7211 fica entre 2,20 e 2,90). Serve para comparar
> formulações entre si, dentro deste conjunto. Para um módulo comparável, o
> ensaio precisaria incluir as peneiras da série normal.

### 5.4 Correlações entre ensaios

Reta de mínimos quadrados com R², sobre dois pares que a literatura da área usa
para conferir a coerência de um conjunto:

| Correlação | Leitura |
|---|---|
| Flexão × compressão aos 28 dias | Costuma ser forte; R² baixo sugere problema de moldagem ou de ensaio. |
| Módulo de elasticidade × compressão | O módulo vem de ultrassom, ensaio não destrutivo. |

A reta só é traçada com **três pares ou mais**, e nunca quando todos os x são
iguais — nos dois casos ela não diria nada.

---

## 6. Squeeze-flow: o que a planilha não guarda

A NBR 15839 descreve o resultado do squeeze-flow como uma **curva carga ×
deslocamento** com três estágios: deformação elástica, fluxo plástico e
enrijecimento por deformação. É assim que o ensaio aparece publicado.

**Essa curva não pode ser desenhada com os dados de hoje.** A planilha registra
três repetições do ensaio, e de cada uma guarda um único par carga/deslocamento —
não a curva. Por isso o dashboard mostra os pontos, e não os três estágios.

Para ter a curva, o registro precisaria receber os dados brutos do equipamento.
Fica anotado como possibilidade, não como pendência: é decisão do laboratório.

---

## 7. Onde mexer

- Fórmulas de ensaio: `apps/api/src/calculos/calculos.ts` (puras, sem banco).
- Classes e zonas normativas: `apps/api/src/calculos/normas.ts`.
- Testes: `calculos.spec.ts` e `normas.spec.ts` — **qualquer mudança de fórmula
  ou de convenção precisa atualizar o teste correspondente**, que é o que
  garante a rastreabilidade contra a planilha e contra a norma.
- Mapa de colunas da planilha: `apps/api/src/importacao/layout-planilha.ts` —
  se a planilha mudar de layout, é o único arquivo a ajustar.
