import * as React from 'react';
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Hr,
  Link,
  Img
} from '@react-email/components';

interface SubscriptionEmailProps {
  title: string;
  body: string;
  ctaText?: string;
  ctaUrl?: string;
}

export default function SubscriptionEmail({
  title,
  body,
  ctaText,
  ctaUrl,
}: SubscriptionEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{title}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Img
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IconOnly_Transparent_NoBuffer%20(1)-qipSsiq4ftcvpww0P3lSnzRPc4YOtH.png"
              width="60"
              height="60"
              alt="Flintime"
              style={logoStyle}
            />
            <Heading style={heading}>{title}</Heading>
          </Section>
          
          {/* Content */}
          <Section style={contentSection}>
            <Text style={text}>{body}</Text>
            
            {ctaText && ctaUrl && (
              <Section style={ctaContainer}>
                <Link
                  href={ctaUrl}
                  style={button}
                >
                  {ctaText}
                </Link>
              </Section>
            )}
          </Section>
          
          {/* Footer */}
          <Section style={footerContainer}>
            <Hr style={divider} />
            <Text style={footer}>
              <p>If you have any questions, please don't hesitate to contact our support team at <Link href="mailto:support@flintime.com" style={footerLink}>support@flintime.com</Link>.</p>
              <p>&copy; {new Date().getFullYear()} Flintime. All rights reserved.</p>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: '#f9fafb',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif',
  padding: '40px 0',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '0',
  maxWidth: '600px',
  borderRadius: '12px',
  overflow: 'hidden',
  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.1)',
};

const header = {
  backgroundColor: '#7c3aed', // Violet-600
  padding: '30px 40px',
  textAlign: 'center' as const,
  color: '#ffffff',
};

const logoStyle = {
  display: 'block',
  margin: '0 auto 20px',
  backgroundColor: 'white',
  padding: '10px',
  borderRadius: '50%',
};

const heading = {
  color: '#ffffff',
  fontSize: '24px',
  fontWeight: '700',
  lineHeight: '1.3',
  textAlign: 'center' as const,
  margin: '0',
  textShadow: '0 1px 1px rgba(0, 0, 0, 0.1)',
};

const contentSection = {
  padding: '30px 40px 20px',
};

const text = {
  color: '#374151', // Gray-700
  fontSize: '16px',
  lineHeight: '1.6',
  textAlign: 'left' as const,
  margin: '0 0 24px',
};

const ctaContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button = {
  backgroundColor: '#7c3aed', // Violet-600
  borderRadius: '8px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  padding: '12px 24px',
  display: 'inline-block',
  boxShadow: '0 2px 4px rgba(124, 58, 237, 0.2)',
  transition: 'all 0.2s ease',
};

const footerContainer = {
  padding: '0 40px 30px',
};

const divider = {
  borderColor: '#e5e7eb', // Gray-200
  margin: '0 0 20px',
};

const footer = {
  color: '#6b7280', // Gray-500
  fontSize: '14px',
  lineHeight: '1.5',
  textAlign: 'center' as const,
  margin: '0',
};

const footerLink = {
  color: '#7c3aed',
  textDecoration: 'none',
  fontWeight: '500',
}; 