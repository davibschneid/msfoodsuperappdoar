import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
} from 'class-validator';

export class CreateOngDto {
  @ApiProperty({ description: 'Nome da ONG' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'CEP' })
  @IsString()
  @IsNotEmpty()
  cep: string;

  @ApiProperty({ description: 'Cidade' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ description: 'Estado (UF)' })
  @IsString()
  @IsNotEmpty()
  state: string;

  @ApiProperty({ description: 'Bairro' })
  @IsString()
  @IsNotEmpty()
  neighborhood: string;

  @ApiProperty({ description: 'Rua / Avenida' })
  @IsString()
  @IsNotEmpty()
  street: string;

  @ApiProperty({ description: 'Número' })
  @IsString()
  @IsNotEmpty()
  number: string;

  @ApiPropertyOptional({ description: 'Complemento' })
  @IsString()
  @IsOptional()
  complement?: string;

  @ApiPropertyOptional({ description: 'Ponto de referência' })
  @IsString()
  @IsOptional()
  referencePoint?: string;

  @ApiProperty({ description: 'Compartilhar dados / planilha' })
  @IsBoolean()
  shareData: boolean;

  @ApiPropertyOptional({ description: 'ID da planilha Google Sheets' })
  @IsString()
  @IsOptional()
  spreadsheetId?: string;

  @ApiProperty({ description: 'Categoria da ONG: clothes' })
  @IsString()
  @IsNotEmpty()
  category: string;
}

export class UpdateOngDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  cep?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  state?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  neighborhood?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  street?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  number?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  complement?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  referencePoint?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  shareData?: boolean;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  spreadsheetId?: string;
}

export class OngResponseDto {
  id: string;
  name: string;
  cep: string;
  city: string;
  state: string;
  neighborhood: string;
  street: string;
  number: string;
  complement?: string;
  referencePoint?: string;
  shareData: boolean;
  spreadsheetId?: string;
  category: string;
  createdAt: string;
  updatedAt: string;
}
