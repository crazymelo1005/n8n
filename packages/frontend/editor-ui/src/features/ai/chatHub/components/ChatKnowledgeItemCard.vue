<script setup lang="ts">
import { computed } from 'vue';
import type { ChatHubKnowledgeItemDto } from '@n8n/api-types';
import { N8nActionDropdown, N8nIcon, N8nIconButton, N8nText } from '@n8n/design-system';
import type { ActionDropdownItem } from '@n8n/design-system/types';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { buildKnowledgeItemAttachmentUrl } from '@/features/ai/chatHub/chat.api';

const {
	item,
	hideActions = false,
	size = 'md',
} = defineProps<{
	item: ChatHubKnowledgeItemDto;
	hideActions?: boolean;
	size?: 'sm' | 'md';
}>();

const emit = defineEmits<{
	delete: [];
}>();

const i18n = useI18n();
const rootStore = useRootStore();

type MenuAction = 'delete';

const menuItems = computed<Array<ActionDropdownItem<MenuAction>>>(() => {
	return [{ id: 'delete' as const, label: i18n.baseText('chatHub.knowledge.card.menu.delete') }];
});

const fileName = computed(() => {
	return item.attachment?.fileName || 'Unknown file';
});

const fileSize = computed(() => {
	return item.attachment?.fileSize || '';
});

const createdDate = computed(() => {
	return new Date(item.createdAt).toLocaleDateString();
});

const isImage = computed(() => {
	const mimeType = item.attachment?.mimeType;
	return mimeType?.startsWith('image/');
});

const thumbnailUrl = computed(() => {
	if (!isImage.value) return null;
	return buildKnowledgeItemAttachmentUrl(rootStore.restApiContext, item.id);
});

function handleSelectMenu(action: MenuAction) {
	if (action === 'delete') {
		emit('delete');
	}
}
</script>

<template>
	<div :class="[$style.card, { [$style.sm]: size === 'sm' }]">
		<div :class="$style.preview">
			<div v-if="isImage && thumbnailUrl" :class="$style.thumbnail">
				<img :src="thumbnailUrl" :alt="fileName" :class="$style.thumbnailImage" />
			</div>
			<div v-else :class="$style.icon">
				<N8nIcon icon="file" size="xlarge" />
			</div>

			<div v-if="!hideActions" :class="$style.actions">
				<N8nActionDropdown
					:items="menuItems"
					placement="bottom-end"
					@select="handleSelectMenu"
					@click.stop.prevent
				>
					<template #activator>
						<N8nIconButton
							icon="ellipsis-vertical"
							type="tertiary"
							size="medium"
							:title="i18n.baseText('chatHub.knowledge.card.button.moreOptions')"
							text
							:class="$style.actionDropdownTrigger"
						/>
					</template>
				</N8nActionDropdown>
			</div>
		</div>

		<div :class="$style.content">
			<N8nText tag="h3" size="medium" bold :class="$style.title">
				{{ fileName }}
			</N8nText>
			<N8nText size="small" color="text-light" :class="$style.description">
				{{ fileSize }} • {{ createdDate }}
			</N8nText>
		</div>
	</div>
</template>

<style lang="scss" module>
.card {
	display: flex;
	flex-direction: column;
	background-color: var(--color--background--light-3);
	border: var(--border);
	border-radius: var(--radius--lg);
	text-decoration: none;
	color: inherit;
	overflow: hidden;

	&.sm {
		border-radius: var(--radius);

		.content {
			padding: var(--spacing--2xs);
			gap: var(--spacing--5xs);
		}

		.actions {
			top: var(--spacing--5xs);
			right: var(--spacing--5xs);
		}
	}
}

.preview {
	position: relative;
	width: 100%;
	aspect-ratio: 4 / 3;
	background-color: var(--color--background--light-2);
}

.icon {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 100%;
	height: 100%;
	color: var(--color--text--tint-2);
}

.thumbnail {
	width: 100%;
	height: 100%;
}

.thumbnailImage {
	width: 100%;
	height: 100%;
	object-fit: cover;
	display: block;
}

.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	padding: var(--spacing--sm);
}

.title {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.description {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.actions {
	position: absolute;
	top: var(--spacing--2xs);
	right: var(--spacing--2xs);
}

.actionDropdownTrigger {
	box-shadow: none !important;
	outline: none !important;
	background-color: var(--color--background--light-3);
	border-radius: var(--radius);
}
</style>
