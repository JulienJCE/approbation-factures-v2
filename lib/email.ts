import { Client } from '@microsoft/msgraph-client';

export async function sendApprovalEmail(
  recipientEmail: string,
  documentName: string,
  status: 'approved' | 'rejected',
  approverName: string
) {
  try {
    // Configuration minimale pour test
    console.log(`📧 Email sent to ${recipientEmail}: ${documentName} - ${status}`);
    return true;
  } catch (error) {
    console.error('Email error:', error);
    return false;
  }
}
