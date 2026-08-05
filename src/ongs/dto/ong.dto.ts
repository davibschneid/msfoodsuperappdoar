import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsArray,
  IsNumber,
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

  @ApiProperty({ description: 'Endereço (rua / avenida)' })
  @IsString()
  @IsNotEmpty()
  address: string;

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

  @ApiPropertyOptional({ description: 'Descrição da ONG' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Emoji representativo da ONG' })
  @IsString()
  @IsOptional()
  emoji?: string;

  @ApiPropertyOptional({
    description: 'Itens aceitos para doação',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  acceptedItems?: string[];

  @ApiPropertyOptional({ description: 'Latitude' })
  @IsNumber()
  @IsOptional()
  latitude?: number;

  @ApiPropertyOptional({ description: 'Longitude' })
  @IsNumber()
  @IsOptional()
  longitude?: number;

  @ApiProperty({ description: 'Categoria da ONG: food' })
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
  address?: string;

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

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  emoji?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  acceptedItems?: string[];

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  latitude?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  longitude?: number;
}

export class OngResponseDto {
  id: string;
  name: string;
  cep: string;
  city: string;
  state: string;
  neighborhood: string;
  address: string;
  number: string;
  complement?: string;
  referencePoint?: string;
  shareData: boolean;
  spreadsheetId?: string;
  description: string;
  emoji: string;
  acceptedItems: string[];
  latitude: number;
  longitude: number;
  category: string;
  createdAt: string;
  updatedAt: string;
}
