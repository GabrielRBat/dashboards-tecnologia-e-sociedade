import { Transform } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

const TIPOS_PROJETO = ['NP', 'MT', 'AT', 'RC', 'PE'];
const ORIGENS = ['PRODUCAO', 'LABORATORIO'];

/** Aceita `?tipoProjeto=NP&tipoProjeto=MT` e `?tipoProjeto=NP,MT`. */
const paraLista = ({ value }: { value: unknown }): string[] | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  const bruto = Array.isArray(value) ? value : [value];
  const itens = bruto
    .flatMap((v) => String(v).split(','))
    .map((v) => v.trim())
    .filter(Boolean);
  return itens.length > 0 ? itens : undefined;
};

export class ListarFormulacoesDto {
  @IsOptional()
  @IsString()
  busca?: string;

  @IsOptional()
  @Transform(paraLista)
  @IsArray()
  @IsIn(TIPOS_PROJETO, { each: true })
  tipoProjeto?: string[];

  @IsOptional()
  @Transform(paraLista)
  @IsArray()
  @IsIn(ORIGENS, { each: true })
  origem?: string[];

  @IsOptional()
  @Transform(paraLista)
  @IsArray()
  @IsString({ each: true })
  desenvolvedor?: string[];

  @IsOptional()
  @IsDateString()
  dataInicio?: string;

  @IsOptional()
  @IsDateString()
  dataFim?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  pagina?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  porPagina?: number = 25;
}
