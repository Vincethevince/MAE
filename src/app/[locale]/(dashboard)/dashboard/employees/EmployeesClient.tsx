"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import type { EmployeeWithAvailability } from "./page";
import {
  addEmployee,
  updateEmployee,
  deactivateEmployee,
  setEmployeeAvailability,
  deleteEmployeeAvailability,
} from "@/app/[locale]/(dashboard)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pencil, Check, X as XIcon } from "lucide-react";

// ─── Employee Availability Form ─────────────────────────────────────────────

const ALL_DAYS = [1, 2, 3, 4, 5, 6, 0] as const;

interface DayAvailability {
  startTime: string;
  endTime: string;
}

interface EmployeeAvailabilityFormProps {
  employeeId: string;
  availability: EmployeeWithAvailability["availability"];
}

function EmployeeAvailabilityForm({
  employeeId,
  availability,
}: EmployeeAvailabilityFormProps) {
  const t = useTranslations("dashboard.employees");
  const tAvail = useTranslations("dashboard.availability");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<number, string>>({});

  const initialDays = Object.fromEntries(
    ALL_DAYS.map((day) => {
      const slot = availability.find((a) => a.day_of_week === day);
      return [
        day,
        slot
          ? {
              startTime: slot.start_time.slice(0, 5),
              endTime: slot.end_time.slice(0, 5),
            }
          : { startTime: "", endTime: "" },
      ];
    })
  ) as Record<number, DayAvailability>;

  const [days, setDays] = useState<Record<number, DayAvailability>>(initialDays);

  const updateDay = (day: number, field: "startTime" | "endTime", value: string) => {
    setDays((prev) => ({
      ...prev,
      [day]: { ...prev[day]!, [field]: value },
    }));
    setSuccess(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSuccess(false);

    const newErrors: Record<number, string> = {};
    for (const day of ALL_DAYS) {
      const { startTime, endTime } = days[day]!;
      if ((startTime && !endTime) || (!startTime && endTime)) {
        newErrors[day] = t("errors.validationError");
      }
      if (startTime && endTime && startTime >= endTime) {
        newErrors[day] = t("errors.validationError");
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    startTransition(async () => {
      const savePromises = ALL_DAYS.map((day) => {
        const { startTime, endTime } = days[day]!;
        if (!startTime || !endTime) {
          return Promise.resolve({ success: true as const });
        }
        const fd = new FormData();
        fd.set("employeeId", employeeId);
        fd.set("dayOfWeek", String(day));
        fd.set("startTime", startTime);
        fd.set("endTime", endTime);
        return setEmployeeAvailability(fd);
      });

      const deletePromises = ALL_DAYS.map((day) => {
        const { startTime, endTime } = days[day]!;
        if (!startTime || !endTime) {
          const fd = new FormData();
          fd.set("employeeId", employeeId);
          fd.set("dayOfWeek", String(day));
          return deleteEmployeeAvailability(fd);
        }
        return Promise.resolve({ success: true as const });
      });

      const results = await Promise.all([...savePromises, ...deletePromises]);
      const failed = results.find((r) => "error" in r && r.error);
      if (failed && "error" in failed) {
        setErrors({ 0: t(`errors.${failed.error}`) });
      } else {
        setSuccess(true);
        router.refresh();
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 pt-2">
      {errors[0] && <p className="text-sm text-destructive">{errors[0]}</p>}
      {success && <p className="text-sm text-green-600">{t("saveSuccess")}</p>}

      {ALL_DAYS.map((day) => (
        <div key={day} className="flex items-start gap-4">
          <span className="w-24 text-sm font-medium pt-2.5 shrink-0">
            {tAvail(`days.${day}`)}
          </span>
          <div className="flex flex-col gap-1 flex-1">
            <div className="flex items-center gap-2">
              <Input
                type="time"
                value={days[day]!.startTime}
                onChange={(e) => updateDay(day, "startTime", e.target.value)}
                className="flex-1"
                aria-label={`${tAvail(`days.${day}`)} start time`}
              />
              <span className="text-muted-foreground text-sm shrink-0">–</span>
              <Input
                type="time"
                value={days[day]!.endTime}
                onChange={(e) => updateDay(day, "endTime", e.target.value)}
                className="flex-1"
                aria-label={`${tAvail(`days.${day}`)} end time`}
              />
              {(days[day]!.startTime || days[day]!.endTime) && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    updateDay(day, "startTime", "");
                    updateDay(day, "endTime", "");
                  }}
                  aria-label={`Clear ${tAvail(`days.${day}`)}`}
                >
                  ×
                </Button>
              )}
            </div>
            {errors[day] && (
              <p className="text-xs text-destructive">{errors[day]}</p>
            )}
          </div>
        </div>
      ))}

      <Button type="submit" disabled={isPending} className="mt-2">
        {isPending ? tCommon("loading") : tCommon("save")}
      </Button>
    </form>
  );
}

// ─── Employee Card ───────────────────────────────────────────────────────────

interface EmployeeCardProps {
  employee: EmployeeWithAvailability;
  onDeactivated: (id: string) => void;
}

function EmployeeCard({ employee, onDeactivated }: EmployeeCardProps) {
  const t = useTranslations("dashboard.employees");
  const tCommon = useTranslations("common");
  const [showAvailability, setShowAvailability] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(employee.name);
  const router = useRouter();

  const handleDeactivate = () => {
    if (!window.confirm(t("deactivateConfirm"))) return;
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("employeeId", employee.id);
      const result = await deactivateEmployee(fd);
      if ("error" in result && result.error) {
        setError(t(`errors.${result.error}`));
      } else {
        onDeactivated(employee.id);
        router.refresh();
      }
    });
  };

  const handleRename = () => {
    if (!editName.trim() || editName.trim() === employee.name) {
      setIsEditing(false);
      return;
    }
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("employeeId", employee.id);
      fd.set("name", editName.trim());
      const result = await updateEmployee(fd);
      if ("error" in result && result.error) {
        setError(t(`errors.${result.error}`));
      } else {
        setIsEditing(false);
        router.refresh();
      }
    });
  };

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between gap-4">
          {isEditing ? (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRename();
                  if (e.key === "Escape") { setIsEditing(false); setEditName(employee.name); }
                }}
                autoFocus
                className="h-8 text-sm"
                maxLength={100}
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={handleRename}
                disabled={isPending}
                aria-label={tCommon("save")}
              >
                <Check className="h-4 w-4 text-green-600" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => { setIsEditing(false); setEditName(employee.name); }}
                aria-label={tCommon("cancel")}
              >
                <XIcon className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 min-w-0">
              <h3 className="font-semibold truncate">{employee.name}</h3>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0 opacity-50 hover:opacity-100"
                onClick={() => setIsEditing(true)}
                aria-label={tCommon("edit")}
              >
                <Pencil className="h-3 w-3" />
              </Button>
            </div>
          )}
          <div className="flex gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAvailability((v) => !v)}
            >
              {t("availabilityTitle")}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeactivate}
              disabled={isPending}
            >
              {t("deactivate")}
            </Button>
          </div>
        </div>
        {error && <p className="text-sm text-destructive mt-2">{error}</p>}
        {showAvailability && (
          <div className="mt-4 border-t pt-4">
            <EmployeeAvailabilityForm
              employeeId={employee.id}
              availability={employee.availability}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Add Employee Form ───────────────────────────────────────────────────────

interface AddEmployeeFormProps {
  onAdded: () => void;
  onCancel: () => void;
}

function AddEmployeeForm({ onAdded, onCancel }: AddEmployeeFormProps) {
  const t = useTranslations("dashboard.employees");
  const tCommon = useTranslations("common");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      const result = await addEmployee(formData);
      if ("error" in result && result.error) {
        setError(t(`errors.${result.error}`));
      } else {
        onAdded();
      }
    });
  };

  return (
    <form action={handleSubmit} className="space-y-4">
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="space-y-1.5">
        <Label htmlFor="new-employee-name">{t("fields.name")}</Label>
        <Input
          id="new-employee-name"
          name="name"
          required
          minLength={2}
          maxLength={100}
          autoFocus
        />
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
          {tCommon("cancel")}
        </Button>
        <Button type="submit" disabled={isPending} className="flex-1">
          {isPending ? tCommon("loading") : tCommon("save")}
        </Button>
      </div>
    </form>
  );
}

// ─── Main Client Component ───────────────────────────────────────────────────

interface EmployeesClientProps {
  employees: EmployeeWithAvailability[];
}

export function EmployeesClient({ employees: initialEmployees }: EmployeesClientProps) {
  const t = useTranslations("dashboard.employees");
  const router = useRouter();
  const [employees, setEmployees] =
    useState<EmployeeWithAvailability[]>(initialEmployees);
  const [showAddForm, setShowAddForm] = useState(false);

  const handleDeactivated = (id: string) => {
    setEmployees((prev) => prev.filter((e) => e.id !== id));
  };

  const handleAdded = () => {
    setShowAddForm(false);
    router.refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        {!showAddForm && (
          <Button onClick={() => setShowAddForm(true)}>
            {t("addEmployee")}
          </Button>
        )}
      </div>

      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("addEmployee")}</CardTitle>
          </CardHeader>
          <CardContent>
            <AddEmployeeForm
              onAdded={handleAdded}
              onCancel={() => setShowAddForm(false)}
            />
          </CardContent>
        </Card>
      )}

      {employees.length > 0 ? (
        <div className="space-y-3">
          {employees.map((emp) => (
            <EmployeeCard
              key={emp.id}
              employee={emp}
              onDeactivated={handleDeactivated}
            />
          ))}
        </div>
      ) : (
        !showAddForm && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              {t("noEmployees")}
            </CardContent>
          </Card>
        )
      )}
    </div>
  );
}
