import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { FieldPath } from 'firebase-admin/firestore';
import { FirebaseService } from '../firebase/firebase.service';
import { OngsService } from '../ongs/ongs.service';

type Input = { item: string; meta: number; arrecadado: number; unidade: string; urgencia: string };

@Injectable()
export class PortalNeedsService {
  private readonly category = 'food';
  constructor(private readonly firebase: FirebaseService, private readonly ongs: OngsService) {}

  private async partner(id: string) {
    const ong = await this.ongs.findById(id);
    if (ong.category !== this.category) throw new NotFoundException('ONG não encontrada nesta categoria');
    return ong;
  }

  async list(partnerId: string, cursor?: string) {
    await this.partner(partnerId);
    let query = this.firebase.collection('partner_needs').where('partnerId', '==', partnerId).orderBy(FieldPath.documentId());
    if (cursor) { this.id(cursor); query = query.startAfter(cursor); }
    const snapshot = await query.limit(51).get();
    const docs = snapshot.docs.slice(0, 50);
    return { items: docs.map(doc => { const { fingerprint, ...record } = doc.data(); return { id: doc.id, ...record }; }), nextCursor: snapshot.size > 50 ? docs[49].id : null };
  }

  async create(partnerId: string, actorUid: string, requestId: string, input: Input) {
    this.id(requestId);
    if (!input || typeof input.item !== 'string' || !input.item.trim() || input.item.length > 50 || /[<>\u0000-\u001f]/.test(input.item)) throw new BadRequestException('Item inválido: use texto simples com até 50 caracteres');
    if (!Number.isFinite(input.meta) || input.meta <= 0 || !Number.isFinite(input.arrecadado) || input.arrecadado < 0 || !['un.', 'kg', 'L', 'cx', 'pct'].includes(input.unidade) || !['Alta', 'Média', 'Baixa'].includes(input.urgencia) || !actorUid?.trim()) throw new BadRequestException('Dados inválidos');
    const payload = { item: input.item.trim(), meta: input.meta, arrecadado: input.arrecadado, unidade: input.unidade, urgencia: input.urgencia };
    return this.mutate(partnerId, actorUid, requestId, payload);
  }

  async setStatus(partnerId: string, actorUid: string, id: string, status: 'Ativa' | 'Concluída') {
    this.id(id);
    if (!actorUid?.trim() || !['Ativa', 'Concluída'].includes(status)) throw new BadRequestException('Operação inválida');
    return this.mutate(partnerId, actorUid, id, undefined, status);
  }

  private async mutate(partnerId: string, actorUid: string, id: string, input?: Input, status?: string) {
    const ong = await this.partner(partnerId);
    const ref = this.firebase.collection('partner_needs').doc(id);
    const projectionRef = this.firebase.collection('ongNeeds').doc(partnerId);
    const eventRef = this.firebase.collection('partner_events').doc();
    const fingerprint = input ? createHash('sha256').update(JSON.stringify(input)).digest('hex') : null;
    return this.firebase.getFirestore().runTransaction(async tx => {
      const current = (await tx.get(ref)).data();
      if (input && current) {
        if (current.partnerId !== partnerId || current.category !== this.category || current.createdBy !== actorUid || current.fingerprint !== fingerprint) throw new ConflictException('Identificador da operação já utilizado');
        return { id, ...current };
      }
      if (!input && (!current || current.partnerId !== partnerId || current.category !== this.category)) throw new NotFoundException('Necessidade não encontrada');
      if (!input && current!.status === status) return { id, ...current };
      const projection = (await tx.get(projectionRef)).data();
      if (projection && projection.source !== 'portal' && (!Array.isArray(projection.needs) || projection.needs.length)) throw new ConflictException('Migre as necessidades da planilha antes de usar o portal');
      const now = new Date().toISOString();
      const nextStatus = status ?? (input!.arrecadado >= input!.meta ? 'Concluída' : 'Ativa');
      const record = { ...(current ?? {}), ...(input ?? {}), partnerId, category: this.category, status: nextStatus, updatedAt: now, version: (current?.version ?? 0) + 1, ...(input ? { fingerprint, createdAt: now, createdBy: actorUid } : {}), ...(nextStatus === 'Concluída' ? { concludedAt: now } : !input ? { reopenedAt: now } : {}) };
      const needs = (projection?.needs ?? []).filter((need: { id: string }) => need.id !== id);
      if (nextStatus === 'Ativa') {
        const date = new Date(now);
        const values = record as unknown as Input;
        needs.push({ id, item: values.item, meta: values.meta, arrecadado: values.arrecadado, unidade: values.unidade, urgencia: values.urgencia, status: values.arrecadado > 0 ? 'Em Andamento' : 'Pendente', ativo: 'Ativo', dataAtualizacao: date.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }), horaAtualizacao: date.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' }) });
      }
      if (needs.length > 500 || Buffer.byteLength(JSON.stringify(needs)) > 700000) throw new ConflictException('Limite de necessidades ativas atingido');
      tx.set(ref, record);
      tx.create(eventRef, { partnerId, entityType: 'need', entityId: id, eventType: input ? 'created' : nextStatus === 'Ativa' ? 'reopened' : 'concluded', actorUid, occurredAt: now, source: 'portal', version: record.version, changes: input ?? { previousStatus: current!.status, status: nextStatus } });
      tx.set(projectionRef, { ongId: partnerId, ongName: ong.name, category: this.category, source: 'portal', needs, updatedAt: now });
      return { id, ...record };
    });
  }

  private id(id: string) {
    if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(id)) throw new BadRequestException('Identificador inválido');
  }
}
