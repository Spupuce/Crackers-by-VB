// lib/services/emailService.js

import nodemailer from 'nodemailer';

export function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function normalizeCustomMessage(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
}

export function getMailFromConfig() {
  const mailFromAddress = process.env.MAIL_FROM_ADDRESS;
  const mailFromName = process.env.MAIL_FROM_NAME || 'Crackers by VB';
  const replyTo = process.env.CONTACT_RECIPIENT_EMAIL || mailFromAddress;

  if (!mailFromAddress) {
    throw new Error('MAIL_FROM_ADDRESS est manquant.');
  }

  return {
    mailFromAddress,
    mailFromName,
    replyTo,
  };
}

export function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !port || !user || !pass) {
    throw new Error('Configuration SMTP incomplète.');
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
    logger: true,
    debug: true,
  });
}

export function getGreeting(customerName) {
  return customerName ? `Bonjour ${customerName},` : 'Bonjour,';
}

export function formatPrice(amount, currency = 'EUR') {
  const numericAmount = Number(amount) || 0;
  const normalizedCurrency =
    typeof currency === 'string' && currency.trim()
      ? currency.trim().toUpperCase()
      : 'EUR';

  try {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: normalizedCurrency,
    }).format(numericAmount);
  } catch (error) {
    return `${numericAmount.toFixed(2)} €`;
  }
}

export function buildOrderItemLabel(item) {
  if (!item) {
    return 'Produit';
  }

  const safeName =
    typeof item.name === 'string' && item.name.trim() ? item.name.trim() : 'Produit';

  if (typeof item.color === 'string' && item.color.trim()) {
    return `${safeName} (${item.color.trim()})`;
  }

  return safeName;
}

export function buildOrderItemsText(orderSummary) {
  const items = Array.isArray(orderSummary?.items) ? orderSummary.items : [];
  const currency = orderSummary?.currency || 'EUR';

  if (items.length === 0) {
    return '';
  }

  return items
    .map((item) => {
      const quantity = Number(item?.quantity) || 0;
      const lineTotal = Number(item?.lineTotal) || 0;
      const itemLabel = buildOrderItemLabel(item);

      return `- ${itemLabel} x${quantity} — ${formatPrice(lineTotal, currency)}`;
    })
    .join('\n');
}

export function buildOrderItemsRowsHtml(orderSummary) {
  const items = Array.isArray(orderSummary?.items) ? orderSummary.items : [];
  const currency = orderSummary?.currency || 'EUR';

  if (items.length === 0) {
    return '';
  }

  return items
    .map((item) => {
      const itemName =
        typeof item?.name === 'string' && item.name.trim()
          ? item.name.trim()
          : 'Produit';
      const itemColor =
        typeof item?.color === 'string' && item.color.trim()
          ? item.color.trim()
          : '';
      const quantity = Number(item?.quantity) || 0;
      const lineTotal = Number(item?.lineTotal) || 0;

      return `
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #E5E7EB; vertical-align: top;">
            <span style="display: block; font-weight: 600; color: #111827;">
              ${escapeHtml(itemName)}
            </span>
            ${
              itemColor
                ? `<span style="display: block; margin-top: 4px; font-size: 13px; color: #6B7280;">
                    Couleur : ${escapeHtml(itemColor)}
                  </span>`
                : ''
            }
          </td>
          <td style="padding: 12px 12px; border-bottom: 1px solid #E5E7EB; text-align: center; vertical-align: top; white-space: nowrap;">
            ${escapeHtml(String(quantity))}
          </td>
          <td style="padding: 12px 0; border-bottom: 1px solid #E5E7EB; text-align: right; vertical-align: top; white-space: nowrap;">
            ${escapeHtml(formatPrice(lineTotal, currency))}
          </td>
        </tr>
      `;
    })
    .join('');
}

export function buildOrderTotalsHtml(orderSummary) {
  const currency = orderSummary?.currency || 'EUR';
  const subtotalAmount = Number(orderSummary?.subtotalAmount) || 0;
  const shippingAmount = Number(orderSummary?.shippingAmount) || 0;
  const totalAmount = Number(orderSummary?.totalAmount) || 0;

  return `
    <table
      role="presentation"
      cellpadding="0"
      cellspacing="0"
      width="100%"
      style="margin-top: 16px; border-collapse: collapse;"
    >
      <tbody>
        <tr>
          <td style="padding: 4px 0; color: #4B5563;">Sous-total</td>
          <td style="padding: 4px 0; text-align: right; color: #111827; white-space: nowrap;">
            ${escapeHtml(formatPrice(subtotalAmount, currency))}
          </td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #4B5563;">Livraison</td>
          <td style="padding: 4px 0; text-align: right; color: #111827; white-space: nowrap;">
            ${escapeHtml(formatPrice(shippingAmount, currency))}
          </td>
        </tr>
        <tr>
          <td style="padding: 10px 0 0; font-weight: 700; color: #111827; border-top: 1px solid #E5E7EB;">
            Total
          </td>
          <td
            style="padding: 10px 0 0; text-align: right; font-weight: 700; color: #111827; border-top: 1px solid #E5E7EB; white-space: nowrap;"
          >
            ${escapeHtml(formatPrice(totalAmount, currency))}
          </td>
        </tr>
      </tbody>
    </table>
  `;
}

export function buildOrderTotalsText(orderSummary) {
  const currency = orderSummary?.currency || 'EUR';
  const subtotalAmount = Number(orderSummary?.subtotalAmount) || 0;
  const shippingAmount = Number(orderSummary?.shippingAmount) || 0;
  const totalAmount = Number(orderSummary?.totalAmount) || 0;

  return `Sous-total : ${formatPrice(subtotalAmount, currency)}
Livraison : ${formatPrice(shippingAmount, currency)}
Total : ${formatPrice(totalAmount, currency)}`;
}

/**
 * EMAIL SUIVI DE STATUT (admin → cliente)
 * --------------------------------------------------
 * On garde ici le ton "nous" car ce sont des messages
 * de suivi plus "institutionnels" qui peuvent venir
 * plus tard d’une petite équipe.
 */
export function buildOrderStatusEmailText({
  orderId,
  customerName,
  statusLabel,
  trackingNumber,
  trackingUrl,
}) {
  const greeting = getGreeting(customerName);

  return `${greeting}

Nous vous contactons au sujet de votre commande ${orderId} sur Crackers by VB.

Statut actuel de votre commande : ${statusLabel}
${trackingNumber ? `Numéro de suivi Mondial Relay : ${trackingNumber}` : ''}
${trackingUrl ? `Lien de suivi : ${trackingUrl}` : ''}

Nous restons disponibles si vous avez la moindre question.

Belle journée,
Crackers by VB`;
}

export function buildOrderStatusEmailHtml({
  orderId,
  customerName,
  statusLabel,
  trackingNumber,
  trackingUrl,
}) {
  const greeting = getGreeting(customerName);

  return `
    <div style="font-family: Arial, sans-serif; color: #1F2937; line-height: 1.6;">
      <p style="margin: 0 0 16px;">${escapeHtml(greeting)}</p>

      <p style="margin: 0 0 16px;">
        Nous vous contactons au sujet de votre commande
        <strong>${escapeHtml(orderId)}</strong> sur Crackers by VB.
      </p>

      <div style="margin: 24px 0; padding: 16px; background: #F9FAFB; border-radius: 12px;">
        <p style="margin: 0 0 8px;"><strong>Commande :</strong> ${escapeHtml(orderId)}</p>
        <p style="margin: 0 0 8px;"><strong>Statut actuel :</strong> ${escapeHtml(statusLabel)}</p>
        ${
          trackingNumber
            ? `<p style="margin: 0 0 8px;"><strong>Numéro de suivi Mondial Relay :</strong> ${escapeHtml(
                trackingNumber
              )}</p>`
            : ''
        }
        ${
          trackingUrl
            ? `<p style="margin: 0;"><strong>Lien de suivi :</strong> <a href="${escapeHtml(
                trackingUrl
              )}" target="_blank" rel="noreferrer">${escapeHtml(trackingUrl)}</a></p>`
            : ''
        }
      </div>

      <p style="margin: 0 0 16px;">
        Nous restons disponibles si vous avez la moindre question.
      </p>

      <p style="margin: 0;">Belle journée,<br />Crackers by VB</p>
    </div>
  `;
}

export function buildCustomEmailText(customMessage) {
  return customMessage;
}

export function buildCustomEmailHtml(customMessage) {
  const safeHtml = escapeHtml(customMessage).replace(/\n/g, '<br />');

  return `
    <div style="font-family: Arial, sans-serif; color: #1F2937; line-height: 1.6;">
      <p style="margin: 0;">${safeHtml}</p>
    </div>
  `;
}

export function buildOrderConfirmationEmailText({
  orderId,
  customerName,
  accountUrl,
  orderSummary,
}) {
  const greeting = getGreeting(customerName);
  const hasAccountLink = typeof accountUrl === 'string' && accountUrl.trim().length > 0;
  const itemsText = buildOrderItemsText(orderSummary);
  const totalsText = buildOrderTotalsText(orderSummary);

  const base = `${greeting}

Merci beaucoup pour votre commande ${orderId} sur Crackers by VB.

Votre paiement est bien confirmé et je commence la préparation de votre commande.

Récapitulatif de votre commande :
${itemsText ? `${itemsText}

` : ''}${totalsText}

Vous recevrez un nouvel email dès que votre colis sera prêt à être déposé en point relais ou expédié.`;

  const followUp = hasAccountLink
    ? `

Si vous avez un compte sur la boutique, vous pouvez retrouver le suivi et le détail de votre commande à tout moment à cette adresse :
${accountUrl}`
    : '';

  const closing = `

Si vous avez la moindre question, vous pouvez me répondre directement à ce message.

Belle journée,
Crackers by VB`;

  return `${base}${followUp}${closing}`;
}

export function buildOrderConfirmationEmailHtml({
  orderId,
  customerName,
  accountUrl,
  orderSummary,
}) {
  const greeting = getGreeting(customerName);
  const safeOrderId = escapeHtml(orderId);
  const safeAccountUrl =
    typeof accountUrl === 'string' && accountUrl.trim().length > 0
      ? escapeHtml(accountUrl.trim())
      : '';
  const itemsRowsHtml = buildOrderItemsRowsHtml(orderSummary);
  const totalsHtml = buildOrderTotalsHtml(orderSummary);

  return `
    <div style="font-family: Arial, sans-serif; color: #1F2937; line-height: 1.6;">
      <p style="margin: 0 0 16px;">${escapeHtml(greeting)}</p>

      <p style="margin: 0 0 16px;">
        Merci beaucoup pour votre commande
        <strong>${safeOrderId}</strong> sur Crackers by VB.
      </p>

      <div style="margin: 24px 0; padding: 20px; background: #F9FAFB; border-radius: 12px;">
        <p style="margin: 0 0 8px; font-weight: 600; font-size: 15px;">
          Récapitulatif de votre commande
        </p>
        <p style="margin: 0 0 4px;"><strong>Commande :</strong> ${safeOrderId}</p>
        <p style="margin: 0 0 16px;"><strong>Paiement :</strong> confirmé</p>

        ${
          itemsRowsHtml
            ? `
        <table
          role="presentation"
          cellpadding="0"
          cellspacing="0"
          width="100%"
          style="width: 100%; border-collapse: collapse; margin-top: 12px;"
        >
          <thead>
            <tr>
              <th
                align="left"
                style="padding: 0 0 10px; border-bottom: 1px solid #D1D5DB; font-size: 13px; color: #4B5563;"
              >
                Article
              </th>
              <th
                align="center"
                style="padding: 0 12px 10px; border-bottom: 1px solid #D1D5DB; font-size: 13px; color: #4B5563; white-space: nowrap;"
              >
                Qté
              </th>
              <th
                align="right"
                style="padding: 0 0 10px; border-bottom: 1px solid #D1D5DB; font-size: 13px; color: #4B5563; white-space: nowrap;"
              >
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            ${itemsRowsHtml}
          </tbody>
        </table>
        `
            : ''
        }

        ${totalsHtml}
      </div>

      <p style="margin: 0 0 12px;">
        Votre commande est maintenant en cours de préparation directement par la créatrice.
      </p>

      <p style="margin: 0 0 12px;">
        Vous recevrez un nouvel email dès que votre colis sera prêt à être déposé en point relais ou expédié.
      </p>

      ${
        safeAccountUrl
          ? `
      <p style="margin: 0 0 16px;">
        Si vous disposez d'un compte sur la boutique, vous pouvez retrouver le suivi et le détail
        de votre commande à tout moment en vous rendant sur votre
        <a href="${safeAccountUrl}" target="_blank" rel="noreferrer">espace client</a>.
      </p>
      `
          : ''
      }

      <p style="margin: 0 0 16px;">
        Si vous avez la moindre question, vous pouvez me répondre directement à ce message.
      </p>

      <p style="margin: 0;">Belle journée,<br />Crackers by VB</p>
    </div>
  `;
}

export function isAcceptedResult(info, email) {
  if (!info) {
    return false;
  }

  const accepted = Array.isArray(info.accepted) ? info.accepted : [];
  const rejected = Array.isArray(info.rejected) ? info.rejected : [];

  if (rejected.includes(email)) {
    return false;
  }

  return accepted.includes(email);
}

export async function sendEmail({
  to,
  subject,
  text,
  html,
}) {
  if (!isValidEmail(to)) {
    throw new Error('Adresse email destinataire invalide.');
  }

  const transporter = getTransporter();
  const { mailFromAddress, mailFromName, replyTo } = getMailFromConfig();

  await transporter.verify();

  const info = await transporter.sendMail({
    from: `"${mailFromName}" <${mailFromAddress}>`,
    to,
    subject,
    text,
    html,
    replyTo,
  });

  if (!isAcceptedResult(info, to)) {
    throw new Error("L'email n'a pas été accepté par le serveur SMTP.");
  }

  return info;
}

export async function sendOrderConfirmationEmail({
  customerEmail,
  customerName,
  orderId,
  accountUrl,
  orderSummary,
}) {
  const subject = `Confirmation de votre commande ${orderId}`;

  return sendEmail({
    to: customerEmail,
    subject,
    text: buildOrderConfirmationEmailText({
      orderId,
      customerName,
      accountUrl,
      orderSummary,
    }),
    html: buildOrderConfirmationEmailHtml({
      orderId,
      customerName,
      accountUrl,
      orderSummary,
    }),
  });
}