import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js';
import { BuildSuccessEmail } from './templates/BuildSuccessEmail.tsx';
import { BuildFailureEmail } from './templates/BuildFailureEmail.tsx';
import { DeploySuccessEmail } from './templates/DeploySuccessEmail.tsx';
import { DeployFailureEmail } from './templates/DeployFailureEmail.tsx';
import { render } from 'npm:@react-email/render';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false },
});

const templates = {
  APP_BUILD_SUCCESS: BuildSuccessEmail,
  APP_BUILD_FAILURE: BuildFailureEmail,
  APP_DEPLOY_SUCCESS: DeploySuccessEmail,
  APP_DEPLOY_FAILURE: DeployFailureEmail,
};

Deno.serve(async (req) => {
  const { record } = await req.json();
  const { organization_id, environment_id, type, metadata } = record;

  try {
    // Check if environment has notifications enabled for this type and EMAIL channel
    const { data: envNotification } = await supabase
      .from('environment_notifications')
      .select('enabled')
      .eq('environment_id', environment_id)
      .eq('type', type)
      .eq('channel', 'EMAIL')
      .single();

    if (!envNotification?.enabled) return new Response('OK', { status: 200 });

    // Get organization members with user details
    const { data: members } = await supabase
      .from('memberships')
      .select('user_id, user:users(email, full_name)')
      .eq('organization_id', organization_id)
      .is('deleted_at', null);

    for (const member of members || []) {
      // Check if user has email notifications enabled
      const { data: userNotification } = await supabase
        .from('user_notifications')
        .select('email_enabled')
        .eq('user_id', member.user_id)
        .single();

      if (userNotification && !userNotification.email_enabled) continue;

      // Add username to metadata
      const templateProps = {
        ...metadata,
        username: member.user.full_name || member.user.email?.split('@')[0]
      };

      // Render and send email
      const Template = templates[type];
      const html = render(Template(templateProps));
      
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: 'no-reply@ping.thunder.so',
          to: member.user.email,
          subject: getSubject(type, metadata),
          html,
        }),
      });
    }

    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Failed to process notification:', error);
    return new Response('Error', { status: 500 });
  }
});

function getSubject(type: string, metadata: any): string {
  switch (type) {
    case 'APP_BUILD_SUCCESS':
      return `✅ Build successful for ${metadata.service_name}`;
    case 'APP_BUILD_FAILURE':
      return `❌ Build failed for ${metadata.service_name}`;
    case 'APP_DEPLOY_SUCCESS':
      return `🚀 Deploy successful for ${metadata.service_name}`;
    case 'APP_DEPLOY_FAILURE':
      return `💥 Deploy failed for ${metadata.service_name}`;
    default:
      return 'Thunder Notification';
  }
}