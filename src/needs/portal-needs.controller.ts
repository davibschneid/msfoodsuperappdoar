import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { IsIn, IsNotEmpty, IsNumber, IsString, Matches, MaxLength, Min } from 'class-validator';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { PortalNeedsService } from './portal-needs.service';

class CreateNeed {
  @Matches(/^[A-Za-z0-9_-]{1,128}$/) requestId: string;
  @IsString() @IsNotEmpty() @MaxLength(50) @Matches(/^[^<>\u0000-\u001f]+$/) item: string;
  @IsNumber() @Min(0.000001) meta: number;
  @IsNumber() @Min(0) arrecadado: number;
  @IsIn(['un.', 'kg', 'L', 'cx', 'pct']) unidade: string;
  @IsIn(['Alta', 'Média', 'Baixa']) urgencia: string;
  @IsString() @IsNotEmpty() @MaxLength(128) actorUid: string;
}
class ChangeStatus {
  @IsIn(['Ativa', 'Concluída']) status: 'Ativa' | 'Concluída';
  @IsString() @IsNotEmpty() @MaxLength(128) actorUid: string;
}

@UseGuards(ApiKeyGuard)
@Controller('portal/ongs/:ongId/needs')
export class PortalNeedsController {
  constructor(private readonly needs: PortalNeedsService) {}
  @Get()
  list(@Param('ongId') id: string, @Query('cursor') cursor?: string) { return this.needs.list(id, cursor); }
  @Post()
  create(@Param('ongId') id: string, @Body() dto: CreateNeed) { return this.needs.create(id, dto.actorUid, dto.requestId, dto); }
  @Put(':id/status')
  status(@Param('ongId') ongId: string, @Param('id') id: string, @Body() dto: ChangeStatus) { return this.needs.setStatus(ongId, dto.actorUid, id, dto.status); }
}
