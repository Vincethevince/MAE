"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import type { Database } from "@/types/database";
import { addService, updateService, deleteService } from "../../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Service = Database["public"]["Tables"]["services"]["Row"];

interface ServicesClientProps {
  services: Service[];
}

function formatPrice(cents: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

interface ServiceFormProps {
  service?: Service;
  onCancel?: () => void;
  onSuccess: () => void;
}

function ServiceForm({ service, onCancel, onSuccess }: ServiceFormProps) {
  const t = useTranslations("dashboard.services");
  const tCommon = useTranslations("common");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      const action = service ? updateService : addService;
      if (service) {
        formData.set("serviceId", service.id);
      }
      const result = await action(formData);
      if ("error" in result && result.error) {
        setError(t(`errors.${result.error}`) || tCommon("error"));
      } else {
        onSuccess();
      }
    });
  };

  return (
    <form action={handleSubmit} className="space-y-4">
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor={`name-${service?.id ?? "new"}`}>
            {t("fields.name")}
          </Label>
          <Input
            id={`name-${service?.id ?? "new"}`}
            name="name"
            defaultValue={service?.name}
            required
            minLength={2}
            maxLength={100}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`category-${service?.id ?? "new"}`}>
            {t("fields.category")}
          </Label>
          <Input
            id={`category-${service?.id ?? "new"}`}
            name="category"
            defaultValue={service?.category}
            required
          />
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor={`duration-${service?.id ?? "new"}`}>
            {t("fields.durationMinutes")}
          </Label>
          <Input
            id={`duration-${service?.id ?? "new"}`}
            name="durationMinutes"
            type="number"
            defaultValue={service?.duration_minutes ?? 60}
            min={5}
            max={480}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`price-${service?.id ?? "new"}`}>
            {t("fields.priceCents")}
          </Label>
          <Input
            id={`price-${service?.id ?? "new"}`}
            name="priceCents"
            type="number"
            defaultValue={service?.price_cents ?? 0}
            min={0}
            step={1}
            required
          />
          <p className="text-xs text-muted-foreground">{t("fields.priceHint")}</p>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`desc-${service?.id ?? "new"}`}>
          {t("fields.description")}
        </Label>
        <Textarea
          id={`desc-${service?.id ?? "new"}`}
          name="description"
          defaultValue={service?.description ?? ""}
          maxLength={300}
          rows={2}
        />
      </div>
      <div className="flex gap-2">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isPending}
          >
            {tCommon("cancel")}
          </Button>
        )}
        <Button type="submit" disabled={isPending} className="flex-1">
          {isPending ? tCommon("loading") : tCommon("save")}
        </Button>
      </div>
    </form>
  );
}

interface ServiceCardProps {
  service: Service;
  onDeleted: (id: string) => void;
  onUpdated: (service: Service) => void;
}

function ServiceCard({ service, onDeleted, onUpdated }: ServiceCardProps) {
  const t = useTranslations("dashboard.services");
  const tCommon = useTranslations("common");
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("serviceId", service.id);
      await deleteService(fd);
      onDeleted(service.id);
    });
  };

  if (isEditing) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("editService")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ServiceForm
            service={service}
            onCancel={() => setIsEditing(false)}
            onSuccess={() => {
              setIsEditing(false);
              onUpdated({ ...service });
            }}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold truncate">{service.name}</h3>
              <Badge variant="secondary">{service.category}</Badge>
            </div>
            {service.description && (
              <p className="text-sm text-muted-foreground mt-1">
                {service.description}
              </p>
            )}
            <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
              <span>{service.duration_minutes} min</span>
              <span className="font-medium text-foreground">
                {formatPrice(service.price_cents)}
              </span>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
            >
              {tCommon("edit")}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={isPending}
            >
              {tCommon("delete")}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ServicesClient({ services: initialServices }: ServicesClientProps) {
  const t = useTranslations("dashboard.services");
  const [services, setServices] = useState<Service[]>(initialServices);
  const [showAddForm, setShowAddForm] = useState(false);

  const handleDeleted = (id: string) => {
    setServices((prev) => prev.filter((s) => s.id !== id));
  };

  const handleUpdated = (updated: Service) => {
    setServices((prev) =>
      prev.map((s) => (s.id === updated.id ? updated : s))
    );
  };

  const handleAdded = () => {
    setShowAddForm(false);
    // Reload to get the newly created service from server
    window.location.reload();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground">
            {services.length} {t("servicesCount")}
          </p>
        </div>
        {!showAddForm && (
          <Button onClick={() => setShowAddForm(true)}>{t("addService")}</Button>
        )}
      </div>

      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("newService")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ServiceForm
              onCancel={() => setShowAddForm(false)}
              onSuccess={handleAdded}
            />
          </CardContent>
        </Card>
      )}

      {services.length > 0 ? (
        <>
          <Separator />
          <div className="space-y-3">
            {services.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                onDeleted={handleDeleted}
                onUpdated={handleUpdated}
              />
            ))}
          </div>
        </>
      ) : (
        !showAddForm && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              {t("noServices")}
            </CardContent>
          </Card>
        )
      )}
    </div>
  );
}
