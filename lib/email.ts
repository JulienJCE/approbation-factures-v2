import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendApprovalEmail(
  recipientEmail: string,
  documentName: string,
  status: 'approved' | 'rejected',
  approverName: string,
  pdfUrl?: string
): Promise<{ ok: boolean; error?: string; id?: string }> {
  try {
    const isApproved = status === 'approved';
    const subject = isApproved
      ? `✅ Facture approuvée: ${documentName}`
      : `❌ Facture rejetée: ${documentName}`;

    const statusText = isApproved ? 'APPROUVÉE' : 'REJETÉE';
    const statusColor = isApproved ? '#28a745' : '#dc3545';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: ${statusColor};">Facture ${statusText}</h2>
        <p>Bonjour,</p>
        <p>La facture <strong>${documentName}</strong> a été <strong style="color: ${statusColor};">${statusText.toLowerCase()}</strong> par ${approverName}.</p>
        <p><strong>Date:</strong> ${new Date().toLocaleString('fr-CA', { timeZone: 'America/Toronto' })}</p>
        ${isApproved ? '<p>📎 <strong>La facture tamponnée est jointe à ce courriel.</strong></p>' : ''}
        ${pdfUrl ? `<p><a href="${pdfUrl}" style="display: inline-block; background: ${statusColor}; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin-top: 10px;">📄 Voir le document ${isApproved ? 'tamponné' : ''}</a></p>` : ''}
        <hr style="margin-top: 30px; border: none; border-top: 1px solid #ddd;">
        <p style="font-size: 12px; color: #666;">Ce courriel a été envoyé automatiquement par le système d'approbation Conteneurs Experts.</p>
      </div>
    `;

    // Télécharger le PDF pour le joindre au courriel
    const attachments: Array<{ filename: string; content: string }> = [];
    if (pdfUrl) {
      try {
        const pdfRes = await fetch(pdfUrl);
        if (pdfRes.ok) {
          const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer());
          attachments.push({
            filename: documentName,
            content: pdfBuffer.toString('base64'),
          });
        }
      } catch (err) {
        console.error('PDF fetch for attachment failed:', err);
        // On continue quand même — email envoyé sans pièce jointe
      }
    }

    const result = await resend.emails.send({
      from: 'Approbation Factures <onboarding@resend.dev>',
      to: recipientEmail,
      subject,
      html,
      attachments: attachments.length > 0 ? attachments : undefined,
    });

    if (result.error) {
      return { ok: false, error: JSON.stringify(result.error) };
    }

    return { ok: true, id: result.data?.id };
  } catch (error) {
    console.error('Email error:', error);
    return { ok: false, error: String(error) };
  }
}
