import React from "npm:react";
import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Section,
  Text,
} from "npm:@react-email/components";

interface DeployFailureProps {
  username?: string;
  application_id: string;
  application_name: string;
  repository: string;
  branch?: string;
  commit_sha: string;
  commit_message: string;
  deploy_id: string;
  error_message: string;
  account_id?: string;
  region?: string;
}

export const DeployFailureEmail = ({
  username,
  application_id,
  application_name,
  repository,
  branch,
  commit_sha,
  commit_message,
  deploy_id,
  error_message,
  account_id,
  region,
}: DeployFailureProps) => (
  <Html>
    <Head />
    <Body style={main}>
      <Container style={container}>
        <Section className="text-left">
          <table style={{ width: '100%' }}>
            <tbody>
              <tr>
                <td style={{ width: '46px' }}></td> 
                <td style={{ width: '24px' }}>
                  <Img
                    alt="Thunder"
                    height="24"
                    src="https://thunder.so/images/thunder.png"
                  />
                </td>
                <td style={{ width: '1px' }}></td> 
                <td>
                  <Text style={{ fontSize: "16px", fontWeight: "bold" }}>thunder</Text>
                </td>
              </tr>
            </tbody>
          </table>
        </Section>
        <Section style={box}>
          <Text style={paragraph}>
            Hi {username},
          </Text>

          <Text style={paragraph}>
            💥 Your deployment for <strong>{application_name}</strong> has failed.
          </Text>

          <table style={{ width: '100%' }}>
            <tbody>
              <tr>
                <td style={{ width: '100px', color: '#525f7f' }}>Repository: </td> 
                <td style={{ color: '#525f7f' }}>{repository}</td> 
              </tr>
              <tr>
                <td style={{ width: '100px', color: '#525f7f' }}>Branch: </td> 
                <td style={{ color: '#525f7f' }}>{branch}</td> 
              </tr>
              <tr>
                <td style={{ width: '100px', color: '#525f7f' }}>Commit: </td> 
                <td style={{ color: '#525f7f' }}>{commit_sha?.substring(0, 7)}</td> 
              </tr>
              <tr>
                <td style={{ width: '100px', color: '#525f7f' }}>Message: </td> 
                <td style={{ color: '#525f7f' }}>{commit_message}</td> 
              </tr>
            </tbody>
          </table>
        </Section>

        <Section style={box}>
          <Hr style={hr} />

          <Button style={button} href={`https://console.thunder.so/app/${application_id}/deploys/${deploy_id}`}>
            View logs
          </Button>
          
          <Text style={paragraph}>
            Actions performed on your AWS Account:
          </Text>

          {account_id && region && (
            <table style={{ width: '100%' }}>
              <tbody>
                <tr>
                  <td style={{ width: '150px', color: '#525f7f' }}>Account ID: </td> 
                  <td style={{ color: '#525f7f' }}>{account_id}</td> 
                </tr>
                <tr>
                  <td style={{ width: '150px', color: '#525f7f' }}>Region: </td> 
                  <td style={{ color: '#525f7f' }}>{region}</td> 
                </tr>
              </tbody>
            </table>
          )}

          <Hr style={hr} />
          <Text style={paragraph}>
            Need help? Check our{" "}
            <Link style={anchor} href="https://thunder.so/docs">
              documentation
            </Link>{" "}
            or visit the{" "}
            <Link style={anchor} href="https://console.thunder.so">
              console
            </Link>.
          </Text>

          <Link style={anchor} href="https://thunder.so">thunder.so</Link>
          
          <Hr style={hr} />
          <Text style={footer}>
              CloudBits, Inc. 651 N Broad St., Suite 206, Middletown, Delaware 19709 
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
};

const box = {
  padding: "0 48px",
};

const hr = {
  borderColor: "#e6ebf1",
  margin: "20px 0",
};

const paragraph = {
  color: "#525f7f",
  fontSize: "16px",
  lineHeight: "24px",
  textAlign: "left" as const,
};

const anchor = {
  color: "#556cd6",
};

const button = {
  backgroundColor: "#1a0d0d",
  borderRadius: "5px",
  color: "#fff",
  fontSize: "16px",
  fontWeight: "bold",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "block",
  width: "100%",
  padding: "10px",
};

const footer = {
  color: "#8898aa",
  fontSize: "12px",
  lineHeight: "16px",
};