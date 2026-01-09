import type { MigrationContext, ReversibleMigration } from '../migration-types';

const table = {
	knowledgeItems: 'chat_hub_knowledge_items',
	agents: 'chat_hub_agents',
	agentKnowledgeItems: 'chat_hub_agent_knowledge_items',
	user: 'user',
} as const;

export class CreateChatHubKnowledgeItemsTable1766200000000 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable(table.knowledgeItems)
			.withColumns(
				column('id').uuid.primary,
				column('type').varchar(16).comment('ChatHubKnowledgeItemType enum: "attachment"').notNull,
				column('ownerId').uuid.notNull,
				column('attachment').json.comment('File attachment stored as JSON (IBinaryData)'),
			)
			.withForeignKey('ownerId', {
				tableName: table.user,
				columnName: 'id',
				onDelete: 'CASCADE',
			}).withTimestamps;

		await createTable(table.agentKnowledgeItems)
			.withColumns(
				column('agentId').uuid.notNull.primary,
				column('knowledgeItemId').uuid.notNull.primary,
			)
			.withForeignKey('agentId', {
				tableName: table.agents,
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('knowledgeItemId', {
				tableName: table.knowledgeItems,
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withIndexOn('agentId')
			.withIndexOn('knowledgeItemId');
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable(table.agentKnowledgeItems);
		await dropTable(table.knowledgeItems);
	}
}
