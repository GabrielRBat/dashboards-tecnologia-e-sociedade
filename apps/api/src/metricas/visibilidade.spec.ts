import {
  DashboardParaAcesso,
  QuemPergunta,
  motivoSemAcesso,
  podeEditar,
  podeVer,
} from './visibilidade';

const AUTOR = 'u-autor';
const OUTRO = 'u-outro';

const membro = (grupos: string[] = [], id = OUTRO): QuemPergunta => ({
  id,
  papel: 'MEMBRO',
  grupos,
});
const admin = (id = 'u-admin'): QuemPergunta => ({ id, papel: 'ADMIN', grupos: [] });

const dash = (
  visibilidade: DashboardParaAcesso['visibilidade'],
  grupos: string[] = [],
  criadoPor: string | null = AUTOR,
): DashboardParaAcesso => ({ criadoPor, visibilidade, grupos });

describe('podeVer', () => {
  it('TODOS: qualquer pessoa autenticada vê', () => {
    expect(podeVer(dash('TODOS'), membro())).toBe(true);
    expect(podeVer(dash('TODOS'), membro(['g1']))).toBe(true);
  });

  it('PRIVADO: só quem criou', () => {
    expect(podeVer(dash('PRIVADO'), membro([], AUTOR))).toBe(true);
    expect(podeVer(dash('PRIVADO'), membro())).toBe(false);
    expect(podeVer(dash('PRIVADO'), membro(['g1', 'g2']))).toBe(false);
  });

  it('GRUPOS: vê quem está em pelo menos um dos grupos marcados', () => {
    const d = dash('GRUPOS', ['g1', 'g2']);
    expect(podeVer(d, membro(['g1']))).toBe(true);
    expect(podeVer(d, membro(['g2', 'g9']))).toBe(true);
    expect(podeVer(d, membro(['g9']))).toBe(false);
    expect(podeVer(d, membro([]))).toBe(false);
  });

  it('GRUPOS sem nenhum grupo marcado não vira "todos"', () => {
    // O engano perigoso: um campo esquecido publicaria o painel para a equipe.
    const d = dash('GRUPOS', []);
    expect(podeVer(d, membro(['g1']))).toBe(false);
    expect(podeVer(d, membro([]))).toBe(false);
    // O autor continua vendo o que é dele.
    expect(podeVer(d, membro([], AUTOR))).toBe(true);
  });

  it('quem criou vê sempre, mesmo fora dos grupos que escolheu', () => {
    expect(podeVer(dash('GRUPOS', ['g1']), membro([], AUTOR))).toBe(true);
    expect(podeVer(dash('PRIVADO'), membro([], AUTOR))).toBe(true);
  });

  it('administrador vê tudo', () => {
    expect(podeVer(dash('PRIVADO'), admin())).toBe(true);
    expect(podeVer(dash('GRUPOS', []), admin())).toBe(true);
    expect(podeVer(dash('GRUPOS', ['g1']), admin())).toBe(true);
  });

  it('dashboard sem autor segue a visibilidade', () => {
    expect(podeVer(dash('TODOS', [], null), membro())).toBe(true);
    expect(podeVer(dash('PRIVADO', [], null), membro())).toBe(false);
    expect(podeVer(dash('PRIVADO', [], null), admin())).toBe(true);
  });

  it('visibilidade desconhecida é negada, não liberada', () => {
    const estranho = { criadoPor: null, visibilidade: 'QUALQUER', grupos: [] };
    expect(podeVer(estranho as never, membro(['g1']))).toBe(false);
  });
});

describe('podeEditar', () => {
  it('quem criou edita', () => {
    expect(podeEditar(dash('TODOS'), membro([], AUTOR))).toBe(true);
  });

  it('quem só enxerga não edita', () => {
    // Ver não dá direito de mudar para todo mundo.
    expect(podeEditar(dash('TODOS'), membro())).toBe(false);
    expect(podeEditar(dash('GRUPOS', ['g1']), membro(['g1']))).toBe(false);
  });

  it('administrador edita tudo', () => {
    expect(podeEditar(dash('PRIVADO'), admin())).toBe(true);
  });

  it('dashboard sem autor é editável por quem o vê', () => {
    // São os anteriores ao login: não há dono, e travá-los tiraria da equipe
    // algo que hoje é dela.
    expect(podeEditar(dash('TODOS', [], null), membro())).toBe(true);
    expect(podeEditar(dash('GRUPOS', ['g1'], null), membro(['g1']))).toBe(true);
    expect(podeEditar(dash('GRUPOS', ['g1'], null), membro(['g9']))).toBe(false);
    expect(podeEditar(dash('PRIVADO', [], null), membro())).toBe(false);
  });
});

describe('motivoSemAcesso', () => {
  it('explica o caso do grupo vazio, que confunde', () => {
    expect(motivoSemAcesso(dash('GRUPOS', []))).toMatch(/nenhum grupo foi escolhido/);
  });

  it('explica privado e grupos', () => {
    expect(motivoSemAcesso(dash('PRIVADO'))).toMatch(/particular/);
    expect(motivoSemAcesso(dash('GRUPOS', ['g1']))).toMatch(/alguns grupos/);
  });
});
