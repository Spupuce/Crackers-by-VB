// pages/api/contact.js

import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      message: 'Méthode non autorisée.',
    });
  }

  const { name, email, subject, message } = req.body || {};

  const trimmedData = {
    name: typeof name === 'string' ? name.trim() : '',
    email: typeof email === 'string' ? email.trim() : '',
    subject: typeof subject === 'string' ? subject.trim() : '',
    message: typeof message === 'string' ? message.trim() : '',
  };

  if (
    !trimmedData.name ||
    !trimmedData.email ||
    !trimmedData.subject ||
    !trimmedData.message
  ) {
    return res.status(400).json({
      message: 'Tous les champs sont obligatoires.',
    });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(trimmedData.email)) {
    return res.status(400).json({
      message: 'Adresse email invalide.',
    });
  }

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = Number(process.env.SMTP_PORT || 465);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const mailFromName = process.env.MAIL_FROM_NAME || 'Crackers by VB';
  const mailFromAddress = process.env.MAIL_FROM_ADDRESS;
  const contactRecipientEmail = process.env.CONTACT_RECIPIENT_EMAIL;

  if (
    !smtpHost ||
    !smtpPort ||
    !smtpUser ||
    !smtpPass ||
    !mailFromAddress ||
    !contactRecipientEmail
  ) {
    return res.status(500).json({
      message: 'La configuration email du site est incomplète côté serveur.',
    });
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  try {
    await transporter.sendMail({
      from: {
        name: mailFromName,
        address: mailFromAddress,
      },
      to: contactRecipientEmail,
      replyTo: {
        name: trimmedData.name,
        address: trimmedData.email,
      },
      subject: `[Contact site] ${trimmedData.subject}`,
      text: `
Nom : ${trimmedData.name}
Email : ${trimmedData.email}
Sujet : ${trimmedData.subject}

Message :
${trimmedData.message}
      `.trim(),
      html: `
        <html>
          <body>
            <h2>Nouveau message depuis le formulaire de contact</h2>
            <p><strong>Nom :</strong> ${escapeHtml(trimmedData.name)}</p>
            <p><strong>Email :</strong> ${escapeHtml(trimmedData.email)}</p>
            <p><strong>Sujet :</strong> ${escapeHtml(trimmedData.subject)}</p>
            <p><strong>Message :</strong></p>
            <p>${escapeHtml(trimmedData.message).replace(/\n/g, '<br />')}</p>
          </body>
        </html>
      `,
    });

    return res.status(200).json({
      message: 'Message envoyé avec succès.',
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Une erreur serveur est survenue lors de l’envoi du message.',
    });
  }
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}