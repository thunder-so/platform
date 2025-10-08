import { BuildSuccessEmail } from '../templates/BuildSuccessEmail';

export default function BuildSuccessPreview() {
  return (
    <BuildSuccessEmail
      username="saddam-azad"
      application_id="65rytfhgvbnuygh"
      application_name="frontend-app"
      application_url="https://d1r6qbtmvfy32u.cloudfront.net"
      domain="app.acme-corp.com"
      repository="github.com/acme-corp/website"
      branch="main"
      // commit_sha="a1b2c3d4e5f6789012345678901234567890abcd"
      // commit_message="feat: add new dashboard component"
      build_id="build-123456"
      account_id="665186350589"
      region="us-east-1"
    />
  );
}