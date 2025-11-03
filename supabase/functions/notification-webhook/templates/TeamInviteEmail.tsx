import React from "npm:react";
import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Section,
  Text,
} from "npm:@react-email/components";

interface TeamInviteProps {
  organization_name: string;
  invite_url: string;
}

export const TeamInviteEmail = ({
  organization_name,
  invite_url,
}: TeamInviteProps) => (
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
            Hello,
          </Text>

          <Text style={paragraph}>
            You've been invited to join <strong>{organization_name}</strong> on Thunder.
          </Text>

          <Button style={button} href={invite_url}>
            Accept Invitation
          </Button>

          <Text style={paragraph}>
            If you did not expect this invitation, you can safely ignore this email.
          </Text>

          <Hr style={hr} />
          <Text style={paragraph}>
            Need help? Check our{" "}
            <a style={anchor} href="https://thunder.so/docs">
              documentation
            </a>.
          </Text>

          <a style={anchor} href="https://thunder.so">www.thunder.so</a>
          
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