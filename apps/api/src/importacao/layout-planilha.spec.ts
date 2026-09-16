import {
  COL,
  COMPRESSAO_PLANILHA,
  ENDURECIDO_PLANILHA,
  FLEXAO_PLANILHA,
  GRANULOMETRIA_PLANILHA,
  MATERIAIS_PLANILHA,
} from './layout-planilha';

describe('layout da planilha de alimentação', () => {
  it('mantém a composição nas colunas originais e lê água a partir da versão atual', () => {
    expect(MATERIAIS_PLANILHA[0]?.coluna).toBe(10);
    expect(MATERIAIS_PLANILHA.at(-1)?.coluna).toBe(45);

    expect(COL.teorAgua).toBe(49);
    expect(COL.massaAgua).toBe(50);
    expect(COL.comentarios).toBe(51);
  });

  it('pula as colunas calculadas antes e entre os blocos de ensaio', () => {
    expect(GRANULOMETRIA_PLANILHA.map((g) => g.coluna)).toEqual([
      54, 55, 56, 57, 58, 59, 60, 61,
    ]);

    expect(COL.densAparenteMassa).toBe(62);
    expect(COL.densAparenteVolume).toBe(63);
    expect(COL.retencaoM0).toBe(65);
    expect(COL.retencaoM1).toBe(66);
    expect(COL.retencaoM2).toBe(67);
    expect(COL.densFrescoMassa).toBe(69);
    expect(COL.densFrescoVolume).toBe(70);
    expect(COL.squeezeDeslocamento).toEqual([72, 73, 74]);
    expect(COL.squeezeCarga).toEqual([76, 77, 78]);
  });

  it('lê só corpos de prova, sem as médias calculadas da planilha', () => {
    expect(FLEXAO_PLANILHA.map((f) => f.colunas)).toEqual([
      [80, 81, 82],
      [84, 85, 86],
      [88, 89, 90],
      [92, 93, 94],
    ]);

    expect(COMPRESSAO_PLANILHA.map((c) => c.colunas)).toEqual([
      [96, 97, 98, 99, 100, 101],
      [103, 104, 105, 106, 107, 108],
      [110, 111, 112, 113, 114, 115],
      [117, 118, 119, 120, 121, 122],
    ]);
  });

  it('mantém o deslocamento de três colunas no estado endurecido', () => {
    expect(ENDURECIDO_PLANILHA[0]?.corpos[0]).toMatchObject({
      indice: 1,
      dimensoes: [124, 125, 126, 127, 128, 129],
      massa: 145,
      velocidades: [152, 153, 154],
    });
    expect(ENDURECIDO_PLANILHA[1]?.corpos[2]).toMatchObject({
      indice: 3,
      dimensoes: [177, 178, 179, 180, 181, 182],
      massa: 188,
      velocidades: [199, 200, 201],
    });
  });
});
