import {
  CLASSES_COMPRESSAO,
  CLASSES_DENSIDADE,
  CLASSES_RETENCAO,
  classificar,
  moduloFinura,
  regressaoLinear,
  retidaAcumulada,
  ZONAS_NBR7211,
} from './normas';

describe('classificar (NBR 13281)', () => {
  it('classifica a compressão nos degraus da norma', () => {
    expect(classificar(1.0, CLASSES_COMPRESSAO)).toBe('P1');
    expect(classificar(4.2, CLASSES_COMPRESSAO)).toBe('P4');
    expect(classificar(12, CLASSES_COMPRESSAO)).toBe('P6');
  });

  it('nas faixas sobrepostas devolve a classe mais alta que o valor alcança', () => {
    // 2,8 MPa cabe em P2 (1,5–3,0) e em P3 (2,5–4,5); a convenção é a mais alta.
    expect(classificar(2.8, CLASSES_COMPRESSAO)).toBe('P3');
    expect(classificar(5.6, CLASSES_COMPRESSAO)).toBe('P5');
  });

  it('trata o limite inferior como inclusivo', () => {
    expect(classificar(8.0, CLASSES_COMPRESSAO)).toBe('P6');
    expect(classificar(7.99, CLASSES_COMPRESSAO)).toBe('P5');
  });

  it('classifica densidade no estado fresco', () => {
    expect(classificar(1300, CLASSES_DENSIDADE)).toBe('D2');
    expect(classificar(1697, CLASSES_DENSIDADE)).toBe('D4');
    expect(classificar(2500, CLASSES_DENSIDADE)).toBe('D6');
  });

  it('classifica retenção de água', () => {
    expect(classificar(70, CLASSES_RETENCAO)).toBe('U1');
    expect(classificar(86.97, CLASSES_RETENCAO)).toBe('U4');
    expect(classificar(99, CLASSES_RETENCAO)).toBe('U6');
  });

  it('devolve null sem valor', () => {
    expect(classificar(null, CLASSES_COMPRESSAO)).toBeNull();
    expect(classificar(undefined, CLASSES_COMPRESSAO)).toBeNull();
    expect(classificar(Number.NaN, CLASSES_COMPRESSAO)).toBeNull();
  });
});

describe('retidaAcumulada', () => {
  it('acumula da peneira maior para a menor', () => {
    const r = retidaAcumulada([
      { peneiraMm: 1.18, frequencia: 10 },
      { peneiraMm: 0.6, frequencia: 25 },
      { peneiraMm: 0.3, frequencia: 30 },
    ]);

    expect(r.map((p) => p.acumulada)).toEqual([10, 35, 65]);
  });

  it('ordena mesmo recebendo os pontos fora de ordem', () => {
    const r = retidaAcumulada([
      { peneiraMm: 0.3, frequencia: 30 },
      { peneiraMm: 1.18, frequencia: 10 },
      { peneiraMm: 0.6, frequencia: 25 },
    ]);

    expect(r.map((p) => p.peneiraMm)).toEqual([1.18, 0.6, 0.3]);
    expect(r.map((p) => p.acumulada)).toEqual([10, 35, 65]);
  });

  it('não passa de 100 quando as frequências somam mais por arredondamento', () => {
    const r = retidaAcumulada([
      { peneiraMm: 1.18, frequencia: 60 },
      { peneiraMm: 0.6, frequencia: 60 },
    ]);

    expect(r[1]?.acumulada).toBe(100);
  });

  it('devolve lista vazia sem pontos', () => {
    expect(retidaAcumulada([])).toEqual([]);
  });
});

describe('moduloFinura (NBR NM 248)', () => {
  it('soma as retidas acumuladas da série normal e divide por 100', () => {
    // Acumuladas: 4,75 → 5; 2,36 → 20; 1,18 → 40; 0,6 → 65; 0,3 → 85; 0,15 → 95.
    // Soma = 310 → módulo 3,10.
    const mf = moduloFinura([
      { peneiraMm: 4.75, frequencia: 5 },
      { peneiraMm: 2.36, frequencia: 15 },
      { peneiraMm: 1.18, frequencia: 20 },
      { peneiraMm: 0.6, frequencia: 25 },
      { peneiraMm: 0.3, frequencia: 20 },
      { peneiraMm: 0.15, frequencia: 10 },
    ]);

    expect(mf).toBeCloseTo(3.1, 6);
  });

  it('ignora peneiras fora da série normal', () => {
    const comIntrusa = moduloFinura([
      { peneiraMm: 1.18, frequencia: 40 },
      { peneiraMm: 0.09, frequencia: 30 }, // fora da série normal
      { peneiraMm: 0.3, frequencia: 20 },
    ]);

    // Ordem por peneira: 1,18 (acum. 40) · 0,3 (acum. 60) · 0,09 (acum. 90).
    // A de 0,09 mm não é da série normal, então só 40 + 60 = 100 contam → 1,0.
    expect(comIntrusa).toBeCloseTo(1.0, 6);
  });

  it('devolve null sem pontos ou sem peneira da série normal', () => {
    expect(moduloFinura([])).toBeNull();
    expect(moduloFinura([{ peneiraMm: 0.09, frequencia: 50 }])).toBeNull();
  });
});

describe('ZONAS_NBR7211', () => {
  it('mantém os limites em ordem crescente dentro de cada peneira', () => {
    for (const z of ZONAS_NBR7211) {
      expect(z.utilizavelMin).toBeLessThanOrEqual(z.otimaMin);
      expect(z.otimaMin).toBeLessThanOrEqual(z.otimaMax);
      expect(z.otimaMax).toBeLessThanOrEqual(z.utilizavelMax);
    }
  });

  it('vai da peneira maior para a menor', () => {
    const mms = ZONAS_NBR7211.map((z) => z.peneiraMm);
    expect([...mms].sort((a, b) => b - a)).toEqual(mms);
  });
});

describe('regressaoLinear', () => {
  it('recupera exatamente uma reta perfeita', () => {
    const r = regressaoLinear([
      { x: 1, y: 3 },
      { x: 2, y: 5 },
      { x: 3, y: 7 },
    ]);

    expect(r?.a).toBeCloseTo(2, 9);
    expect(r?.b).toBeCloseTo(1, 9);
    expect(r?.r2).toBeCloseTo(1, 9);
    expect(r?.n).toBe(3);
  });

  it('descarta pares incompletos antes de ajustar', () => {
    const r = regressaoLinear([
      { x: 1, y: 3 },
      { x: null, y: 5 },
      { x: 2, y: null },
      { x: 2, y: 5 },
      { x: 3, y: 7 },
    ]);

    expect(r?.n).toBe(3);
    expect(r?.a).toBeCloseTo(2, 9);
  });

  it('devolve R² baixo quando os pontos não seguem reta', () => {
    const r = regressaoLinear([
      { x: 1, y: 10 },
      { x: 2, y: 1 },
      { x: 3, y: 9 },
      { x: 4, y: 2 },
    ]);

    expect(r).not.toBeNull();
    expect(r!.r2).toBeLessThan(0.3);
  });

  it('devolve null com menos de três pares', () => {
    expect(regressaoLinear([{ x: 1, y: 2 }])).toBeNull();
    expect(
      regressaoLinear([
        { x: 1, y: 2 },
        { x: 2, y: 4 },
      ]),
    ).toBeNull();
  });

  it('devolve null quando todos os x são iguais (reta vertical)', () => {
    expect(
      regressaoLinear([
        { x: 2, y: 1 },
        { x: 2, y: 5 },
        { x: 2, y: 9 },
      ]),
    ).toBeNull();
  });

  it('devolve R² = 1 quando y é constante, sem dividir por zero', () => {
    const r = regressaoLinear([
      { x: 1, y: 4 },
      { x: 2, y: 4 },
      { x: 3, y: 4 },
    ]);

    expect(r?.a).toBeCloseTo(0, 9);
    expect(r?.r2).toBe(1);
  });
});
