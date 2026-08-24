import {
  TAMANHO_MINIMO_SENHA,
  conferirSenha,
  emailPareceValido,
  gerarHash,
  identificadorValido,
  normalizarEmail,
  validarSenha,
} from './senhas';

describe('gerarHash / conferirSenha', () => {
  // bcrypt com custo 12 é lento de propósito; o padrão de 5s do Jest não basta.
  jest.setTimeout(30000);

  it('confere a senha correta', async () => {
    const hash = await gerarHash('umaSenhaBoaAqui');
    await expect(conferirSenha('umaSenhaBoaAqui', hash)).resolves.toBe(true);
  });

  it('recusa senha errada', async () => {
    const hash = await gerarHash('umaSenhaBoaAqui');
    await expect(conferirSenha('umaSenhaBoaAquj', hash)).resolves.toBe(false);
  });

  it('nunca guarda a senha em texto no hash', async () => {
    const hash = await gerarHash('umaSenhaBoaAqui');
    expect(hash).not.toContain('umaSenhaBoaAqui');
    expect(hash.startsWith('$2')).toBe(true);
  });

  it('gera hashes diferentes para a mesma senha', async () => {
    // Salt por hash: sem isso, duas pessoas com a mesma senha teriam o mesmo
    // registro, e um vazamento revelaria isso de imediato.
    const a = await gerarHash('umaSenhaBoaAqui');
    const b = await gerarHash('umaSenhaBoaAqui');
    expect(a).not.toBe(b);
    await expect(conferirSenha('umaSenhaBoaAqui', b)).resolves.toBe(true);
  });
});

describe('validarSenha', () => {
  it('aceita senha com o comprimento mínimo', () => {
    expect(validarSenha('a'.repeat(TAMANHO_MINIMO_SENHA))).toBeNull();
    expect(validarSenha('uma frase longa como senha')).toBeNull();
  });

  it('recusa senha curta demais', () => {
    expect(validarSenha('curta')).toMatch(/pelo menos/);
    expect(validarSenha('a'.repeat(TAMANHO_MINIMO_SENHA - 1))).toMatch(/pelo menos/);
  });

  it('recusa vazio e tipos que não são texto', () => {
    expect(validarSenha('')).toMatch(/Informe/);
    expect(validarSenha(undefined)).toMatch(/Informe/);
    expect(validarSenha(null)).toMatch(/Informe/);
    expect(validarSenha(12345678901)).toMatch(/Informe/);
  });

  it('recusa espaço nas pontas, que quase sempre é erro de digitação', () => {
    expect(validarSenha(' senhaComEspaco ')).toMatch(/espaço/);
  });

  it('recusa acima de 72 bytes, o limite que o bcrypt trunca em silêncio', () => {
    expect(validarSenha('a'.repeat(72))).toBeNull();
    expect(validarSenha('a'.repeat(73))).toMatch(/no máximo/);
  });

  it('conta bytes, não caracteres, em senha com acento', () => {
    // 'á' ocupa 2 bytes em UTF-8: 40 desses passam de 72 bytes.
    expect(validarSenha('á'.repeat(40))).toMatch(/no máximo/);
    expect(validarSenha('á'.repeat(30))).toBeNull();
  });
});

describe('normalizarEmail', () => {
  it('baixa a caixa e tira espaços', () => {
    expect(normalizarEmail('  Fulano@Empresa.COM.BR ')).toBe(
      'fulano@empresa.com.br',
    );
  });
});

describe('emailPareceValido', () => {
  it('aceita endereços comuns', () => {
    expect(emailPareceValido('pessoa@laboratorio.com.br')).toBe(true);
    expect(emailPareceValido('a.b+c@d.co')).toBe(true);
  });

  it('recusa o que claramente não é e-mail', () => {
    expect(emailPareceValido('sem-arroba')).toBe(false);
    expect(emailPareceValido('sem@dominio')).toBe(false);
    expect(emailPareceValido('com espaco@dominio.com')).toBe(false);
    expect(emailPareceValido('')).toBe(false);
  });
});

describe('identificadorValido', () => {
  it('aceita e-mail', () => {
    expect(identificadorValido('pessoa@exemplo.com')).toBe(true);
  });

  it('aceita nome de usuário simples, usado pelos comandos de terminal', () => {
    expect(identificadorValido('admin')).toBe(true);
    expect(identificadorValido('lab.tecnica')).toBe(true);
    expect(identificadorValido('conta_de-servico')).toBe(true);
  });

  it('recusa o que não serve como identificador', () => {
    expect(identificadorValido('ab')).toBe(false); // curto demais
    expect(identificadorValido('com espaço')).toBe(false);
    expect(identificadorValido('Maiuscula')).toBe(false); // normalize antes
    expect(identificadorValido('')).toBe(false);
  });
});
