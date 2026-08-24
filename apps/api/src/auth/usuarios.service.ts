import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DB, Database } from '../db/db.module';
import { usuarios } from '../db/schema';
import {
  conferirSenha,
  emailPareceValido,
  gerarHash,
  normalizarEmail,
  validarSenha,
} from './senhas';

export type Papel = 'ADMIN' | 'MEMBRO';

/** Usuário sem o hash da senha — é o que sai da API, sempre. */
export interface UsuarioPublico {
  id: string;
  nome: string;
  email: string;
  papel: Papel;
  ativo: boolean;
  precisaTrocarSenha: boolean;
  ultimoAcessoEm: string | null;
  criadoEm: string;
}

type LinhaUsuario = typeof usuarios.$inferSelect;

/**
 * Tira o hash antes de devolver.
 *
 * Toda saída passa por aqui. Montar o objeto de resposta à mão em cada lugar é
 * como o hash acaba vazando num endpoint esquecido.
 */
function publico(u: LinhaUsuario): UsuarioPublico {
  return {
    id: u.id,
    nome: u.nome,
    email: u.email,
    papel: u.papel,
    ativo: u.ativo,
    precisaTrocarSenha: u.precisaTrocarSenha,
    ultimoAcessoEm: u.ultimoAcessoEm ? u.ultimoAcessoEm.toISOString() : null,
    criadoEm: u.criadoEm.toISOString(),
  };
}

@Injectable()
export class UsuariosService {
  constructor(@Inject(DB) private readonly db: Database) {}

  async listar(): Promise<UsuarioPublico[]> {
    const linhas = await this.db.select().from(usuarios);
    return linhas
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
      .map(publico);
  }

  async obter(id: string): Promise<UsuarioPublico> {
    const u = await this.buscarPorId(id);
    if (!u) throw new NotFoundException('Usuário não encontrado.');
    return publico(u);
  }

  async buscarPorId(id: string): Promise<LinhaUsuario | undefined> {
    const [linha] = await this.db
      .select()
      .from(usuarios)
      .where(eq(usuarios.id, id));
    return linha;
  }

  async buscarPorEmail(email: string): Promise<LinhaUsuario | undefined> {
    const [linha] = await this.db
      .select()
      .from(usuarios)
      .where(eq(usuarios.email, normalizarEmail(email)));
    return linha;
  }

  async quantos(): Promise<number> {
    const linhas = await this.db.select({ id: usuarios.id }).from(usuarios);
    return linhas.length;
  }

  async criar(dados: {
    nome: string;
    email: string;
    senha: string;
    papel?: Papel;
    precisaTrocarSenha?: boolean;
  }): Promise<UsuarioPublico> {
    const nome = dados.nome?.trim();
    if (!nome) throw new BadRequestException('Informe o nome.');

    const email = normalizarEmail(dados.email ?? '');
    if (!emailPareceValido(email)) {
      throw new BadRequestException('Informe um e-mail válido.');
    }

    const problema = validarSenha(dados.senha);
    if (problema) throw new BadRequestException(problema);

    if (await this.buscarPorEmail(email)) {
      throw new ConflictException('Já existe um usuário com esse e-mail.');
    }

    const [criado] = await this.db
      .insert(usuarios)
      .values({
        nome,
        email,
        senhaHash: await gerarHash(dados.senha),
        papel: dados.papel ?? 'MEMBRO',
        precisaTrocarSenha: dados.precisaTrocarSenha ?? false,
      })
      .returning();

    return publico(criado as LinhaUsuario);
  }

  async atualizar(
    id: string,
    dados: { nome?: string; papel?: Papel; ativo?: boolean },
  ): Promise<UsuarioPublico> {
    const atual = await this.buscarPorId(id);
    if (!atual) throw new NotFoundException('Usuário não encontrado.');

    const campos: Record<string, unknown> = { atualizadoEm: new Date() };
    if (dados.nome !== undefined) {
      const nome = dados.nome.trim();
      if (!nome) throw new BadRequestException('O nome não pode ficar vazio.');
      campos.nome = nome;
    }
    if (dados.papel !== undefined) campos.papel = dados.papel;
    if (dados.ativo !== undefined) campos.ativo = dados.ativo;

    /*
     * Rebaixar ou desativar o último administrador deixaria o sistema sem
     * ninguém capaz de criar contas — e sem caminho de volta pela interface.
     */
    const perdeAdmin =
      atual.papel === 'ADMIN' &&
      ((dados.papel !== undefined && dados.papel !== 'ADMIN') ||
        dados.ativo === false);

    if (perdeAdmin && (await this.contarAdminsAtivos()) <= 1) {
      throw new BadRequestException(
        'Este é o único administrador ativo. Promova outra pessoa antes de mudar este acesso.',
      );
    }

    const [atualizado] = await this.db
      .update(usuarios)
      .set(campos)
      .where(eq(usuarios.id, id))
      .returning();

    return publico(atualizado as LinhaUsuario);
  }

  /**
   * Troca de senha pelo próprio dono, conferindo a senha atual.
   *
   * Pedir a senha atual não é burocracia: sem isso, quem pegar uma sessão aberta
   * troca a senha e toma a conta de vez.
   */
  async trocarSenha(
    id: string,
    senhaAtual: string,
    senhaNova: string,
  ): Promise<{ trocada: true }> {
    const u = await this.buscarPorId(id);
    if (!u) throw new NotFoundException('Usuário não encontrado.');

    const confere = await conferirSenha(senhaAtual ?? '', u.senhaHash);
    if (!confere) throw new BadRequestException('A senha atual está incorreta.');

    const problema = validarSenha(senhaNova);
    if (problema) throw new BadRequestException(problema);

    if (await conferirSenha(senhaNova, u.senhaHash)) {
      throw new BadRequestException('A senha nova precisa ser diferente da atual.');
    }

    await this.db
      .update(usuarios)
      .set({
        senhaHash: await gerarHash(senhaNova),
        precisaTrocarSenha: false,
        atualizadoEm: new Date(),
      })
      .where(eq(usuarios.id, id));

    return { trocada: true };
  }

  /** Redefinição por administrador: a pessoa terá de trocar no próximo acesso. */
  async redefinirSenha(id: string, senhaNova: string): Promise<{ redefinida: true }> {
    const u = await this.buscarPorId(id);
    if (!u) throw new NotFoundException('Usuário não encontrado.');

    const problema = validarSenha(senhaNova);
    if (problema) throw new BadRequestException(problema);

    await this.db
      .update(usuarios)
      .set({
        senhaHash: await gerarHash(senhaNova),
        precisaTrocarSenha: true,
        atualizadoEm: new Date(),
      })
      .where(eq(usuarios.id, id));

    return { redefinida: true };
  }

  async remover(id: string): Promise<{ removido: true }> {
    const u = await this.buscarPorId(id);
    if (!u) throw new NotFoundException('Usuário não encontrado.');

    if (u.papel === 'ADMIN' && (await this.contarAdminsAtivos()) <= 1) {
      throw new BadRequestException(
        'Este é o único administrador ativo. Promova outra pessoa antes de excluir esta conta.',
      );
    }

    await this.db.delete(usuarios).where(eq(usuarios.id, id));
    return { removido: true };
  }

  async registrarAcesso(id: string): Promise<void> {
    await this.db
      .update(usuarios)
      .set({ ultimoAcessoEm: new Date() })
      .where(eq(usuarios.id, id));
  }

  private async contarAdminsAtivos(): Promise<number> {
    const linhas = await this.db.select().from(usuarios);
    return linhas.filter((u) => u.papel === 'ADMIN' && u.ativo).length;
  }
}

export { publico as paraPublico };
