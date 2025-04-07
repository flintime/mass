import * as React from 'react';
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Hr,
  Link,
  Row,
  Column,
  Img,
} from '@react-email/components';

interface AppointmentEmailProps {
  recipient: 'user' | 'business';
  appointmentDetails: {
    service: string;
    date: string;
    time: string;
    notes?: string;
    status: string;
  };
  customerDetails: {
    name: string;
    phone: string;
    email?: string;
  };
  businessDetails: {
    name: string;
    address?: string;
    city?: string;
    state?: string;
    phone?: string;
  };
  actionUrl: string;
}

export default function AppointmentEmail({
  recipient,
  appointmentDetails,
  customerDetails,
  businessDetails,
  actionUrl,
}: AppointmentEmailProps) {
  const isUser = recipient === 'user';
  const title = isUser 
    ? `Your Appointment with ${businessDetails.name}`
    : `New Appointment Request from ${customerDetails.name}`;
  
  const previewText = isUser
    ? `Your appointment for ${appointmentDetails.service} has been requested`
    : `New appointment request for ${appointmentDetails.service}`;
  
  const ctaText = isUser
    ? 'View Appointment Details'
    : 'Respond to Request';

  // Function to convert status to a more readable format
  const formatStatus = (status: string) => {
    const statusMap: Record<string, string> = {
      'requested': 'Requested',
      'confirmed': 'Confirmed',
      'canceled': 'Canceled',
      'reschedule_requested': 'Reschedule Requested',
      'completed': 'Completed'
    };
    return statusMap[status] || status.charAt(0).toUpperCase() + status.slice(1);
  };

  // Function to determine status color
  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      'requested': '#f59e0b', // Amber
      'confirmed': '#10b981', // Emerald
      'canceled': '#ef4444',  // Red
      'reschedule_requested': '#8b5cf6', // Violet
      'completed': '#3b82f6'  // Blue
    };
    return colorMap[status] || '#6b7280'; // Default gray
  };
  
  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
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
          
          {/* Introduction */}
          <Section style={introSection}>
            {isUser ? (
              <Text style={text}>
                Thank you for requesting an appointment with <span style={highlight}>{businessDetails.name}</span>. We've received your request and have notified the business. They will respond to your request soon.
              </Text>
            ) : (
              <Text style={text}>
                You have received a new appointment request from <span style={highlight}>{customerDetails.name}</span>. Please review the details below and respond to this request.
              </Text>
            )}
          </Section>
          
          {/* Status Badge */}
          <Section style={{...statusBadgeContainer, backgroundColor: getStatusBadgeBgColor(appointmentDetails.status)}}>
            <Text style={{...statusBadge, color: getStatusColor(appointmentDetails.status)}}>
              Status: {formatStatus(appointmentDetails.status)}
            </Text>
          </Section>
          
          {/* Appointment Details */}
          <Section style={detailsContainer}>
            <Heading as="h2" style={subheading}>Appointment Details</Heading>
            
            <Row style={detailRow}>
              <Column style={detailLabel}>Service:</Column>
              <Column style={detailValue}>{appointmentDetails.service}</Column>
            </Row>
            
            <Row style={detailRow}>
              <Column style={detailLabel}>Date:</Column>
              <Column style={detailValue}>{appointmentDetails.date}</Column>
            </Row>
            
            <Row style={detailRow}>
              <Column style={detailLabel}>Time:</Column>
              <Column style={detailValue}>{appointmentDetails.time}</Column>
            </Row>
            
            {appointmentDetails.notes && (
              <Row style={detailRow}>
                <Column style={detailLabel}>Notes:</Column>
                <Column style={detailValue}>{appointmentDetails.notes}</Column>
              </Row>
            )}
          </Section>
          
          <Hr style={divider} />
          
          {/* Contact Information */}
          <Section style={detailsContainer}>
            {isUser ? (
              <>
                <Heading as="h2" style={subheading}>Business Information</Heading>
                
                <Row style={detailRow}>
                  <Column style={detailLabel}>Name:</Column>
                  <Column style={detailValue}>{businessDetails.name}</Column>
                </Row>
                
                {businessDetails.phone && (
                  <Row style={detailRow}>
                    <Column style={detailLabel}>Phone:</Column>
                    <Column style={detailValue}>{businessDetails.phone}</Column>
                  </Row>
                )}
                
                {businessDetails.address && (
                  <Row style={detailRow}>
                    <Column style={detailLabel}>Address:</Column>
                    <Column style={detailValue}>
                      {[businessDetails.address, businessDetails.city, businessDetails.state].filter(Boolean).join(', ')}
                    </Column>
                  </Row>
                )}
              </>
            ) : (
              <>
                <Heading as="h2" style={subheading}>Customer Information</Heading>
                
                <Row style={detailRow}>
                  <Column style={detailLabel}>Name:</Column>
                  <Column style={detailValue}>{customerDetails.name}</Column>
                </Row>
                
                <Row style={detailRow}>
                  <Column style={detailLabel}>Phone:</Column>
                  <Column style={detailValue}>{customerDetails.phone}</Column>
                </Row>
                
                {customerDetails.email && (
                  <Row style={detailRow}>
                    <Column style={detailLabel}>Email:</Column>
                    <Column style={detailValue}>{customerDetails.email}</Column>
                  </Row>
                )}
              </>
            )}
          </Section>
          
          {/* CTA Button */}
          <Section style={ctaContainer}>
            <Link
              href={actionUrl}
              style={button}
            >
              {ctaText}
            </Link>
          </Section>
          
          {/* Footer */}
          <Section style={footerContainer}>
            <Text style={footer}>
              <p>This is an automated message from Flintime.</p>
              <p>If you have any questions, please contact our support team at <Link href="mailto:support@flintime.com" style={footerLink}>support@flintime.com</Link>.</p>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// Helper function to get status badge background color
const getStatusBadgeBgColor = (status: string) => {
  const bgColorMap: Record<string, string> = {
    'requested': '#fef3c7', // Amber light
    'confirmed': '#d1fae5', // Emerald light
    'canceled': '#fee2e2',  // Red light
    'reschedule_requested': '#ede9fe', // Violet light
    'completed': '#dbeafe'  // Blue light
  };
  return bgColorMap[status] || '#f3f4f6'; // Default gray light
};

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

const introSection = {
  padding: '30px 40px 10px',
};

const statusBadgeContainer = {
  margin: '0 40px 20px',
  padding: '8px 16px',
  borderRadius: '8px',
  textAlign: 'center' as const,
};

const statusBadge = {
  margin: '0',
  fontWeight: '600',
  fontSize: '14px',
};

const highlight = {
  fontWeight: '600',
  color: '#7c3aed',
};

const text = {
  color: '#374151', // Gray-700
  fontSize: '16px',
  lineHeight: '1.6',
  textAlign: 'left' as const,
  margin: '0 0 20px',
};

const detailsContainer = {
  padding: '0 40px 20px',
};

const subheading = {
  color: '#1f2937', // Gray-800
  fontSize: '18px',
  fontWeight: '600',
  lineHeight: '1.4',
  margin: '0 0 16px',
  borderBottom: '1px solid #e5e7eb',
  paddingBottom: '8px',
};

const detailRow = {
  margin: '0 0 12px',
};

const detailLabel = {
  color: '#6b7280', // Gray-500
  fontSize: '14px',
  fontWeight: '600',
  width: '30%',
  paddingRight: '16px',
  verticalAlign: 'top',
};

const detailValue = {
  color: '#1f2937', // Gray-800
  fontSize: '15px',
  fontWeight: '400',
  width: '70%',
};

const divider = {
  borderColor: '#e5e7eb', // Gray-200
  margin: '10px 40px 30px',
  height: '1px',
};

const ctaContainer = {
  padding: '0 40px 30px',
  textAlign: 'center' as const,
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
  backgroundColor: '#f3f4f6', // Gray-100
  padding: '20px 40px',
  borderTop: '1px solid #e5e7eb',
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