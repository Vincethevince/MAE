import { z } from "zod";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const bookingSchema = z.object({
  providerId: z
    .string()
    .regex(UUID_REGEX, "Invalid provider ID"),
  serviceId: z
    .string()
    .regex(UUID_REGEX, "Invalid service ID"),
  startTime: z
    .string()
    .datetime({ message: "Invalid datetime format" })
    .refine(
      (val) => new Date(val) > new Date(),
      { message: "Start time must be in the future" }
    ),
  notes: z.string().max(500).optional(),
});

export type BookingInput = z.infer<typeof bookingSchema>;

export const reviewSchema = z.object({
  appointmentId: z.string().regex(UUID_REGEX, "Invalid appointment ID"),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().max(500).optional().or(z.literal("")),
});

export type ReviewInput = z.infer<typeof reviewSchema>;
