import {
  BadRequestException,
  Controller,
  Module,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
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
  async importar(@UploadedFile() arquivo?: Express.Multer.File) {
    if (!arquivo) {
      throw new BadRequestException('Envie a planilha no campo "arquivo".');
    }
    if (!/\.xlsx$/i.test(arquivo.originalname)) {
      throw new BadRequestException('Apenas arquivos .xlsx são aceitos.');
    }
    return this.service.importar(arquivo.buffer, arquivo.originalname);
  }
}

@Module({
  controllers: [ImportacaoController],
  providers: [ImportacaoService],
})
export class ImportacaoModule {}
