import { Resend } from 'resend';
import { render } from '@react-email/render';
import React from 'react';
import AppointmentEmail from '@/emails/appointment-email';

// Initialize Resend with the API key
const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Sends a password reset email to the user or business
 */
export async function sendPasswordResetEmail(
  email: string, 
  resetLink: string, 
  accountType: 'user' | 'business' = 'user'
): Promise<{ success: boolean; error?: string }> {
  try {
    // Determine account type for the email subject and content
    const accountTypeLabel = accountType === 'business' ? 'Business' : '';
    const subject = `Reset Your Flintime ${accountTypeLabel} Password`;
    
    const { data, error } = await resend.emails.send({
      from: 'Flintime <noreply@flintime.com>',
      to: email,
      subject: subject,
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${subject}</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif; background-color: #f9fafb; color: #374151;">
          <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#f9fafb">
            <tr>
              <td align="center" style="padding: 40px 0;">
                <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.1);">
                  <!-- Header -->
                  <tr>
                    <td align="center" style="padding: 30px 40px; background-color: #7c3aed; color: #ffffff;">
                      <img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IconOnly_Transparent_NoBuffer%20(1)-qipSsiq4ftcvpww0P3lSnzRPc4YOtH.png" alt="Flintime" width="60" height="60" style="display: block; margin: 0 auto 20px; background-color: white; padding: 10px; border-radius: 50%;">
                      <h1 style="margin: 0; font-size: 24px; font-weight: 700; line-height: 1.3; text-shadow: 0 1px 1px rgba(0, 0, 0, 0.1);">Reset Your ${accountTypeLabel} Password</h1>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td align="left" style="padding: 30px 40px 20px;">
                      <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #374151;">
            We received a request to reset your password for your Flintime ${accountTypeLabel} account. 
                        Please click the button below to create a new password:
                      </p>
                      
                      <!-- CTA Button -->
                      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 32px 0;">
                        <tr>
                          <td align="center">
                            <a href="${resetLink}" style="display: inline-block; background-color: #7c3aed; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; text-align: center; padding: 12px 24px; border-radius: 8px; box-shadow: 0 2px 4px rgba(124, 58, 237, 0.2);">
            Reset Password
          </a>
                          </td>
                        </tr>
                      </table>
                      
                      <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #374151;">
            If you did not request a password reset, please ignore this email or contact support 
            if you have concerns.
          </p>
                      
                      <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #374151;">
            This password reset link is only valid for the next hour.
          </p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="padding: 20px 40px 30px;">
                      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 0 0 20px;" />
                      <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #6b7280; text-align: center;">
            If you're having trouble clicking the "Reset Password" button, copy and paste the URL below into your web browser:
          </p>
                      <p style="margin: 10px 0 0; font-size: 14px; line-height: 1.5; color: #6b7280; word-break: break-all; text-align: center;">
                        <a href="${resetLink}" style="color: #7c3aed; text-decoration: none; font-weight: 500;">${resetLink}</a>
                      </p>
                      <p style="margin: 20px 0 0; font-size: 14px; line-height: 1.5; color: #6b7280; text-align: center;">
                        &copy; ${new Date().getFullYear()} Flintime. All rights reserved.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error('Error sending reset password email:', error);
      return { success: false, error: error.message };
    }

    console.log('Reset password email sent successfully:', data?.id);
    return { success: true };
  } catch (error: any) {
    console.error('Exception sending reset password email:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Interface for appointment email data
 */
interface AppointmentEmailData {
  recipient: 'user' | 'business';
  recipientEmail: string;
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

/**
 * Sends an appointment notification email to the user or business
 */
export async function sendAppointmentEmail(
  emailData: AppointmentEmailData
): Promise<{ success: boolean; error?: string }> {
  try {
    const { recipient, recipientEmail, appointmentDetails, customerDetails, businessDetails, actionUrl } = emailData;
    
    // Validate required fields to prevent emails with undefined values
    if (!recipientEmail) {
      console.error('Missing recipient email, cannot send appointment email');
      return { success: false, error: 'Missing recipient email' };
    }
    
    if (!appointmentDetails.service) {
      console.error('Missing service name in appointment details');
      return { success: false, error: 'Missing service name' };
    }
    
    if (!customerDetails.name) {
      console.error('Missing customer name in details');
      return { success: false, error: 'Missing customer name' };
    }
    
    if (!businessDetails.name) {
      console.error('Missing business name in details');
      return { success: false, error: 'Missing business name' };
    }
    
    // Log the data we're using to send the email
    console.log(`Sending appointment email to ${recipient} with data:`, {
      recipientEmail: recipientEmail.slice(0, 3) + '***@***' + recipientEmail.split('@')[1],
      service: appointmentDetails.service,
      businessName: businessDetails.name,
      customerName: customerDetails.name,
    });
    
    // Determine email subject based on recipient
    const subject = recipient === 'user'
      ? `Your Appointment Request with ${businessDetails.name}`
      : `New Appointment Request from ${customerDetails.name}`;
    
    // Create React component with email data
    const emailComponent = React.createElement(AppointmentEmail, {
      recipient,
      appointmentDetails,
      customerDetails,
      businessDetails,
      actionUrl
    });
    
    // Send the email using Resend with React component
    const { data, error } = await resend.emails.send({
      from: 'Flintime <notifications@flintime.com>',
      to: recipientEmail,
      subject: subject,
      react: emailComponent, // Use the React component directly instead of HTML
    });

    if (error) {
      console.error(`Error sending appointment email to ${recipient}:`, error);
      return { success: false, error: error.message };
    }

    console.log(`Appointment email sent successfully to ${recipient}:`, data?.id);
    return { success: true };
  } catch (error: any) {
    console.error(`Exception sending appointment email:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Interface for reschedule request email data
 */
interface RescheduleRequestEmailData {
  userEmail: string;
  appointmentDetails: {
    service: string;
    originalDate: string;
    originalTime: string;
    newDate: string;
    newTime: string;
  };
  businessDetails: {
    name: string;
    phone?: string;
  };
  actionUrl: string;
}

/**
 * Sends an email notification to a user when a business requests to reschedule an appointment
 */
export async function sendRescheduleRequestEmail(
  emailData: RescheduleRequestEmailData
): Promise<{ success: boolean; error?: string }> {
  try {
    const { userEmail, appointmentDetails, businessDetails, actionUrl } = emailData;
    
    // Format dates for display if they're not already formatted
    const formatDate = (dateStr: string) => {
      try {
        if (dateStr.includes(',')) return dateStr; // Already formatted
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      } catch (e) {
        return dateStr; // Return original if formatting fails
      }
    };
    
    // Add logging to diagnose the issue
    console.log('Reschedule Email - Original appointment details:', JSON.stringify(appointmentDetails, null, 2));
    
    // Ensure we have valid values for date and time
    const originalDate = formatDate(appointmentDetails.originalDate || 'Invalid date');
    const newDate = formatDate(appointmentDetails.newDate || 'Invalid date');
    
    // Provide fallbacks for undefined values
    const originalTime = appointmentDetails.originalTime || 'Not specified';
    const newTime = appointmentDetails.newTime || 'Not specified';
    const service = appointmentDetails.service || 'your appointment';
    
    // Send the email using Resend
    const { data, error } = await resend.emails.send({
      from: 'Flintime <notifications@flintime.com>',
      to: userEmail,
      subject: `Appointment Time Change Request from ${businessDetails.name}`,
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Appointment Time Change Request</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif; background-color: #f9fafb; color: #374151;">
          <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#f9fafb">
            <tr>
              <td align="center" style="padding: 40px 0;">
                <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.1);">
                  <!-- Header -->
                  <tr>
                    <td align="center" style="padding: 30px 40px; background-color: #7c3aed; color: #ffffff;">
                      <img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IconOnly_Transparent_NoBuffer%20(1)-qipSsiq4ftcvpww0P3lSnzRPc4YOtH.png" alt="Flintime" width="60" height="60" style="display: block; margin: 0 auto 20px; background-color: white; padding: 10px; border-radius: 50%;">
                      <h1 style="margin: 0; font-size: 24px; font-weight: 700; line-height: 1.3; text-shadow: 0 1px 1px rgba(0, 0, 0, 0.1);">Appointment Time Change Request</h1>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td align="left" style="padding: 30px 40px 20px;">
                      <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #374151;">
                        <span style="font-weight: 600; color: #7c3aed;">${businessDetails.name}</span> has requested to change the time of your <span style="font-weight: 600; color: #7c3aed;">${service}</span> appointment.
                      </p>
                      
                      <!-- Current Appointment Info -->
                      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f9fafb; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
                        <tr>
                          <td>
                            <h3 style="margin: 0 0 12px; font-size: 18px; font-weight: 600; color: #1f2937;">Current Appointment</h3>
                            <p style="margin: 0 0 8px; font-size: 15px; color: #4b5563;"><strong>Service:</strong> ${service}</p>
                            <p style="margin: 0 0 8px; font-size: 15px; color: #4b5563;"><strong>Date:</strong> ${originalDate}</p>
                            <p style="margin: 0 0 0; font-size: 15px; color: #4b5563;"><strong>Time:</strong> ${originalTime}</p>
                          </td>
                        </tr>
                      </table>
                      
                      <!-- Suggested New Time Info -->
                      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f0f9ff; padding: 16px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #7c3aed;">
                        <tr>
                          <td>
                            <h3 style="margin: 0 0 12px; font-size: 18px; font-weight: 600; color: #1f2937;">Suggested New Time</h3>
                            <p style="margin: 0 0 8px; font-size: 15px; color: #4b5563;"><strong>Date:</strong> ${newDate}</p>
                            <p style="margin: 0 0 0; font-size: 15px; color: #4b5563;"><strong>Time:</strong> ${newTime}</p>
                          </td>
                        </tr>
                      </table>
                      
                      <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #374151;">
                        Please log in to your account and go to the <strong>My Appointments</strong> page to accept or decline this time change request.
                      </p>
                      
                      <!-- CTA Button -->
                      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 32px 0;">
                        <tr>
                          <td align="center">
                            <a href="${actionUrl}" style="display: inline-block; background-color: #7c3aed; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; text-align: center; padding: 12px 24px; border-radius: 8px; box-shadow: 0 2px 4px rgba(124, 58, 237, 0.2);">
                              Login to Approve or Decline
                            </a>
                          </td>
                        </tr>
                      </table>
                      
                      <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #374151; text-align: center;">
                        <span style="font-weight: 500;">Note:</span> To approve this time change, you must login to your account and visit the My Appointments page.
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="padding: 0 40px 30px;">
                      <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #6b7280; text-align: center;">
            If you have any questions, please contact ${businessDetails.name}
            ${businessDetails.phone ? ' at ' + businessDetails.phone : ''} or reply to this email.
          </p>
                      <p style="margin: 10px 0 0; font-size: 14px; line-height: 1.5; color: #6b7280; text-align: center;">
                        Your appointments can be managed at <a href="${actionUrl}" style="color: #7c3aed; text-decoration: none; font-weight: 500;">My Appointments</a> page.
                      </p>
                      <p style="margin: 10px 0 0; font-size: 14px; line-height: 1.5; color: #6b7280; text-align: center;">
                        &copy; ${new Date().getFullYear()} Flintime. All rights reserved.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error('Error sending reschedule request email:', error);
      return { success: false, error: error.message };
    }

    console.log('Reschedule request email sent successfully:', data?.id);
    return { success: true };
  } catch (error: any) {
    console.error('Exception sending reschedule request email:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Interface for reschedule approval email data
 */
interface RescheduleApprovalEmailData {
  businessEmail: string;
  appointmentDetails: {
    service: string;
    originalDate: string;
    originalTime: string;
    newDate: string;
    newTime: string;
  };
  customerDetails: {
    name: string;
    phone?: string;
  };
  actionUrl: string;
}

/**
 * Sends an email notification to a business when a user approves a time change request
 */
export async function sendRescheduleApprovalEmail(
  emailData: RescheduleApprovalEmailData
): Promise<{ success: boolean; error?: string }> {
  try {
    const { businessEmail, appointmentDetails, customerDetails, actionUrl } = emailData;
    
    // Format dates for display if they're not already formatted
    const formatDate = (dateStr: string) => {
      try {
        if (dateStr.includes(',')) return dateStr; // Already formatted
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      } catch (e) {
        return dateStr; // Return original if formatting fails
      }
    };
    
    const originalDate = formatDate(appointmentDetails.originalDate);
    const newDate = formatDate(appointmentDetails.newDate);
    
    // Send the email using Resend
    const { data, error } = await resend.emails.send({
      from: 'Flintime <notifications@flintime.com>',
      to: businessEmail,
      subject: `${customerDetails.name} Approved Your Appointment Time Change`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IconOnly_Transparent_NoBuffer%20(1)-qipSsiq4ftcvpww0P3lSnzRPc4YOtH.png" alt="Flintime" style="width: 60px; margin-bottom: 20px;">
          
          <h2 style="color: #7c3aed; margin-bottom: 24px;">Appointment Time Change Approved</h2>
          
          <p style="color: #4b5563; margin-bottom: 20px;">
            Good news! ${customerDetails.name} has approved your request to change the time of their ${appointmentDetails.service} appointment.
          </p>
          
          <div style="background-color: #f9fafb; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
            <h3 style="color: #374151; margin-top: 0; margin-bottom: 16px;">Previous Appointment</h3>
            <p style="color: #4b5563; margin-bottom: 8px;"><strong>Service:</strong> ${appointmentDetails.service}</p>
            <p style="color: #4b5563; margin-bottom: 8px;"><strong>Date:</strong> ${originalDate}</p>
            <p style="color: #4b5563; margin-bottom: 8px;"><strong>Time:</strong> ${appointmentDetails.originalTime}</p>
          </div>
          
          <div style="background-color: #f0fff4; padding: 16px; border-radius: 8px; margin-bottom: 24px; border-left: 4px solid #10b981;">
            <h3 style="color: #374151; margin-top: 0; margin-bottom: 16px;">New Confirmed Time</h3>
            <p style="color: #4b5563; margin-bottom: 8px;"><strong>Date:</strong> ${newDate}</p>
            <p style="color: #4b5563; margin-bottom: 8px;"><strong>Time:</strong> ${appointmentDetails.newTime}</p>
          </div>
          
          <p style="color: #4b5563; margin-bottom: 24px;">
            The appointment has been updated in your calendar.
          </p>
          
          <a 
            href="${actionUrl}" 
            style="
              display: inline-block;
              background-color: #7c3aed;
              color: white;
              padding: 12px 24px;
              text-decoration: none;
              border-radius: 6px;
              margin-bottom: 24px;
              font-weight: bold;
            "
          >
            View Appointment
          </a>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 32px;">
            If you have any questions, you can contact the customer
            ${customerDetails.phone ? ' at ' + customerDetails.phone : ''}.
          </p>
        </div>
      `,
    });

    if (error) {
      console.error(`Error sending reschedule approval email:`, error);
      return { success: false, error: error.message };
    }

    console.log(`Reschedule approval email sent successfully:`, data?.id);
    return { success: true };
  } catch (error: any) {
    console.error(`Exception sending reschedule approval email:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Interface for appointment confirmation email data
 */
interface AppointmentConfirmationEmailData {
  userEmail: string;
  appointmentDetails: {
    service: string;
    date: string;
    time: string;
    notes?: string;
  };
  businessDetails: {
    name: string;
    address?: string;
    phone?: string;
  };
  actionUrl: string;
}

/**
 * Sends an email notification to a user when a business confirms their appointment
 */
export async function sendAppointmentConfirmationEmail(
  emailData: AppointmentConfirmationEmailData
): Promise<{ success: boolean; error?: string }> {
  try {
    const { userEmail, appointmentDetails, businessDetails, actionUrl } = emailData;
    
    // Format date for display if it's not already formatted
    const formatDate = (dateStr: string) => {
      try {
        if (dateStr.includes(',')) return dateStr; // Already formatted
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      } catch (e) {
        return dateStr; // Return original if formatting fails
      }
    };
    
    const formattedDate = formatDate(appointmentDetails.date);
    
    // Send the email using Resend
    const { data, error } = await resend.emails.send({
      from: 'Flintime <notifications@flintime.com>',
      to: userEmail,
      subject: `Your Appointment with ${businessDetails.name} is Confirmed`,
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Appointment Confirmation</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif; background-color: #f9fafb; color: #374151;">
          <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#f9fafb">
            <tr>
              <td align="center" style="padding: 40px 0;">
                <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.1);">
                  <!-- Header -->
                  <tr>
                    <td align="center" style="padding: 30px 40px; background-color: #10b981; color: #ffffff;">
                      <img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IconOnly_Transparent_NoBuffer%20(1)-qipSsiq4ftcvpww0P3lSnzRPc4YOtH.png" alt="Flintime" width="60" height="60" style="display: block; margin: 0 auto 20px; background-color: white; padding: 10px; border-radius: 50%;">
                      <h1 style="margin: 0; font-size: 24px; font-weight: 700; line-height: 1.3; text-shadow: 0 1px 1px rgba(0, 0, 0, 0.1);">Appointment Confirmed</h1>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td align="left" style="padding: 30px 40px 20px;">
                      <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #374151;">
                        Your appointment with <span style="font-weight: 600; color: #10b981;">${businessDetails.name}</span> has been confirmed. We've added this appointment to your calendar.
                      </p>
                      
                      <!-- Status Badge -->
                      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #d1fae5; padding: 12px; border-radius: 8px; margin-bottom: 24px; text-align: center;">
                        <tr>
                          <td>
                            <p style="margin: 0; font-size: 16px; font-weight: 600; color: #10b981;">Confirmed</p>
                          </td>
                        </tr>
                      </table>
                      
                      <!-- Appointment Details -->
                      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                        <tr>
                          <td>
                            <h3 style="margin: 0 0 16px; font-size: 18px; font-weight: 600; color: #1f2937; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">Appointment Details</h3>
                            
                            <table width="100%" border="0" cellspacing="0" cellpadding="0">
                              <tr>
                                <td width="30%" style="padding-bottom: 12px; vertical-align: top;">
                                  <p style="margin: 0; font-size: 14px; font-weight: 600; color: #6b7280;">Service:</p>
                                </td>
                                <td width="70%" style="padding-bottom: 12px; vertical-align: top;">
                                  <p style="margin: 0; font-size: 15px; color: #1f2937;">${appointmentDetails.service}</p>
                                </td>
                              </tr>
                              <tr>
                                <td width="30%" style="padding-bottom: 12px; vertical-align: top;">
                                  <p style="margin: 0; font-size: 14px; font-weight: 600; color: #6b7280;">Date:</p>
                                </td>
                                <td width="70%" style="padding-bottom: 12px; vertical-align: top;">
                                  <p style="margin: 0; font-size: 15px; color: #1f2937;">${formattedDate}</p>
                                </td>
                              </tr>
                              <tr>
                                <td width="30%" style="padding-bottom: 12px; vertical-align: top;">
                                  <p style="margin: 0; font-size: 14px; font-weight: 600; color: #6b7280;">Time:</p>
                                </td>
                                <td width="70%" style="padding-bottom: 12px; vertical-align: top;">
                                  <p style="margin: 0; font-size: 15px; color: #1f2937;">${appointmentDetails.time}</p>
                                </td>
                              </tr>
                              ${appointmentDetails.notes ? `
                              <tr>
                                <td width="30%" style="vertical-align: top;">
                                  <p style="margin: 0; font-size: 14px; font-weight: 600; color: #6b7280;">Notes:</p>
                                </td>
                                <td width="70%" style="vertical-align: top;">
                                  <p style="margin: 0; font-size: 15px; color: #1f2937;">${appointmentDetails.notes}</p>
                                </td>
                              </tr>
                              ` : ''}
                            </table>
                          </td>
                        </tr>
                      </table>
                      
                      <!-- Business Info -->
                      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
                        <tr>
                          <td>
                            <h3 style="margin: 0 0 16px; font-size: 18px; font-weight: 600; color: #1f2937; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">Business Information</h3>
                            
                            <table width="100%" border="0" cellspacing="0" cellpadding="0">
                              <tr>
                                <td width="30%" style="padding-bottom: 12px; vertical-align: top;">
                                  <p style="margin: 0; font-size: 14px; font-weight: 600; color: #6b7280;">Name:</p>
                                </td>
                                <td width="70%" style="padding-bottom: 12px; vertical-align: top;">
                                  <p style="margin: 0; font-size: 15px; color: #1f2937;">${businessDetails.name}</p>
                                </td>
                              </tr>
                              ${businessDetails.phone ? `
                              <tr>
                                <td width="30%" style="padding-bottom: 12px; vertical-align: top;">
                                  <p style="margin: 0; font-size: 14px; font-weight: 600; color: #6b7280;">Phone:</p>
                                </td>
                                <td width="70%" style="padding-bottom: 12px; vertical-align: top;">
                                  <p style="margin: 0; font-size: 15px; color: #1f2937;">${businessDetails.phone}</p>
                                </td>
                              </tr>
                              ` : ''}
                              ${businessDetails.address ? `
                              <tr>
                                <td width="30%" style="vertical-align: top;">
                                  <p style="margin: 0; font-size: 14px; font-weight: 600; color: #6b7280;">Address:</p>
                                </td>
                                <td width="70%" style="vertical-align: top;">
                                  <p style="margin: 0; font-size: 15px; color: #1f2937;">${businessDetails.address}</p>
                                </td>
                              </tr>
                              ` : ''}
                            </table>
                          </td>
                        </tr>
                      </table>
                      
                      <!-- CTA Button -->
                      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 32px 0;">
                        <tr>
                          <td align="center">
                            <a href="${actionUrl}" style="display: inline-block; background-color: #10b981; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; text-align: center; padding: 12px 24px; border-radius: 8px; box-shadow: 0 2px 4px rgba(16, 185, 129, 0.2);">
                              View Appointment Details
                            </a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="padding: 0 40px 30px;">
                      <p style="margin: 20px 0 0; font-size: 14px; line-height: 1.5; color: #6b7280; text-align: center;">
                        If you need to reschedule or cancel, please do so at least 24 hours before your appointment time.
                      </p>
                      <p style="margin: 10px 0 0; font-size: 14px; line-height: 1.5; color: #6b7280; text-align: center;">
                        If you have any questions, please contact <a href="mailto:support@flintime.com" style="color: #10b981; text-decoration: none; font-weight: 500;">support@flintime.com</a>.
                      </p>
                      <p style="margin: 10px 0 0; font-size: 14px; line-height: 1.5; color: #6b7280; text-align: center;">
                        &copy; ${new Date().getFullYear()} Flintime. All rights reserved.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error('Error sending appointment confirmation email:', error);
      return { success: false, error: error.message };
    }

    console.log('Appointment confirmation email sent successfully:', data?.id);
    return { success: true };
  } catch (error: any) {
    console.error('Exception sending appointment confirmation email:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Interface for appointment cancellation email data
 */
interface AppointmentCancellationEmailData {
  recipientEmail: string;
  recipientType: 'user' | 'business';
  appointmentDetails: {
    service: string;
    date: string;
    time: string;
  };
  canceledBy: 'user' | 'business';
  cancelerName: string;
  otherPartyDetails: {
    name: string;
    phone?: string;
  };
  actionUrl: string;
}

/**
 * Sends an email notification when an appointment is canceled
 */
export async function sendAppointmentCancellationEmail(
  emailData: AppointmentCancellationEmailData
): Promise<{ success: boolean; error?: string }> {
  try {
    const { 
      recipientEmail, 
      recipientType, 
      appointmentDetails, 
      canceledBy, 
      cancelerName,
      otherPartyDetails, 
      actionUrl 
    } = emailData;
    
    // Determine email content based on recipient type and who canceled
    const title = `${appointmentDetails.service} Appointment Canceled`;
    const selfCanceled = (canceledBy === 'user' && recipientType === 'user') || 
                         (canceledBy === 'business' && recipientType === 'business');
    
    // Format date for display if it's not already formatted
    const formatDate = (dateStr: string) => {
      try {
        if (dateStr.includes(',')) return dateStr; // Already formatted
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      } catch (e) {
        return dateStr; // Return original if formatting fails
      }
    };
    
    const formattedDate = formatDate(appointmentDetails.date);
    
    // Send the email using Resend
    const { data, error } = await resend.emails.send({
      from: 'Flintime <notifications@flintime.com>',
      to: recipientEmail,
      subject: title,
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${title}</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif; background-color: #f9fafb; color: #374151;">
          <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#f9fafb">
            <tr>
              <td align="center" style="padding: 40px 0;">
                <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.1);">
                  <!-- Header -->
                  <tr>
                    <td align="center" style="padding: 30px 40px; background-color: #ef4444; color: #ffffff;">
                      <img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IconOnly_Transparent_NoBuffer%20(1)-qipSsiq4ftcvpww0P3lSnzRPc4YOtH.png" alt="Flintime" width="60" height="60" style="display: block; margin: 0 auto 20px; background-color: white; padding: 10px; border-radius: 50%;">
                      <h1 style="margin: 0; font-size: 24px; font-weight: 700; line-height: 1.3; text-shadow: 0 1px 1px rgba(0, 0, 0, 0.1);">Appointment Canceled</h1>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td align="left" style="padding: 30px 40px 20px;">
                      ${selfCanceled ? `
                        <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #374151;">
                          You have canceled your ${appointmentDetails.service} appointment on ${formattedDate} at ${appointmentDetails.time}.
                        </p>
                      ` : `
                        <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #374151;">
                          Your ${appointmentDetails.service} appointment on ${formattedDate} at ${appointmentDetails.time} has been canceled by <span style="font-weight: 600; color: #ef4444;">${cancelerName}</span>.
                        </p>
                      `}
                      
                      <!-- Status Badge -->
                      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #fee2e2; padding: 12px; border-radius: 8px; margin-bottom: 24px; text-align: center;">
                        <tr>
                          <td>
                            <p style="margin: 0; font-size: 16px; font-weight: 600; color: #ef4444;">Canceled</p>
                          </td>
                        </tr>
                      </table>
                      
                      <!-- Appointment Details -->
                      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                        <tr>
                          <td>
                            <h3 style="margin: 0 0 16px; font-size: 18px; font-weight: 600; color: #1f2937; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">Canceled Appointment Details</h3>
                            
                            <table width="100%" border="0" cellspacing="0" cellpadding="0">
                              <tr>
                                <td width="30%" style="padding-bottom: 12px; vertical-align: top;">
                                  <p style="margin: 0; font-size: 14px; font-weight: 600; color: #6b7280;">Service:</p>
                                </td>
                                <td width="70%" style="padding-bottom: 12px; vertical-align: top;">
                                  <p style="margin: 0; font-size: 15px; color: #1f2937;">${appointmentDetails.service}</p>
                                </td>
                              </tr>
                              <tr>
                                <td width="30%" style="padding-bottom: 12px; vertical-align: top;">
                                  <p style="margin: 0; font-size: 14px; font-weight: 600; color: #6b7280;">Date:</p>
                                </td>
                                <td width="70%" style="padding-bottom: 12px; vertical-align: top;">
                                  <p style="margin: 0; font-size: 15px; color: #1f2937;">${formattedDate}</p>
                                </td>
                  </tr>
                  <tr>
                                <td width="30%" style="padding-bottom: 12px; vertical-align: top;">
                                  <p style="margin: 0; font-size: 14px; font-weight: 600; color: #6b7280;">Time:</p>
                                </td>
                                <td width="70%" style="padding-bottom: 12px; vertical-align: top;">
                                  <p style="margin: 0; font-size: 15px; color: #1f2937;">${appointmentDetails.time}</p>
                                </td>
                  </tr>
                              <tr>
                                <td width="30%" style="vertical-align: top;">
                                  <p style="margin: 0; font-size: 14px; font-weight: 600; color: #6b7280;">Canceled by:</p>
                                </td>
                                <td width="70%" style="vertical-align: top;">
                                  <p style="margin: 0; font-size: 15px; color: #1f2937;">${cancelerName}</p>
                                </td>
                              </tr>
                            </table>
                          </td>
                  </tr>
                      </table>
                      
                      <!-- CTA Button -->
                      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 32px 0;">
                        <tr>
                          <td align="center">
                            <a href="${actionUrl}" style="display: inline-block; background-color: #6b7280; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; text-align: center; padding: 12px 24px; border-radius: 8px; box-shadow: 0 2px 4px rgba(107, 114, 128, 0.2);">
                              ${recipientType === 'user' ? 'View Your Appointments' : 'View Appointment Dashboard'}
                            </a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="padding: 0 40px 30px;">
                      <p style="margin: 20px 0 0; font-size: 14px; line-height: 1.5; color: #6b7280; text-align: center;">
                        If you have any questions, please contact <a href="mailto:support@flintime.com" style="color: #6b7280; text-decoration: none; font-weight: 500;">support@flintime.com</a>.
                      </p>
                      <p style="margin: 10px 0 0; font-size: 14px; line-height: 1.5; color: #6b7280; text-align: center;">
                        &copy; ${new Date().getFullYear()} Flintime. All rights reserved.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error('Error sending appointment cancellation email:', error);
      return { success: false, error: error.message };
    }

    console.log('Appointment cancellation email sent successfully:', data?.id);
    return { success: true };
  } catch (error: any) {
    console.error('Exception sending appointment cancellation email:', error);
    return { success: false, error: error.message };
  }
}