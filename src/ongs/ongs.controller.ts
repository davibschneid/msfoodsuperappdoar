import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiSecurity } from '@nestjs/swagger';
import { OngsService } from './ongs.service';
import { CreateOngDto, UpdateOngDto } from './dto/ong.dto';
import { ApiKeyGuard } from '../common/guards/api-key.guard';

@ApiTags('ONGs')
@ApiSecurity('api-key')
@UseGuards(ApiKeyGuard)
@Controller('ongs')
export class OngsController {
  constructor(private readonly ongsService: OngsService) {}

  @Post()
  @ApiOperation({ summary: 'Cadastrar nova ONG' })
  create(@Body() dto: CreateOngDto) {
    return this.ongsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todas as ONGs' })
  findAll() {
    return this.ongsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar ONG por ID' })
  findById(@Param('id') id: string) {
    return this.ongsService.findById(id);
  }

  @Get('spreadsheet/:spreadsheetId')
  @ApiOperation({ summary: 'Buscar ONG por ID da planilha' })
  findBySpreadsheetId(@Param('spreadsheetId') spreadsheetId: string) {
    return this.ongsService.findBySpreadsheetId(spreadsheetId);
  }

  @Get('cnpj/:cnpj')
  @ApiOperation({ summary: 'Buscar ONG por CNPJ' })
  findByCnpj(@Param('cnpj') cnpj: string) {
    return this.ongsService.findByCnpj(cnpj);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar ONG' })
  update(@Param('id') id: string, @Body() dto: UpdateOngDto) {
    return this.ongsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover ONG' })
  delete(@Param('id') id: string) {
    return this.ongsService.delete(id);
  }

  // --- Necessidades (Google Sheets) ---

  @Get('needs')
  @ApiOperation({ summary: 'Listar necessidades de todas as ONGs' })
  getAllNeeds() {
    return this.ongsService.getAllNeeds();
  }

  @Get('needs/ong/:ongId')
  @ApiOperation({ summary: 'Buscar necessidades de uma ONG' })
  getNeedsByOngId(@Param('ongId') ongId: string) {
    return this.ongsService.getNeedsByOngId(ongId);
  }

  @Put('needs/ong/:ongId/arrecadado')
  @ApiOperation({ summary: 'Atualizar valor arrecadado na planilha da ONG' })
  updateArrecadado(
    @Param('ongId') ongId: string,
    @Body('rowIndex') rowIndex: number,
    @Body('value') value: number,
  ) {
    return this.ongsService.updateArrecadado(ongId, rowIndex, value);
  }
}
