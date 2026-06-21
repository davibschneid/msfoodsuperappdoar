import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsNotEmpty, Min } from 'class-validator';

export class UpdateArrecadadoDto {
  @ApiProperty({ description: 'Índice da linha na planilha (0-based)' })
  @IsNumber()
  @IsNotEmpty()
  rowIndex: number;

  @ApiProperty({ description: 'Novo valor arrecadado' })
  @IsNumber()
  @Min(0)
  value: number;
}

export class NeedResponseDto {
  item: string;
  meta: number;
  arrecadado: number;
  unidade: string;
  urgencia: string;
  status: string;
  dataAtualizacao: string;
  horaAtualizacao: string;
}

export class OngNeedsResponseDto {
  ongId: string;
  ongName: string;
  category: string;
  needs: NeedResponseDto[];
}
