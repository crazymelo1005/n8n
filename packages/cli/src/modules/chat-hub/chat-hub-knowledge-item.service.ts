import type { ChatAttachment } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import type { IBinaryData } from 'n8n-workflow';
import { v4 as uuidv4 } from 'uuid';

import { NotFoundError } from '@/errors/response-errors/not-found.error';

import type { ChatHubKnowledgeItem } from './chat-hub-knowledge-item.entity';
import { ChatHubKnowledgeItemRepository } from './chat-hub-knowledge-item.repository';
import { ChatHubAttachmentService } from './chat-hub.attachment.service';

@Service()
export class ChatHubKnowledgeItemService {
	constructor(
		private readonly logger: Logger,
		private readonly knowledgeItemRepository: ChatHubKnowledgeItemRepository,
		private readonly chatHubAttachmentService: ChatHubAttachmentService,
	) {}

	async getKnowledgeItemsByUserId(userId: string): Promise<ChatHubKnowledgeItem[]> {
		return await this.knowledgeItemRepository.getManyByUserId(userId);
	}

	async getKnowledgeItemById(id: string, userId: string): Promise<ChatHubKnowledgeItem> {
		const knowledgeItem = await this.knowledgeItemRepository.getOneById(id, userId);
		if (!knowledgeItem) {
			throw new NotFoundError('Knowledge item not found');
		}
		return knowledgeItem;
	}

	async createKnowledgeItem(
		user: User,
		attachment: ChatAttachment | null,
	): Promise<ChatHubKnowledgeItem> {
		const id = uuidv4();
		let storedAttachment: IBinaryData | null = null;

		// Store attachment file through BinaryDataService if provided
		if (attachment) {
			storedAttachment = await this.chatHubAttachmentService.storeKnowledgeItemAttachment(
				id,
				attachment,
			);
		}

		try {
			const knowledgeItem = await this.knowledgeItemRepository.createKnowledgeItem({
				id,
				type: 'attachment',
				ownerId: user.id,
				attachment: storedAttachment,
			});

			this.logger.debug(`Knowledge item created: ${id} by user ${user.id}`);
			return knowledgeItem;
		} catch (error) {
			// Rollback: delete the stored attachment file if database creation failed
			if (storedAttachment) {
				try {
					await this.chatHubAttachmentService.deleteAttachments([storedAttachment]);
				} catch (cleanupError) {
					this.logger.error(
						`Failed to clean up attachment file for knowledge item ${id}: ${cleanupError}`,
					);
				}
			}
			throw error;
		}
	}

	async deleteKnowledgeItem(id: string, userId: string): Promise<void> {
		// First check if the knowledge item exists and belongs to the user
		const existingItem = await this.knowledgeItemRepository.getOneById(id, userId);
		if (!existingItem) {
			throw new NotFoundError('Knowledge item not found');
		}

		// Delete the attachment file first
		await this.chatHubAttachmentService.deleteKnowledgeItemAttachmentById(id);

		// Then delete the database record
		await this.knowledgeItemRepository.deleteKnowledgeItem(id);

		this.logger.debug(`Knowledge item deleted: ${id} by user ${userId}`);
	}
}
