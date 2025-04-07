import { sendEmail, verifyEmailConnection } from '@/lib/email';

async function testEmail() {
  try {
    // First, verify the email connection
    const isConnected = await verifyEmailConnection();
    if (!isConnected) {
      console.error('Failed to connect to email server');
      process.exit(1);
    }

    // Test sending a subscription email
    const success = await sendEmail({
      to: process.env.TEST_EMAIL || '',
      subject: 'Test Subscription Email',
      title: 'Welcome to Your Subscription!',
      body: 'Thank you for subscribing to our service. We are excited to have you on board.',
      ctaText: 'View Dashboard',
      ctaUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
    });

    if (success) {
      console.log('Test email sent successfully');
    } else {
      console.error('Failed to send test email');
      process.exit(1);
    }
  } catch (error) {
    console.error('Error running email test:', error);
    process.exit(1);
  }
}

testEmail(); 