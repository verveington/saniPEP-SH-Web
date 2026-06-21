"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge, Card, FormControl, Text, TextField, View } from "reshaped";
import type { Route } from "@frontend/lib/types";
import {
  categoryLabel,
  fallbackRouteByAction,
  primaryActionLabel,
  searchPatientIntent,
} from "@frontend/lib/searchIndex";
import { ButtonText } from "./common";
import { isPublicRoute, portalLoginHref } from "../lib/routes/publicRoutes";
import { SharedIconBox, type SharedIconName } from "../../shared/icons/SharedIcon";

const actionIconByGoal = {
  appointment: "symbols/i_schedule_school_date_time",
  upload: "symbols/rx",
  configure: "symbols/nappy_diaper",
  portal: "symbols/ui_secure",
  inquiry: "symbols/secure_communication",
} satisfies Record<string, SharedIconName>;

export function HelpFinderClient() {
  const [query, setQuery] = useState("");
  const matches = useMemo(() => searchPatientIntent(query), [query]);

  const actionHref = (route: Route) => route === "/portal/login" ? portalLoginHref : route;

  return (
    <section className="section">
      <div className="sectionInner gridTwo">
        <View direction="column" gap={6}>
          <View direction="column" gap={3}>
            <Text as="h1" variant="featured-1" weight="semibold">
              Hilfe finden
            </Text>
            <Text color="neutral-faded">
              Die Suche priorisiert Patientenworte und führt zu öffentlichen Formularen oder zum Portal-Hinweis.
            </Text>
          </View>
          <FormControl>
            <FormControl.Label>Symptom, Produkt oder Situation</FormControl.Label>
            <TextField
              name="search"
              size="large"
              value={query}
              onChange={({ value }) => setQuery(value)}
              placeholder="z. B. geschwollene Beine"
            />
          </FormControl>
          <div className="gridAuto">
            {matches.map((item) => {
              const actionRoute = fallbackRouteByAction[item.primaryAction];
              const href = actionHref(actionRoute);
              const action = (
                <ButtonText icon={ChevronRight}>{primaryActionLabel[item.primaryAction]}</ButtonText>
              );

              return (
                <Card padding={4} key={item.id}>
                  <View direction="column" gap={4}>
                    <View direction="row" justify="space-between" gap={3} wrap>
                      <View direction="row" gap={3} align="center">
                        <SharedIconBox name={actionIconByGoal[item.primaryAction]} />
                        <View direction="column" gap={1}>
                          <Text weight="semibold">{item.title}</Text>
                          <Text variant="caption-1" color="neutral-faded">
                            {item.term}
                          </Text>
                        </View>
                      </View>
                      <Badge color={item.category === "symptom" ? "primary" : item.category === "product" ? "warning" : "neutral"} variant="faded">
                        {categoryLabel[item.category]}
                      </Badge>
                    </View>
                    <Text variant="body-2" color="neutral-faded">
                      {item.summary}
                    </Text>
                    {isPublicRoute(actionRoute) ? (
                      <Link className="actionLink actionLinkPrimary" href={href}>
                        {action}
                      </Link>
                    ) : (
                      <a className="actionLink actionLinkPrimary" href={href}>
                        {action}
                      </a>
                    )}
                  </View>
                </Card>
              );
            })}
          </div>
        </View>
        <div className="plainPanel">
          <View direction="column" gap={4} padding={6}>
            <SharedIconBox name="symbols/health_data_security" />
            <Text as="h2" variant="featured-5" weight="semibold">
              Datenschutzgrenze
            </Text>
            <Text color="neutral-faded">
              Suchbegriffe werden nicht in Analytics übernommen. Conversion-Events zählen nur grobe Ziele wie Termin, Upload, Kontakt oder Portal-Hinweis.
            </Text>
          </View>
        </div>
      </div>
    </section>
  );
}
