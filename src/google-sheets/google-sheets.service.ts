import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google, drive_v3, sheets_v4 } from 'googleapis';

export interface SheetRow {
  item: string;
  meta: number;
  arrecadado: number;
  unidade: string;
  urgencia: string;
  status: string;
  dataAtualizacao: string;
  horaAtualizacao: string;
  ativo?: string;
}

export interface SpreadsheetValidationResult {
  valid: boolean;
  errors: string[];
  validatedRows: number;
}

@Injectable()
export class GoogleSheetsService {
  private readonly logger = new Logger(GoogleSheetsService.name);
  private sheets: sheets_v4.Sheets | null = null;
  private drive: drive_v3.Drive | null = null;

  constructor(private readonly configService: ConfigService) { this.initClient(); }

  private initClient() {
    const credentialPath = this.configService.get<string>('GOOGLE_APPLICATION_CREDENTIALS');
    const auth = new google.auth.GoogleAuth({
      ...(credentialPath ? { keyFile: credentialPath } : {}),
      scopes: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive.metadata.readonly'],
    });
    this.sheets = google.sheets({ version: 'v4', auth });
    this.drive = google.drive({ version: 'v3', auth });
    this.logger.log(`Google Sheets client initialized with ${credentialPath ? 'keyfile' : 'ADC'}`);
  }

  isConfigured(): boolean { return this.sheets !== null && this.drive !== null; }

  async assertValidSpreadsheet(spreadsheetId: string): Promise<SpreadsheetValidationResult> {
    const result = await this.validateSpreadsheet(spreadsheetId);
    if (!result.valid) throw new BadRequestException(result.errors);
    return result;
  }

  async validateSpreadsheet(spreadsheetId: string): Promise<SpreadsheetValidationResult> {
    const id = spreadsheetId.trim();
    if (!/^[A-Za-z0-9_-]{20,128}$/.test(id)) return this.invalid('spreadsheetID inválido. Informe o ID ou URL de uma planilha Google Sheets.');
    if (!this.sheets || !this.drive) return this.invalid('A integração com Google Sheets não está configurada.');
    try {
      const file = await this.drive.files.get({ fileId: id, fields: 'id,mimeType,capabilities(canEdit)' });
      if (file.data.mimeType !== 'application/vnd.google-apps.spreadsheet') return this.invalid('O arquivo informado não é uma planilha Google Sheets.');
      if (file.data.capabilities?.canEdit !== true) return this.invalid('A planilha não possui permissão de escrita para a conta de serviço do aplicativo.');
      const metadata = await this.sheets.spreadsheets.get({ spreadsheetId: id, fields: 'sheets.properties.gridProperties(rowCount)' });
      const rowCount = metadata.data.sheets?.[0]?.properties?.gridProperties?.rowCount ?? 0;
      if (rowCount > 10001) return this.invalid('A planilha excede o limite configurado de 10.000 necessidades.');
      const formulaResponse = await this.sheets.spreadsheets.values.get({ spreadsheetId: id, range: 'A1:H10002', valueRenderOption: 'FORMULA' });
      const response = await this.sheets.spreadsheets.values.get({ spreadsheetId: id, range: 'A1:H10002', valueRenderOption: 'FORMATTED_VALUE', dateTimeRenderOption: 'FORMATTED_STRING' });
      const formulaRows = (formulaResponse.data.values ?? []) as unknown[][];
      const rows = (response.data.values ?? []) as unknown[][];
      if (!rows.length) return this.invalid('A planilha está vazia.');
      if (rows.length > 10001) return this.invalid('A planilha excede o limite de 10.000 necessidades.');
      const expected = ['Item / Necessidade', 'Meta', 'Arrecadado', 'Unidade', 'Urgência', 'Data da Atualização', 'Hora da Atualização', 'Status'];
      const headers = expected.map((_, index) => this.cell(rows[0]?.[index]));
      const headerErrors = expected.flatMap((header, index) => this.normalized(headers[index]) === this.normalized(header) ? [] : [`coluna '${header}' não encontrada na posição ${index + 1}`]);
      if (headerErrors.length) return { valid: false, errors: headerErrors, validatedRows: 0 };
      const totalNeeds = rows.slice(1).filter((row) => Array.from({ length: 8 }, (_, column) => this.cell(row?.[column])).some((value) => value.trim())).length;
      if (totalNeeds > 20) return this.invalid('A planilha permite no máximo 20 necessidades.');
      const errors: string[] = [];
      let validatedRows = 0;
      for (let index = 1; index < rows.length; index++) {
        const line = index + 1;
        const rawRow = Array.from({ length: 8 }, (_, column) => this.cell(rows[index]?.[column]));
        if (rawRow.every((value) => !value.trim())) continue;
        const formulaRow = Array.from({ length: 8 }, (_, column) => this.cell(formulaRows[index]?.[column]));
        const suspicious = formulaRow.map((value, column) => ({ column, reason: this.suspiciousReason(value, column) })).find((entry) => entry.reason);
        if (suspicious) {
          this.auditRejection(line, expected[suspicious.column], suspicious.reason!);
          errors.push(`linha ${line}: conteúdo potencialmente inseguro na coluna '${expected[suspicious.column]}'`);
          if (errors.length >= 50) break;
          continue;
        }
        const row = rawRow.map((value) => value.trim());
        if (!row[0]) errors.push(`linha ${line}: Item / Necessidade é obrigatório`);
        if (!/^\d+$/.test(row[1]) || Number(row[1]) <= 0 || !Number.isSafeInteger(Number(row[1]))) errors.push(`linha ${line}: Meta deve ser um número inteiro positivo`);
        if (!/^\d+$/.test(row[2]) || !Number.isSafeInteger(Number(row[2]))) errors.push(`linha ${line}: Arrecadado deve ser um número inteiro positivo ou zero`);
        if (!row[3] || row[3].length > 60) errors.push(`linha ${line}: Unidade deve ser um texto de até 60 caracteres`);
        if (!['baixa', 'media', 'alta', 'critica'].includes(this.normalized(row[4]))) errors.push(`linha ${line}: Urgência deve ser Baixa, Média, Alta ou Crítica`);
        if (!this.validDate(row[5])) errors.push(`linha ${line}: Data da Atualização inválida; use dd/mm/aaaa`);
        if (!this.validTime(row[6])) errors.push(`linha ${line}: Hora da Atualização inválida; use hh:mm`);
        if (!['ativo', 'inativo', 'pausado'].includes(this.normalized(row[7]))) errors.push(`linha ${line}: Status deve ser Ativo, Inativo ou Pausado`);
        validatedRows++;
        if (errors.length >= 50) break;
      }
      if (!validatedRows && !errors.length) errors.push('A planilha não possui necessidades cadastradas.');
      return { valid: errors.length === 0, errors, validatedRows };
    } catch (error: unknown) {
      const apiError = error as { code?: number; response?: { status?: number } };
      const status = apiError.code ?? apiError.response?.status;
      if (status === 403) return this.invalid('Sem acesso à planilha. Compartilhe-a com a conta de serviço do aplicativo como Editor.');
      if (status === 404) return this.invalid('Planilha não encontrada. Verifique o spreadsheetID e o compartilhamento.');
      this.logger.error('Falha segura ao validar planilha de necessidades');
      return this.invalid('Não foi possível validar a planilha agora. Tente novamente.');
    }
  }

  async readNeeds(spreadsheetId: string): Promise<SheetRow[]> {
    if (!this.sheets) return [];
    await this.assertValidSpreadsheet(spreadsheetId);
    const response = await this.sheets.spreadsheets.values.get({ spreadsheetId, range: 'A2:H21' });
    const rows = response.data.values;
    if (!rows?.length) return [];
    return rows.filter((row) => row[0]).map((row) => {
      const meta = Number(String(row[1] ?? '0').replace(',', '.')) || 0;
      const arrecadado = Number(String(row[2] ?? '0').replace(',', '.')) || 0;
      const status = arrecadado >= meta && meta > 0 ? 'Meta Atingida' : arrecadado > 0 ? 'Em Andamento' : 'Pendente';
      return { item: String(row[0] ?? ''), meta, arrecadado, unidade: String(row[3] ?? ''), urgencia: String(row[4] ?? 'Média'), status, dataAtualizacao: String(row[5] ?? ''), horaAtualizacao: String(row[6] ?? ''), ativo: this.canonicalStatus(String(row[7] ?? 'Ativo')) };
    });
  }

  async updateArrecadado(spreadsheetId: string, rowIndex: number, value: number): Promise<void> {
    if (!this.sheets) return;
    if (!Number.isInteger(rowIndex) || rowIndex < 0 || rowIndex >= 20) throw new BadRequestException('Índice da necessidade inválido.');
    if (!Number.isSafeInteger(value) || value < 0) throw new BadRequestException('Arrecadado deve ser um número inteiro positivo ou zero.');
    const now = new Date();
    const date = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric' }).format(now);
    const time = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', hour12: false }).format(now);
    await this.sheets.spreadsheets.values.update({ spreadsheetId, range: `C${rowIndex + 2}:G${rowIndex + 2}`, valueInputOption: 'RAW', requestBody: { values: [[value, null, null, date, time]] } });
  }

  private invalid(error: string): SpreadsheetValidationResult { return { valid: false, errors: [error], validatedRows: 0 }; }
  private cell(value: unknown): string { return String(value ?? ''); }
  private normalized(value: string): string { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(); }
  private canonicalStatus(value: string): string { const normalized = this.normalized(value); return normalized === 'inativo' ? 'Inativo' : normalized === 'pausado' ? 'Pausado' : 'Ativo'; }
  private suspiciousReason(value: string, column: number): string | null { if (Buffer.byteLength(value, 'utf8') > 500) return 'cell_size_limit'; if (/^[\s]*[=+@-]/.test(value) || value.startsWith('\t')) return 'formula_injection'; if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(value)) return 'control_character'; if (/<\/?[a-z][^>]*>/i.test(value) || /<script\b/i.test(value)) return 'html_or_xss'; if (/\b(?:eval|exec)\s*\(|\bchild_process\b|\bprocess\s*\.|\brequire\s*\(|\bimport\s*\(/i.test(value)) return 'code_execution'; if (/\bunion\s+select\b|\bdrop\s+table\b|\binsert\s+into\b|\bdelete\s+from\b|\bupdate\s+\w+\s+set\b|--|\/\*|\*\//i.test(value)) return 'sql_injection'; if ((column === 0 || column === 3) && value.trim() && !/^[\p{L}\p{N} .,;'’()/%°ºª#&:_-]+$/u.test(value.trim())) return 'character_allowlist'; return null; }
  private auditRejection(line: number, column: string, reason: string): void { this.logger.warn(`SpreadsheetSecurityRejected line=${line} column=${column} reason=${reason}`); }
  private validDate(value: string): boolean { const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value); if (!match) return false; const day = Number(match[1]); const month = Number(match[2]); const year = Number(match[3]); const date = new Date(Date.UTC(year, month - 1, day)); return year >= 2000 && year <= 2100 && date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day; }
  private validTime(value: string): boolean { const match = /^(\d{2}):(\d{2})$/.exec(value); return !!match && Number(match[1]) <= 23 && Number(match[2]) <= 59; }
}
