import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiSecurity } from '@nestjs/swagger';
import { NeedsService } from './needs.service';
import { UpdateArrecadadoDto } from './dto/needs.dto';
import { ApiKeyGuard } from '../common/guards/api-key.guard';

@ApiTags('Necessidades')
@ApiSecurity('api-key')
@UseGuards(ApiKeyGuard)
@Controller('needs')
export class NeedsController {
  constructor(private readonly needsService: NeedsService) {}

  @Get()
  @ApiOperation({
    summary: 'Listar necessidades de todas as ONGs com planilha',
  })
  findAll() {
    return this.needsService.getAllNeeds();
  }

  @Get('ong/:ongId')
  @ApiOperation({ summary: 'Buscar necessidades de uma ONG específica' })
  findByOngId(@Param('ongId') ongId: string) {
    return this.needsService.getNeedsByOngId(ongId);
  }

  @Put('ong/:ongId/arrecadado')
  @ApiOperation({ summary: 'Atualizar valor arrecadado de um item na planilha' })
  updateArrecadado(
    @Param('ongId') ongId: string,
    @Body() dto: UpdateArrecadadoDto,
  ) {
    return this.needsService.updateArrecadado(ongId, dto.rowIndex, dto.value);
  }
}
