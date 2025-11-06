<template>
  <div>
    <ClientOnly>
      <GithubRepoSelector @selected="onRepoSelected" />
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import GithubRepoSelector from '~/components/new/GithubRepoSelector.vue';
import { useNewApplicationFlow } from '~/composables/useNewApplicationFlow';

definePageMeta({
  layout: 'new'
});

const { clearApplicationSchema } = useNewApplicationFlow();
clearApplicationSchema();

const router = useRouter();
const route = useRoute();

const onRepoSelected = ({ repo, installationId, type }: { repo: any; installationId: number; type?: string }) => {
  const stack_type = (route.query.stack_type as string) || type || 'SPA';
  const params = new URLSearchParams({
    owner: repo.owner?.login || repo.owner,
    repo: repo.name,
    installation_id: installationId.toString(),
    stack_type,
  });
  router.push(`/new/configure?${params.toString()}`);
};
</script>
