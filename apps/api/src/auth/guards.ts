import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  createParamDecorator,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { UsuarioNaRequisicao } from './jwt.strategy';
import { Papel } from './usuarios.service';

export const CHAVE_PUBLICO = 'rota_publica';

/**
 * Marca uma rota como aberta.
 *
 * O guard de JWT é **global**: tudo nasce protegido e só sai da proteção quem
 * for marcado aqui, explicitamente. O contrário — proteger rota a rota — deixa
 * um endpoint novo aberto por esquecimento, que é como a maioria dos vazamentos
 * começa.
 */
export const Publico = () => SetMetadata(CHAVE_PUBLICO, true);

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(contexto: ExecutionContext) {
    const publico = this.reflector.getAllAndOverride<boolean>(CHAVE_PUBLICO, [
      contexto.getHandler(),
      contexto.getClass(),
    ]);

    if (publico) return true;
    return super.canActivate(contexto);
  }
}

export const CHAVE_PAPEIS = 'papeis_exigidos';

/** Exige um dos papéis informados. Use junto do guard global. */
export const ExigePapel = (...papeis: Papel[]) =>
  SetMetadata(CHAVE_PAPEIS, papeis);

@Injectable()
export class PapeisGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(contexto: ExecutionContext): boolean {
    const exigidos = this.reflector.getAllAndOverride<Papel[]>(CHAVE_PAPEIS, [
      contexto.getHandler(),
      contexto.getClass(),
    ]);

    if (!exigidos || exigidos.length === 0) return true;

    const req = contexto
      .switchToHttp()
      .getRequest<Request & { user?: UsuarioNaRequisicao }>();

    if (!req.user || !exigidos.includes(req.user.papel)) {
      throw new ForbiddenException(
        'Esta ação é restrita a administradores.',
      );
    }

    return true;
  }
}

/** Pega quem está autenticado, sem repetir `req.user` pelos controllers. */
export const Autenticado = createParamDecorator(
  (_dado: unknown, contexto: ExecutionContext): UsuarioNaRequisicao => {
    const req = contexto
      .switchToHttp()
      .getRequest<Request & { user: UsuarioNaRequisicao }>();
    return req.user;
  },
);
