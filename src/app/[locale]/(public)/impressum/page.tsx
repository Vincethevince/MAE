import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export const metadata: Metadata = {
  title: "Impressum – MAE",
  robots: { index: false },
};

export default async function ImpressumPage() {
  const t = await getTranslations("legal");

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-bold mb-8">{t("impressum.title")}</h1>

      <div className="prose prose-sm max-w-none space-y-6 text-sm leading-relaxed text-foreground">
        <section>
          <h2 className="text-base font-semibold mb-2">{t("impressum.angaben")}</h2>
          <p className="text-muted-foreground">
            MAE – Make Appointments Easier<br />
            {/* TODO: Firmenname, Rechtsform */}
            [Firmenname und Rechtsform eintragen]<br />
            [Straße und Hausnummer]<br />
            [PLZ Ort]<br />
            Deutschland
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold mb-2">{t("impressum.kontakt")}</h2>
          <p className="text-muted-foreground">
            {t("impressum.email")}: <a href="mailto:kontakt@makeappointmentseasier.com" className="text-primary hover:underline">kontakt@makeappointmentseasier.com</a><br />
            {t("impressum.phone")}: [Telefonnummer eintragen]
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold mb-2">{t("impressum.vertreter")}</h2>
          <p className="text-muted-foreground">
            [Name des Geschäftsführers / Vertretungsberechtigten]
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold mb-2">{t("impressum.register")}</h2>
          <p className="text-muted-foreground">
            {t("impressum.registerGericht")}: [Amtsgericht]<br />
            {t("impressum.registerNummer")}: [Handelsregisternummer]
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold mb-2">{t("impressum.ust")}</h2>
          <p className="text-muted-foreground">
            {t("impressum.ustId")}: [USt-IdNr. eintragen]
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold mb-2">{t("impressum.streitbeilegung")}</h2>
          <p className="text-muted-foreground">
            {t("impressum.streitbeilegungText")}
          </p>
          <p className="text-muted-foreground mt-2">
            {t("impressum.euStreitschlichtung")}{" "}
            <a
              href="https://ec.europa.eu/consumers/odr/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              https://ec.europa.eu/consumers/odr/
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}
