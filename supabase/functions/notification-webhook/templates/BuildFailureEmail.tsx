import { Html, Head, Body, Container, Heading, Text, Section, Button } from 'npm:@react-email/components';

export const BuildFailureEmail = ({ service_name, repository, commit_sha, commit_message, build_id, error_message }) => (
  <Html>
    <Head />
    <Body style={{ fontFamily: 'Arial, sans-serif', backgroundColor: '#f4f4f4' }}>
      <Container style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: '#ffffff', padding: '20px' }}>
        <Heading style={{ color: '#ef4444', fontSize: '24px', marginBottom: '20px' }}>
          ❌ Build Failed
        </Heading>
        <Text style={{ fontSize: '16px', lineHeight: '1.5', marginBottom: '20px' }}>
          Your build for <strong>{service_name}</strong> has failed.
        </Text>
        <Section style={{ backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '5px', marginBottom: '20px' }}>
          <Text style={{ margin: '5px 0', fontSize: '14px' }}>
            <strong>Repository:</strong> {repository}
          </Text>
          <Text style={{ margin: '5px 0', fontSize: '14px' }}>
            <strong>Commit:</strong> {commit_sha?.substring(0, 7)}
          </Text>
          <Text style={{ margin: '5px 0', fontSize: '14px' }}>
            <strong>Message:</strong> {commit_message}
          </Text>
          <Text style={{ margin: '5px 0', fontSize: '14px' }}>
            <strong>Build ID:</strong> {build_id}
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