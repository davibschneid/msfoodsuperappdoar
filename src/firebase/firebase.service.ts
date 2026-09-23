import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { initializeApp, cert, App } from 'firebase-admin/app';
import {
  getFirestore,
  Firestore,
  CollectionReference,
  FieldValue,
} from 'firebase-admin/firestore';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name);
  private db: Firestore;
  private app: App;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const projectId = this.configService.get<string>('FIREBASE_PROJECT_ID');
    const credentialPath = this.configService.get<string>(
      'GOOGLE_APPLICATION_CREDENTIALS',
    );

    if (credentialPath) {
      this.app = initializeApp({
        credential: cert(credentialPath),
        projectId,
      });
      this.logger.log('Firebase initialized with service account credentials');
    } else if (projectId) {
      this.app = initializeApp({ projectId });
      this.logger.log(
        `Firebase initialized with project ID: ${projectId} (ADC)`,
      );
    } else {
      this.app = initializeApp({
        projectId: 'doar-dev-local',
      });
      this.logger.warn(
        'Firebase initialized with local dev project (doar-dev-local).',
      );
    }

    this.db = getFirestore(this.app);
  }

  getFirestore(): Firestore {
    return this.db;
  }

  collection(name: string): CollectionReference {
    return this.db.collection(name);
  }

  async getCatalogVersion(category: 'clothes' | 'food' | 'furniture' | 'pets'): Promise<number> {
    const snapshot = await this.db.collection('configuracaoApp').doc('catalogos').get();
    const value = snapshot.get(`ongs.${category}Version`);
    return typeof value === 'number' ? value : 0;
  }

  async incrementCatalogVersion(
    category: 'clothes' | 'food' | 'furniture' | 'pets',
  ): Promise<void> {
    const versionField = `${category}Version`;
    await this.db.collection('configuracaoApp').doc('catalogos').set(
      {
        ongs: {
          [versionField]: FieldValue.increment(1),
        },
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }

  private readonly DEFAULT_CACHE_CHECK_PLANILHA_ONG_MINUTES = 60;

  async getCacheCheckPlanilhaOngMinutes(): Promise<number> {
    const docRef = this.db.collection('configuracaoApp').doc('catalogos');
    const snapshot = await docRef.get();
    const value = (snapshot.data() ?? {})
      .cacheCheckPlanilhaOngMinutes as unknown;
    if (typeof value === 'number' && value > 0) {
      return value;
    }
    await docRef.set(
      {
        cacheCheckPlanilhaOngMinutes: this.DEFAULT_CACHE_CHECK_PLANILHA_ONG_MINUTES,
      },
      { merge: true },
    );
    return this.DEFAULT_CACHE_CHECK_PLANILHA_ONG_MINUTES;
  }
}
