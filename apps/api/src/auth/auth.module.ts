import {
  Body,
  Controller,
  Delete,
  Get,
  Module,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { Throttle } from '@nestjs/throttler';
import { obterSegredoJwt } from '../config/ambiente';
import { AuthService, SEGUNDOS_DE_SESSAO } from './auth.service';
import {
  Autenticado,
  ExigePapel,
  JwtAuthGuard,
  PapeisGuard,
  Publico,
} from './guards';
import { JwtStrategy, UsuarioNaRequisicao } from './jwt.strategy';
import { Papel, UsuariosService } from './usuarios.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly usuarios: UsuariosService,
  ) {}

  /**
   * Login.
   *
   * Limitado a 5 tentativas por minuto por IP. Sem esse limite, uma senha de dez
   * caracteres cai em questão de horas com um script — o hash lento do bcrypt
   * atrasa o ataque, mas quem freia de verdade é isto.
   */
  @Publico()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  entrar(@Body() corpo: { email: string; senha: string }) {
    return this.auth.entrar(corpo?.email, corpo?.senha);
  }

  /**
   * Auto-registro público.
   *
   * **Isto contraria a especificação original**, que pedia cadastro só por
   * administrador. Foi decisão explícita do usuário em 2026-08-24, ciente de
   * que qualquer pessoa passa a poder criar conta e ver as formulações e
   * ensaios do laboratório. Registrado em `context.md` e `ESPECIFICACOES.md`.
   *
   * Duas travas continuam de pé, e não são negociáveis pela interface:
   *
   * 1. **A conta nasce sempre como MEMBRO.** O papel não vem do corpo da
   *    requisição — se viesse, bastaria mandar `papel: 'ADMIN'` para virar
   *    administrador, e o controle de acesso inteiro deixaria de existir.
   * 2. **Limite de 3 por hora por IP**, contra criação de contas em massa.
   */
  @Publico()
  @Throttle({ default: { limit: 3, ttl: 3_600_000 } })
  @Post('registrar')
  async registrar(
    @Body() corpo: { nome: string; email: string; senha: string },
  ) {
    await this.usuarios.criar({
      nome: corpo?.nome,
      email: corpo?.email,
      senha: corpo?.senha,
      // Fixo aqui de propósito: nunca aceite papel vindo de fora.
      papel: 'MEMBRO',
      // Senha escolhida pela própria pessoa: não há o que trocar depois.
      precisaTrocarSenha: false,
    });

    // Já devolve a sessão: pedir para entrar de novo logo após criar a conta é
    // atrito sem ganho nenhum de segurança.
    return this.auth.entrar(corpo.email, corpo.senha);
  }

  /** Dados de quem está logado. O frontend usa para saber se a sessão vale. */
  @Get('eu')
  eu(@Autenticado() usuario: UsuarioNaRequisicao) {
    return this.auth.eu(usuario.id);
  }

  /** Troca da própria senha, conferindo a atual. */
  @Post('trocar-senha')
  trocarSenha(
    @Autenticado() usuario: UsuarioNaRequisicao,
    @Body() corpo: { senhaAtual: string; senhaNova: string },
  ) {
    return this.usuarios.trocarSenha(
      usuario.id,
      corpo?.senhaAtual,
      corpo?.senhaNova,
    );
  }

  /** Quanto tempo dura a sessão — o frontend ajusta o prazo do cookie. */
  @Publico()
  @Get('duracao-sessao')
  duracao() {
    return { segundos: SEGUNDOS_DE_SESSAO };
  }
}

/**
 * Gestão de contas — só administradores.
 *
 * Não existe rota de auto-registro, como manda a especificação: quem cria conta
 * é um administrador. Uma rota pública de cadastro tornaria o login decorativo.
 */
@Controller('usuarios')
@UseGuards(PapeisGuard)
@ExigePapel('ADMIN')
export class UsuariosController {
  constructor(private readonly usuarios: UsuariosService) {}

  @Get()
  listar() {
    return this.usuarios.listar();
  }

  @Get(':id')
  obter(@Param('id', ParseUUIDPipe) id: string) {
    return this.usuarios.obter(id);
  }

  @Post()
  criar(
    @Body()
    corpo: { nome: string; email: string; senha: string; papel?: Papel },
  ) {
    return this.usuarios.criar({
      ...corpo,
      // Senha definida por outra pessoa: trocar no primeiro acesso.
      precisaTrocarSenha: true,
    });
  }

  @Put(':id')
  atualizar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() corpo: { nome?: string; papel?: Papel; ativo?: boolean },
  ) {
    return this.usuarios.atualizar(id, corpo);
  }

  @Post(':id/redefinir-senha')
  redefinirSenha(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() corpo: { senhaNova: string },
  ) {
    return this.usuarios.redefinirSenha(id, corpo?.senhaNova);
  }

  @Delete(':id')
  remover(@Param('id', ParseUUIDPipe) id: string) {
    return this.usuarios.remover(id);
  }
}

@Module({
  imports: [
    PassportModule,
    /*
     * `registerAsync`, e não `register`: a forma síncrona avalia o segredo no
     * instante em que o arquivo é carregado, e os `import` do módulo são içados
     * para antes do `carregarAmbiente()` do main.ts — ou seja, o `.env` ainda
     * não teria sido lido e a API morreria dizendo que falta JWT_SEGREDO. A
     * fábrica só roda quando o Nest monta o módulo, com o ambiente já em pé.
     */
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: obterSegredoJwt(),
        signOptions: { expiresIn: SEGUNDOS_DE_SESSAO },
      }),
    }),
    // Teto geral por IP; o login tem limite próprio, bem mais apertado.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 200 }]),
  ],
  controllers: [AuthController, UsuariosController],
  providers: [
    AuthService,
    UsuariosService,
    JwtStrategy,
    /*
     * Guards globais: tudo nasce protegido, e só sai da proteção o que estiver
     * marcado com @Publico(). Assim um endpoint novo não fica aberto por
     * esquecimento — que é como a maioria dos vazamentos acontece.
     */
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
  exports: [UsuariosService, AuthService],
})
export class AuthModule {}
