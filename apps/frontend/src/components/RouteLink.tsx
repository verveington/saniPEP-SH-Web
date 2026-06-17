import type { MouseEvent, ReactNode } from "react";
import type { Navigate, PublicRoute } from "../app/routes";

const isModifiedClick = (event: MouseEvent<HTMLAnchorElement>) =>
  event.metaKey || event.altKey || event.ctrlKey || event.shiftKey || event.button !== 0;

export function handleRouteLinkClick(
  event: MouseEvent<HTMLAnchorElement>,
  route: PublicRoute,
  navigate: Navigate,
) {
  if (isModifiedClick(event)) return;
  event.preventDefault();
  navigate(route);
}

export function RouteLink({
  route,
  navigate,
  className,
  children,
  ariaCurrent,
}: {
  route: PublicRoute;
  navigate: Navigate;
  className: string;
  children: ReactNode;
  ariaCurrent?: "page";
}) {
  return (
    <a
      className={className}
      href={route}
      onClick={(event) => handleRouteLinkClick(event, route, navigate)}
      aria-current={ariaCurrent}
    >
      {children}
    </a>
  );
}
