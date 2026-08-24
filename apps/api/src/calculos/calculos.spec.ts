import {
  arredondar,
  calcularCorpoDeProva,
  coeficienteVariacao,
  densidade,
  densidadeMediaEndurecida,
  desvioPadrao,
  media,
  moduloElasticidadeDinamico,
  moduloElasticidadeLegadoPlanilha,
  relacaoAguaLigante,
  retencaoAgua,
  teorFinos,
  volumeCorpoDeProva,
} from './calculos';

/**
 * Os valores de referência vêm da linha 11 da aba "planilha de alimentação"
 * (formulação "Argamassa de Revestimento_1"), a única linha da planilha real
 * com todos os ensaios preenchidos.
 */
describe('cálculos de argamassa', () => {
  describe('media / desvioPadrao / coeficienteVariacao', () => {
    it('calcula a média ignorando nulos', () => {
      expect(media([8.5, 8.4, 8.3])).toBeCloseTo(8.4, 10);
      expect(media([8.5, null, 8.3, undefined])).toBeCloseTo(8.4, 10);
    });

    it('retorna null quando não há valores válidos', () => {
      expect(media([])).toBeNull();
      expect(media([null, undefined])).toBeNull();
      expect(media([NaN])).toBeNull();
    });

    it('calcula desvio padrão amostral e exige ao menos dois valores', () => {
      expect(desvioPadrao([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2.13809, 4);
      expect(desvioPadrao([5])).toBeNull();
    });

    it('calcula o coeficiente de variação em %', () => {
      expect(coeficienteVariacao([10, 12, 14])).toBeCloseTo(16.666, 2);
      expect(coeficienteVariacao([0, 0])).toBeNull();
    });
  });

  describe('densidade', () => {
    it('reproduz a densidade aparente da planilha', () => {
      // 630 g / 400,1 cm³ => 1574,61 kg/m³
      expect(densidade(630, 400.1)).toBeCloseTo(1574.6063484, 6);
    });

    it('reproduz a densidade no estado fresco da planilha', () => {
      expect(densidade(678.9, 400.1)).toBeCloseTo(1696.8257936, 6);
    });

    it('protege contra volume zero ou ausente', () => {
      expect(densidade(630, 0)).toBeNull();
      expect(densidade(630, null)).toBeNull();
      expect(densidade(null, 400.1)).toBeNull();
    });
  });

  describe('retencaoAgua', () => {
    it('reproduz o valor da planilha (86,97%)', () => {
      // M0 = 1548,6 | M1 = 2700,2 | M2 = 2679,5 | massa de água = 400 g
      expect(retencaoAgua(1548.6, 2700.2, 2679.5, 400)).toBeCloseTo(
        86.96813129558886,
        8,
      );
    });

    it('retorna null com dados incompletos', () => {
      expect(retencaoAgua(null, 2700.2, 2679.5, 400)).toBeNull();
      expect(retencaoAgua(1548.6, 1548.6, 2679.5, 400)).toBeNull();
    });
  });

  describe('relacaoAguaLigante', () => {
    it('divide o teor de água pelo teor de ligantes', () => {
      expect(relacaoAguaLigante(16, 32)).toBeCloseTo(0.5, 10);
    });

    it('retorna null sem ligantes', () => {
      expect(relacaoAguaLigante(16, 0)).toBeNull();
      expect(relacaoAguaLigante(16, null)).toBeNull();
    });
  });

  describe('teorFinos', () => {
    it('soma os teores informados', () => {
      expect(teorFinos([20, 8, null, 5])).toBeCloseTo(33, 10);
    });

    it('retorna null sem valores', () => {
      expect(teorFinos([null, undefined])).toBeNull();
    });
  });

  describe('volumeCorpoDeProva', () => {
    it('reproduz o volume do CP1 da planilha', () => {
      // média(16,10; 16,00) x média(4,02; 4,05) x média(4,12; 4,08)
      expect(volumeCorpoDeProva(16.1, 16, 4.02, 4.05, 4.12, 4.08)).toBeCloseTo(
        265.523175,
        6,
      );
    });

    it('retorna null com dimensão faltando', () => {
      expect(volumeCorpoDeProva(16.1, 16, null, null, 4.12, 4.08)).toBeNull();
    });
  });

  describe('moduloElasticidadeDinamico', () => {
    it('aplica Ed = rho x V^2 x [(1+v)(1-2v)/(1-v)] e devolve MPa', () => {
      // rho = 1513,99 kg/m³, V média = 4,8333 km/s, v = 0,2 => fator 0,9
      const ed = moduloElasticidadeDinamico(1513.992140234087, [4.59, 4.96, 4.95]);
      expect(ed).not.toBeNull();
      expect(ed as number).toBeCloseTo(31831.6, 0);
    });

    it('fica na faixa esperada para argamassas (10 a 40 GPa)', () => {
      const ed = moduloElasticidadeDinamico(1513.99, [4.59, 4.96, 4.95]) as number;
      expect(ed).toBeGreaterThan(10_000);
      expect(ed).toBeLessThan(40_000);
    });

    it('retorna null sem densidade ou sem leituras', () => {
      expect(moduloElasticidadeDinamico(null, [4.59])).toBeNull();
      expect(moduloElasticidadeDinamico(1513.99, [])).toBeNull();
    });
  });

  describe('moduloElasticidadeLegadoPlanilha', () => {
    it('reproduz exatamente o número que a planilha exibe hoje', () => {
      // Confirma que a divergência é da fórmula da planilha, não de leitura de dados.
      expect(
        moduloElasticidadeLegadoPlanilha(1513.992140234087, [4.59, 4.96, 4.95]),
      ).toBeCloseTo(8781.154413357704, 6);
    });

    it('difere da fórmula correta (a planilha não eleva V ao quadrado)', () => {
      const correto = moduloElasticidadeDinamico(1513.99, [4.59, 4.96, 4.95]);
      const legado = moduloElasticidadeLegadoPlanilha(1513.99, [4.59, 4.96, 4.95]);
      expect(correto).not.toBeCloseTo(legado as number, 0);
    });
  });

  describe('calcularCorpoDeProva', () => {
    it('encadeia volume, massa específica e módulo', () => {
      const cp = calcularCorpoDeProva({
        indice: 1,
        l1: 16.1,
        l2: 16,
        h1: 4.02,
        h2: 4.05,
        c1: 4.12,
        c2: 4.08,
        massa: 402,
        v1: 4.59,
        v2: 4.96,
        v3: 4.95,
      });
      expect(cp.volume).toBeCloseTo(265.523175, 6);
      expect(cp.massaEspecifica).toBeCloseTo(1513.992140234087, 6);
      expect(cp.modulo).not.toBeNull();
    });

    it('devolve nulos quando o CP está vazio', () => {
      const cp = calcularCorpoDeProva({ indice: 1 });
      expect(cp.volume).toBeNull();
      expect(cp.massaEspecifica).toBeNull();
      expect(cp.modulo).toBeNull();
    });
  });

  describe('densidadeMediaEndurecida', () => {
    it('reproduz a média da planilha aos 14 dias (massa total / volume total)', () => {
      const corpos = [
        { indice: 1, massa: 402, volume: 265.523175 },
        { indice: 2, massa: 398, volume: 260.342235 },
        { indice: 3, massa: 395, volume: 259.29321687500004 },
      ].map((c) => ({ ...c, massaEspecifica: null, modulo: null }));
      expect(densidadeMediaEndurecida(corpos)).toBeCloseTo(1521.9854423, 6);
    });

    it('retorna null sem corpos de prova', () => {
      expect(densidadeMediaEndurecida([])).toBeNull();
    });
  });

  describe('arredondar', () => {
    it('arredonda preservando null', () => {
      expect(arredondar(1574.6063484, 2)).toBe(1574.61);
      expect(arredondar(null)).toBeNull();
    });
  });
});
