import { DeployFailureEmail } from '../templates/DeployFailureEmail';

export default function DeployFailurePreview() {
  return (
    <DeployFailureEmail
      username="saddam-azad"
      application_id="65rytfhgvbnuygh"
      application_name="frontend-app"
      repository="github.com/acme-corp/website"
      branch="main"
      commit_sha="a1b2c3d4e5f6"
      commit_message="fix: update login button style"
      deploy_id="deploy-789012"
      error_message="Deploy failed: Health check timeout after 300s"
      account_id="665186350589"
      region="us-east-1"
    />
  );
}