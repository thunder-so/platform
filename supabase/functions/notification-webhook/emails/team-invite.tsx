import { TeamInviteEmail } from '../templates/TeamInviteEmail.tsx';

export default function TeamInvitePreview() {
  return (
    <TeamInviteEmail
      organization_name="Acme Corp"
      invite_url="https://console.thunder.so/org/org-123456"
    />
  );
}