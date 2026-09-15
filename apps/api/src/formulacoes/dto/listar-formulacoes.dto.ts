import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
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
const CAMPOS_BUSCA = [
  'todos',
  'nomenclatura',
  'numeracao',
  'desenvolvedor',
  'comentarios',
];

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
  /** Até 3 ids — usado na comparação lado a lado de formulações. */
  @IsOptional()
  @Transform(paraLista)
  @IsArray()
  @ArrayMaxSize(3, {
    message: 'A comparação admite no máximo 3 formulações.',
  })
  @IsString({ each: true })
  ids?: string[];

  @IsOptional()
  @IsString()
  busca?: string;

  @IsOptional()
  @IsIn(CAMPOS_BUSCA)
  campoBusca?: string;

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
