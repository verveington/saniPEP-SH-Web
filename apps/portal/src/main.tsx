import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Calendar,
  CheckCircle,
  ClipboardList,
  FileText,
  Lock,
  LogOut,
  PackageCheck,
  Shield,
  Upload,
  User,
} from "lucide-react";
import { Badge, Button, FormControl, Reshaped, Text, TextField, View } from "reshaped";
import "reshaped/bundle.css";
import "reshaped/themes/slate/theme.css";
import "../../frontend/src/styles/global.css";
import "./staff-admin.css";
import { installDesignTokens } from "../../shared/design/saniPepDesignTokens";
import { serverAuthBoundary } from "../../shared/security/accessControl";
import {
  portalApi,
  PortalApiError,
  type CreatePortalRequestInput,
  type PortalDashboardResponse,
  type PortalRequestDto,
  type PortalSessionResponse,
  type StaffRequestsResponse,
} from "./api";

installDesignTokens();

type Notice = {
  tone: "positive" | "warning" | "neutral";
  title: string;
  body: string;
};

const statusLabels: Record<PortalRequestDto["status"], string> = {
  draft: "Entwurf",
  submitted: "Eingereicht",
  staff_review: "Mitarbeiterprüfung",
  approved: "Freigegeben",
  rejected: "Abgelehnt",
  completed: "Abgeschlossen",
};

const sensitivityLabels: Record<PortalRequestDto["sensitivity"], string> = {
  contact: "Kontaktdaten",
  health: "geschützt",
  omnia_reference: "Bestandsreferenz",
};

const kindFilterLabels: Record<PortalRequestDto["kind"], string> = {
  prescription_upload: "Rezeptupload-Anfrage",
  appointment_request: "Terminwunsch",
  reorder_request: "Bestellanfrage",
  subscription_change_request: "Abo-Wunsch",
  health_contact_request: "Kontaktanfrage",
};

const staffActionStatuses = ["staff_review", "approved", "rejected", "completed"] as const;

const acceptedUploadExtensions = ".pdf,.jpg,.jpeg,.png,.heic,.heif";

type StaffRequestFilters = {
  status?: PortalRequestDto["status"];
  kind?: PortalRequestDto["kind"];
};

type StatusFilterValue = PortalRequestDto["status"] | "all";
type KindFilterValue = PortalRequestDto["kind"] | "all";

function PortalMvpApp() {
  const [session, setSession] = useState<PortalSessionResponse | null>(null);
  const [dashboard, setDashboard] = useState<PortalDashboardResponse | null>(null);
  const [staffRequests, setStaffRequests] = useState<StaffRequestsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    let active = true;

    async function restoreSession() {
      try {
        const restored = await portalApi.session();
        if (!active) return;
        if (restored.authenticated) {
          setSession(restored);
          await loadSessionData(restored);
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

  const loadSessionData = async (activeSession: PortalSessionResponse) => {
    if (isStaffSession(activeSession)) {
      setDashboard(null);
      setStaffRequests(await portalApi.staffRequests());
      return;
    }

    setStaffRequests(null);
    setDashboard(await portalApi.dashboard());
  };

  const refreshDashboard = async () => {
    const refreshed = await portalApi.dashboard();
    setDashboard(refreshed);
    return refreshed;
  };

  const refreshStaffRequests = async (filters: StaffRequestFilters = {}) => {
    const refreshed = await portalApi.staffRequests(filters);
    setStaffRequests(refreshed);
    return refreshed;
  };

  const handleLogin = async (input: { email: string; password: string }) => {
    setNotice(null);
    const login = await portalApi.login(input);
    setSession(login);
    await loadSessionData(login);
    setNotice({
      tone: "positive",
      title: "Backend-Login aktiv",
      body: login.message ?? "Session wurde serverseitig erstellt.",
    });
  };

  const handleLogout = async () => {
    if (session) await portalApi.logout(session.csrfToken);
    setSession(null);
    setDashboard(null);
    setStaffRequests(null);
    setNotice({
      tone: "neutral",
      title: "Abgemeldet",
      body: "Das Backend hat das Session-Cookie geloescht.",
    });
  };

  const handleStaffStatusChange = async (
    requestId: string,
    status: PortalRequestDto["status"],
    filters: StaffRequestFilters,
  ) => {
    if (!session || !isStaffSession(session)) return;
    setNotice(null);
    const result = await portalApi.updateRequestStatus({ requestId, status }, session.csrfToken);
    await refreshStaffRequests(filters);
    setNotice({
      tone: "positive",
      title: "Status aktualisiert",
      body: `${result.request.kindLabel} ${result.request.id} steht jetzt auf ${statusLabels[result.request.status]}.`,
    });
  };

  const handleCreateRequest = async (input: CreatePortalRequestInput) => {
    if (!session) return;
    setNotice(null);
    const result = await portalApi.createRequest(input, session.csrfToken);
    setDashboard(result.dashboard);
    setNotice({
      tone: "positive",
      title: "Request gespeichert",
      body: `${result.request.kindLabel} ${result.request.id} liegt in der Mitarbeiterpruefung.`,
    });
  };

  if (loading) {
    return (
      <PortalShell>
        <StateNotice tone="neutral" title="Portal wird geladen" body="Session und Backend-Dashboard werden abgefragt." />
      </PortalShell>
    );
  }

  return (
    <PortalShell session={session} onLogout={session ? handleLogout : undefined}>
      <View direction="column" gap={5}>
        {notice && <StateNotice tone={notice.tone} title={notice.title} body={notice.body} />}
        {!session ? (
          <LoginPanel onLogin={handleLogin} />
        ) : isStaffSession(session) ? (
          <StaffAdminWorkbench
            session={session}
            workspace={staffRequests}
            onRefresh={refreshStaffRequests}
            onChangeStatus={handleStaffStatusChange}
          />
        ) : session.session.role === "customer" ? (
          <PortalDashboard
            session={session}
            dashboard={dashboard}
            onRefresh={refreshDashboard}
            onCreateRequest={handleCreateRequest}
          />
        ) : (
          <StateNotice tone="warning" title="Rolle nicht unterstützt" body="Diese Portaloberfläche erlaubt customer, staff und admin." />
        )}
      </View>
    </PortalShell>
  );
}

function PortalShell({
  children,
  session,
  onLogout,
}: {
  children: React.ReactNode;
  session?: PortalSessionResponse | null;
  onLogout?: () => Promise<void>;
}) {
  return (
    <main className="appShell">
      <section className="section">
        <div className="sectionInner">
          <View direction="column" gap={5}>
            <View direction="row" justify="space-between" align="center" gap={4} wrap>
              <View direction="column" gap={2}>
                <span className="iconBox" aria-hidden>
                  <Shield />
                </span>
                <Text as="h1" variant="featured-1" weight="semibold">
                  Kundenportal MVP
                </Text>
                <Text color="neutral-faded">
                  Backend-Login, serverseitige Session, gespeicherte Portal-Requests und Audit Events ohne Omnia-Anbindung.
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
                {serverAuthBoundary.productionInvariant} Dieses MVP nutzt Development-Seed-Daten und speichert keine echten Gesundheitsdaten.
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
  const [email, setEmail] = useState("staff@example.test");
  const [password, setPassword] = useState("staff-passwort");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const presets = [
    { label: "Staff", email: "staff@example.test", password: "staff-passwort" },
    { label: "Admin", email: "admin@example.test", password: "admin-passwort" },
    { label: "Kunde", email: "demo@example.test", password: "demo-passwort" },
  ];

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
          <View direction="column" gap={1}>
            <Text as="h2" variant="featured-4" weight="semibold">
              Backend Login
            </Text>
            <Text variant="body-2" color="neutral-faded">
              Demo-Zugänge laufen gegen das Backend. Staff/Admin öffnen die Request-Workbench, Kunde öffnet das Portal-Dashboard.
            </Text>
          </View>
          <View direction="row" gap={2} wrap>
            {presets.map((preset) => (
              <Button
                key={preset.email}
                variant="outline"
                color="neutral"
                onClick={() => {
                  setEmail(preset.email);
                  setPassword(preset.password);
                }}
              >
                {preset.label}
              </Button>
            ))}
          </View>
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
          <Button color="primary" onClick={submit} disabled={submitting}>
            <span className="buttonLabel">
              <Lock aria-hidden />
              {submitting ? "Login läuft" : "Einloggen"}
            </span>
          </Button>
          {error && <StateNotice tone="warning" title="Login fehlgeschlagen" body={error} />}
        </View>
      </div>
      <div className="plainPanel">
        <View direction="column" gap={4} padding={6}>
          <span className="iconBox" aria-hidden>
            <User />
          </span>
          <Text as="h2" variant="featured-5" weight="semibold">
            Sessionverwaltung
          </Text>
          <Text variant="body-2" color="neutral-faded">
            Das Portal speichert keine Tokens im LocalStorage. CSRF bleibt im React-State, die Session selbst liegt serverseitig.
          </Text>
          <Text variant="body-2" color="neutral-faded">
            Logout löscht das HTTP-only Cookie und erzeugt ein Audit Event.
          </Text>
        </View>
      </div>
    </div>
  );
}

function PortalDashboard({
  session,
  dashboard,
  onRefresh,
  onCreateRequest,
}: {
  session: PortalSessionResponse;
  dashboard: PortalDashboardResponse | null;
  onRefresh: () => Promise<PortalDashboardResponse>;
  onCreateRequest: (input: CreatePortalRequestInput) => Promise<void>;
}) {
  if (!dashboard) {
    return <StateNotice tone="neutral" title="Dashboard lädt" body="Portalstatus wird vom Backend geholt." />;
  }

  return (
    <View direction="column" gap={5}>
      <div className="gridAuto" aria-label="Portal-Kennzahlen">
        <Kpi icon={ClipboardList} label="Offene Anfragen" value={dashboard.summary.openRequests.toString()} />
        <Kpi icon={CheckCircle} label="Abgeschlossen" value={dashboard.summary.completedRequests.toString()} />
        <Kpi icon={ClipboardList} label="Gespeicherte Requests" value={dashboard.summary.storedRequests.toString()} />
        <Kpi icon={User} label="Mitarbeiterprüfung" value={dashboard.summary.staffReviewRequired.toString()} />
        <Kpi icon={Shield} label="Omnia-Schreibzugriffe" value={dashboard.summary.omniaWrites.toString()} />
        <Kpi icon={CheckCircle} label="Audit Events" value={dashboard.summary.auditEvents.toString()} />
      </div>

      <div className="gridTwo">
        <div className="plainPanel">
          <View direction="column" gap={4} padding={6}>
            <Text as="h2" variant="featured-5" weight="semibold">
              Portal-Session
            </Text>
            <div className="safeRow">
              <Text weight="semibold">{session.profile.safeDisplayName}</Text>
              <Text variant="body-2" color="neutral-faded">
                Rolle: {session.session.role} · Ablauf: {formatDateTime(session.session.idleExpiresAt)}
              </Text>
            </div>
            <Button variant="outline" color="neutral" onClick={() => void onRefresh()}>
              <span className="buttonLabel">
                <CheckCircle aria-hidden />
                Dashboard neu laden
              </span>
            </Button>
          </View>
        </div>
        <div className="plainPanel">
          <View direction="column" gap={4} padding={6}>
            <Text as="h2" variant="featured-5" weight="semibold">
              Sicherheitsgrenzen
            </Text>
            {dashboard.boundaries.map((boundary) => (
              <div className="privacyNote" key={boundary}>
                <Shield aria-hidden />
                <Text variant="body-2">{boundary}</Text>
              </div>
            ))}
          </View>
        </div>
      </div>

      <RequestForms onCreateRequest={onCreateRequest} />

      <LatestActivities activities={dashboard.latestActivities} />

      <div className="gridTwo">
        <RequestTimeline requests={dashboard.requests} />
        <AuditTrail dashboard={dashboard} />
      </div>
    </View>
  );
}

function StaffAdminWorkbench({
  session,
  workspace,
  onRefresh,
  onChangeStatus,
}: {
  session: PortalSessionResponse;
  workspace: StaffRequestsResponse | null;
  onRefresh: (filters?: StaffRequestFilters) => Promise<StaffRequestsResponse>;
  onChangeStatus: (
    requestId: string,
    status: PortalRequestDto["status"],
    filters: StaffRequestFilters,
  ) => Promise<void>;
}) {
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>("all");
  const [kindFilter, setKindFilter] = useState<KindFilterValue>("all");
  const [selectedRequestId, setSelectedRequestId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!workspace) return;
    if (workspace.requests.some((request) => request.id === selectedRequestId)) return;
    setSelectedRequestId(workspace.requests[0]?.id ?? "");
  }, [workspace, selectedRequestId]);

  if (!workspace) {
    return <StateNotice tone="neutral" title="Staff-Workbench lädt" body="Portal-Requests werden serverseitig abgefragt." />;
  }

  const activeFilters = staffFiltersFromValues(statusFilter, kindFilter);
  const selectedRequest = workspace.requests.find((request) => request.id === selectedRequestId) ?? null;
  const selectedAuditEvents = selectedRequest
    ? workspace.auditEvents.filter((event) => event.requestId === selectedRequest.id)
    : [];

  const applyFilters = async () => {
    setBusy(true);
    setError(null);
    try {
      await onRefresh(activeFilters);
    } catch (caught) {
      setError(apiErrorText(caught));
    } finally {
      setBusy(false);
    }
  };

  const changeStatus = async (status: PortalRequestDto["status"]) => {
    if (!selectedRequest) return;
    setBusy(true);
    setError(null);
    try {
      await onChangeStatus(selectedRequest.id, status, activeFilters);
    } catch (caught) {
      setError(apiErrorText(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View direction="column" gap={5}>
      <div className="gridAuto" aria-label="Staff Request Kennzahlen">
        <Kpi icon={ClipboardList} label="Alle Requests" value={workspace.summary.totalRequests.toString()} />
        <Kpi icon={FileText} label="Gefiltert" value={workspace.summary.filteredRequests.toString()} />
        <Kpi icon={User} label="Staff Review" value={workspace.summary.staffReviewRequests.toString()} />
        <Kpi icon={CheckCircle} label="Freigegeben" value={workspace.summary.approvedRequests.toString()} />
        <Kpi icon={Shield} label="Omnia Writes" value={workspace.summary.omniaWrites.toString()} />
        <Kpi icon={CheckCircle} label="Audit Events" value={workspace.summary.auditEvents.toString()} />
      </div>

      <div className="plainPanel">
        <View direction="column" gap={4} padding={6}>
          <View direction="row" justify="space-between" align="center" gap={3} wrap>
            <View direction="column" gap={1}>
              <Text as="h2" variant="featured-5" weight="semibold">
                Staff/Admin Request-Filter
              </Text>
              <Text variant="body-2" color="neutral-faded">
                Angemeldet als {session.profile.safeDisplayName} ({session.session.role}).
              </Text>
            </View>
            <Button variant="outline" color="neutral" onClick={applyFilters} disabled={busy}>
              <span className="buttonLabel">
                <ClipboardList aria-hidden />
                Filter anwenden
              </span>
            </Button>
          </View>

          <div className="staffFilterGrid">
            <FormControl>
              <FormControl.Label>Status</FormControl.Label>
              <select
                className="nativeSelect"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as StatusFilterValue)}
              >
                <option value="all">Alle Status</option>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </FormControl>
            <FormControl>
              <FormControl.Label>Request-Typ</FormControl.Label>
              <select
                className="nativeSelect"
                value={kindFilter}
                onChange={(event) => setKindFilter(event.target.value as KindFilterValue)}
              >
                <option value="all">Alle Typen</option>
                {Object.entries(kindFilterLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </FormControl>
          </div>

          {workspace.boundaries.map((boundary) => (
            <div className="privacyNote" key={boundary}>
              <Shield aria-hidden />
              <Text variant="body-2">{boundary}</Text>
            </div>
          ))}
          {error && <StateNotice tone="warning" title="Staff-Aktion fehlgeschlagen" body={error} />}
        </View>
      </div>

      <div className="gridTwo staffWorkbenchGrid">
        <div className="plainPanel">
          <View direction="column" gap={4} padding={6}>
            <Text as="h2" variant="featured-5" weight="semibold">
              Alle Portal-Requests
            </Text>
            {workspace.requests.length === 0 ? (
              <StateNotice tone="neutral" title="Keine Treffer" body="Passe Status oder Request-Typ an, um weitere Requests zu sehen." />
            ) : (
              <div className="staffRequestList">
                {workspace.requests.map((request) => (
                  <button
                    type="button"
                    className={`staffRequestCard${selectedRequestId === request.id ? " staffRequestCardActive" : ""}`}
                    key={request.id}
                    onClick={() => setSelectedRequestId(request.id)}
                  >
                    <View direction="row" justify="space-between" align="start" gap={3}>
                      <View direction="column" gap={1}>
                        <Text weight="semibold">{request.kindLabel}</Text>
                        <Text variant="caption-1" color="neutral-faded">
                          {request.id}
                        </Text>
                      </View>
                      <Badge color={statusBadgeColor(request.status)} variant="faded">
                        {statusLabels[request.status]}
                      </Badge>
                    </View>
                    <Text variant="body-2" color="neutral-faded">
                      {request.safeSummary}
                    </Text>
                    <View direction="row" gap={2} wrap>
                      <Badge color="neutral" variant="faded">
                        {request.customerProfileId}
                      </Badge>
                      <Badge color="primary" variant="faded">
                        {request.employeeStatusLabel}
                      </Badge>
                    </View>
                  </button>
                ))}
              </div>
            )}
          </View>
        </div>

        <StaffRequestDetails
          request={selectedRequest}
          auditEvents={selectedAuditEvents}
          busy={busy}
          onChangeStatus={changeStatus}
        />
      </div>

      <StaffAuditTrail events={workspace.auditEvents} />
    </View>
  );
}

function StaffRequestDetails({
  request,
  auditEvents,
  busy,
  onChangeStatus,
}: {
  request: PortalRequestDto | null;
  auditEvents: PortalDashboardResponse["auditEvents"];
  busy: boolean;
  onChangeStatus: (status: PortalRequestDto["status"]) => Promise<void>;
}) {
  if (!request) {
    return (
      <div className="plainPanel">
        <View direction="column" gap={4} padding={6}>
          <StateNotice tone="neutral" title="Keine Anfrage ausgewählt" body="Wähle links einen Portal-Request für Details und Statusaktionen." />
        </View>
      </div>
    );
  }

  return (
    <div className="plainPanel">
      <View direction="column" gap={4} padding={6}>
        <View direction="row" justify="space-between" align="start" gap={3} wrap>
          <View direction="column" gap={1}>
            <Text as="h2" variant="featured-5" weight="semibold">
              Detailansicht
            </Text>
            <Text variant="body-2" color="neutral-faded">
              {request.id} · {request.kindLabel}
            </Text>
          </View>
          <Badge color={statusBadgeColor(request.status)} variant="faded">
            {statusLabels[request.status]}
          </Badge>
        </View>

        <div className="staffDetailSummary">
          <Text weight="semibold">{request.safeSummary}</Text>
          <Text variant="body-2" color="neutral-faded">
            Angelegt {formatDateTime(request.createdAt)} · aktualisiert {formatDateTime(request.updatedAt)}
          </Text>
        </div>

        <div className="staffDataGrid">
          <StaffDataItem label="Kundenprofil-ID" value={request.customerProfileId} />
          <StaffDataItem label="Mitarbeiterstatus" value={request.employeeStatusLabel} />
          <StaffDataItem label="Schutzklasse" value={sensitivityLabels[request.sensitivity]} />
          <StaffDataItem label="Omnia Write" value={request.omniaWriteAllowed ? "ja" : "nein"} />
        </div>

        <RequestSpecificDetails request={request} />

        <View direction="column" gap={3}>
          <Text as="h3" variant="featured-6" weight="semibold">
            Status ändern
          </Text>
          <div className="staffStatusActions">
            {staffActionStatuses.map((status) => (
              <Button
                key={status}
                color={status === "rejected" ? "critical" : "primary"}
                variant={status === "rejected" ? "outline" : undefined}
                onClick={() => void onChangeStatus(status)}
                disabled={busy || !canTransitionTo(request.status, status)}
              >
                {statusLabels[status]}
              </Button>
            ))}
          </div>
        </View>

        <View direction="column" gap={3}>
          <Text as="h3" variant="featured-6" weight="semibold">
            Audit Events dieser Anfrage
          </Text>
          {auditEvents.length === 0 ? (
            <StateNotice tone="neutral" title="Keine Audit Events im Filter" body="Für diese Anfrage liegen im aktuellen Staff-Filter keine Events vor." />
          ) : (
            auditEvents.map((event) => <AuditEventCard event={event} key={event.id} />)
          )}
        </View>
      </View>
    </div>
  );
}

function RequestSpecificDetails({ request }: { request: PortalRequestDto }) {
  const rows = requestDetailRows(request);
  if (rows.length === 0) return null;

  return (
    <View direction="column" gap={3}>
      <Text as="h3" variant="featured-6" weight="semibold">
        Request-Metadaten
      </Text>
      <div className="staffDataGrid">
        {rows.map((row) => (
          <StaffDataItem label={row.label} value={row.value} key={row.label} />
        ))}
      </div>
    </View>
  );
}

function StaffAuditTrail({ events }: { events: StaffRequestsResponse["auditEvents"] }) {
  return (
    <div className="plainPanel">
      <View direction="column" gap={4} padding={6}>
        <Text as="h2" variant="featured-5" weight="semibold">
          Audit Events
        </Text>
        {events.length === 0 ? (
          <StateNotice tone="neutral" title="Keine Audit Events" body="Audit Events erscheinen, sobald gefilterte Requests erstellt oder bearbeitet wurden." />
        ) : (
          <div className="gridAuto">
            {events.map((event) => <AuditEventCard event={event} key={event.id} />)}
          </div>
        )}
      </View>
    </div>
  );
}

function AuditEventCard({ event }: { event: StaffRequestsResponse["auditEvents"][number] }) {
  return (
    <div className="safeRow">
      <View direction="row" justify="space-between" gap={3} wrap>
        <Text weight="semibold">{event.action}</Text>
        <Badge color={event.outcome === "rejected" ? "warning" : "positive"} variant="faded">
          {event.outcome}
        </Badge>
      </View>
      <Text variant="caption-1" color="neutral-faded">
        {formatDateTime(event.occurredAt)} · {event.actorRole} · {event.requestId ?? event.objectType ?? "portal"}
      </Text>
    </div>
  );
}

function StaffDataItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="staffDataItem">
      <Text variant="caption-1" color="neutral-faded">
        {label}
      </Text>
      <Text weight="semibold">{value}</Text>
    </div>
  );
}

function RequestForms({ onCreateRequest }: { onCreateRequest: (input: CreatePortalRequestInput) => Promise<void> }) {
  return (
    <View direction="column" gap={3}>
      <Text as="h2" variant="featured-4" weight="semibold">
        Neue Portal-Requests
      </Text>
      <div className="gridAuto">
        <PrescriptionRequestForm onCreateRequest={onCreateRequest} />
        <AppointmentRequestForm onCreateRequest={onCreateRequest} />
        <ReorderRequestForm onCreateRequest={onCreateRequest} />
        <SubscriptionRequestForm onCreateRequest={onCreateRequest} />
        <ContactRequestForm onCreateRequest={onCreateRequest} />
      </div>
    </View>
  );
}

function PrescriptionRequestForm({ onCreateRequest }: { onCreateRequest: (input: CreatePortalRequestInput) => Promise<void> }) {
  const [context, setContext] = useState<CreatePortalRequestInput & { kind: "prescription_upload" }>({
    kind: "prescription_upload",
    context: "compression",
    fileExtension: "pdf",
    mimeType: "application/pdf",
    sizeBytes: 240_000,
    consentAccepted: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await onCreateRequest(context);
      setContext((current) => ({ ...current, consentAccepted: false }));
    } catch (caught) {
      setError(apiErrorText(caught));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="formPanel">
      <View direction="column" gap={4} padding={5}>
        <FormTitle icon={Upload} title="Rezeptupload-Anfrage" body="Speichert nur Metadaten und eine Request-ID, keine Datei." />
        <FormControl>
          <FormControl.Label>Kontext</FormControl.Label>
          <select className="nativeSelect" value={context.context} onChange={(event) => setContext((current) => ({ ...current, context: event.target.value as typeof context.context }))}>
            <option value="compression">Kompressionsversorgung</option>
            <option value="aid">Hilfsmittelversorgung</option>
            <option value="followup">Nachreichung</option>
          </select>
        </FormControl>
        <FormControl>
          <FormControl.Label>Datei auswählen</FormControl.Label>
          <input
            className="nativeSelect"
            type="file"
            accept={acceptedUploadExtensions}
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              if (!file) return;
              setContext((current) => ({
                ...current,
                fileExtension: extensionFromFileName(file.name),
                mimeType: file.type || mimeFromExtension(file.name),
                sizeBytes: file.size,
              }));
            }}
          />
        </FormControl>
        <label className="safeRow">
          <View direction="row" gap={3} align="start">
            <input
              type="checkbox"
              checked={context.consentAccepted}
              onChange={(event) => setContext((current) => ({ ...current, consentAccepted: event.currentTarget.checked }))}
            />
            <Text variant="body-2">Einwilligung zur Verarbeitung dieser Anfrage im Demo-MVP bestätigen.</Text>
          </View>
        </label>
        <Button color="primary" onClick={submit} disabled={submitting || !context.consentAccepted}>
          <span className="buttonLabel">
            <Upload aria-hidden />
            Anfrage speichern
          </span>
        </Button>
        {error && <StateNotice tone="warning" title="Upload-Anfrage nicht gespeichert" body={error} />}
      </View>
    </div>
  );
}

function AppointmentRequestForm({ onCreateRequest }: { onCreateRequest: (input: CreatePortalRequestInput) => Promise<void> }) {
  const [input, setInput] = useState<CreatePortalRequestInput & { kind: "appointment_request" }>({
    kind: "appointment_request",
    preferredDay: defaultAppointmentDay(),
    timeWindow: "vormittag",
    concern: "kompression",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await onCreateRequest(input);
    } catch (caught) {
      setError(apiErrorText(caught));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="formPanel">
      <View direction="column" gap={4} padding={5}>
        <FormTitle icon={Calendar} title="Terminwunsch" body="Speichert einen Wunsch, keine finale Buchung." />
        <FormControl>
          <FormControl.Label>Wunschtag</FormControl.Label>
          <TextField
            name="preferredDay"
            value={input.preferredDay}
            onChange={({ value }) => setInput((current) => ({ ...current, preferredDay: value }))}
            inputAttributes={{ type: "date" }}
          />
        </FormControl>
        <FormControl>
          <FormControl.Label>Zeitfenster</FormControl.Label>
          <select className="nativeSelect" value={input.timeWindow} onChange={(event) => setInput((current) => ({ ...current, timeWindow: event.target.value as typeof input.timeWindow }))}>
            <option value="vormittag">Vormittag</option>
            <option value="mittag">Mittag</option>
            <option value="nachmittag">Nachmittag</option>
          </select>
        </FormControl>
        <FormControl>
          <FormControl.Label>Anliegen</FormControl.Label>
          <select className="nativeSelect" value={input.concern} onChange={(event) => setInput((current) => ({ ...current, concern: event.target.value as typeof input.concern }))}>
            <option value="kompression">Kompressionsberatung</option>
            <option value="rezept">Rezeptbesprechung</option>
            <option value="versorgungskontrolle">Versorgungskontrolle</option>
          </select>
        </FormControl>
        <Button color="primary" onClick={submit} disabled={submitting}>
          <span className="buttonLabel">
            <Calendar aria-hidden />
            Terminwunsch speichern
          </span>
        </Button>
        {error && <StateNotice tone="warning" title="Terminwunsch nicht gespeichert" body={error} />}
      </View>
    </div>
  );
}

function ReorderRequestForm({ onCreateRequest }: { onCreateRequest: (input: CreatePortalRequestInput) => Promise<void> }) {
  const [input, setInput] = useState<CreatePortalRequestInput & { kind: "reorder_request" }>({
    kind: "reorder_request",
    supplyAlias: "kompressionsversorgung",
    cadence: "einmalig",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await onCreateRequest(input);
    } catch (caught) {
      setError(apiErrorText(caught));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="formPanel">
      <View direction="column" gap={4} padding={5}>
        <FormTitle icon={PackageCheck} title="Bestellanfrage" body="Erzeugt nur eine prüfbare Anfrage, keine Omnia-Bestellung." />
        <FormControl>
          <FormControl.Label>Versorgung</FormControl.Label>
          <select className="nativeSelect" value={input.supplyAlias} onChange={(event) => setInput((current) => ({ ...current, supplyAlias: event.target.value as typeof input.supplyAlias }))}>
            <option value="kompressionsversorgung">Kompressionsversorgung</option>
            <option value="inkontinenzmaterial">Inkontinenzmaterial</option>
            <option value="bandage">Bandage</option>
          </select>
        </FormControl>
        <FormControl>
          <FormControl.Label>Wunsch</FormControl.Label>
          <select className="nativeSelect" value={input.cadence} onChange={(event) => setInput((current) => ({ ...current, cadence: event.target.value as typeof input.cadence }))}>
            <option value="einmalig">Einmalig anfragen</option>
            <option value="regelmaessig-pruefen">Regelmäßige Versorgung prüfen</option>
          </select>
        </FormControl>
        <Button color="primary" onClick={submit} disabled={submitting}>
          <span className="buttonLabel">
            <PackageCheck aria-hidden />
            Bestellanfrage speichern
          </span>
        </Button>
        {error && <StateNotice tone="warning" title="Bestellanfrage nicht gespeichert" body={error} />}
      </View>
    </div>
  );
}

function SubscriptionRequestForm({ onCreateRequest }: { onCreateRequest: (input: CreatePortalRequestInput) => Promise<void> }) {
  const [input, setInput] = useState<CreatePortalRequestInput & { kind: "subscription_change_request" }>({
    kind: "subscription_change_request",
    supplyAlias: "kompressionsversorgung",
    cadence: "quartalsweise",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await onCreateRequest(input);
    } catch (caught) {
      setError(apiErrorText(caught));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="formPanel">
      <View direction="column" gap={4} padding={5}>
        <FormTitle icon={ClipboardList} title="Abo-Wunsch" body="Speichert einen Rhythmuswunsch als prüfbare Anfrage." />
        <FormControl>
          <FormControl.Label>Versorgung</FormControl.Label>
          <select className="nativeSelect" value={input.supplyAlias} onChange={(event) => setInput((current) => ({ ...current, supplyAlias: event.target.value as typeof input.supplyAlias }))}>
            <option value="kompressionsversorgung">Kompressionsversorgung</option>
            <option value="inkontinenzmaterial">Inkontinenzmaterial</option>
            <option value="bandage">Bandage</option>
          </select>
        </FormControl>
        <FormControl>
          <FormControl.Label>Rhythmuswunsch</FormControl.Label>
          <select className="nativeSelect" value={input.cadence} onChange={(event) => setInput((current) => ({ ...current, cadence: event.target.value as typeof input.cadence }))}>
            <option value="monatlich">Monatlich prüfen</option>
            <option value="quartalsweise">Quartalsweise prüfen</option>
            <option value="halbjaehrlich">Halbjährlich prüfen</option>
          </select>
        </FormControl>
        <Button color="primary" onClick={submit} disabled={submitting}>
          <span className="buttonLabel">
            <ClipboardList aria-hidden />
            Abo-Wunsch speichern
          </span>
        </Button>
        {error && <StateNotice tone="warning" title="Abo-Wunsch nicht gespeichert" body={error} />}
      </View>
    </div>
  );
}

function ContactRequestForm({ onCreateRequest }: { onCreateRequest: (input: CreatePortalRequestInput) => Promise<void> }) {
  const [input, setInput] = useState<CreatePortalRequestInput & { kind: "health_contact_request" }>({
    kind: "health_contact_request",
    topic: "rueckfrage",
    preferredChannel: "telefon",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await onCreateRequest(input);
    } catch (caught) {
      setError(apiErrorText(caught));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="formPanel">
      <View direction="column" gap={4} padding={5}>
        <FormTitle icon={FileText} title="Kontaktanfrage" body="Speichert Thema und Kontaktweg, keine Freitexte oder Gesundheitsdetails." />
        <FormControl>
          <FormControl.Label>Thema</FormControl.Label>
          <select className="nativeSelect" value={input.topic} onChange={(event) => setInput((current) => ({ ...current, topic: event.target.value as typeof input.topic }))}>
            <option value="rueckfrage">Rückfrage</option>
            <option value="beratung">Beratung</option>
            <option value="unterlagen">Unterlagen</option>
          </select>
        </FormControl>
        <FormControl>
          <FormControl.Label>Kontaktweg</FormControl.Label>
          <select className="nativeSelect" value={input.preferredChannel} onChange={(event) => setInput((current) => ({ ...current, preferredChannel: event.target.value as typeof input.preferredChannel }))}>
            <option value="telefon">Telefon</option>
            <option value="email">E-Mail</option>
          </select>
        </FormControl>
        <Button color="primary" onClick={submit} disabled={submitting}>
          <span className="buttonLabel">
            <FileText aria-hidden />
            Kontaktanfrage speichern
          </span>
        </Button>
        {error && <StateNotice tone="warning" title="Kontaktanfrage nicht gespeichert" body={error} />}
      </View>
    </div>
  );
}

function LatestActivities({ activities }: { activities: PortalDashboardResponse["latestActivities"] }) {
  return (
    <div className="plainPanel">
      <View direction="column" gap={4} padding={6}>
        <Text as="h2" variant="featured-5" weight="semibold">
          Letzte Aktivitäten
        </Text>
        {activities.length === 0 ? (
          <StateNotice tone="neutral" title="Noch keine Aktivität" body="Login, Anfragen und Statuswechsel erscheinen hier." />
        ) : (
          <div className="gridAuto">
            {activities.map((event) => (
              <div className="safeRow" key={event.id}>
                <View direction="row" justify="space-between" gap={3} wrap>
                  <Text weight="semibold">{event.action}</Text>
                  <Badge color={event.outcome === "rejected" ? "warning" : "positive"} variant="faded">
                    {event.outcome}
                  </Badge>
                </View>
                <Text variant="caption-1" color="neutral-faded">
                  {formatDateTime(event.occurredAt)} · {event.requestId ?? "Portal"}
                </Text>
              </div>
            ))}
          </div>
        )}
      </View>
    </div>
  );
}

function RequestTimeline({ requests }: { requests: PortalRequestDto[] }) {
  return (
    <div className="plainPanel">
      <View direction="column" gap={4} padding={6}>
        <Text as="h2" variant="featured-5" weight="semibold">
          Mitarbeiterstatus
        </Text>
        {requests.length === 0 ? (
          <StateNotice tone="neutral" title="Noch keine Requests" body="Speichere eine Anfrage, um die Mitarbeiterprüfung zu sehen." />
        ) : (
          requests.map((request) => (
            <div className="safeRow" key={request.id}>
              <View direction="row" justify="space-between" gap={3} wrap>
                <Text weight="semibold">{request.kindLabel}</Text>
                <Badge color={request.status === "submitted" ? "warning" : "neutral"} variant="faded">
                  {statusLabels[request.status]}
                </Badge>
              </View>
              <Text variant="body-2" color="neutral-faded">
                {request.safeSummary}
              </Text>
              <View direction="row" gap={2} wrap>
                <Badge color="primary" variant="faded">{request.employeeStatusLabel}</Badge>
                <Badge color="neutral" variant="faded">{sensitivityLabels[request.sensitivity]}</Badge>
                <Badge color={request.omniaWriteAllowed ? "critical" : "positive"} variant="faded">
                  Omnia Write: {request.omniaWriteAllowed ? "ja" : "nein"}
                </Badge>
              </View>
              <Text variant="caption-1" color="neutral-faded">
                {request.id} · {formatDateTime(request.createdAt)}
              </Text>
            </div>
          ))
        )}
      </View>
    </div>
  );
}

function AuditTrail({ dashboard }: { dashboard: PortalDashboardResponse }) {
  return (
    <div className="plainPanel">
      <View direction="column" gap={4} padding={6}>
        <Text as="h2" variant="featured-5" weight="semibold">
          Audit Events
        </Text>
        {dashboard.auditEvents.length === 0 ? (
          <StateNotice tone="neutral" title="Noch keine Audit Events" body="Login und Requests erzeugen Audit-Einträge." />
        ) : (
          dashboard.auditEvents.map((event) => (
            <div className="safeRow" key={event.id}>
              <View direction="row" justify="space-between" gap={3} wrap>
                <Text weight="semibold">{event.action}</Text>
                <Badge color={event.outcome === "rejected" ? "warning" : "positive"} variant="faded">
                  {event.outcome}
                </Badge>
              </View>
              <Text variant="caption-1" color="neutral-faded">
                {formatDateTime(event.occurredAt)} · {event.requestId ?? event.objectType ?? "portal"}
              </Text>
            </div>
          ))
        )}
      </View>
    </div>
  );
}

function Kpi({ icon: Icon, label, value }: { icon: typeof Shield; label: string; value: string }) {
  return (
    <div className="safeRow">
      <View direction="row" gap={3} align="center">
        <span className="iconBox" aria-hidden>
          <Icon />
        </span>
        <View direction="column" gap={1}>
          <Text variant="body-2" color="neutral-faded">
            {label}
          </Text>
          <Text variant="featured-4" weight="bold">
            {value}
          </Text>
        </View>
      </View>
    </div>
  );
}

function FormTitle({ icon: Icon, title, body }: { icon: typeof Shield; title: string; body: string }) {
  return (
    <View direction="column" gap={2}>
      <span className="iconBox" aria-hidden>
        <Icon />
      </span>
      <Text as="h3" variant="featured-6" weight="semibold">
        {title}
      </Text>
      <Text variant="body-2" color="neutral-faded">
        {body}
      </Text>
    </View>
  );
}

function StateNotice({ tone, title, body }: Notice) {
  const className = tone === "warning" ? "privacyNote privacyNoteCritical" : "safeRow";
  return (
    <div className={className} role="status">
      <View direction="row" gap={3} align="start">
        {tone === "positive" ? <CheckCircle aria-hidden /> : <Shield aria-hidden />}
        <View direction="column" gap={1}>
          <Text weight="semibold">{title}</Text>
          <Text variant="body-2" color="neutral-faded">
            {body}
          </Text>
        </View>
      </View>
    </div>
  );
}

function isStaffSession(session: PortalSessionResponse) {
  return session.session.role === "staff" || session.session.role === "admin";
}

function staffFiltersFromValues(status: StatusFilterValue, kind: KindFilterValue): StaffRequestFilters {
  return {
    ...(status === "all" ? {} : { status }),
    ...(kind === "all" ? {} : { kind }),
  };
}

function canTransitionTo(current: PortalRequestDto["status"], next: PortalRequestDto["status"]) {
  const allowed: Record<PortalRequestDto["status"], readonly PortalRequestDto["status"][]> = {
    draft: ["rejected"],
    submitted: ["staff_review", "rejected"],
    staff_review: ["approved", "rejected"],
    approved: ["completed", "rejected"],
    rejected: [],
    completed: [],
  };
  return allowed[current].includes(next);
}

function statusBadgeColor(status: PortalRequestDto["status"]) {
  const colors: Record<PortalRequestDto["status"], "neutral" | "primary" | "positive" | "critical" | "warning"> = {
    draft: "neutral",
    submitted: "warning",
    staff_review: "primary",
    approved: "positive",
    rejected: "critical",
    completed: "positive",
  };
  return colors[status];
}

function requestDetailRows(request: PortalRequestDto) {
  if (request.uploadObject) {
    return [
      { label: "Dateityp", value: `${request.uploadObject.extension.toUpperCase()} · ${request.uploadObject.mimeType}` },
      { label: "Größe", value: formatByteSize(request.uploadObject.sizeBytes) },
      { label: "Speichermodus", value: request.uploadObject.storageMode },
      { label: "Produktiv-Upload", value: request.uploadObject.productionUpload ? "ja" : "nein" },
    ];
  }

  if (request.appointmentWish) {
    return [
      { label: "Wunschtag", value: request.appointmentWish.preferredDay },
      { label: "Zeitfenster", value: request.appointmentWish.timeWindow },
      { label: "Anliegen", value: request.appointmentWish.concern },
    ];
  }

  if (request.reorderWish) {
    return [
      { label: "Versorgung", value: request.reorderWish.supplyAlias },
      { label: "Wunsch", value: request.reorderWish.cadence },
    ];
  }

  if (request.subscriptionWish) {
    return [
      { label: "Versorgung", value: request.subscriptionWish.supplyAlias },
      { label: "Rhythmus", value: request.subscriptionWish.cadence },
    ];
  }

  if (request.contactWish) {
    return [
      { label: "Thema", value: request.contactWish.topic },
      { label: "Kontaktweg", value: request.contactWish.preferredChannel },
    ];
  }

  return [];
}

function formatByteSize(sizeBytes: number) {
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  return `${Math.round(sizeBytes / 1024)} KB`;
}

function apiNotice(error: unknown, fallback: string): Notice {
  return {
    tone: "warning",
    title: "Backend nicht erreichbar",
    body: error instanceof PortalApiError ? `${fallback} (${error.message})` : fallback,
  };
}

function apiErrorText(error: unknown) {
  if (error instanceof PortalApiError) return `${error.message} (${error.status})`;
  if (error instanceof Error) return error.message;
  return "Unbekannter Fehler";
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function defaultAppointmentDay() {
  const date = new Date();
  date.setDate(date.getDate() + 3);
  return date.toISOString().slice(0, 10);
}

function extensionFromFileName(fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase();
  return extension && extension.length <= 5 ? extension : "pdf";
}

function mimeFromExtension(fileName: string) {
  const extension = extensionFromFileName(fileName);
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  if (extension === "png") return "image/png";
  if (extension === "heic") return "image/heic";
  if (extension === "heif") return "image/heif";
  return "application/pdf";
}

createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Reshaped defaultTheme="slate" defaultColorMode="light">
      <PortalMvpApp />
    </Reshaped>
  </React.StrictMode>,
);
