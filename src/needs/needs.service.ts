import {
  Injectable,
  Logger,
  NotFoundException,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { FieldValue } from 'firebase-admin/firestore';
import { OngsService } from '../ongs/ongs.service';
import {
  GoogleSheetsService,
  SheetRow,
} from '../google-sheets/google-sheets.service';
import { FirebaseService } from '../firebase/firebase.service';
import { OngNeedsResponseDto, NeedResponseDto } from './dto/needs.dto';

const NEEDS_COLLECTION = 'ongNeeds';
const DEFAULT_SYNC_INTERVAL_MS = 60 * 60 * 1000;

@Injectable()
export class NeedsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(NeedsService.name);
  private readonly CATEGORY = 'food';
  private syncIntervalMs = DEFAULT_SYNC_INTERVAL_MS;
  private syncInProgress = false;

  constructor(
    private readonly ongsService: OngsService,
    private readonly sheetsService: GoogleSheetsService,
    private readonly firebaseService: FirebaseService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    try {
      const minutes =
        await this.firebaseService.getCacheCheckPlanilhaOngMinutes();
      this.syncIntervalMs = minutes * 60 * 1000;

      await this.syncAllOngs().catch((error) =>
        this.logger.error(`Initial needs sync failed: ${error}`),
      );

      const interval = setInterval(
        () =>
          this.syncAllOngs().catch((error) =>
            this.logger.error(`Scheduled needs sync failed: ${error}`),
          ),
        this.syncIntervalMs,
      );
      this.schedulerRegistry.addInterval('syncOngNeeds', interval);
      this.logger.log(`Needs sync scheduled every ${minutes} minute(s)`);
    } catch (error: unknown) {
      this.logger.error(`Failed to schedule needs sync: ${String(error)}`);
    }
  }

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

    let needs = await this.getCachedNeeds(ongId);
    if (needs.length === 0 && this.sheetsService.isConfigured()) {
      this.logger.warn(
        `Cache empty for ONG ${ongId}, falling back to spreadsheet ${ong.spreadsheetId}`,
      );
      try {
        const fromSheets = await this.sheetsService.readNeeds(ong.spreadsheetId);
        needs = fromSheets
          .map((row) => ({ ...row, ativo: row.ativo ?? 'Ativo' }))
          .filter((n) => n.ativo === 'Ativo');
        await this.writeNeedsToCache(ong, fromSheets);
      } catch (error: unknown) {
        this.logger.error(
          `Failed to read spreadsheet ${ong.spreadsheetId}: ${String(error)}`,
        );
        needs = [];
      }
    } else {
      needs = needs.filter((n) => n.ativo === 'Ativo');
    }

    return {
      ongId: ong.id,
      ongName: ong.name,
      category: ong.category,
      needs,
    };
  }

  async getAllNeeds(): Promise<OngNeedsResponseDto[]> {
    const snapshot = await this.firebaseService
      .collection(NEEDS_COLLECTION)
      .where('category', '==', this.CATEGORY)
      .get();

    const results: OngNeedsResponseDto[] = [];
    for (const doc of snapshot.docs) {
      const data = doc.data() as Record<string, unknown>;
      const ongId = (data.ongId as string) ?? doc.id;
      const ongName = (data.ongName as string) ?? '';
      const needs = ((data.needs as NeedResponseDto[]) ?? []).filter(
        (n) => n.ativo === 'Ativo' && n.status !== 'Meta Atingida',
      );

      if (needs.length > 0) {
        results.push({
          ongId,
          ongName,
          category: this.CATEGORY,
          needs,
        });
      }
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

    if (!this.sheetsService.isConfigured()) {
      this.logger.warn('Google Sheets not configured, skipping update');
      return;
    }

    await this.sheetsService.updateArrecadado(
      ong.spreadsheetId,
      rowIndex,
      value,
    );
    this.logger.log(
      `Updated arrecadado for ONG ${ongId}, row ${rowIndex}: ${value}`,
    );

    await this.syncOng(ongId).catch((error) =>
      this.logger.error(
        `Failed to sync needs after update for ONG ${ongId}: ${String(error)}`,
      ),
    );
  }

  async syncOng(ongId: string): Promise<void> {
    const ong = await this.ongsService.findById(ongId);
    if (!ong.spreadsheetId) return;
    await this.syncOngNeeds(ong);
  }

  async syncAllOngs(): Promise<void> {
    if (this.syncInProgress) {
      this.logger.warn('Needs sync already in progress, skipping');
      return;
    }

    this.syncInProgress = true;
    try {
      const ongs = await this.ongsService.findAll();
      for (const ong of ongs) {
        if (!ong.spreadsheetId) continue;
        await this.syncOngNeeds(ong).catch((error: unknown) => {
          this.logger.error(
            `Failed to sync needs for ONG ${ong.id}: ${String(error)}`,
          );
        });
      }
      this.logger.log('Needs cache synchronized from spreadsheets');
    } finally {
      this.syncInProgress = false;
    }
  }

  private async getCachedNeeds(ongId: string): Promise<NeedResponseDto[]> {
    const doc = await this.firebaseService
      .collection(NEEDS_COLLECTION)
      .doc(ongId)
      .get();

    if (!doc.exists) return [];

    const data = doc.data() as { needs?: NeedResponseDto[] } | undefined;
    return Array.isArray(data?.needs) ? data!.needs : [];
  }

  private async syncOngNeeds(ong: {
    id: string;
    name: string;
    category: string;
    spreadsheetId?: string;
  }): Promise<void> {
    if (!ong.spreadsheetId || !this.sheetsService.isConfigured()) return;

    const needs = await this.sheetsService.readNeeds(ong.spreadsheetId);
    await this.writeNeedsToCache(ong, needs);

    this.logger.log(
      `Synced ${needs.length} needs for ONG ${ong.id} (${ong.name})`,
    );
  }

  private async writeNeedsToCache(
    ong: {
      id: string;
      name: string;
      category: string;
      spreadsheetId?: string;
    },
    needs: SheetRow[],
  ): Promise<void> {
    const docRef = this.firebaseService.collection(NEEDS_COLLECTION).doc(ong.id);
    await docRef.set(
      {
        ongId: ong.id,
        ongName: ong.name,
        category: ong.category,
        spreadsheetId: ong.spreadsheetId,
        needs,
        syncedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }
}
