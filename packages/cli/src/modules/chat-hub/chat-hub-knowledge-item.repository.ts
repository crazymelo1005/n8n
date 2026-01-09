import { Service } from '@n8n/di';
import { DataSource, EntityManager, Repository } from '@n8n/typeorm';

import { ChatHubKnowledgeItem } from './chat-hub-knowledge-item.entity';

@Service()
export class ChatHubKnowledgeItemRepository extends Repository<ChatHubKnowledgeItem> {
	constructor(dataSource: DataSource) {
		super(ChatHubKnowledgeItem, dataSource.manager);
	}

	async createKnowledgeItem(
		knowledgeItem: Partial<ChatHubKnowledgeItem> & Pick<ChatHubKnowledgeItem, 'id'>,
		trx?: EntityManager,
	) {
		const em = trx ?? this.manager;
		await em.insert(ChatHubKnowledgeItem, knowledgeItem);
		return await em.findOneOrFail(ChatHubKnowledgeItem, {
			where: { id: knowledgeItem.id },
		});
	}

	async deleteKnowledgeItem(id: string, trx?: EntityManager) {
		const em = trx ?? this.manager;
		return await em.delete(ChatHubKnowledgeItem, { id });
	}

	async getManyByUserId(userId: string) {
		return await this.find({
			where: { ownerId: userId },
			order: { createdAt: 'DESC' },
		});
	}

	async getOneById(id: string, userId: string, trx?: EntityManager) {
		const em = trx ?? this.manager;
		return await em.findOne(ChatHubKnowledgeItem, {
			where: { id, ownerId: userId },
		});
	}

	async getManyByIdsAndUserId(ids: string[], userId: string, trx?: EntityManager) {
		if (ids.length === 0) {
			return [];
		}

		const em = trx ?? this.manager;
		return await em.find(ChatHubKnowledgeItem, {
			where: ids.map((id) => ({ id, ownerId: userId })),
		});
	}
}
