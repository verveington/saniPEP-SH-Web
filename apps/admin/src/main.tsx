import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { CheckCircle, ClipboardList, Lock, LogOut, RefreshCw, Shield } from "lucide-react";
import { Badge, Button, FormControl, Reshaped, Text, TextField, View } from "reshaped";
import "reshaped/bundle.css";
import "reshaped/themes/slate/theme.css";
import "../../frontend/src/styles/global.css";
import "./staff-admin.css";
import { installDesignTokens } from "../../frontend/src/lib/designTokens";
import { serverAuthBoundary } from "../../shared/security/accessControl";
import {
  StaffAdminApiError,
  staffAdminApi,
  type StaffAuditEvent,
  type StaffRequestDetail,
  type StaffRequestListItem,
  type StaffRequestsResponse,
  type StaffSessionResponse,
  type StaffStatus,
} from "./api";

installDesignTokens();

type Notice = {
  tone: "positive" | "warning" | "neutral";
  title: string;
  body: string;
};

type StatusFilter = StaffStatus | "all";

const fallbackStatusModel: StaffRequestsResponse["statusModel"] = [
  { value: "new", label: "Neu" },
  { value: "in_review", label: "In Pruefung" },
  { value: "waiting_for_customer", label: "Rueckfrage an Kunde" },
  { value: "completed", label: "Abgeschlossen" },
  { value: "cancelled", label: "Abgebrochen" },
];

function StaffAdminApp() {
  const [session, setSession] = useState<StaffSessionResponse | null>(null);
  const [workspace, setWorkspace] = useState<StaffRequestsResponse | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<StaffRequestDetail | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    let active = true;

    async function restoreSession() {
      try {
        const restored = await staffAdminApi.session();
        if (!active) return;
        if (restored) {
          setSession(restored);
          await loadRequests("all", undefined, active);
        }
      } catch (error) {
        if (active) setNotice(apiNotice(error, "Session konnte nicht geladen werden."));
      } finally {
        if (active) setLoading(false);
      }
    }

    void restoreSession();
    return () => {
      active = false;
    };
  }, []);

  const loadRequestDetail = async (requestId: string) => {
    const detail = await staffAdminApi.requestDetail(requestId);
    setSelectedRequest(detail.request);
    return detail.request;
  };

  const loadRequests = async (
    filter: StatusFilter = statusFilter,
    preferredRequestId = selectedRequest?.id,
    active = true,
  ) => {
    const response = await staffAdminApi.listRequests(filter === "all" ? undefined : filter);
    if (!active) return response;
    setWorkspace(response);
    const nextRequestId = response.requests.some((request) => request.id === preferredRequestId)
      ? preferredRequestId
      : response.requests[0]?.id;
    if (nextRequestId) {
      await loadRequestDetail(nextRequestId);
    } else {
      setSelectedRequest(null);
    }
    return response;
  };

  const handleLogin = async (input: { email: string; password: string }) => {
    setNotice(null);
    const login = await staffAdminApi.login(input);
    setSession(login);
    setStatusFilter("all");
    await loadRequests("all");
    setNotice({
      tone: "positive",
      title: "Angemeldet",
      body: `${login.profile.safeDisplayName} ist fuer Staff Requests angemeldet.`,
    });
  };

  const handleLogout = async () => {
    if (session) await staffAdminApi.logout(session.csrfToken);
    setSession(null);
    setWorkspace(null);
    setSelectedRequest(null);
    setNotice({
      tone: "neutral",
      title: "Abgemeldet",
      body: "Die Staff-Session wurde beendet.",
    });
  };

  const handleApplyFilter = async () => {
    setBusy(true);
    setNotice(null);
    try {
      await loadRequests(statusFilter);
    } catch (error) {
      setNotice(apiNotice(error, "Request-Liste konnte nicht geladen werden."));
    } finally {
      setBusy(false);
    }
  };

  const handleSelectRequest = async (request: StaffRequestListItem) => {
    setBusy(true);
    setNotice(null);
    try {
      await loadRequestDetail(request.id);
    } catch (error) {
      setNotice(apiNotice(error, "Detailansicht konnte nicht geladen werden."));
    } finally {
      setBusy(false);
    }
  };

  const handleStatusChange = async (status: StaffStatus) => {
    if (!session || !selectedRequest) return;
    setBusy(true);
    setNotice(null);
    try {
      await staffAdminApi.updateStatus({ requestId: selectedRequest.id, status }, session.csrfToken);
      await loadRequests(statusFilter, selectedRequest.id);
      setNotice({
        tone: "positive",
        title: "Status aktualisiert",
        body: `${selectedRequest.id} wurde auf ${statusLabel(status, workspace)} gesetzt.`,
      });
    } catch (error) {
      setNotice(apiNotice(error, "Statuswechsel wurde abgelehnt."));
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <StaffShell>
        <StateNotice tone="neutral" title="Staff Admin laedt" body="Session und Backend werden geprueft." />
      </StaffShell>
    );
  }

  return (
    <StaffShell session={session} onLogout={session ? handleLogout : undefined}>
      <View direction="column" gap={5}>
        {notice && <StateNotice tone={notice.tone} title={notice.title} body={notice.body} />}
        {!session ? (
          <LoginPanel onLogin={handleLogin} />
        ) : (
          <StaffWorkbench
            busy={busy}
            session={session}
            workspace={workspace}
            selectedRequest={selectedRequest}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            onApplyFilter={handleApplyFilter}
            onSelectRequest={handleSelectRequest}
            onStatusChange={handleStatusChange}
          />
        )}
      </View>
    </StaffShell>
  );
}

function StaffShell({
  children,
  session,
  onLogout,
}: {
  children: React.ReactNode;
  session?: StaffSessionResponse | null;
  onLogout?: () => Promise<void>;
}) {
  return (
    <main className="appShell staffAdminShell">
      <section className="section">
        <div className="sectionInner">
          <View direction="column" gap={5}>
            <View direction="row" justify="space-between" align="center" gap={4} wrap>
              <View direction="column" gap={2}>
                <span className="iconBox" aria-hidden>
                  <Shield />
                </span>
                <Text as="h1" variant="featured-2" weight="semibold">
                  Staff Requests
                </Text>
                <Text color="neutral-faded">
                  Public Requests pruefen und Status setzen.
                </Text>
              </View>
              {session && (
                <View direction="row" gap={3} align="center" wrap>
                  <Badge color="positive" variant="faded">
                    {session.profile.safeDisplayName}
                  </Badge>
                  <Button variant="outline" color="neutral" onClick={onLogout}>
                    <span className="buttonLabel">
                      <LogOut aria-hidden />
                      Abmelden
                    </span>
                  </Button>
                </View>
              )}
            </View>
            <div className="privacyNote">
              <Lock aria-hidden />
              <Text variant="body-2">
                {serverAuthBoundary.productionInvariant}
              </Text>
            </div>
            {children}
          </View>
        </div>
      </section>
    </main>
  );
}

function LoginPanel({ onLogin }: { onLogin: (input: { email: string; password: string }) => Promise<void> }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await onLogin({ email, password });
    } catch (caught) {
      setError(apiErrorText(caught));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="gridTwo">
      <div className="formPanel">
        <View direction="column" gap={4} padding={6}>
          <Text as="h2" variant="featured-4" weight="semibold">
            Staff Login
          </Text>
          <FormControl>
            <FormControl.Label>E-Mail</FormControl.Label>
            <TextField
              name="email"
              value={email}
              onChange={({ value }) => setEmail(value)}
              inputAttributes={{ type: "email", autoComplete: "username" }}
            />
          </FormControl>
          <FormControl>
            <FormControl.Label>Passwort</FormControl.Label>
            <TextField
              name="password"
              value={password}
              onChange={({ value }) => setPassword(value)}
              inputAttributes={{ type: "password", autoComplete: "current-password" }}
            />
          </FormControl>
          <Button color="primary" onClick={submit} disabled={submitting || !email.trim() || !password}>
            <span className="buttonLabel">
              <Lock aria-hidden />
              {submitting ? "Anmeldung laeuft" : "Einloggen"}
            </span>
          </Button>
          {error && <StateNotice tone="warning" title="Login fehlgeschlagen" body={error} />}
        </View>
      </div>
      <div className="plainPanel">
        <View direction="column" gap={4} padding={6}>
          <span className="iconBox" aria-hidden>
            <Shield />
          </span>
          <Text as="h2" variant="featured-5" weight="semibold">
            Zugriff
          </Text>
          <Text variant="body-2" color="neutral-faded">
            Staff-Zugriffe laufen ueber serverseitige Rollenpruefung, HTTP-only Session-Cookie und CSRF-Token im Arbeitsspeicher.
          </Text>
        </View>
      </div>
    </div>
  );
}

function StaffWorkbench({
  busy,
  session,
  workspace,
  selectedRequest,
  statusFilter,
  onStatusFilterChange,
  onApplyFilter,
  onSelectRequest,
  onStatusChange,
}: {
  busy: boolean;
  session: StaffSessionResponse;
  workspace: StaffRequestsResponse | null;
  selectedRequest: StaffRequestDetail | null;
  statusFilter: StatusFilter;
  onStatusFilterChange: (value: StatusFilter) => void;
  onApplyFilter: () => Promise<void>;
  onSelectRequest: (request: StaffRequestListItem) => Promise<void>;
  onStatusChange: (status: StaffStatus) => Promise<void>;
}) {
  const statusModel = workspace?.statusModel ?? fallbackStatusModel;

  return (
    <View direction="column" gap={5}>
      <div className="gridAuto" aria-label="Staff Request Kennzahlen">
        <Kpi icon={ClipboardList} label="Requests" value={String(workspace?.requests.length ?? 0)} />
        <Kpi icon={CheckCircle} label="Neue" value={String(workspace?.requests.filter((request) => request.staffStatus === "new").length ?? 0)} />
        <Kpi icon={Shield} label="Uploads" value="0" />
      </div>

      <div className="plainPanel">
        <View direction="column" gap={4} padding={6}>
          <div className="staffAdminToolbar">
            <FormControl>
              <FormControl.Label>Status</FormControl.Label>
              <select
                className="nativeSelect"
                value={statusFilter}
                onChange={(event) => onStatusFilterChange(event.currentTarget.value as StatusFilter)}
              >
                <option value="all">Alle</option>
                {statusModel.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </FormControl>
            <Button variant="outline" color="neutral" onClick={onApplyFilter} disabled={busy}>
              <span className="buttonLabel">
                <RefreshCw aria-hidden />
                Aktualisieren
              </span>
            </Button>
          </div>
          <div className="safeRow">
            <Text weight="semibold">{session.profile.safeDisplayName}</Text>
            <Text variant="body-2" color="neutral-faded">
              Rolle {session.session.role} · Session bis {formatDateTime(session.session.idleExpiresAt)}
            </Text>
          </div>
        </View>
      </div>

      <div className="staffAdminGrid">
        <RequestList
          requests={workspace?.requests ?? []}
          selectedRequestId={selectedRequest?.id}
          busy={busy}
          onSelectRequest={onSelectRequest}
        />
        <RequestDetail
          request={selectedRequest}
          statusModel={statusModel}
          busy={busy}
          onStatusChange={onStatusChange}
        />
      </div>
    </View>
  );
}

function RequestList({
  requests,
  selectedRequestId,
  busy,
  onSelectRequest,
}: {
  requests: StaffRequestListItem[];
  selectedRequestId?: string;
  busy: boolean;
  onSelectRequest: (request: StaffRequestListItem) => Promise<void>;
}) {
  return (
    <div className="plainPanel">
      <View direction="column" gap={4} padding={6}>
        <Text as="h2" variant="featured-5" weight="semibold">
          Request-Liste
        </Text>
        {requests.length === 0 ? (
          <StateNotice tone="neutral" title="Keine Requests" body="Der aktuelle Filter liefert keine Treffer." />
        ) : (
          <div className="staffRequestList">
            {requests.map((request) => (
              <button
                className={`staffRequestButton${selectedRequestId === request.id ? " staffRequestButtonActive" : ""}`}
                disabled={busy}
                key={request.id}
                onClick={() => void onSelectRequest(request)}
                type="button"
              >
                <View direction="row" justify="space-between" align="start" gap={3}>
                  <View direction="column" gap={1}>
                    <Text weight="semibold">{request.kindLabel}</Text>
                    <Text variant="caption-1" color="neutral-faded">
                      {request.id}
                    </Text>
                  </View>
                  <Badge color={statusBadgeColor(request.staffStatus)} variant="faded">
                    {request.staffStatusLabel}
                  </Badge>
                </View>
                <Text variant="body-2" color="neutral-faded">
                  {request.safeSummary}
                </Text>
                <View direction="row" gap={2} wrap>
                  <Badge color="neutral" variant="faded">
                    {request.requestType}
                  </Badge>
                  <Badge color={request.omniaWriteAllowed ? "warning" : "positive"} variant="faded">
                    Omnia {request.omniaWriteAllowed ? "write" : "read-only"}
                  </Badge>
                </View>
              </button>
            ))}
          </div>
        )}
      </View>
    </div>
  );
}

function RequestDetail({
  request,
  statusModel,
  busy,
  onStatusChange,
}: {
  request: StaffRequestDetail | null;
  statusModel: StaffRequestsResponse["statusModel"];
  busy: boolean;
  onStatusChange: (status: StaffStatus) => Promise<void>;
}) {
  if (!request) {
    return (
      <div className="plainPanel">
        <View direction="column" gap={4} padding={6}>
          <StateNotice tone="neutral" title="Keine Auswahl" body="Waehle einen Request aus der Liste." />
        </View>
      </div>
    );
  }

  const rows = detailRows(request);
  const terminal = request.staffStatus === "completed" || request.staffStatus === "cancelled";

  return (
    <div className="plainPanel">
      <View direction="column" gap={4} padding={6}>
        <View direction="row" justify="space-between" align="start" gap={3} wrap>
          <View direction="column" gap={1}>
            <Text as="h2" variant="featured-5" weight="semibold">
              Request-Details
            </Text>
            <Text variant="body-2" color="neutral-faded">
              {request.id} · {request.kindLabel}
            </Text>
          </View>
          <Badge color={statusBadgeColor(request.staffStatus)} variant="faded">
            {request.staffStatusLabel}
          </Badge>
        </View>

        <div className="safeRow">
          <Text weight="semibold">{request.safeSummary}</Text>
          <Text variant="body-2" color="neutral-faded">
            Angelegt {formatDateTime(request.createdAt)} · aktualisiert {formatDateTime(request.updatedAt)}
          </Text>
        </div>

        <div className="staffAdminDetailGrid">
          {rows.map((row) => (
            <DataItem label={row.label} value={row.value} key={`${row.label}:${row.value}`} />
          ))}
        </div>

        <View direction="column" gap={3}>
          <Text as="h3" variant="featured-6" weight="semibold">
            Status setzen
          </Text>
          <div className="staffAdminStatusGrid">
            {statusModel.map((status) => (
              <Button
                key={status.value}
                color={status.value === "cancelled" ? "critical" : "primary"}
                variant={status.value === request.staffStatus || status.value === "cancelled" ? "outline" : undefined}
                disabled={busy || terminal || status.value === request.staffStatus}
                onClick={() => void onStatusChange(status.value)}
              >
                {status.label}
              </Button>
            ))}
          </div>
        </View>

        <View direction="column" gap={3}>
          <Text as="h3" variant="featured-6" weight="semibold">
            Audit
          </Text>
          <div className="staffAdminAuditList">
            {request.auditEvents.length === 0 ? (
              <StateNotice tone="neutral" title="Keine Audit Events" body="Fuer diesen Request wurden noch keine Audit Events geladen." />
            ) : (
              request.auditEvents.map((event) => <AuditEventCard event={event} key={event.id} />)
            )}
          </div>
        </View>
      </View>
    </div>
  );
}

function DataItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="staffAdminDataItem">
      <Text variant="caption-1" color="neutral-faded">
        {label}
      </Text>
      <Text weight="semibold">{value}</Text>
    </div>
  );
}

function AuditEventCard({ event }: { event: StaffAuditEvent }) {
  return (
    <div className="safeRow">
      <View direction="row" justify="space-between" gap={3} wrap>
        <Text weight="semibold">{event.action}</Text>
        <Badge color={event.outcome === "rejected" || event.outcome === "blocked" ? "warning" : "positive"} variant="faded">
          {event.outcome}
        </Badge>
      </View>
      <Text variant="caption-1" color="neutral-faded">
        {formatDateTime(event.occurredAt)} · {event.actorRole}
      </Text>
    </div>
  );
}

function Kpi({ icon: Icon, label, value }: { icon: typeof ClipboardList; label: string; value: string }) {
  return (
    <div className="safeRow">
      <View direction="row" gap={3} align="center">
        <span className="iconBox" aria-hidden>
          <Icon />
        </span>
        <View direction="column" gap={1}>
          <Text variant="caption-1" color="neutral-faded">
            {label}
          </Text>
          <Text variant="featured-5" weight="semibold">
            {value}
          </Text>
        </View>
      </View>
    </div>
  );
}

function StateNotice({ tone, title, body }: Notice) {
  return (
    <div className={tone === "warning" ? "privacyNote privacyNoteCritical" : "safeRow"} role="status" aria-live="polite">
      <Text weight="semibold">{title}</Text>
      <Text variant="body-2" color="neutral-faded">
        {body}
      </Text>
    </div>
  );
}

function detailRows(request: StaffRequestDetail) {
  const rows = [
    { label: "Status", value: request.staffStatusLabel },
    { label: "Quelle", value: request.source },
    { label: "Schutzklasse", value: request.sensitivity },
    { label: "Kontakt vorhanden", value: request.contactAvailable ? "ja" : "nein" },
    { label: "Omnia Write", value: request.omniaWriteAllowed ? "ja" : "nein" },
  ];
  const publicRequest = request.publicRequest;
  if (!publicRequest) return rows;

  if (publicRequest.contact) {
    rows.push({ label: "Kontakt", value: publicRequest.contact.name });
    if (publicRequest.contact.email) rows.push({ label: "E-Mail", value: publicRequest.contact.email });
    if (publicRequest.contact.phone) rows.push({ label: "Telefon", value: publicRequest.contact.phone });
    if (publicRequest.contact.preferredChannel) rows.push({ label: "Kontaktweg", value: publicRequest.contact.preferredChannel });
  }
  if (publicRequest.document) {
    rows.push({ label: "Dokument", value: `${publicRequest.document.fileExtension.toUpperCase()} · ${formatBytes(publicRequest.document.sizeBytes)}` });
    rows.push({ label: "MIME", value: publicRequest.document.mimeType });
    rows.push({ label: "Upload-Modus", value: publicRequest.document.uploadMode });
  }
  for (const [prefix, detail] of [
    ["Termin", publicRequest.appointment],
    ["Kontaktanfrage", publicRequest.contactInquiry],
    ["Versorgung", publicRequest.care],
  ] as const) {
    if (!detail) continue;
    for (const [key, value] of Object.entries(detail)) {
      rows.push({ label: `${prefix}: ${key}`, value: String(value) });
    }
  }
  return rows;
}

function statusLabel(status: StaffStatus, workspace: StaffRequestsResponse | null) {
  return (workspace?.statusModel ?? fallbackStatusModel).find((item) => item.value === status)?.label ?? status;
}

function statusBadgeColor(status: StaffStatus) {
  if (status === "completed") return "positive";
  if (status === "cancelled" || status === "waiting_for_customer") return "warning";
  if (status === "in_review") return "primary";
  return "neutral";
}

function formatDateTime(value: string | undefined) {
  if (!value) return "offen";
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatBytes(sizeBytes: number) {
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  return `${Math.round(sizeBytes / 1024)} KB`;
}

function apiNotice(error: unknown, fallback: string): Notice {
  return {
    tone: "warning",
    title: fallback,
    body: apiErrorText(error),
  };
}

function apiErrorText(error: unknown) {
  if (error instanceof StaffAdminApiError) {
    if (error.status === 401) return "Anmeldung erforderlich.";
    if (error.status === 403) return "Diese Rolle darf Staff Requests nicht bearbeiten.";
    if (error.status === 404) return "Request wurde nicht gefunden.";
    if (error.status === 409) return "Dieser Statuswechsel ist fuer den aktuellen Status nicht erlaubt.";
    return error.message;
  }
  return error instanceof Error ? error.message : "Unbekannter Fehler.";
}

createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Reshaped defaultTheme="slate" defaultColorMode="light">
      <StaffAdminApp />
    </Reshaped>
  </React.StrictMode>,
);
