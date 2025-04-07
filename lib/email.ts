import nodemailer, { SentMessageInfo } from 'nodemailer';
import { render } from '@react-email/render';
import SubscriptionEmail from '@/emails/subscription-email';
import React from 'react';

export interface EmailOptions {
  to: string;
  subject: string;
  title: string;
  body: string;
  ctaText?: string;
  ctaUrl?: string;
}

// Create reusable transporter object using SMTP transport
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    // Verify required configuration
    if (!process.env.SMTP_FROM) {
      console.error('Missing SMTP_FROM environment variable');
      return false;
    }

    // Render the email template
    const emailComponent = React.createElement(SubscriptionEmail, {
      title: options.title,
      body: options.body,
      ctaText: options.ctaText,
      ctaUrl: options.ctaUrl,
    });
    
    const emailHtml = await Promise.resolve(render(emailComponent));

    // Send the email
    const info: SentMessageInfo = await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: options.to,
      subject: options.subject,
      html: emailHtml,
    });

    if (info?.messageId) {
      console.log('Email sent:', info.messageId);
    }
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
}

// Verify SMTP connection
export async function verifyEmailConnection(): Promise<boolean> {
  try {
    await transporter.verify();
    console.log('SMTP connection verified successfully');
    return true;
  } catch (error) {
    console.error('SMTP connection verification failed:', error);
    return false;
  }
}

export async function sendResetPasswordEmail(email: string, resetLink: string): Promise<void> {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Reset Your Flintime Business Password',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #7c3aed; margin-bottom: 24px;">Reset Your Password</h2>
        <p style="color: #4b5563; margin-bottom: 24px;">
          You recently requested to reset your password for your Flintime Business account. 
          Click the button below to reset it.
        </p>
        <a 
          href="${resetLink}" 
          style="
            display: inline-block;
            background-color: #7c3aed;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            margin-bottom: 24px;
          "
        >
          Reset Password
        </a>
        <p style="color: #4b5563; margin-bottom: 24px;">
          If you did not request a password reset, please ignore this email or contact support 
          if you have concerns.
        </p>
        <p style="color: #4b5563; margin-bottom: 24px;">
          This password reset link is only valid for the next 30 minutes.
        </p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="color: #9ca3af; font-size: 14px;">
          If you're having trouble clicking the "Reset Password" button, copy and paste the URL below into your web browser:
        </p>
        <p style="color: #6b7280; font-size: 14px; word-break: break-all;">
          ${resetLink}
        </p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error: any) {
    console.error('Error sending reset password email:', error);
    throw new Error('Failed to send reset password email');
  }
} 