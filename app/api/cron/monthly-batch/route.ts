import { NextRequest, NextResponse } from 'next/server';
import { getExpensesForMonthlyBatch, markExpensesBatchSent } from '@/lib/db';
import { sendMonthlyExpenseBatch, ExpenseBatchRow } from '@/lib/email';

export const dynamic = 'force-dynamic';

const COMPTA_EMAIL = process.env.COMPTA_EMAIL || 'payables@conteneursexperts.com';

/**
 * Cron mensuel (1er du mois) : envoie à la comptabilité (Christine) le
 * récapitulatif de TOUTES les dépenses Visa du mois précédent, tous
 * statuts confondus, puis marque ces dépenses comme envoyées
 * (batch_sent_at) pour éviter les doublons.
 *
 * Sécurité : Vercel Cron ajoute l'en-tête `Authorization: Bearer ${CRON_SECRET}`
 * lorsque la variable CRON_SECRET est définie dans le projet.
 */
export async function GET(request: NextRequest) {
  try {
    // Vérification du secret cron (si configuré)
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const authHeader = request.headers.get('authorization');
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
      }
    }

    // Période = mois précédent complet (heure de Montréal approximée en UTC)
    const now = new Date();
    const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
    const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

    const periodLabel = periodStart.toLocaleDateString('fr-CA', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    });

    const expenses = await getExpensesForMonthlyBatch(periodStart, periodEnd);

    if (!expenses.length) {
      return NextResponse.json({
        ok: true,
        sent: false,
        message: `Aucune dépense Visa pour ${periodLabel} — aucun courriel envoyé.`,
      });
    }

    const rows: ExpenseBatchRow[] = expenses.map((doc) => ({
      employeName: doc.submittedByName || 'Inconnu',
      date: doc.createdAt.toLocaleDateString('fr-CA', { timeZone: 'America/Toronto' }),
      fileName: doc.fileName,
      amount: doc.amount || 0,
      amountTps: doc.amountTps,
      amountTvq: doc.amountTvq,
      category: doc.category || 'Autre',
      categoryOtherDescription: doc.categoryOtherDescription,
      expenseExplanation: doc.expenseExplanation,
      cardType: doc.cardType,
      status: doc.status,
      pdfUrl: doc.pdfUrl,
    }));

    const emailResult = await sendMonthlyExpenseBatch(COMPTA_EMAIL, periodLabel, rows);

    if (!emailResult.ok) {
      // Ne PAS marquer batch_sent_at si l'envoi a échoué — le prochain
      // passage du cron (ou un déclenchement manuel) reprendra ces dépenses.
      return NextResponse.json(
        { ok: false, sent: false, error: emailResult.error },
        { status: 500 }
      );
    }

    const marked = await markExpensesBatchSent(expenses.map((e) => e.id));

    return NextResponse.json({
      ok: true,
      sent: true,
      period: periodLabel,
      count: expenses.length,
      marked,
      to: COMPTA_EMAIL,
    });
  } catch (error) {
    console.error('Monthly batch cron error:', error);
    return NextResponse.json(
      { ok: false, error: String(error) },
      { status: 500 }
    );
  }
}
