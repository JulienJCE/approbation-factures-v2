export async function sendApprovalEmail(
  recipientEmail: string,
  documentName: string,
  status: 'approved' | 'rejected',
  approverName: string
) {
  try {
    // Log pour debug - à remplacer par Microsoft Graph plus tard
    console.log(`📧 Email notification sent to ${recipientEmail}`);
    console.log(`   Document: ${documentName}`);
    console.log(`   Status: ${status}`);
    console.log(`   Approver: ${approverName}`);
    
    return true;
  } catch (error) {
    console.error('Email error:', error);
    return false;
  }
}
