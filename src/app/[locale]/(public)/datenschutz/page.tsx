import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export const metadata: Metadata = {
  title: "Datenschutzerklärung – MAE",
  robots: { index: false },
};

export default async function DatenschutzPage() {
  const t = await getTranslations("legal");

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-bold mb-2">{t("datenschutz.title")}</h1>
      <p className="text-sm text-muted-foreground mb-8">{t("datenschutz.stand")}: April 2026</p>

      <div className="space-y-8 text-sm leading-relaxed">

        <section>
          <h2 className="text-base font-semibold mb-3">1. {t("datenschutz.verantwortlicher")}</h2>
          <p className="text-muted-foreground">
            MAE – Make Appointments Easier<br />
            [Firmenname und vollständige Adresse]<br />
            E-Mail: <a href="mailto:datenschutz@makeappointmentseasier.com" className="text-primary hover:underline">datenschutz@makeappointmentseasier.com</a>
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold mb-3">2. {t("datenschutz.erhobene")}</h2>
          <p className="text-muted-foreground mb-3">
            {t("datenschutz.erhobeneBeschreibung")}
          </p>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>{t("datenschutz.daten.name")}</li>
            <li>{t("datenschutz.daten.email")}</li>
            <li>{t("datenschutz.daten.phone")}</li>
            <li>{t("datenschutz.daten.appointments")}</li>
            <li>{t("datenschutz.daten.reviews")}</li>
            <li>{t("datenschutz.daten.providerInfo")}</li>
            <li>{t("datenschutz.daten.technical")}</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold mb-3">3. {t("datenschutz.zweck")}</h2>
          <p className="text-muted-foreground mb-3">
            {t("datenschutz.zweckBeschreibung")}
          </p>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>{t("datenschutz.zwecke.konto")}</li>
            <li>{t("datenschutz.zwecke.buchung")}</li>
            <li>{t("datenschutz.zwecke.kommunikation")}</li>
            <li>{t("datenschutz.zwecke.erinnerung")}</li>
            <li>{t("datenschutz.zwecke.bewertungen")}</li>
            <li>{t("datenschutz.zwecke.verbesserung")}</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold mb-3">4. {t("datenschutz.rechtsgrundlage")}</h2>
          <p className="text-muted-foreground">
            {t("datenschutz.rechtsgrundlageBeschreibung")}
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold mb-3">5. {t("datenschutz.drittanbieter")}</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-foreground mb-1">Supabase</h3>
              <p className="text-muted-foreground">
                {t("datenschutz.supabase")}
              </p>
            </div>
            <div>
              <h3 className="font-medium text-foreground mb-1">Vercel</h3>
              <p className="text-muted-foreground">
                {t("datenschutz.vercel")}
              </p>
            </div>
            <div>
              <h3 className="font-medium text-foreground mb-1">Resend</h3>
              <p className="text-muted-foreground">
                {t("datenschutz.resend")}
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-base font-semibold mb-3">6. {t("datenschutz.speicherung")}</h2>
          <p className="text-muted-foreground">
            {t("datenschutz.speicherungBeschreibung")}
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold mb-3">7. {t("datenschutz.rechte")}</h2>
          <p className="text-muted-foreground mb-3">
            {t("datenschutz.rechteBeschreibung")}
          </p>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>{t("datenschutz.rechteListe.auskunft")}</li>
            <li>{t("datenschutz.rechteListe.berichtigung")}</li>
            <li>{t("datenschutz.rechteListe.loeschung")}</li>
            <li>{t("datenschutz.rechteListe.einschraenkung")}</li>
            <li>{t("datenschutz.rechteListe.widerspruch")}</li>
            <li>{t("datenschutz.rechteListe.uebertragbarkeit")}</li>
            <li>{t("datenschutz.rechteListe.beschwerde")}</li>
          </ul>
          <p className="text-muted-foreground mt-3">
            {t("datenschutz.rechteKontakt")}{" "}
            <a href="mailto:datenschutz@makeappointmentseasier.com" className="text-primary hover:underline">
              datenschutz@makeappointmentseasier.com
            </a>
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold mb-3">8. {t("datenschutz.cookies")}</h2>
          <p className="text-muted-foreground">
            {t("datenschutz.cookiesBeschreibung")}
          </p>
        </section>

      </div>
    </div>
  );
}
