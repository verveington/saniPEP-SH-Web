import { ChevronRight, Search, Shield, ShoppingCart, Upload } from "lucide-react";
import type { MouseEvent } from "react";
import { useMemo, useState } from "react";
import { Badge, Card, FormControl, Text, TextField, View } from "reshaped";
import { isPublicRoute } from "../app/routes";
import type { Navigate } from "../app/routes";
import type { Route } from "../lib/types";
import { ButtonText, IconBox } from "../components/common";
import { handleRouteLinkClick } from "../components/RouteLink";
import {
  categoryLabel,
  fallbackRouteByAction,
  primaryActionLabel,
  searchPatientIntent,
} from "../lib/searchIndex";

export default function HelpFinderPage({ navigate, portalLoginHref }: { navigate: Navigate; portalLoginHref: string }) {
  const [query, setQuery] = useState("");
  const matches = useMemo(() => searchPatientIntent(query), [query]);

  const openRoute = (route: Route) => {
    if (route === "/portal/login") {
      window.location.assign(portalLoginHref);
      return;
    }

    if (isPublicRoute(route)) navigate(route);
  };

  const handleActionLink = (event: MouseEvent<HTMLAnchorElement>, route: Route) => {
    if (route === "/portal/login") return;
    if (isPublicRoute(route)) handleRouteLinkClick(event, route, navigate);
  };

  return (
    <section className="section">
      <div className="sectionInner gridTwo">
        <View direction="column" gap={6}>
          <View direction="column" gap={3}>
            <Text as="h1" variant="featured-1" weight="semibold">
              Hilfe finden
            </Text>
            <Text color="neutral-faded">
              Die Suche priorisiert Patientenworte und führt zu öffentlichen Formularen oder zum getrennten Portal-Login.
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

              return (
                <Card padding={4} key={item.id}>
                  <View direction="column" gap={4}>
                    <View direction="row" justify="space-between" gap={3} wrap>
                      <View direction="row" gap={3} align="center">
                        <IconBox icon={item.primaryAction === "configure" ? ShoppingCart : item.primaryAction === "upload" ? Upload : Search} />
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
                    <a
                      className="actionLink actionLinkPrimary"
                      href={actionRoute === "/portal/login" ? portalLoginHref : actionRoute}
                      onClick={(event) => handleActionLink(event, actionRoute)}
                    >
                      <ButtonText icon={ChevronRight}>{primaryActionLabel[item.primaryAction]}</ButtonText>
                    </a>
                  </View>
                </Card>
              );
            })}
          </div>
        </View>
        <div className="plainPanel">
          <View direction="column" gap={4} padding={6}>
            <IconBox icon={Shield} />
            <Text as="h2" variant="featured-5" weight="semibold">
              Datenschutzgrenze
            </Text>
            <Text color="neutral-faded">
              Suchbegriffe werden nicht in Analytics übernommen. Conversion-Events zählen nur grobe Ziele wie Termin, Upload, Kontakt oder Portal-Login.
            </Text>
          </View>
        </div>
      </div>
    </section>
  );
}
