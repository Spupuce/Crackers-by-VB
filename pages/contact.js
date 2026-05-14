// pages/contact.js

import { useState } from 'react';
import Head from 'next/head';
import Header from '../components/Header';
import Footer from '../components/Footer';
import PageContainer from '../components/PageContainer';
import ContentCard from '../components/ContentCard';
import styles from '../styles/InternalPages.module.css';

const initialForm = {
  name: '',
  email: '',
  subject: '',
  message: '',
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ContactPage() {
  const [formData, setFormData] = useState(initialForm);
  const [status, setStatus] = useState({
    type: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (status.message) {
      setStatus({
        type: '',
        message: '',
      });
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const trimmedData = {
      name: formData.name.trim(),
      email: formData.email.trim(),
      subject: formData.subject.trim(),
      message: formData.message.trim(),
    };

    if (
      !trimmedData.name ||
      !trimmedData.email ||
      !trimmedData.subject ||
      !trimmedData.message
    ) {
      setStatus({
        type: 'error',
        message: 'Merci de compléter tous les champs du formulaire.',
      });
      return;
    }

    if (!emailRegex.test(trimmedData.email)) {
      setStatus({
        type: 'error',
        message: 'Merci de renseigner une adresse email valide.',
      });
      return;
    }

    setIsSubmitting(true);
    setStatus({
      type: '',
      message: '',
    });

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(trimmedData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message || 'Une erreur est survenue lors de l’envoi du message.'
        );
      }

      setFormData(initialForm);
      setStatus({
        type: 'success',
        message:
          'Votre message a bien été envoyé. Vous recevrez une réponse dès que possible.',
      });
    } catch (error) {
      setStatus({
        type: 'error',
        message:
          error.message ||
          'Une erreur est survenue lors de l’envoi du message.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Head>
        <title>Contact - Crackers by VB</title>
        <meta
          name="description"
          content="Contactez Crackers by VB pour toute question sur les créations, les disponibilités ou les marchés."
        />
      </Head>

      <Header />

      <PageContainer
        title="Contactez-moi"
        subtitle="N'hésitez pas à me contacter, je vous réponds avec plaisir !"
        narrow
      >
        <ContentCard>
          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            <div className={styles.formGroup}>
              <label htmlFor="name" className={styles.label}>
                Nom complet
              </label>
              <input
                id="name"
                name="name"
                type="text"
                className={styles.input}
                value={formData.name}
                onChange={handleChange}
                autoComplete="name"
                placeholder="Ex. : Virginie Dupont"
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="email" className={styles.label}>
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                className={styles.input}
                value={formData.email}
                onChange={handleChange}
                autoComplete="email"
                placeholder="exemple@domaine.com"
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="subject" className={styles.label}>
                Sujet
              </label>
              <input
                id="subject"
                name="subject"
                type="text"
                className={styles.input}
                value={formData.subject}
                onChange={handleChange}
                placeholder="Question sur un article, une disponibilité ou un marché"
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="message" className={styles.label}>
                Message
              </label>
              <textarea
                id="message"
                name="message"
                className={styles.textarea}
                value={formData.message}
                onChange={handleChange}
                placeholder="Précisez votre demande en quelques lignes"
                required
              />
            </div>

            {status.message ? (
              <p
                className={styles.metaText}
                style={{
                  color:
                    status.type === 'success'
                      ? 'var(--color-success, #2e7d32)'
                      : 'var(--color-error, #c62828)',
                }}
              >
                {status.message}
              </p>
            ) : null}

            <button
              type="submit"
              className={styles.primaryButton}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Envoi en cours...' : 'Envoyer le message'}
            </button>
          </form>
        </ContentCard>
      </PageContainer>

      <Footer />
    </>
  );
}