<script setup lang="ts">
import type { PropType } from 'vue'

export interface TDropdownMenuItem {
  label: string;
  to?: string;
  click?: Function;
  [key: string]: any;
}

defineProps({
  items: {
    type: Array as PropType<TDropdownMenuItem[][]>,
    default: () => []
  },
  mode: {
    type: String as PropType<'click' | 'hover'>,
    default: 'click'
  },
  popper: {
    type: Object as PropType<any>,
    default: () => ({})
  },
  ui: {
    type: Object as PropType<any>,
    default: () => ({})
  }
})
</script>

<template>
  <UPopover :mode="mode" :popper="popper" :ui="ui">
    <slot />

    <template #content>
      <div v-if="items.length" class="py-1">
        <template v-for="(group, index) in items" :key="index">
          <div v-for="item in group" :key="item.label">
            <slot name="item" :item="item">
              <NuxtLink
                v-if="item.to"
                :to="item.to"
                class="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                {{ item.label }}
              </NuxtLink>
              <span
                v-else-if="item.click"
                @click="() => { if (item.click) item.click(); }"
                class="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
              >
                {{ item.label }}
              </span>
            </slot>
          </div>
          <hr v-if="index < items.length - 1" class="border-gray-200 dark:border-gray-700" />
        </template>
      </div>
    </template>
  </UPopover>
</template>