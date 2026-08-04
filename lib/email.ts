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
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="https://approbation-factures-v2.vercel.app/logo-conteneurs-experts.png" alt="Conteneurs Experts" style="height: 80px;">
        </div>
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
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="https://approbation-factures-v2.vercel.app/logo-conteneurs-experts.png" alt="Conteneurs Experts" style="height: 80px;">
        </div>
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

// Email envoyé à l'approbateur quand une nouvelle facture arrive pour lui
export async function sendApprovalRequestEmail(
  approverEmail: string,
  approverName: string,
  documentName: string,
  uploadedBy: string,
  pdfUrl?: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="https://approbation-factures-v2.vercel.app/logo-conteneurs-experts.png" alt="Conteneurs Experts" style="height: 80px;">
        </div>
        <h2 style="color: #6f42c1;">📋 Nouvelle facture à approuver</h2>
        <p>Bonjour ${approverName},</p>
        <p>Une nouvelle facture a été soumise pour votre approbation par <strong>${uploadedBy}</strong>.</p>
        <div style="background: #f8f9fa; padding: 15px; border-radius: 4px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Document:</strong> ${documentName}</p>
          <p style="margin: 10px 0 0 0;"><strong>Date de soumission:</strong> ${new Date().toLocaleString('fr-CA', { timeZone: 'America/Toronto' })}</p>
        </div>
        <p><a href="https://approbation-factures-v2.vercel.app/approbateur" style="display: inline-block; background: #6f42c1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin-top: 10px; font-weight: bold;">✅ Approuver la facture</a></p>
        ${pdfUrl ? `<p style="margin-top: 15px;"><a href="${pdfUrl}" style="color: #007bff;">📄 Prévisualiser le document</a></p>` : ''}
        <hr style="margin-top: 30px; border: none; border-top: 1px solid #ddd;">
        <p style="font-size: 12px; color: #666;">Ce courriel a été envoyé automatiquement par le système d'approbation Conteneurs Experts.</p>
      </div>
    `;

    const result = await resend.emails.send({
      from: 'Approbation Factures <onboarding@resend.dev>',
      to: approverEmail,
      subject: `📋 Nouvelle facture à approuver: ${documentName}`,
      html,
    });

    if (result.error) {
      return { ok: false, error: JSON.stringify(result.error) };
    }
    return { ok: true };
  } catch (error) {
    console.error('Approval request email error:', error);
    return { ok: false, error: String(error) };
  }
}

export interface ExpenseBatchRow {
  employeName: string;
  date: string;
  fileName: string;
  amount: number;
  amountTps?: number;
  amountTvq?: number;
  category: string;
  categoryOtherDescription?: string;
  expenseExplanation?: string;
  status: string;
  pdfUrl?: string;
}

/**
 * Envoie le récapitulatif mensuel des dépenses Visa à la comptabilité
 * (Christine, payables@). Un seul courriel regroupant toutes les dépenses
 * du mois précédent, tous statuts confondus.
 */
export async function sendMonthlyExpenseBatch(
  toEmail: string,
  periodLabel: string,
  rows: ExpenseBatchRow[]
): Promise<{ ok: boolean; error?: string }> {
  try {
    const fmt = (n?: number) =>
      n != null ? n.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD' }) : '—';

    const statusLabel = (s: string) =>
      s === 'approved' ? '✅ Approuvée' : s === 'rejected' ? '❌ Rejetée' : '⏳ En attente';

    const totalAmount = rows.reduce((sum, r) => sum + (r.amount || 0), 0);
    const totalTps = rows.reduce((sum, r) => sum + (r.amountTps || 0), 0);
    const totalTvq = rows.reduce((sum, r) => sum + (r.amountTvq || 0), 0);

    const tableRows = rows
      .map(
        (r) => `
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;">${r.employeName}</td>
          <td style="padding: 8px; border: 1px solid #ddd; white-space: nowrap;">${r.date}</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${fmt(r.amount)}</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${fmt(r.amountTps)}</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${fmt(r.amountTvq)}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${r.category}${r.category === 'Autre' && r.categoryOtherDescription ? ` (${r.categoryOtherDescription})` : ''}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${r.expenseExplanation || '—'}</td>
          <td style="padding: 8px; border: 1px solid #ddd; white-space: nowrap;">${statusLabel(r.status)}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${r.pdfUrl ? `<a href="${r.pdfUrl}">📄 Reçu</a>` : '—'}</td>
        </tr>`
      )
      .join('');

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 900px; margin: 0 auto;">
        <h2 style="color: #1e90ff;">💳 Dépenses Visa — ${periodLabel}</h2>
        <p>Bonjour Christine,</p>
        <p>Voici le récapitulatif mensuel des dépenses Visa soumises durant la période <strong>${periodLabel}</strong> (${rows.length} dépense${rows.length > 1 ? 's' : ''}).</p>
        <table style="border-collapse: collapse; width: 100%; font-size: 13px;">
          <thead>
            <tr style="background: #f0f4f8;">
              <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Employé</th>
              <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Date</th>
              <th style="padding: 8px; border: 1px solid #ddd; text-align: right;">Montant</th>
              <th style="padding: 8px; border: 1px solid #ddd; text-align: right;">TPS</th>
              <th style="padding: 8px; border: 1px solid #ddd; text-align: right;">TVQ</th>
              <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Catégorie</th>
              <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Explication</th>
              <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Statut</th>
              <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Reçu</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
          <tfoot>
            <tr style="background: #f0f4f8; font-weight: bold;">
              <td style="padding: 8px; border: 1px solid #ddd;" colspan="2">TOTAL</td>
              <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${fmt(totalAmount)}</td>
              <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${fmt(totalTps)}</td>
              <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${fmt(totalTvq)}</td>
              <td style="padding: 8px; border: 1px solid #ddd;" colspan="4"></td>
            </tr>
          </tfoot>
        </table>
        <p style="margin-top: 20px; font-size: 13px; color: #444;">Les dépenses en attente ou rejetées sont incluses à titre informatif — à traiter selon votre jugement.</p>
        <hr style="margin-top: 30px; border: none; border-top: 1px solid #ddd;">
        <p style="font-size: 12px; color: #666;">Ce courriel a été envoyé automatiquement par le système d'approbation Conteneurs Experts le 1er du mois.</p>
      </div>
    `;

    const result = await resend.emails.send({
      from: 'Approbation Factures <onboarding@resend.dev>',
      to: toEmail,
      subject: `💳 Dépenses Visa — ${periodLabel} (${rows.length} dépense${rows.length > 1 ? 's' : ''})`,
      html,
    });

    if (result.error) {
      return { ok: false, error: JSON.stringify(result.error) };
    }
    return { ok: true };
  } catch (error) {
    console.error('Monthly expense batch email error:', error);
    return { ok: false, error: String(error) };
  }
}
