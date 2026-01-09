import { ChatHubKnowledgeItemType } from '@n8n/api-types';
import { User, WithTimestamps } from '@n8n/db';
import { Column, Entity, ManyToOne, JoinColumn, PrimaryGeneratedColumn } from '@n8n/typeorm';
import type { IBinaryData } from 'n8n-workflow';

@Entity({ name: 'chat_hub_knowledge_items' })
export class ChatHubKnowledgeItem extends WithTimestamps {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	/**
	 * The type of knowledge item.
	 */
	@Column({ type: 'varchar', length: 16 })
	type: ChatHubKnowledgeItemType;

	/**
	 * ID of the user that owns this knowledge item.
	 */
	@Column({ type: String })
	ownerId: string;

	/**
	 * The user that owns this knowledge item.
	 */
	@ManyToOne('User', { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'ownerId' })
	owner?: User;

	/**
	 * File attachment for the knowledge item, stored as JSON.
	 * Storage strategy depends on the binary data mode configuration:
	 * - When using external storage (e.g., filesystem-v2): Only metadata is stored, with 'id' referencing the external location
	 * - When using default mode: Base64-encoded data is stored directly in the 'data' field
	 */
	@Column({ type: 'json', nullable: true })
	attachment: IBinaryData | null;
}
