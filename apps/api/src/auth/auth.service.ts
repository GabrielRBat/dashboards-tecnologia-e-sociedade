import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { conferirSenha, normalizarEmail } from './senhas';
import { UsuarioPublico, UsuariosService, paraPublico } from './usuarios.service';

/** O que vai dentro do token. */
export interface ConteudoToken {
  /** id do usuário */
  sub: string;
  email: string;
  papel: 'ADMIN' | 'MEMBRO';
}

export interface RespostaLogin {
  token: string;
  /** Segundos até expirar — o frontend usa para definir o prazo do cookie. */
  expiraEmSegundos: number;
  usuario: UsuarioPublico;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usuarios: UsuariosService,
    private readonly jwt: JwtService,
  ) {}

  /**
   * Valida credenciais e emite o token.
   *
   * **A mensagem de erro é a mesma para e-mail inexistente, senha errada e conta
   * desativada.** Diferenciar entregaria a quem tenta invadir a lista de quem
   * tem conta aqui — e "usuário não encontrado" é exatamente o que um ataque
   * precisa para saber onde insistir.
   *
   * Quando o e-mail não existe, ainda assim comparamos contra um hash de
   * mentira. Sem isso, a resposta para e-mail inexistente voltaria em 1 ms e a
   * de senha errada em 250 ms — e essa diferença de tempo revela quem é cliente.
   */
  async entrar(email: string, senha: string): Promise<RespostaLogin> {
    const usuario = await this.usuarios.buscarPorEmail(normalizarEmail(email ?? ''));

    if (!usuario) {
      await conferirSenha(senha ?? '', HASH_DE_MENTIRA);
      throw new UnauthorizedException('E-mail ou senha incorretos.');
    }

    const senhaConfere = await conferirSenha(senha ?? '', usuario.senhaHash);
    if (!senhaConfere || !usuario.ativo) {
      throw new UnauthorizedException('E-mail ou senha incorretos.');
    }

    await this.usuarios.registrarAcesso(usuario.id);

    const conteudo: ConteudoToken = {
      sub: usuario.id,
      email: usuario.email,
      papel: usuario.papel,
    };

    return {
      token: await this.jwt.signAsync(conteudo),
      expiraEmSegundos: SEGUNDOS_DE_SESSAO,
      usuario: paraPublico({ ...usuario, ultimoAcessoEm: new Date() }),
    };
  }

  /** Dados de quem está logado, relidos do banco a cada chamada. */
  async eu(id: string): Promise<UsuarioPublico> {
    const usuario = await this.usuarios.buscarPorId(id);
    if (!usuario || !usuario.ativo) {
      throw new UnauthorizedException('Sessão inválida.');
    }
    return paraPublico(usuario);
  }
}

/**
 * Hash de uma senha que ninguém tem, só para gastar o mesmo tempo do bcrypt
 * quando o e-mail não existe. É um hash bcrypt válido de uma senha aleatória.
 */
const HASH_DE_MENTIRA =
  '$2b$12$txiRL2uM9HDbdcaPs8KB4O4Uq3w8/8LtSMzL/Ros.r8linEzraZ6y';

/**
 * Duração da sessão.
 *
 * Doze horas cobre um dia inteiro de trabalho sem pedir login de novo, e ainda
 * assim expira antes de virar um crachá esquecido em cima da mesa. Não há
 * refresh token: para uma equipe pequena, ele adicionaria uma superfície de
 * ataque (o refresh precisa ser guardado e revogado) sem resolver problema que
 * exista aqui.
 */
export const SEGUNDOS_DE_SESSAO = 12 * 60 * 60;
