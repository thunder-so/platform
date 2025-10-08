import { DeploySuccessEmail } from '../templates/DeploySuccessEmail';

export default function DeploySuccessPreview() {
  return (
    <DeploySuccessEmail
      username="saddam-azad"
      application_id="65rytfhgvbnuygh"
      application_name="frontend-app"
      application_url="https://d1r6qbtmvfy32u.cloudfront.net"
      domain="app.acme-corp.com"
      deploy_id="deploy-789012"
      repository="github.com/acme-corp/website"
      branch="main"
      commit_sha="a1b2c3d4e5f6"
      commit_message="fix: update login button style"
      account_id="665186350589"
      region="us-east-1"
    />
  );
}