import { BuildFailureEmail } from '../templates/BuildFailureEmail';

export default function BuildFailurePreview() {
  return (
    <BuildFailureEmail
      username="saddam-azad"
      application_id="65rytfhgvbnuygh"
      application_name="frontend-app"
      repository="github.com/acme-corp/website"
      branch="main"
      // commit_sha="a1b2c3d4e5f6"
      // commit_message="fix: update login button style"
      build_id="build-123456"
      error_message="Build failed: npm install returned exit code 1"
      account_id="665186350589"
      region="us-east-1"
    />
  );
}