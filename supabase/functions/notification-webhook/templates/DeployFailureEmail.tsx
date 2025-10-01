import { Html, Head, Body, Container, Heading, Text, Section, Button } from 'npm:@react-email/components';

export const DeployFailureEmail = ({ service_name, environment_name, deploy_id, repository, error_message }) => (
  <Html>
    <Head />
    <Body style={{ fontFamily: 'Arial, sans-serif', backgroundColor: '#f4f4f4' }}>
      <Container style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: '#ffffff', padding: '20px' }}>
        <Heading style={{ color: '#ef4444', fontSize: '24px', marginBottom: '20px' }}>
          💥 Deploy Failed
        </Heading>
        <Text style={{ fontSize: '16px', lineHeight: '1.5', marginBottom: '20px' }}>
          Your deployment for <strong>{service_name}</strong> to <strong>{environment_name}</strong> has failed.
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
          <Text style={{ margin: '5px 0', fontSize: '14px' }}>
            <strong>Deploy ID:</strong> {deploy_id}
          </Text>
        </Section>
        {error_message && (
          <Section style={{ backgroundColor: '#fef2f2', padding: '15px', borderRadius: '5px', marginBottom: '20px', border: '1px solid #fecaca' }}>
            <Text style={{ margin: '0', fontSize: '14px', color: '#dc2626' }}>
              <strong>Error:</strong> {error_message}
            </Text>
          </Section>
        )}
        <Text style={{ fontSize: '14px', color: '#666' }}>
          Thunder Platform
        </Text>
      </Container>
    </Body>
  </Html>
);