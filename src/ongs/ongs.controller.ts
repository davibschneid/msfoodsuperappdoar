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
}
