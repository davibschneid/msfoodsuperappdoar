import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { CreateOngDto, UpdateOngDto, OngResponseDto } from './dto/ong.dto';
import { GoogleSheetsService, SheetRow } from '../google-sheets/google-sheets.service';

const CACHE_TTL_MS = 30 * 60 * 1000;

@Injectable()
export class OngsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(OngsService.name);
  private readonly COLLECTION = 'ongs';
  private readonly CATEGORY = 'food';
  private cachedOngs: OngResponseDto[] | null = null;
  private cacheExpiresAt = 0;
  private cachedVersion: number | null = null;
  private cacheLoad: Promise<OngResponseDto[]> | null = null;
  private cacheGeneration = 0;

  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly googleSheets: GoogleSheetsService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.getCachedOngs().catch((error) =>
      this.logger.warn(`Falha ao aquecer cache de ONGs: ${error}`),
    );
  }

  private dateToString(value: unknown): string {
    if (typeof value === 'string') return value;
    if (value && typeof (value as { toDate?: unknown }).toDate === 'function') return (value as { toDate: () => Date }).toDate().toISOString();
    return '';
  }

  private sanitizeDescription(value: string): string {
    return value.replace(/\\b/g, '').replace(/\\B/g, '');
  }

  private toResponse(
    id: string,
    data: Record<string, unknown>,
  ): OngResponseDto {
    return {
      id,
      cnpj: (data.cnpj as string) ?? '',
      name: (data.name as string) ?? '',
      email: (data.email as string) ?? '',
      cep: (data.cep as string) ?? '',
      city: (data.city as string) ?? '',
      state: (data.state as string) ?? '',
      neighborhood: (data.neighborhood as string) ?? '',
      address: ((data.address ?? data.street ?? '') as string),
      number: (data.number as string) ?? '',
      complement: (data.complement as string) ?? '',
      referencePoint: (data.referencePoint as string) ?? '',
      shareData: (data.shareData as boolean) ?? false,
      spreadsheetId: (data.spreadsheetId as string) ?? '',
      description: this.sanitizeDescription((data.description as string) ?? ''),
      emoji: (data.emoji as string) ?? '',
      acceptedItems: (data.acceptedItems as string[]) ?? [],
      latitude: (data.latitude as number) ?? 0,
      longitude: (data.longitude as number) ?? 0,
      category: (data.category as string) ?? '',
      status: (data.status as string) ?? 'PRE_CADASTRADA',
      dataCredenciamento: this.dateToString(data.dataCredenciamento),
      createdAt: this.dateToString(data.createdAt),
      updatedAt: this.dateToString(data.updatedAt),
    };
  }

  async create(dto: CreateOngDto): Promise<OngResponseDto> {
    const preRegistered = await this.findByCnpj(dto.cnpj).catch(() => null);

    if (preRegistered) {
      return this.update(preRegistered.id, dto as UpdateOngDto);
    }

    if (dto.spreadsheetId) {
      await this.googleSheets.assertValidSpreadsheet(dto.spreadsheetId);
      const existing = await this.findBySpreadsheetId(dto.spreadsheetId).catch(
        () => null,
      );
      if (existing) {
        throw new ConflictException(
          `Planilha ${dto.spreadsheetId} já cadastrada`,
        );
      }
    }

    const now = new Date().toISOString();
    const docData = {
      cnpj: dto.cnpj,
      name: dto.name,
      email: dto.email ?? '',
      cep: dto.cep,
      city: dto.city,
      state: dto.state,
      neighborhood: dto.neighborhood,
      address: dto.address,
      number: dto.number,
      complement: dto.complement ?? '',
      referencePoint: dto.referencePoint ?? '',
      shareData: dto.shareData,
      spreadsheetId: dto.spreadsheetId ?? '',
      description: this.sanitizeDescription(dto.description ?? ''),
      emoji: dto.emoji ?? '',
      acceptedItems: dto.acceptedItems ?? [],
      latitude: dto.latitude ?? 0,
      longitude: dto.longitude ?? 0,
      category: dto.category,
      status: dto.spreadsheetId ? 'CREDENCIADA' : 'PRE_CADASTRADA',
      dataCredenciamento: dto.spreadsheetId ? now : '',
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await this.firebaseService
      .collection(this.COLLECTION)
      .add(docData);
    this.invalidateCache();

    this.logger.log(`ONG created: ${docRef.id} (${dto.name})`);

    await this.firebaseService.incrementCatalogVersion(this.CATEGORY);

    return this.toResponse(docRef.id, docData);
  }

  async findAll(): Promise<OngResponseDto[]> {
    return [...(await this.getCachedOngs())];
  }

  async findById(id: string): Promise<OngResponseDto> {
    const doc = await this.firebaseService
      .collection(this.COLLECTION)
      .doc(id)
      .get();

    if (!doc.exists) {
      throw new NotFoundException(`ONG ${id} não encontrada`);
    }

    return this.toResponse(doc.id, doc.data() as Record<string, unknown>);
  }

  async findBySpreadsheetId(spreadsheetId: string): Promise<OngResponseDto> {
    const snapshot = await this.firebaseService
      .collection(this.COLLECTION)
      .where('spreadsheetId', '==', spreadsheetId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      throw new NotFoundException(
        `ONG com planilha ${spreadsheetId} não encontrada`,
      );
    }

    const doc = snapshot.docs[0];
    return this.toResponse(doc.id, doc.data() as Record<string, unknown>);
  }

  async findByCnpj(cnpj: string): Promise<OngResponseDto> {
    const snapshot = await this.firebaseService
      .collection(this.COLLECTION)
      .where('cnpj', '==', cnpj)
      .where('category', '==', this.CATEGORY)
      .limit(1)
      .get();
    const matching = snapshot.docs[0];

    if (!matching) {
      throw new NotFoundException(
        `ONG com CNPJ ${cnpj} não encontrada`,
      );
    }

    return this.toResponse(matching.id, matching.data() as Record<string, unknown>);
  }

  async update(id: string, dto: UpdateOngDto): Promise<OngResponseDto> {
    const docRef = this.firebaseService.collection(this.COLLECTION).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      throw new NotFoundException(`ONG ${id} não encontrada`);
    }

    const current = doc.data() as Record<string, unknown>;
    const spreadsheetChanged =
      dto.spreadsheetId !== undefined && dto.spreadsheetId !== current.spreadsheetId;
    if (spreadsheetChanged && dto.spreadsheetId) {
      await this.googleSheets.assertValidSpreadsheet(dto.spreadsheetId);
      const existing = await this.findBySpreadsheetId(dto.spreadsheetId).catch(() => null);
      if (existing && existing.id !== id) throw new ConflictException(`Planilha ${dto.spreadsheetId} já cadastrada`);
    }
    const updateData: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (spreadsheetChanged) {
      updateData.status = dto.spreadsheetId ? 'CREDENCIADA' : 'PRE_CADASTRADA';
      updateData.dataCredenciamento = dto.spreadsheetId ? new Date().toISOString() : '';
    }

    if (dto.cnpj !== undefined) updateData.cnpj = dto.cnpj;
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.email !== undefined) updateData.email = dto.email;
    if (dto.cep !== undefined) updateData.cep = dto.cep;
    if (dto.city !== undefined) updateData.city = dto.city;
    if (dto.state !== undefined) updateData.state = dto.state;
    if (dto.neighborhood !== undefined)
      updateData.neighborhood = dto.neighborhood;
    if (dto.address !== undefined) updateData.address = dto.address;
    if (dto.number !== undefined) updateData.number = dto.number;
    if (dto.complement !== undefined) updateData.complement = dto.complement;
    if (dto.referencePoint !== undefined)
      updateData.referencePoint = dto.referencePoint;
    if (dto.shareData !== undefined) updateData.shareData = dto.shareData;
    if (dto.spreadsheetId !== undefined)
      updateData.spreadsheetId = dto.spreadsheetId;
    if (dto.description !== undefined)
      updateData.description = this.sanitizeDescription(dto.description);
    if (dto.emoji !== undefined) updateData.emoji = dto.emoji;
    if (dto.acceptedItems !== undefined)
      updateData.acceptedItems = dto.acceptedItems;
    if (dto.latitude !== undefined) updateData.latitude = dto.latitude;
    if (dto.longitude !== undefined) updateData.longitude = dto.longitude;

    await docRef.update(updateData);
    this.invalidateCache();

    this.logger.log(`ONG updated: ${id}`);

    await this.firebaseService.incrementCatalogVersion(this.CATEGORY);

    const updated = await docRef.get();
    return this.toResponse(updated.id, updated.data() as Record<string, unknown>);
  }

  async delete(id: string): Promise<void> {
    const docRef = this.firebaseService.collection(this.COLLECTION).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      throw new NotFoundException(`ONG ${id} não encontrada`);
    }

    await docRef.delete();
    this.invalidateCache();
    this.logger.log(`ONG deleted: ${id}`);

    await this.firebaseService.incrementCatalogVersion(this.CATEGORY);
  }

  async getAllNeeds(): Promise<unknown[]> {
    const ongs = await this.findAll();
    const results: unknown[] = [];

    for (const ong of ongs) {
      if (!ong.spreadsheetId) continue;

      const needs = (await this.getCachedNeedsFromFirestore(ong.id)).filter(
        (n) => n.ativo === 'Ativo',
      );
      if (needs.length > 0) {
        results.push({ ongId: ong.id, ongName: ong.name, needs });
      }
    }

    return results;
  }

  async getNeedsByOngId(id: string): Promise<unknown> {
    const ong = await this.findById(id);
    if (!ong.spreadsheetId) {
      return { ongId: id, ongName: ong.name, needs: [] };
    }
    const needs = (await this.getCachedNeedsFromFirestore(id)).filter(
      (n) => n.ativo === 'Ativo',
    );
    return { ongId: id, ongName: ong.name, needs };
  }

  private async getCachedNeedsFromFirestore(ongId: string): Promise<SheetRow[]> {
    try {
      const doc = await this.firebaseService
        .collection('ongNeeds')
        .doc(ongId)
        .get();
      if (!doc.exists) return [];
      const data = doc.data() as { needs?: SheetRow[] } | undefined;
      return Array.isArray(data?.needs) ? data!.needs : [];
    } catch (error: unknown) {
      const err = error as { message?: string };
      this.logger.warn(
        `Failed to read cached needs for ONG ${ongId}: ${err.message}`,
      );
      return [];
    }
  }

  private async getCachedOngs(): Promise<OngResponseDto[]> {
    const version = await this.firebaseService.getCatalogVersion(this.CATEGORY);
    if (this.cachedOngs && this.cachedVersion === version && Date.now() < this.cacheExpiresAt) {
      return this.cachedOngs;
    }
    if (this.cacheLoad) return this.cacheLoad;

    const generation = this.cacheGeneration;
    const load = this.firebaseService
      .collection(this.COLLECTION)
      .where('category', '==', this.CATEGORY)
      .get()
      .then((snapshot) => {
        const records = snapshot.docs
          .map((doc) =>
            this.toResponse(doc.id, doc.data() as Record<string, unknown>),
          )
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        if (generation === this.cacheGeneration) {
          this.cachedOngs = records;
          this.cachedVersion = version;
          this.cacheExpiresAt = Date.now() + CACHE_TTL_MS;
        }
        return records;
      })
      .finally(() => {
        if (this.cacheLoad === load) this.cacheLoad = null;
      });
    this.cacheLoad = load;
    return load;
  }

  private invalidateCache(): void {
    this.cachedOngs = null;
    this.cachedVersion = null;
    this.cacheExpiresAt = 0;
    this.cacheLoad = null;
    this.cacheGeneration += 1;
  }

  async updateArrecadado(
    ongId: string,
    rowIndex: number,
    value: number,
  ): Promise<void> {
    const ong = await this.findById(ongId);
    if (!ong.spreadsheetId) {
      throw new NotFoundException(`ONG ${ongId} não possui planilha`);
    }
    await this.googleSheets.updateArrecadado(ong.spreadsheetId, rowIndex, value);
  }
}
