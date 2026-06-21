import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { OngsService } from '../ongs/ongs.service';
import {
  GoogleSheetsService,
  SheetRow,
} from '../google-sheets/google-sheets.service';
import { OngNeedsResponseDto } from './dto/needs.dto';

@Injectable()
export class NeedsService {
  private readonly logger = new Logger(NeedsService.name);

  constructor(
    private readonly ongsService: OngsService,
    private readonly sheetsService: GoogleSheetsService,
  ) {}

  async getNeedsByOngId(ongId: string): Promise<OngNeedsResponseDto> {
    const ong = await this.ongsService.findById(ongId);

    if (!ong.spreadsheetId) {
      return {
        ongId: ong.id,
        ongName: ong.name,
        category: ong.category,
        needs: [],
      };
    }

    let needs: SheetRow[] = [];
    if (this.sheetsService.isConfigured()) {
      try {
        needs = await this.sheetsService.readNeeds(ong.spreadsheetId);
      } catch (error) {
        this.logger.error(
          `Failed to read spreadsheet ${ong.spreadsheetId}: ${String(error)}`,
        );
      }
    } else {
      needs = this.getMockNeeds();
    }

    return {
      ongId: ong.id,
      ongName: ong.name,
      category: ong.category,
      needs,
    };
  }

  async getAllNeeds(): Promise<OngNeedsResponseDto[]> {
    const ongs = await this.ongsService.findAll();
    const results: OngNeedsResponseDto[] = [];

    for (const ong of ongs) {
      if (!ong.shareData || !ong.spreadsheetId) continue;

      let needs: SheetRow[] = [];
      if (this.sheetsService.isConfigured()) {
        try {
          needs = await this.sheetsService.readNeeds(ong.spreadsheetId);
        } catch (error) {
          this.logger.error(
            `Failed to read spreadsheet for ONG ${ong.id}: ${String(error)}`,
          );
        }
      } else {
        needs = this.getMockNeeds();
      }

      results.push({
        ongId: ong.id,
        ongName: ong.name,
        category: ong.category,
        needs: needs.filter((n) => n.status !== 'Meta Atingida'),
      });
    }

    return results;
  }

  async updateArrecadado(
    ongId: string,
    rowIndex: number,
    value: number,
  ): Promise<void> {
    const ong = await this.ongsService.findById(ongId);

    if (!ong.spreadsheetId) {
      throw new NotFoundException(
        `ONG ${ongId} não possui planilha configurada`,
      );
    }

    if (this.sheetsService.isConfigured()) {
      await this.sheetsService.updateArrecadado(
        ong.spreadsheetId,
        rowIndex,
        value,
      );
      this.logger.log(
        `Updated arrecadado for ONG ${ongId}, row ${rowIndex}: ${value}`,
      );
    } else {
      this.logger.warn('Google Sheets not configured, skipping update');
    }
  }

  private getMockNeeds(): SheetRow[] {
    return [
      {
        item: 'Leite em Pó',
        meta: 100,
        arrecadado: 45,
        unidade: 'Latas',
        urgencia: 'Alta',
        status: 'Em Andamento',
        dataAtualizacao: '19/06',
        horaAtualizacao: '14:20',
      },
      {
        item: 'Arroz',
        meta: 200,
        arrecadado: 200,
        unidade: 'Pacotes 5kg',
        urgencia: 'Média',
        status: 'Meta Atingida',
        dataAtualizacao: '18/06',
        horaAtualizacao: '10:15',
      },
      {
        item: 'Feijão',
        meta: 150,
        arrecadado: 30,
        unidade: 'Pacotes 1kg',
        urgencia: 'Alta',
        status: 'Em Andamento',
        dataAtualizacao: '17/06',
        horaAtualizacao: '09:30',
      },
      {
        item: 'Óleo de Cozinha',
        meta: 80,
        arrecadado: 0,
        unidade: 'Garrafas 900ml',
        urgencia: 'Média',
        status: 'Pendente',
        dataAtualizacao: '',
        horaAtualizacao: '',
      },
      {
        item: 'Macarrão',
        meta: 120,
        arrecadado: 55,
        unidade: 'Pacotes 500g',
        urgencia: 'Baixa',
        status: 'Em Andamento',
        dataAtualizacao: '16/06',
        horaAtualizacao: '16:45',
      },
    ];
  }
}
