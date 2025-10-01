// Example usage: How to trigger notifications in your application code

import { db } from './apps/console/server/db/schema';
import { notifications } from './apps/console/server/db/schema';

// Example 1: Build Success Notification
async function notifyBuildSuccess(buildData: any) {
  await db.insert(notifications).values({
    organization_id: 'org_xxx',
    application_id: 'app_yyy', 
    type: 'APP_BUILD_SUCCESS',
    metadata: {
      build_id: buildData.id,
      service_name: 'frontend-app',
      repository: 'acme-corp/website',
      commit_sha: 'a1b2c3d4e5f6',
      commit_message: 'feat: add new dashboard component'
    }
  });
}

// Example 2: Build Failure Notification
async function notifyBuildFailure(buildData: any) {
  await db.insert(notifications).values({
    organization_id: 'org_xxx',
    application_id: 'app_yyy',
    type: 'APP_BUILD_FAILURE', 
    metadata: {
      build_id: buildData.id,
      service_name: 'frontend-app',
      repository: 'acme-corp/website',
      commit_sha: 'a1b2c3d4e5f6',
      commit_message: 'fix: update login button style',
      error_message: 'Build failed: npm install returned exit code 1'
    }
  });
}

// Example 3: Deploy Success Notification
async function notifyDeploySuccess(deployData: any) {
  await db.insert(notifications).values({
    organization_id: 'org_xxx',
    application_id: 'app_yyy',
    type: 'APP_DEPLOY_SUCCESS',
    metadata: {
      deploy_id: deployData.id,
      service_name: 'frontend-app',
      environment_name: 'production',
      domain: 'app.acme-corp.com',
      repository: 'acme-corp/website'
    }
  });
}

// Example 4: Deploy Failure Notification  
async function notifyDeployFailure(deployData: any) {
  await db.insert(notifications).values({
    organization_id: 'org_xxx',
    application_id: 'app_yyy',
    type: 'APP_DEPLOY_FAILURE',
    metadata: {
      deploy_id: deployData.id,
      service_name: 'frontend-app', 
      environment_name: 'production',
      repository: 'acme-corp/website',
      error_message: 'Deploy failed: Health check timeout after 300s'
    }
  });
}