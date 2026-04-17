/** Helpers for the DSGVO Art. 20 user data export. */

export interface AppointmentExportRow {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  price_cents: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  service_name: string | null;
  provider_business_name: string | null;
}

export interface ReviewExportRow {
  id: string;
  provider_id: string;
  appointment_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

export interface SavedProviderExportRow {
  id: string;
  provider_id: string;
  created_at: string;
}

export interface ProviderDataExport {
  provider: Record<string, unknown>;
  services: Record<string, unknown>[];
  employees: Record<string, unknown>[];
  availability: Record<string, unknown>[];
  schedule_blocks: Record<string, unknown>[];
  appointments_note: string;
}

export interface ExportPayload {
  export_generated_at: string;
  schema_version: number;
  auth: {
    email: string;
    created_at: string | null;
    last_sign_in_at: string | null;
  };
  profile: {
    id: string;
    email: string;
    full_name: string | null;
    phone: string | null;
    role: string;
    created_at: string;
    updated_at: string;
  } | null;
  appointments: AppointmentExportRow[];
  reviews_authored: ReviewExportRow[];
  saved_providers: SavedProviderExportRow[];
  provider_data: ProviderDataExport | null;
}

/** Returns the ISO-date-stamped export filename. Date must be caller-supplied (never user input). */
export function buildExportFilename(isoDate: string): string {
  return `mae-data-export-${isoDate}.json`;
}

/** Assembles the export payload from pre-fetched rows. Pure function — no I/O. */
export function buildExportPayload(opts: {
  exportedAt: string;
  auth: ExportPayload["auth"];
  profile: ExportPayload["profile"];
  appointments: AppointmentExportRow[];
  reviews: ReviewExportRow[];
  savedProviders: SavedProviderExportRow[];
  providerData: ProviderDataExport | null;
}): ExportPayload {
  return {
    export_generated_at: opts.exportedAt,
    schema_version: 1,
    auth: opts.auth,
    profile: opts.profile,
    appointments: opts.appointments,
    reviews_authored: opts.reviews,
    saved_providers: opts.savedProviders,
    provider_data: opts.providerData,
  };
}
