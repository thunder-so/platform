import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
  Row,
  Column
} from "@react-email/components";
import * as React from "react";

interface StackInstalledProps {
  username?: string;
  applicationId?: string;
  CloudFrontDistributionUrl?: string;
  accountId?: string;
  region?: string,
  repo?: string,
  owner?: string,
  branch?: string
}

export const StackInstalled = ({
  username,
  applicationId,
  CloudFrontDistributionUrl,
  accountId,
  region,
  repo,
  owner,
  branch
}: StackInstalledProps) => (
  <Html>
    <Head />
    <Preview>An application has been installed in your AWS account</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section className="text-left">
          <table style={{ width: '100%' }}>
            <tbody>
              <tr>
                <td style={{ width: '46px' }}></td> 
                <td style={{ width: '24px' }}>
                  <Img
                    alt="Checkmark"
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
            An application has been installed/updated on your AWS account.
          </Text>

          <table style={{ width: '100%' }}>
            <tbody>
              <tr>
                <td style={{ width: '100px', color: '#525f7f' }}>Repository: </td> 
                <td style={{ color: '#525f7f' }}>github.com/{owner}/{repo}</td> 
              </tr>
              <tr>
                <td style={{ width: '100px', color: '#525f7f' }}>Branch: </td> 
                <td style={{ color: '#525f7f' }}>{branch}</td> 
              </tr>
            </tbody>
          </table>
        </Section>

        <Section style={box}>
          <Hr style={hr} />

          <Button style={button} href={CloudFrontDistributionUrl}>
            Preview your application
          </Button>

          <Text style={paragraph}>
            You can view your application details and logs in the {" "}
            <Link style={anchor} href={`https://console.thunder.so/app/${applicationId}`}>
            thunder console
            </Link>{""}.
          </Text>

          <table style={{ width: '100%' }}>
            <tbody>
              <tr>
                <td style={{ width: '150px', color: '#525f7f' }}>AWS Account ID: </td> 
                <td style={{ color: '#525f7f' }}>{accountId}</td> 
              </tr>
              <tr>
                <td style={{ width: '150px', color: '#525f7f' }}>Region: </td> 
                <td style={{ color: '#525f7f' }}>{region}</td> 
              </tr>
            </tbody>
          </table>

          <Hr style={hr} />
          <Text style={paragraph}>
            If you haven't finished setting up the application, you might find our{" "}
            <Link style={anchor} href="https://thunder.so/docs">
              documentation
            </Link>{" "}
            handy.
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

StackInstalled.PreviewProps = {
  username: "saddam-azad",
  applicationId: "w15piype2e8zqy2y5mjduo80",
  CloudFrontDistributionUrl: "https://d1r6qbtmvfy32u.cloudfront.net",
  accountId: "665186350589",
  region: "us-east-1",
  repo: "astro",
  owner: "saddam-azad",
  branch: "master"
} as StackInstalledProps;

export default StackInstalled;

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
