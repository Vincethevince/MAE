"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

interface NewBookingNotifierProps {
  providerId: string;
  /** Translated notification strings passed from server layout */
  messages: {
    newBooking: string;
    newBookingBody: string;
  };
}

/**
 * Client component that subscribes to Supabase Realtime for new appointment
 * INSERT events scoped to this provider. Shows a toast notification.
 *
 * Security: The subscription uses the browser Supabase client (anon key +
 * the authenticated user's session cookie), so RLS policies on `appointments`
 * apply. The `provider_id=eq.{providerId}` filter is an additional guard.
 */
export function NewBookingNotifier({ providerId, messages }: NewBookingNotifierProps) {
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`new-bookings-${providerId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "appointments",
          filter: `provider_id=eq.${providerId}`,
        },
        () => {
          toast(messages.newBooking, {
            description: messages.newBookingBody,
            duration: 8000,
          });
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [providerId, messages]);

  return null;
}
