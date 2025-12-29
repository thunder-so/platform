<template>
  <UModal title="Purchase Additional Seats" :ui="{ footer: 'justify-end' }">
    <template #body>
      <UAlert
        color="warning"
        variant="soft"
        title="Seats cannot be added while on trial"
        icon="tabler:info-circle"
      />
    </template>
    
    <template #footer="{ close }">
      <UButton label="Close" color="neutral" variant="ghost" @click="close" />
    </template>
  </UModal>
</template>
