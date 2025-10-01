import { Html, Head, Body, Container, Heading, Text, Section, Button } from 'npm:@react-email/components';

export const DeploySuccessEmail = ({ service_name, environment_name, domain, deploy_id, repository }) => (
  <Html>
    <Head />
    <Body style={{ fontFamily: 'Arial, sans-serif', backgroundColor: '#f4f4f4' }}>
      <Container style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: '#ffffff', padding: '20px' }}>
        <Heading style={{ color: '#22c55e', fontSize: '24px', marginBottom: '20px' }}>
          🚀 Deploy Successful
        </Heading>
        <Text style={{ fontSize: '16px', lineHeight: '1.5', marginBottom: '20px' }}>
          Your deployment for <strong>{service_name}</strong> to <strong>{environment_name}</strong> has completed successfully.
        </Text>
        <Section style={{ backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '5px', marginBottom: '20px' }}>
          <Text style={{ margin: '5px 0', fontSize: '14px' }}>
            <strong>Service:</strong> {service_name}
          </Text>
          <Text style={{ margin: '5px 0', fontSize: '14px' }}>
            <strong>Environment:</strong> {environment_name}
          </Text>
          <Text style={{ margin: '5px 0', fontSize: '14px' }}>
            <strong>Repository:</strong> {repository}
          </Text>
          {domain && (
            <Text style={{ margin: '5px 0', fontSize: '14px' }}>
              <strong>URL:</strong> <a href={`https://${domain}`} style={{ color: '#3b82f6' }}>{domain}</a>
            </Text>
          )}
          <Text style={{ margin: '5px 0', fontSize: '14px' }}>
            <strong>Deploy ID:</strong> {deploy_id}
          </Text>
        </Section>
        <Text style={{ fontSize: '14px', color: '#666' }}>
          Thunder Platform
        </Text>
      </Container>
    </Body>
  </Html>
);