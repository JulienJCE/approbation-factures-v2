import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendResetEmail(
  recipientEmail: string,
  userName: string,
  tempPassword: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #007bff;">🔑 Réinitialisation de mot de passe</h2>
        <p>Bonjour ${userName},</p>
        <p>Votre mot de passe temporaire pour l'application Approbation de Factures Conteneurs Experts a été réinitialisé.</p>
        <div style="background: #f8f9fa; padding: 15px; border-radius: 4px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Email:</strong> ${recipientEmail}</p>
          <p style="margin: 10px 0 0 0;"><strong>Mot de passe temporaire:</strong> <code style="background: #fff; padding: 4px 8px; border-radius: 3px; font-size: 16px;">${tempPassword}</code></p>
        </div>
        <p><strong>⚠️ Important:</strong> Vous devrez changer ce mot de passe temporaire dès votre prochain login.</p>
        <p><a href="https://approbation-factures-v2.vercel.app/login" style="display: inline-block; background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin-top: 10px;">Se connecter</a></p>
        <hr style="margin-top: 30px; border: none; border-top: 1px solid #ddd;">
        <p style="font-size: 12px; color: #666;">Si vous n'avez pas demandé cette réinitialisation, contactez immédiatement l'administrateur.</p>
      </div>
    `;

    const result = await resend.emails.send({
      from: 'Approbation Factures <onboarding@resend.dev>',
      to: recipientEmail,
      subject: '🔑 Réinitialisation de votre mot de passe',
      html,
    });

    if (result.error) {
      return { ok: false, error: JSON.stringify(result.error) };
    }
    return { ok: true };
  } catch (error) {
    console.error('Reset email error:', error);
    return { ok: false, error: String(error) };
  }
}

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
