import type { BackendEnv } from "../config/env.js";

export type SessionCookieOptions = {
  name: string;
  httpOnly: true;
  secure: boolean;
  sameSite: "lax" | "strict";
  path: "/";
  maxAgeSeconds: number;
};

export function getSessionCookieOptions(env: BackendEnv, staffContext = false): SessionCookieOptions {
  return {
    name: env.sessionCookieName,
    httpOnly: true,
    secure: env.nodeEnv !== "development" || env.sessionCookieName.startsWith("__Host-"),
    sameSite: staffContext ? "strict" : "lax",
    path: "/",
    maxAgeSeconds: env.sessionAbsoluteTtlHours * 60 * 60,
  };
}

export function serializeSessionCookie(token: string, env: BackendEnv, staffContext = false) {
  const options = getSessionCookieOptions(env, staffContext);
  const attributes = [
    `${encodeURIComponent(options.name)}=${encodeURIComponent(token)}`,
    `Max-Age=${options.maxAgeSeconds}`,
    `Path=${options.path}`,
    "HttpOnly",
    `SameSite=${capitalize(options.sameSite)}`,
  ];

  if (options.secure) attributes.push("Secure");
  attributes.push("Priority=High");
  return attributes.join("; ");
}

export function serializeExpiredSessionCookie(env: BackendEnv, staffContext = false) {
  const options = getSessionCookieOptions(env, staffContext);
  const attributes = [
    `${encodeURIComponent(options.name)}=`,
    "Max-Age=0",
    `Path=${options.path}`,
    "HttpOnly",
    `SameSite=${capitalize(options.sameSite)}`,
  ];

  if (options.secure) attributes.push("Secure");
  return attributes.join("; ");
}

function capitalize(value: string) {
  return `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`;
}
