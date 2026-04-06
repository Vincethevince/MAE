import { z } from "zod";

export const PROVIDER_CATEGORIES = [
  "friseur",
  "kosmetik",
  "nagelstudio",
  "massage",
  "physiotherapie",
  "tattoostudio",
  "barbershop",
  "waxing",
] as const;

export type ProviderCategory = (typeof PROVIDER_CATEGORIES)[number];

export const businessProfileSchema = z.object({
  businessName: z.string().min(2).max(100),
  address: z.string().min(5).max(200),
  city: z.string().min(2).max(100),
  postalCode: z.string().regex(/^\d{5}$/, "postalCodeInvalid"),
  phone: z
    .string()
    .regex(/^[+\d\s\-().]{7,20}$/, "phoneInvalid")
    .optional()
    .or(z.literal("")),
  category: z.enum(PROVIDER_CATEGORIES, {
    message: "categoryRequired",
  }),
  description: z.string().max(500).optional().or(z.literal("")),
  website: z
    .string()
    .url("websiteInvalid")
    .refine(
      (url) => url.startsWith("https://") || url.startsWith("http://"),
      "websiteInvalid"
    )
    .optional()
    .or(z.literal("")),
});

export const serviceSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(300).optional().or(z.literal("")),
  durationMinutes: z.coerce.number().int().min(5).max(480),
  priceCents: z.coerce.number().int().min(0).max(10_000_000),
  category: z.string().min(1, "categoryRequired").max(50),
});

export const availabilitySchema = z
  .object({
    dayOfWeek: z.coerce.number().int().min(0).max(6),
    startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "timeFormatInvalid"),
    endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "timeFormatInvalid"),
  })
  .refine(
    (data) => {
      const [startH, startM] = data.startTime.split(":").map(Number);
      const [endH, endM] = data.endTime.split(":").map(Number);
      const startTotal = (startH ?? 0) * 60 + (startM ?? 0);
      const endTotal = (endH ?? 0) * 60 + (endM ?? 0);
      return endTotal > startTotal;
    },
    {
      path: ["endTime"],
      message: "endTimeAfterStartTime",
    }
  );

export const employeeSchema = z.object({
  name: z.string().min(2).max(100),
});

export type BusinessProfileInput = z.infer<typeof businessProfileSchema>;
export type ServiceInput = z.infer<typeof serviceSchema>;
export type AvailabilityInput = z.infer<typeof availabilitySchema>;
export type EmployeeInput = z.infer<typeof employeeSchema>;
