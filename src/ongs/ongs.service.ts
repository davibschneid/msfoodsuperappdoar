import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { CreateOngDto, UpdateOngDto, OngResponseDto } from './dto/ong.dto';

@Injectable()
export class OngsService {
  private readonly logger = new Logger(OngsService.name);
  private readonly COLLECTION = 'ongs';

  constructor(private readonly firebaseService: FirebaseService) {}

  private toResponse(
    id: string,
    data: Record<string, unknown>,
  ): OngResponseDto {
    return {
      id,
      name: (data.name as string) ?? '',
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
      description: (data.description as string) ?? '',
      emoji: (data.emoji as string) ?? '',
      acceptedItems: (data.acceptedItems as string[]) ?? [],
      latitude: (data.latitude as number) ?? 0,
      longitude: (data.longitude as number) ?? 0,
      category: (data.category as string) ?? '',
      createdAt: (data.createdAt as string) ?? '',
      updatedAt: (data.updatedAt as string) ?? '',
    };
  }

  async create(dto: CreateOngDto): Promise<OngResponseDto> {
    if (dto.spreadsheetId) {
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
      name: dto.name,
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
      description: dto.description ?? '',
      emoji: dto.emoji ?? '',
      acceptedItems: dto.acceptedItems ?? [],
      latitude: dto.latitude ?? 0,
      longitude: dto.longitude ?? 0,
      category: dto.category,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await this.firebaseService
      .collection(this.COLLECTION)
      .add(docData);

    this.logger.log(`ONG created: ${docRef.id} (${dto.name})`);

    return this.toResponse(docRef.id, docData);
  }

  async findAll(): Promise<OngResponseDto[]> {
    const snapshot = await this.firebaseService
      .collection(this.COLLECTION)
      .where('category', '==', 'food')
      .get();

    return snapshot.docs
      .map((doc) => this.toResponse(doc.id, doc.data() as Record<string, unknown>))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
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

  async update(id: string, dto: UpdateOngDto): Promise<OngResponseDto> {
    const docRef = this.firebaseService.collection(this.COLLECTION).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      throw new NotFoundException(`ONG ${id} não encontrada`);
    }

    const updateData: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };

    if (dto.name !== undefined) updateData.name = dto.name;
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
      updateData.description = dto.description;
    if (dto.emoji !== undefined) updateData.emoji = dto.emoji;
    if (dto.acceptedItems !== undefined)
      updateData.acceptedItems = dto.acceptedItems;
    if (dto.latitude !== undefined) updateData.latitude = dto.latitude;
    if (dto.longitude !== undefined) updateData.longitude = dto.longitude;

    await docRef.update(updateData);

    this.logger.log(`ONG updated: ${id}`);

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
    this.logger.log(`ONG deleted: ${id}`);
  }
}
