/* pages/apropos.js */

import Head from "next/head";
import Header from "../components/Header";
import Footer from "../components/Footer";
import PageContainer from "../components/PageContainer";
import ContentCard from "../components/ContentCard";
import styles from "../styles/InternalPages.module.css";

export default function AproposPage() {
  return (
    <>
      <Head>
        <title>À propos - Crackers by VB</title>
        <meta
          name="description"
          content="Découvrez l’univers de Crackers by VB, ses créations artisanales et son exigence de qualité."
        />
      </Head>

      <Header />

      <PageContainer title="À propos de Crackers by VB">
        <ContentCard>
          <h2 className={styles.sectionTitle}>Mon Histoire</h2>
          <p className={styles.text}>
            Je suis Virginie, créatrice passionnée qui a fait de mon amour pour
            l’artisanat textile mon métier. Chaque pièce qui sort de mon atelier
            est le fruit d’un travail minutieux et d’une attention particulière
            portée aux détails.
          </p>
          <br />
          <p className={styles.text}>
            Je maîtrise plusieurs techniques artisanales : le tricot, la
            couture, la création de sacs, les retouches, les accessoires de
            maison et les valisettes de jeux pour enfants. Chaque création est
            unique et reflète mon exigence de qualité.
          </p>
        </ContentCard>

        <ContentCard>
          <h2 className={styles.sectionTitle}>Mon Perfectionnisme</h2>

          <div className={styles.quoteBox}>
            <p className={styles.quoteText}>
              "Pour moi, chaque finition compte. Je n’accepte de livrer une
              création que lorsqu’elle correspond exactement à mes standards de
              qualité. C’est cette exigence qui fait la différence et qui donne
              à chaque pièce son caractère unique."
            </p>
          </div>

          <p className={styles.text}>
            Mon perfectionnisme se reflète dans chaque couture, chaque point de
            tricot, chaque assemblage. Je travaille seule, ce qui me permet de
            contrôler chaque étape de la création et de garantir une qualité
            irréprochable.
          </p>
        </ContentCard>

        <ContentCard>
          <h2 className={styles.sectionTitle}>Mes Créations</h2>

          <div className={styles.gridTwo}>
            <div className={styles.smallCard}>
              <h3 className={styles.smallCardTitle}>Couture</h3>
              <p className={styles.text}>
                Cabas, sacs de voyage, charlottes alimentaires, bananes, sacs à
                dos.
              </p>
            </div>

            <div className={styles.smallCard}>
              <h3 className={styles.smallCardTitle}>Crochet</h3>
              <p className={styles.text}>
                Amigurumis, peluches enfant, porte clé, poupée...
              </p>
            </div>

            <div className={styles.smallCard}>
              <h3 className={styles.smallCardTitle}>Tricot</h3>
              <p className={styles.text}>Pulls, écharpes, châles</p>
            </div>

            <div className={styles.smallCard}>
              <h3 className={styles.smallCardTitle}>Créations Enfants</h3>
              <p className={styles.text}>
                Valisettes de jeux, accessoires déco pour chambre, et autres
                créations pour les petits.
              </p>
            </div>
          </div>
        </ContentCard>

        <ContentCard>
          <h2 className={styles.sectionTitle}>Me Rencontrer</h2>
          <p className={styles.text}>
            Vous pouvez découvrir mes créations lors des{" "}
            <span className={styles.textStrong}>marchés de Noël</span> et
            événements artisanaux de la région. C’est l’occasion parfaite pour
            voir les pièces de près, toucher les matières et échanger
            directement avec moi sur vos projets personnalisés.
          </p>
          <br />
          <p className={styles.text}>
            Mes créations sont également disponibles dans les boutiques Casabé à
            Évian et Les Créatives à Thonon.
          </p>
        </ContentCard>

        <ContentCard className={styles.contactCard}>
          <h2 className={styles.sectionTitle}>Contact</h2>
          <a href="mailto:vbeninca74@outlook.fr" className={styles.contactLink}>
            vbeninca74@outlook.fr
          </a>
        </ContentCard>
      </PageContainer>

      <Footer />
    </>
  );
}
