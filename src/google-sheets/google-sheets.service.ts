import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google, sheets_v4 } from 'googleapis';

export interface SheetRow {
  item: string;
  meta: number;
  arrecadado: number;
  unidade: string;
  urgencia: string;
  status: string;
  dataAtualizacao: string;
  horaAtualizacao: string;
  ativo: string;
}

@Injectable()
export class GoogleSheetsService {
  private readonly logger = new Logger(GoogleSheetsService.name);
  private sheets: sheets_v4.Sheets | null = null;

  constructor(private readonly configService: ConfigService) {
    this.initClient();
  }

  private initClient() {
    const credentialPath = this.configService.get<string>(
      'GOOGLE_APPLICATION_CREDENTIALS',
    );

    if (credentialPath) {
      const auth = new google.auth.GoogleAuth({
        keyFile: credentialPath,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });
      this.sheets = google.sheets({ version: 'v4', auth });
      this.logger.log(
        'Google Sheets client initialized with service account credentials',
      );
    } else {
      this.logger.warn(
        'GOOGLE_APPLICATION_CREDENTIALS not configured. Google Sheets will not work.',
      );
    }
  }

  isConfigured(): boolean {
    return this.sheets !== null;
  }

  async readNeeds(spreadsheetId: string): Promise<SheetRow[]> {
    if (!this.sheets) {
      this.logger.warn('Google Sheets not configured, returning empty list');
      return [];
    }

    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'A2:H',
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) return [];

    return rows
      .filter((row) => row[0])
      .map((row) => {
        const meta = parseInt(String(row[1] ?? '0'), 10) || 0;
        const arrecadado = parseInt(String(row[2] ?? '0'), 10) || 0;
        const status =
          arrecadado >= meta && meta > 0
            ? 'Meta Atingida'
            : arrecadado > 0
              ? 'Em Andamento'
              : 'Pendente';

        return {
          item: String(row[0] ?? ''),
          meta,
          arrecadado,
          unidade: String(row[3] ?? ''),
          urgencia: String(row[4] ?? 'Média'),
          status,
          dataAtualizacao: String(row[5] ?? ''),
          horaAtualizacao: String(row[6] ?? ''),
          ativo: String(row[7] ?? 'Ativo').trim(),
        };
      });
  }

  async updateArrecadado(
    spreadsheetId: string,
    rowIndex: number,
    value: number,
  ): Promise<void> {
    if (!this.sheets) {
      this.logger.warn('Google Sheets not configured, skipping update');
      return;
    }

    const now = new Date();
    const dataAtual = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}`;
    const horaAtual = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    await this.sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `C${rowIndex + 2}:H${rowIndex + 2}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[value, null, null, null, dataAtual, horaAtual]],
      },
    });
  }
}
