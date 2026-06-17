import { Activity, ChevronRight, ShoppingCart } from "lucide-react";
import { Badge, Card, Text, View } from "reshaped";
import type { Navigate, PublicRoute } from "../app/routes";
import type { ServiceArea } from "../lib/types";
import { ButtonText, IconBox } from "./common";
import { RouteLink } from "./RouteLink";

export function ServiceCard({ area, navigate }: { area: ServiceArea; navigate: Navigate }) {
  return (
    <Card padding={5} className="serviceCard" attributes={{ "data-priority": area.priority }}>
      <View direction="column" gap={4}>
        <View direction="row" justify="space-between" align="center" gap={3} wrap>
          <IconBox icon={area.priority === "automated" ? ShoppingCart : Activity} />
          <Badge color={area.priority === "primary" ? "primary" : "neutral"} variant="faded">
            {area.intent}
          </Badge>
        </View>
        <View direction="column" gap={2}>
          <Text as="h3" variant="featured-5" weight="semibold">
            {area.title}
          </Text>
          <Text color="neutral-faded">{area.summary}</Text>
        </View>
      </View>
      <RouteLink className="actionLink" route={area.route as PublicRoute} navigate={navigate}>
        <ButtonText icon={ChevronRight}>{`Mehr zu ${area.title}`}</ButtonText>
      </RouteLink>
    </Card>
  );
}
