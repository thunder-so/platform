
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const githubWebhookSecret = Deno.env.get('GITHUB_WEBHOOK_SECRET')!

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false },
})

console.log('🚀 GitHub Webhook Edge Function initialized!')

async function verifySignature(request: Request, body: string): Promise<boolean> {
    const signature = request.headers.get('X-Hub-Signature-256');
    if (!signature) {
        return false;
    }

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(githubWebhookSecret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );

    const signed = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
    const expectedSignature = `sha256=${Array.from(new Uint8Array(signed)).map(b => b.toString(16).padStart(2, '0')).join('')}`;

    return signature === expectedSignature;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  const body = await req.text()

  if (!await verifySignature(req, body)) {
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

    const { data: installationData, error: fetchError } = await supabase
        .from('installations')
        .select('metadata')
        .eq('installation_id', installationId)
        .single();

    if (fetchError) throw fetchError;

    const metadata = installationData.metadata || {};

    switch (action) {
        case 'added':
            metadata.repositories = [...(metadata.repositories || []), ...repositories_added];
            break;
        case 'removed':
            const removedIds = new Set(repositories_removed.map((r: any) => r.id));
            metadata.repositories = (metadata.repositories || []).filter((r: any) => !removedIds.has(r.id));
            break;
    }

    const { error: updateError } = await supabase
        .from('installations')
        .update({ metadata })
        .eq('installation_id', installationId);

    if (updateError) throw updateError;
    console.log(`✅ Successfully updated installation repositories: ${installationId}`)
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
