/* pages/contact.js */

import Head from 'next/head';
import Header from '../components/Header';
import Footer from '../components/Footer';
import PageContainer from '../components/PageContainer';
import ContentCard from '../components/ContentCard';
import styles from '../styles/InternalPages.module.css';

export default function ContactPage() {
  return (
    <>
      <Head>
        <title>Contact - Crackers by VB</title>
        <meta
          name="description"
          content="Contactez Crackers by VB pour toute question ou demande personnalisée."
        />
      </Head>

      <Header />

      <PageContainer
        title="Contactez-moi"
        subtitle="N'hésitez pas à me contacter, je vous réponds avec plaisir !"
        narrow
      >
        <ContentCard>
          <form className={styles.form}>
            <div className={styles.formGroup}>
              <label htmlFor="name" className={styles.label}>
                Nom complet
              </label>
              <input
                id="name"
                name="name"
                type="text"
                className={styles.input}
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
              />
            </div>

            <button type="submit" className={styles.primaryButton}>
              Envoyer le message
            </button>
          </form>
        </ContentCard>
      </PageContainer>

      <Footer />
    </>
  );
}