import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { obterSegredoJwt } from '../config/ambiente';
import { ConteudoToken } from './auth.service';
import { UsuariosService } from './usuarios.service';

/** Quem está autenticado, anexado à requisição. */
export interface UsuarioNaRequisicao {
  id: string;
  email: string;
  papel: 'ADMIN' | 'MEMBRO';
  precisaTrocarSenha: boolean;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly usuarios: UsuariosService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // Token vencido é token inválido. `true` aqui deixaria sessões eternas.
      ignoreExpiration: false,
      secretOrKey: obterSegredoJwt(),
    });
  }

  /**
   * Confere o usuário no banco a cada requisição, e não só a assinatura.
   *
   * O token é válido por doze horas. Sem esta leitura, alguém desativado hoje
   * continuaria entrando até o token vencer — e desativar um acesso precisa
   * valer agora, não no fim do dia.
   */
  async validate(conteudo: ConteudoToken): Promise<UsuarioNaRequisicao> {
    const usuario = await this.usuarios.buscarPorId(conteudo.sub);

    if (!usuario || !usuario.ativo) {
      throw new UnauthorizedException('Sessão inválida.');
    }

    return {
      id: usuario.id,
      email: usuario.email,
      // O papel vem do banco, não do token: uma promoção ou rebaixamento vale
      // na hora, sem esperar a sessão expirar.
      papel: usuario.papel,
      precisaTrocarSenha: usuario.precisaTrocarSenha,
    };
  }
}
