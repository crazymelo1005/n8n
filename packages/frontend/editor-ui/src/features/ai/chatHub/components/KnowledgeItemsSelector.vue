<script setup lang="ts">
import { N8nButton, N8nTooltip } from '@n8n/design-system';
import type { ChatHubKnowledgeItemDto } from '@n8n/api-types';
import { computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import ChatKnowledgeItemCard from './ChatKnowledgeItemCard.vue';

const { selected } = defineProps<{
	disabled: boolean;
	selected: ChatHubKnowledgeItemDto[];
	disabledTooltip?: string;
}>();

const emit = defineEmits<{
	click: [MouseEvent];
}>();

const i18n = useI18n();

const hasItems = computed(() => selected.length > 0);
</script>

<template>
	<div :class="$style.container">
		<div v-if="hasItems" :class="$style.itemsList">
			<ChatKnowledgeItemCard
				v-for="item in selected"
				:key="item.id"
				:item="item"
				:hide-actions="true"
				size="sm"
			/>
		</div>

		<N8nTooltip :content="disabledTooltip" :disabled="!disabledTooltip" placement="top">
			<N8nButton
				type="secondary"
				native-type="button"
				data-test-id="knowledge-items-selector"
				:disabled="disabled"
				icon="plus"
				@click="emit('click', $event)"
			>
				{{ i18n.baseText('chatHub.knowledge.selector.label.default') }}
			</N8nButton>
		</N8nTooltip>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.itemsList {
	display: grid;
	grid-template-columns: repeat(3, 1fr);
	gap: var(--spacing--2xs);
}
</style>
