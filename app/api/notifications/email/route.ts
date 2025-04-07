import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { Business } from '@/models/Business';
import { sendAppointmentEmail } from '@/lib/resend';

export async function POST(req: NextRequest) {
  try {
    const { type, businessId, appointment, customerDetails } = await req.json();

    // Add detailed logging to diagnose duplicate emails
    console.log('Email notification request received:', {
      type,
      appointment: {
        date: appointment.date,
        time: appointment.time,
        status: appointment.status
      },
      customerDetails: {
        name: customerDetails.customerName,
        phone: customerDetails.customerPhone?.slice(-4) || 'none', // Only log last 4 digits for privacy
        hasEmail: !!customerDetails.customerEmail,
        service: customerDetails.service
      }
    });

    if (type !== 'new_appointment') {
      return NextResponse.json(
        { error: 'Invalid notification type' },
        { status: 400 }
      );
    }

    // Validate required fields - prevent sending emails with undefined data
    if (!customerDetails.customerName || !customerDetails.service) {
      console.error('Missing required data for sending email:', {
        hasName: !!customerDetails.customerName,
        hasService: !!customerDetails.service
      });
      return NextResponse.json(
        { error: 'Missing required data for notification', missingData: true },
        { status: 400 }
      );
    }

    // Format date for display
    let formattedDate;
    try {
      // Make sure we have a valid date
      if (!appointment.date) {
        throw new Error('Missing appointment date');
      }
      
      const appointmentDate = new Date(appointment.date);
      formattedDate = appointmentDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (dateError) {
      console.error('Error formatting date:', dateError);
      formattedDate = 'Date to be confirmed';
    }

    // Get business details
    const business = await Business.findById(businessId);
    if (!business) {
      throw new Error('Business not found');
    }

    const businessDetails = {
      name: business.business_name || 'Business Name',
      address: business.address || '',
      city: business.city || '',
      state: business.state || '',
      phone: business.phone?.toString() || ''
    };

    // Get user email if available
    const userEmail = customerDetails.customerEmail;

    // Prepare URLs for action buttons
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const businessUrl = `${baseUrl}/business/dashboard/appointments`;
    const userUrl = `${baseUrl}/profile/appointments`;

    // Results tracking
    const results = {
      sentToBusiness: false,
      sentToUser: false,
      businessError: null as string | null,
      userError: null as string | null
    };

    // Send email to business
    if (business.email) {
      const businessEmailResult = await sendAppointmentEmail({
        recipient: 'business',
        recipientEmail: business.email,
        appointmentDetails: {
          service: customerDetails.service,
          date: formattedDate,
          time: appointment.time || 'Time to be confirmed',
          notes: customerDetails.notes || '',
          status: appointment.status || 'requested'
        },
        customerDetails: {
          name: customerDetails.customerName,
          phone: customerDetails.customerPhone || 'Phone not provided',
          email: customerDetails.customerEmail
        },
        businessDetails,
        actionUrl: businessUrl
      });

      results.sentToBusiness = businessEmailResult.success;
      if (!businessEmailResult.success) {
        results.businessError = businessEmailResult.error || 'Unknown error';
      }
    }

    // Send email to user if we have their email
    if (userEmail) {
      const userEmailResult = await sendAppointmentEmail({
        recipient: 'user',
        recipientEmail: userEmail,
        appointmentDetails: {
          service: customerDetails.service,
          date: formattedDate,
          time: appointment.time || 'Time to be confirmed',
          notes: customerDetails.notes || '',
          status: appointment.status || 'requested'
        },
        customerDetails: {
          name: customerDetails.customerName,
          phone: customerDetails.customerPhone || 'Phone not provided',
          email: userEmail
        },
        businessDetails,
        actionUrl: userUrl
      });

      results.sentToUser = userEmailResult.success;
      if (!userEmailResult.success) {
        results.userError = userEmailResult.error || 'Unknown error';
      }
    }

    // Log results
    console.log('Email notification results:', {
      sentToBusiness: results.sentToBusiness,
      sentToUser: results.sentToUser,
      businessError: results.businessError,
      userError: results.userError
    });

    return NextResponse.json({
      success: results.sentToBusiness || results.sentToUser,
      results
    });
  } catch (error) {
    console.error('Error sending email notification:', error);
    return NextResponse.json(
      { error: 'Failed to send email notification' },
      { status: 500 }
    );
  }
} 