import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import React from 'npm:react';
import { createClient } from 'npm:@supabase/supabase-js';
import { BuildSuccessEmail } from './templates/BuildSuccessEmail.tsx';
import { BuildFailureEmail } from './templates/BuildFailureEmail.tsx';
import { DeploySuccessEmail } from './templates/DeploySuccessEmail.tsx';
import { DeployFailureEmail } from './templates/DeployFailureEmail.tsx';
import { TeamInviteEmail } from './templates/TeamInviteEmail.tsx';
import { render } from 'npm:@react-email/render';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseSecretKey = Deno.env.get('SUPABASE_SECRET_KEY')!;

const supabase = createClient(supabaseUrl, supabaseSecretKey, {
  auth: { persistSession: false },
});

const templates = {
  APP_BUILD_SUCCESS: BuildSuccessEmail,
  APP_BUILD_FAILURE: BuildFailureEmail,
  APP_DEPLOY_SUCCESS: DeploySuccessEmail,
  APP_DEPLOY_FAILURE: DeployFailureEmail,
  TEAM_INVITE: TeamInviteEmail,
};

Deno.serve(async (req) => {
  const { record } = await req.json();
  const { organization_id, environment_id, type, metadata } = record;

  try {
    // Handle team invitations differently
    if (type === 'TEAM_INVITE') {
      const Template = templates[type];
      const html = await render(React.createElement(Template, metadata));
      
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: 'Thunder <no-reply@ping.thunder.so>',
          to: metadata.invitee_email,
          subject: getSubject(type, metadata),
          html,
        }),
      });

      return new Response('OK', { status: 200 });
    }

    // Get organization members with email preferences
    const { data: members } = await supabase
      .from('memberships')
      .select('user_id, user:users(email, full_name, email_enabled)')
      .eq('organization_id', organization_id)
      .is('deleted_at', null);

    for (const member of members || []) {
      // Check if user has email notifications enabled
      if (!member.user.email_enabled) continue;

      // Add username to metadata
      const templateProps = {
        ...metadata,
        username: member.user.full_name || member.user.email?.split('@')[0]
      };

      // Render and send email
      const Template = templates[type];
      const html = await render(React.createElement(Template, templateProps));
      
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: 'Thunder <no-reply@ping.thunder.so>',
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
      return `✅ Build successful for ${metadata.application_name}`;
    case 'APP_BUILD_FAILURE':
      return `❌ Build failed for ${metadata.application_name}`;
    case 'APP_DEPLOY_SUCCESS':
      return `🚀 Deploy successful for ${metadata.application_name}`;
    case 'APP_DEPLOY_FAILURE':
      return `💥 Deploy failed for ${metadata.application_name}`;
    case 'TEAM_INVITE':
      return `You're invited to join ${metadata.organization_name} on Thunder`;
    default:
      return 'Thunder Notification';
  }
}