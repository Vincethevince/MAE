"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CATEGORIES = [
  "friseur",
  "kosmetik",
  "nagelstudio",
  "massage",
  "physiotherapie",
  "tattoostudio",
  "barbershop",
  "waxing",
] as const;

interface SearchFormProps {
  locale: string;
  initialQuery?: string;
  initialCity?: string;
  initialCategory?: string;
}

export function SearchForm({
  locale,
  initialQuery = "",
  initialCity = "",
  initialCategory = "",
}: SearchFormProps) {
  const router = useRouter();
  const t = useTranslations("search");

  const [query, setQuery] = useState(initialQuery);
  const [city, setCity] = useState(initialCity);
  const [category, setCategory] = useState(initialCategory);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const params = new URLSearchParams();
    if (query.trim()) params.set("query", query.trim());
    if (city.trim()) params.set("city", city.trim());
    if (category && category !== "all") params.set("category", category);

    const qs = params.toString();
    router.push(`/${locale}/search${qs ? `?${qs}` : ""}`);
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 min-w-0">
          <Label htmlFor="search-query" className="sr-only">
            {t("searchLabel")}
          </Label>
          <Input
            id="search-query"
            type="text"
            placeholder={t("placeholder")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="sm:w-40">
          <Label htmlFor="search-city" className="sr-only">
            {t("cityLabel")}
          </Label>
          <Input
            id="search-city"
            type="text"
            placeholder={t("cityLabel")}
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
        </div>

        <div className="sm:w-48">
          <Label htmlFor="search-category" className="sr-only">
            {t("categoryLabel")}
          </Label>
          <Select
            value={category || "all"}
            onValueChange={(val) => setCategory(val == null || val === "all" ? "" : val)}
          >
            <SelectTrigger id="search-category">
              <SelectValue placeholder={t("categoryAll")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("categoryAll")}</SelectItem>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {t(`categories.${cat}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button type="submit">{t("searchButton")}</Button>
      </div>
    </form>
  );
}
