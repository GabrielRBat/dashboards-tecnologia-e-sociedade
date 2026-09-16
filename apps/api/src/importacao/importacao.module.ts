import {
  BadRequestException,
  Controller,
  Get,
  Module,
  Post,
  UploadedFile,
  UseInterceptors,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { Autenticado } from '../auth/guards';
import { UsuarioNaRequisicao } from '../auth/jwt.strategy';
import { ImportacaoService } from './importacao.service';

/** Limite de tamanho do upload da planilha. */
const TAMANHO_MAXIMO = 25 * 1024 * 1024; // 25 MB

@Controller('importacao')
export class ImportacaoController {
  constructor(private readonly service: ImportacaoService) {}

  @Post('planilha')
  @UseInterceptors(
    FileInterceptor('arquivo', { limits: { fileSize: TAMANHO_MAXIMO } }),
  )
  async importar(
    @Autenticado() usuario: UsuarioNaRequisicao,
    @UploadedFile() arquivo?: Express.Multer.File,
  ) {
    if (!arquivo) {
      throw new BadRequestException('Envie a planilha no campo "arquivo".');
    }
    if (!/\.xlsx$/i.test(arquivo.originalname)) {
      throw new BadRequestException('Apenas arquivos .xlsx são aceitos.');
    }
    return this.service.importar(
      arquivo.buffer,
      arquivo.originalname,
      usuario.id,
    );
  }

  @Post('planilha/validar')
  @UseInterceptors(
    FileInterceptor('arquivo', { limits: { fileSize: TAMANHO_MAXIMO } }),
  )
  async validar(@UploadedFile() arquivo?: Express.Multer.File) {
    if (!arquivo) {
      throw new BadRequestException('Envie a planilha no campo "arquivo".');
    }
    if (!/\.xlsx$/i.test(arquivo.originalname)) {
      throw new BadRequestException('Apenas arquivos .xlsx são aceitos.');
    }
    return this.service.validar(arquivo.buffer, arquivo.originalname);
  }

  @Get('historico')
  historico() {
    return this.service.historico();
  }

  @Get('template')
  async template(@Res() resposta: Response) {
    const buffer = await this.service.gerarTemplate();
    resposta.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    resposta.setHeader(
      'Content-Disposition',
      'attachment; filename="template-importacao-argamassas.xlsx"',
    );
    resposta.send(buffer);
  }
}

@Module({
  controllers: [ImportacaoController],
  providers: [ImportacaoService],
})
export class ImportacaoModule {}
