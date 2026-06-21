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
      street: dto.street,
      number: dto.number,
      complement: dto.complement ?? '',
      referencePoint: dto.referencePoint ?? '',
      shareData: dto.shareData,
      spreadsheetId: dto.spreadsheetId ?? '',
      category: dto.category,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await this.firebaseService
      .collection(this.COLLECTION)
      .add(docData);

    this.logger.log(`ONG created: ${docRef.id} (${dto.name})`);

    return { id: docRef.id, ...docData };
  }

  async findAll(): Promise<OngResponseDto[]> {
    const snapshot = await this.firebaseService
      .collection(this.COLLECTION)
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<OngResponseDto, 'id'>),
    }));
  }

  async findById(id: string): Promise<OngResponseDto> {
    const doc = await this.firebaseService
      .collection(this.COLLECTION)
      .doc(id)
      .get();

    if (!doc.exists) {
      throw new NotFoundException(`ONG ${id} não encontrada`);
    }

    return { id: doc.id, ...(doc.data() as Omit<OngResponseDto, 'id'>) };
  }

  async findBySpreadsheetId(
    spreadsheetId: string,
  ): Promise<OngResponseDto> {
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
    return { id: doc.id, ...(doc.data() as Omit<OngResponseDto, 'id'>) };
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
    if (dto.street !== undefined) updateData.street = dto.street;
    if (dto.number !== undefined) updateData.number = dto.number;
    if (dto.complement !== undefined) updateData.complement = dto.complement;
    if (dto.referencePoint !== undefined)
      updateData.referencePoint = dto.referencePoint;
    if (dto.shareData !== undefined) updateData.shareData = dto.shareData;
    if (dto.spreadsheetId !== undefined)
      updateData.spreadsheetId = dto.spreadsheetId;

    await docRef.update(updateData);

    this.logger.log(`ONG updated: ${id}`);

    const updated = await docRef.get();
    return {
      id: updated.id,
      ...(updated.data() as Omit<OngResponseDto, 'id'>),
    };
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
