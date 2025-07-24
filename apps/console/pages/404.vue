<template>
    <Header />

    <UContainer>
        <div class="mt-8">
            <UCard>
                <template #header>
                    <h1 class="text-3xl font-bold">You found a dead end.</h1>
                </template>
                <p>
                    The resource you are looking for has been deleted or your membership has been revoked.
                </p>

                <UButton to="/" color="primary" class="mt-4">
                    Go back to dashboard
                </UButton>
            </UCard>
        </div>
    </UContainer>
</template>

<script setup lang="ts">
</script>