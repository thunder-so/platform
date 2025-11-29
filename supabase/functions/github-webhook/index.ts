import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js'
import { Webhooks } from 'npm:@octokit/webhooks'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseSecretKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const githubWebhookSecret = Deno.env.get('GH_WEBHOOK_SECRET')!

const webhooks = new Webhooks({
    secret: githubWebhookSecret,
});

const supabase = createClient(supabaseUrl, supabaseSecretKey, {
  auth: { persistSession: false },
})

console.log('🚀 GitHub Webhook Edge Function initialized!')

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  const body = await req.text()
  const signature = req.headers.get('X-Hub-Signature-256');

  if (!signature || !await webhooks.verify(body, signature)) {
      return new Response('Unauthorized', { status: 401 });
  }

  const payload = JSON.parse(body)
  const eventType = req.headers.get('X-GitHub-Event');

  console.log(`Received event type: ${eventType}`)

  try {
    switch (eventType) {
        case 'installation':
            await handleInstallationEvent(payload);
            break;
        case 'installation_repositories':
            await handleInstallationRepositoriesEvent(payload);
            break;
        case 'installation_target':
            await handleInstallationTargetEvent(payload);
            break;
    }

    return new Response('OK', { status: 200 })
  } catch (error) {
    console.error('❌ Failed to process webhook:', error)
    return new Response('Webhook processing error', { status: 500 })
  }
})

async function handleInstallationEvent(payload: any) {
    const { action, installation } = payload;
    const installationId = installation.id;

    switch (action) {
        case 'created': {
            const { error } = await supabase
                .from('installations')
                .upsert({
                    installation_id: installationId,
                    metadata: installation,
                });
            if (error) throw error;
            console.log(`✅ Successfully created installation: ${installationId}`)
            break;
        }
        case 'deleted': {
            const { error } = await supabase
                .from('installations')
                .update({ deleted_at: new Date().toISOString() })
                .eq('installation_id', installationId);
            if (error) throw error;
            console.log(`✅ Successfully deleted installation: ${installationId}`)
            break;
        }
        case 'suspend':
        case 'unsuspend': {
             const { error } = await supabase
                .from('installations')
                .update({ metadata: installation })
                .eq('installation_id', installationId);
            if (error) throw error;
            console.log(`✅ Successfully updated installation status: ${installationId}`)
            break;
        }
        case 'new_permissions_accepted': {
            const { error } = await supabase
                .from('installations')
                .update({ metadata: installation })
                .eq('installation_id', installationId);
            if (error) throw error;
            console.log(`✅ Successfully updated installation permissions: ${installationId}`)
            break;
        }
    }
}

async function handleInstallationRepositoriesEvent(payload: any) {
    const { action, installation, repositories_added, repositories_removed } = payload;
    const installationId = installation.id;

    // 1. Fetch the current installation metadata from the database
    const { data: installationData, error: fetchError } = await supabase
        .from('installations')
        .select('metadata')
        .eq('installation_id', installationId)
        .single();

    if (fetchError) {
        console.error(`Failed to fetch installation ${installationId}:`, fetchError);
        throw fetchError;
    }

    // 2. Ensure we have a metadata object and a repositories array to work with.
    const metadata = installationData?.metadata || {};
    if (!Array.isArray(metadata.repositories)) {
        metadata.repositories = [];
    }

    // 3. Process based on the action
    switch (action) {
        case 'added': {
            console.log(`Adding ${repositories_added.length} repositories to installation ${installationId}.`);
            // Create a Set of existing repository IDs for quick lookups to avoid duplicates.
            const existingRepoIds = new Set(metadata.repositories.map((r: any) => r.id));
            
            // Filter repositories_added to only include ones not already in the list.
            const newRepos = repositories_added.filter((r: any) => !existingRepoIds.has(r.id));
            
            // Append the new, unique repositories to the existing array.
            metadata.repositories.push(...newRepos);
            break;
        }
        case 'removed': {
            console.log(`Removing ${repositories_removed.length} repositories from installation ${installationId}.`);
            // Create a Set of repository IDs to remove for efficient filtering.
            const removedRepoIds = new Set(repositories_removed.map((r: any) => r.id));
            
            // Filter the existing repositories, keeping only those whose ID is not in the removal set.
            metadata.repositories = metadata.repositories.filter((r: any) => !removedRepoIds.has(r.id));
            break;
        }
    }

    // 4. Update the database with the modified metadata
    const { error: updateError } = await supabase
        .from('installations')
        .update({ metadata })
        .eq('installation_id', installationId);

    if (updateError) {
        console.error(`Failed to update installation ${installationId}:`, updateError);
        throw updateError;
    }

    console.log(`✅ Successfully updated installation repositories for installation: ${installationId}`);
}

async function handleInstallationTargetEvent(payload: any) {
    const { action, installation, changes } = payload;
    const installationId = installation.id;

    if (action === 'renamed') {
        const { data: installationData, error: fetchError } = await supabase
            .from('installations')
            .select('metadata')
            .eq('installation_id', installationId)
            .single();

        if (fetchError) throw fetchError;

        const metadata = installationData.metadata || {};
        metadata.account.login = changes.login.to;

        const { error: updateError } = await supabase
            .from('installations')
            .update({ metadata })
            .eq('installation_id', installationId);

        if (updateError) throw updateError;
        console.log(`✅ Successfully renamed installation target: ${installationId}`)
    }
}
