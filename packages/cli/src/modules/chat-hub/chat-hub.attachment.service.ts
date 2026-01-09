import type { ChatMessageId, ChatSessionId, ChatAttachment } from '@n8n/api-types';
import { Service } from '@n8n/di';
import { Not, IsNull } from '@n8n/typeorm';
import type { EntityManager } from '@n8n/typeorm';
import { sanitizeFilename } from '@n8n/utils';
import { BinaryDataService, FileLocation } from 'n8n-core';
import { BINARY_ENCODING, type IBinaryData } from 'n8n-workflow';
import type Stream from 'node:stream';

import { ChatHubMessageRepository } from './chat-message.repository';
import { ChatHubKnowledgeItemRepository } from './chat-hub-knowledge-item.repository';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

@Service()
export class ChatHubAttachmentService {
	private readonly maxTotalSizeBytes = 200 * 1024 * 1024; // 200 MB
	private readonly maxKnowledgeItemSizeBytes = 50 * 1024 * 1024; // 50 MB per knowledge item

	constructor(
		private readonly binaryDataService: BinaryDataService,
		private readonly messageRepository: ChatHubMessageRepository,
		private readonly knowledgeItemRepository: ChatHubKnowledgeItemRepository,
	) {}

	/**
	 * Stores message attachments through BinaryDataService.
	 * This populates the 'id' and other metadata for attachments. When external storage is used,
	 * BinaryDataService replaces base64 data with the storage mode string (e.g., "filesystem-v2").
	 */
	async storeMessageAttachments(
		sessionId: ChatSessionId,
		messageId: ChatMessageId,
		attachments: ChatAttachment[],
	): Promise<IBinaryData[]> {
		let totalSize = 0;
		const storedAttachments: IBinaryData[] = [];

		for (const attachment of attachments) {
			const buffer = Buffer.from(attachment.data, BINARY_ENCODING);
			totalSize += buffer.length;

			if (totalSize > this.maxTotalSizeBytes) {
				const maxSizeMB = Math.floor(this.maxTotalSizeBytes / (1024 * 1024));

				throw new BadRequestError(
					`Total size of attachments exceeds maximum size of ${maxSizeMB} MB`,
				);
			}

			const stored = await this.processMessageAttachment(sessionId, messageId, attachment, buffer);
			storedAttachments.push(stored);
		}

		return storedAttachments;
	}

	/**
	 * Gets a specific message attachment by index and returns it as either buffer or stream
	 */
	async getMessageAttachment(
		sessionId: ChatSessionId,
		messageId: ChatMessageId,
		attachmentIndex: number,
	): Promise<
		[
			IBinaryData,
			(
				| { type: 'buffer'; buffer: Buffer<ArrayBufferLike>; fileSize: number }
				| { type: 'stream'; stream: Stream.Readable; fileSize: number }
			),
		]
	> {
		const message = await this.messageRepository.getOneById(messageId, sessionId, []);

		if (!message) {
			throw new NotFoundError('Message not found');
		}

		const attachment = message.attachments?.[attachmentIndex];

		if (!attachment) {
			throw new NotFoundError('Attachment not found');
		}

		if (attachment.id) {
			const metadata = await this.binaryDataService.getMetadata(attachment.id);
			const stream = await this.binaryDataService.getAsStream(attachment.id);

			return [attachment, { type: 'stream', stream, fileSize: metadata.fileSize }];
		}

		if (attachment.data) {
			const buffer = await this.binaryDataService.getAsBuffer(attachment);

			return [attachment, { type: 'buffer', buffer, fileSize: buffer.length }];
		}

		throw new NotFoundError('Attachment has no stored file');
	}

	/**
	 * Deletes all message attachments in a session
	 */
	async deleteAllMessageAttachmentsBySessionId(
		sessionId: string,
		trx?: EntityManager,
	): Promise<void> {
		const messages = await this.messageRepository.getManyBySessionId(sessionId, trx);
		// Attachment deletion cannot be rolled back, and the transaction doesn't cover it.
		await this.deleteAttachments(messages.flatMap((message) => message.attachments ?? []));
	}

	/**
	 * Deletes all message attachment files across all sessions
	 */
	async deleteAllMessageAttachments(): Promise<void> {
		const messages = await this.messageRepository.find({
			where: {
				attachments: Not(IsNull()),
			},
			select: ['attachments'],
		});

		await this.deleteAttachments(messages.flatMap((message) => message.attachments ?? []));
	}

	/**
	 * Deletes attachments by their binary data directly.
	 * Used for both message and knowledge item attachments.
	 * Useful for rollback when creation fails.
	 */
	async deleteAttachments(attachments: IBinaryData[]): Promise<void> {
		await this.binaryDataService.deleteManyByBinaryDataId(
			attachments.flatMap((attachment) => (attachment.id ? [attachment.id] : [])),
		);
	}

	/**
	 * Converts attachment binary data to a data URL.
	 * Used for both message and knowledge item attachments.
	 */
	async getDataUrl(binaryData: IBinaryData): Promise<string> {
		if (binaryData.data.startsWith('data:')) {
			return binaryData.data;
		}

		const buffer = await this.binaryDataService.getAsBuffer(binaryData);
		const base64Data = buffer.toString(BINARY_ENCODING);
		const mimeType = binaryData.mimeType || 'application/octet-stream';

		return `data:${mimeType};base64,${base64Data}`;
	}

	/**
	 * Gets attachment binary data as a buffer.
	 * Used for both message and knowledge item attachments.
	 */
	async getAsBuffer(binaryData: IBinaryData): Promise<Buffer<ArrayBufferLike>> {
		return await this.binaryDataService.getAsBuffer(binaryData);
	}

	/**
	 * Stores a knowledge item attachment through BinaryDataService.
	 * This populates the 'id' and other metadata for the attachment. When external storage is used,
	 * BinaryDataService replaces base64 data with the storage mode string (e.g., "filesystem-v2").
	 */
	async storeKnowledgeItemAttachment(
		knowledgeItemId: string,
		attachment: ChatAttachment,
	): Promise<IBinaryData> {
		const buffer = Buffer.from(attachment.data, BINARY_ENCODING);

		if (buffer.length > this.maxKnowledgeItemSizeBytes) {
			const maxSizeMB = Math.floor(this.maxKnowledgeItemSizeBytes / (1024 * 1024));
			throw new BadRequestError(
				`Knowledge item attachment exceeds maximum size of ${maxSizeMB} MB`,
			);
		}

		return await this.processKnowledgeItemAttachment(knowledgeItemId, attachment, buffer);
	}

	/**
	 * Gets a knowledge item attachment and returns it as either buffer or stream
	 */
	async getKnowledgeItemAttachment(
		knowledgeItemId: string,
	): Promise<
		[
			IBinaryData,
			(
				| { type: 'buffer'; buffer: Buffer<ArrayBufferLike>; fileSize: number }
				| { type: 'stream'; stream: Stream.Readable; fileSize: number }
			),
		]
	> {
		const knowledgeItem = await this.knowledgeItemRepository.findOne({
			where: { id: knowledgeItemId },
			select: ['attachment'],
		});

		if (!knowledgeItem?.attachment) {
			throw new NotFoundError('Knowledge item attachment not found');
		}

		const attachment = knowledgeItem.attachment;

		if (attachment.id) {
			const metadata = await this.binaryDataService.getMetadata(attachment.id);
			const stream = await this.binaryDataService.getAsStream(attachment.id);

			return [attachment, { type: 'stream', stream, fileSize: metadata.fileSize }];
		}

		if (attachment.data) {
			const buffer = await this.binaryDataService.getAsBuffer(attachment);

			return [attachment, { type: 'buffer', buffer, fileSize: buffer.length }];
		}

		throw new NotFoundError('Attachment has no stored file');
	}

	/**
	 * Deletes a knowledge item's attachment file by knowledge item ID
	 */
	async deleteKnowledgeItemAttachmentById(
		knowledgeItemId: string,
		trx?: EntityManager,
	): Promise<void> {
		const em = trx ?? this.knowledgeItemRepository.manager;
		const knowledgeItem = await em.findOne(this.knowledgeItemRepository.target, {
			where: { id: knowledgeItemId },
			select: ['attachment'],
		});

		if (knowledgeItem?.attachment) {
			await this.deleteAttachments([knowledgeItem.attachment]);
		}
	}

	/**
	 * Deletes all knowledge item attachment files
	 */
	async deleteAllKnowledgeItemAttachments(): Promise<void> {
		const knowledgeItems = await this.knowledgeItemRepository.find({
			where: {
				attachment: Not(IsNull()),
			},
			select: ['attachment'],
		});

		await this.deleteAttachments(
			knowledgeItems.flatMap((item) => (item.attachment ? [item.attachment] : [])),
		);
	}

	/**
	 * Processes a single message attachment by populating metadata and storing it.
	 */
	private async processMessageAttachment(
		sessionId: ChatSessionId,
		messageId: ChatMessageId,
		attachment: ChatAttachment,
		buffer: Buffer,
	): Promise<IBinaryData> {
		const sanitizedFileName = sanitizeFilename(attachment.fileName);

		// Construct IBinaryData with all required fields
		const binaryData: IBinaryData = {
			data: attachment.data,
			mimeType: attachment.mimeType,
			fileName: sanitizedFileName,
			fileSize: `${buffer.length}`,
			fileExtension: sanitizedFileName?.split('.').pop(),
		};

		return await this.binaryDataService.store(
			FileLocation.ofCustom({
				sourceType: 'chat_message_attachment',
				pathSegments: ['chat-hub', 'sessions', sessionId, 'messages', messageId],
				sourceId: messageId,
			}),
			buffer,
			binaryData,
		);
	}

	/**
	 * Processes a single knowledge item attachment by populating metadata and storing it.
	 */
	private async processKnowledgeItemAttachment(
		knowledgeItemId: string,
		attachment: ChatAttachment,
		buffer: Buffer,
	): Promise<IBinaryData> {
		const sanitizedFileName = sanitizeFilename(attachment.fileName);

		// Construct IBinaryData with all required fields
		const binaryData: IBinaryData = {
			data: attachment.data,
			mimeType: attachment.mimeType,
			fileName: sanitizedFileName,
			fileSize: `${buffer.length}`,
			fileExtension: sanitizedFileName?.split('.').pop(),
		};

		return await this.binaryDataService.store(
			FileLocation.ofCustom({
				sourceType: 'chat_knowledge_item_attachment',
				pathSegments: ['chat-hub', 'knowledge-items', knowledgeItemId],
				sourceId: knowledgeItemId,
			}),
			buffer,
			binaryData,
		);
	}
}
