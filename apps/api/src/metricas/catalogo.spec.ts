import {
  METRICAS,
  METRICAS_POR_CHAVE,
  obterMetrica,
  validarCruzamento,
} from './catalogo';

describe('catálogo de métricas', () => {
  it('não tem chaves repetidas', () => {
    expect(METRICAS_POR_CHAVE.size).toBe(METRICAS.length);
  });

  it('dá unidade a toda métrica contínua que mede algo dimensional', () => {
    const semUnidade = METRICAS.filter(
      (m) => m.natureza === 'continua' && m.unidade === '',
    ).map((m) => m.chave);

    // Relação água/ligante e módulo de finura são adimensionais por definição.
    expect(semUnidade.sort()).toEqual(['moduloFinura', 'relacaoAguaLigante']);
  });

  it('só publica métricas de nível formulação', () => {
    expect(METRICAS.every((m) => m.nivel === 'formulacao')).toBe(true);
  });

  it('encontra métrica por chave e devolve undefined para chave inventada', () => {
    expect(obterMetrica('retencaoAgua')?.rotulo).toBe('Retenção de água');
    expect(obterMetrica('nao-existe')).toBeUndefined();
  });
});

describe('validarCruzamento — dispersão', () => {
  it('aceita duas medidas contínuas diferentes', () => {
    const r = validarCruzamento('dispersao', 'relacaoAguaLigante', 'compressao28d');
    expect(r.valido).toBe(true);
    expect(r.motivo).toBeUndefined();
  });

  it('recusa categórica num dos eixos e aponta o gráfico certo', () => {
    const r = validarCruzamento('dispersao', 'tipoProjeto', 'compressao28d');
    expect(r.valido).toBe(false);
    expect(r.motivo).toMatch(/Barras por categoria/);
  });

  it('recusa a mesma métrica nos dois eixos', () => {
    const r = validarCruzamento('dispersao', 'compressao28d', 'compressao28d');
    expect(r.valido).toBe(false);
    expect(r.motivo).toMatch(/reta perfeita/);
  });

  it('exige o eixo vertical', () => {
    expect(validarCruzamento('dispersao', 'compressao28d').valido).toBe(false);
    expect(validarCruzamento('dispersao', 'compressao28d', null).valido).toBe(
      false,
    );
  });

  it('alerta ao cruzar idades diferentes do mesmo ensaio, sem bloquear', () => {
    const r = validarCruzamento('dispersao', 'compressao3d', 'compressao28d');
    expect(r.valido).toBe(true);
    expect(r.alerta).toMatch(/idades diferentes/);
  });

  it('não alerta quando as idades coincidem', () => {
    const r = validarCruzamento('dispersao', 'compressao28d', 'flexao28d');
    expect(r.valido).toBe(true);
    expect(r.alerta).toBeUndefined();
  });

  it('recusa métrica inexistente', () => {
    const r = validarCruzamento('dispersao', 'inventada', 'compressao28d');
    expect(r.valido).toBe(false);
    expect(r.motivo).toMatch(/desconhecida/);
  });
});

describe('validarCruzamento — barras', () => {
  it('aceita categoria no x e medida contínua no y', () => {
    const r = validarCruzamento('barras', 'tipoProjeto', 'compressao28d');
    expect(r.valido).toBe(true);
  });

  it('recusa medida contínua no eixo das categorias', () => {
    const r = validarCruzamento('barras', 'compressao28d', 'retencaoAgua');
    expect(r.valido).toBe(false);
    expect(r.motivo).toMatch(/não forma grupos/);
  });

  it('recusa categórica no y, onde é preciso resumir uma medida', () => {
    const r = validarCruzamento('barras', 'tipoProjeto', 'origem');
    expect(r.valido).toBe(false);
    expect(r.motivo).toMatch(/classifica, não mede/);
  });

  it('aceita classe da norma como categoria', () => {
    expect(validarCruzamento('barras', 'classeCompressao', 'retencaoAgua').valido).toBe(
      true,
    );
  });
});

describe('validarCruzamento — distribuição', () => {
  it('aceita contínua e categórica, sem exigir eixo vertical', () => {
    expect(validarCruzamento('distribuicao', 'compressao28d').valido).toBe(true);
    expect(validarCruzamento('distribuicao', 'tipoProjeto').valido).toBe(true);
  });

  it('recusa métrica inexistente', () => {
    expect(validarCruzamento('distribuicao', 'inventada').valido).toBe(false);
  });
});

describe('validarCruzamento — tipo desconhecido', () => {
  it('recusa em vez de deixar passar', () => {
    const r = validarCruzamento(
      'pizza' as never,
      'compressao28d',
      'retencaoAgua',
    );
    expect(r.valido).toBe(false);
    expect(r.motivo).toMatch(/desconhecido/);
  });
});
