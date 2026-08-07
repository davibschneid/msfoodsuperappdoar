import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FirebaseService } from '../firebase/firebase.service';

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);
  private readonly COLLECTION = 'ongs';

  constructor(
    private readonly configService: ConfigService,
    private readonly firebaseService: FirebaseService,
  ) {}

  async onModuleInit() {
    const autoSeed = this.configService.get<string>('AUTO_SEED');
    if (autoSeed !== 'true') return;

    const snapshot = await this.firebaseService
      .collection(this.COLLECTION)
      .limit(1)
      .get();

    if (!snapshot.empty) {
      this.logger.log('ONGs collection already has data, skipping seed');
      return;
    }

    this.logger.log('Seeding ONGs de alimentos...');

    const now = new Date().toISOString();
    const ongs = [
      {
        name: 'Banco de Alimentos RS',
        cep: '90010001',
        city: 'Porto Alegre',
        state: 'RS',
        neighborhood: 'Centro Histórico',
        street: 'Av. Borges de Medeiros',
        number: '1501',
        complement: 'Galpão 2',
        referencePoint: 'Próximo ao Parque Farroupilha',
        shareData: true,
        spreadsheetId: 'mock-spreadsheet-banco-alimentos',
        category: 'food',
        latitude: -30.0403255,
        longitude: -51.2311931,
        createdAt: now,
        updatedAt: now,
      },
      {
        name: 'ONG Prato Cheio',
        cep: '90040191',
        city: 'Porto Alegre',
        state: 'RS',
        neighborhood: 'Cidade Baixa',
        street: 'Rua da República',
        number: '450',
        complement: '',
        referencePoint: 'Próximo ao Zaffari',
        shareData: true,
        spreadsheetId: 'mock-spreadsheet-prato-cheio',
        category: 'food',
        latitude: -30.0383442,
        longitude: -51.2231435,
        createdAt: now,
        updatedAt: now,
      },
      {
        name: 'Cozinha Comunitária Esperança',
        cep: '91040000',
        city: 'Porto Alegre',
        state: 'RS',
        neighborhood: 'Restinga',
        street: 'Estrada João Antônio da Silveira',
        number: '1200',
        complement: '',
        referencePoint: 'Próximo à escola municipal',
        shareData: false,
        spreadsheetId: '',
        category: 'food',
        latitude: -30.157478,
        longitude: -51.1449568,
        createdAt: now,
        updatedAt: now,
      },
    ];

    for (const ong of ongs) {
      await this.firebaseService.collection(this.COLLECTION).add(ong);
      this.logger.log(`Seeded ONG: ${ong.name}`);
    }

    this.logger.log('Seed completed');
  }
}
