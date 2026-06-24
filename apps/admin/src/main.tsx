import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  AlertTriangle,
  CheckCircle,
  ClipboardList,
  Clock,
  FileText,
  KeyRound,
  Lock,
  LogOut,
  Mail,
  RefreshCw,
  Send,
  Shield,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Badge, Button, FormControl, Reshaped, Text, TextArea, TextField, View } from "reshaped";
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
  type StaffRequestMessage,
  type StaffRequestDetail,
  type StaffRequestListItem,
  type StaffRequestsResponse,
  type StaffSessionResponse,
  type StaffStatus,
  type StaffUser,
  type StaffRole,
} from "./api";

installDesignTokens();

type Notice = {
  tone: "positive" | "warning" | "neutral";
  title: string;
  body: string;
};

type StatusFilter = StaffStatus | "all";

type TemporaryPasswordNotice = {
  email: string;
  password: string;
  reason: "created" | "reset";
};

const fallbackStatusModel: StaffRequestsResponse["statusModel"] = [
  { value: "new", label: "Neu" },
  { value: "in_review", label: "In Pruefung" },
  { value: "waiting_for_customer", label: "Rueckfrage an Kunde" },
  { value: "completed", label: "Abgeschlossen" },
  { value: "cancelled", label: "Abgebrochen" },
];

const requestTypeLabels: Record<string, string> = {
  appointment: "Termin",
  contact: "Kontakt",
  care: "Pflege/Versorgung",
  document: "Dokument/Rezept",
  appointment_request: "Termin",
  health_contact_request: "Kontakt",
  reorder_request: "Bestellung/Versorgung",
  prescription_upload: "Dokument/Rezept",
};

const statusHelpText: Record<StaffStatus, string> = {
  new: "Neu eingegangen, fachlich sichten und passenden naechsten Schritt waehlen.",
  in_review: "Wird intern geprueft; Kontakt-, Fach- oder Rezeptlage klaeren.",
  waiting_for_customer: "Rueckfrage ist offen; auf Antwort oder Rueckruf warten.",
  completed: "Fachlich erledigt; keine weitere Aktion im MVP vorgesehen.",
  cancelled: "Abgebrochen; keine weitere Aktion im MVP vorgesehen.",
};

const replyTemplates: Record<string, string> = {
  none: "",
  appointment: "Guten Tag,\n\nvielen Dank fuer Ihre Terminanfrage. Wir melden uns zur Abstimmung des passenden Termins bei Ihnen.\n\nFreundliche Gruesse\nsaniPEP Sanitaetshaus",
  "contact-data": "Guten Tag,\n\nvielen Dank fuer Ihre Anfrage. Zur weiteren Bearbeitung benoetigen wir noch eine kurze Rueckmeldung zu Ihren Kontaktdaten oder zum bevorzugten Rueckrufweg.\n\nFreundliche Gruesse\nsaniPEP Sanitaetshaus",
  care: "Guten Tag,\n\nvielen Dank fuer Ihre Pflege-/Versorgungs-Anfrage. Wir pruefen die Angaben intern und melden uns mit einer fachlichen Rueckfrage oder dem naechsten Schritt.\n\nFreundliche Gruesse\nsaniPEP Sanitaetshaus",
  document: "Guten Tag,\n\nvielen Dank fuer Ihren Rezept-/Dokument-Hinweis. Die sichere Einreichung von Dateien wird separat geklaert; bitte senden Sie keine medizinischen Dokumente als Anhang ueber diese Antwort.\n\nFreundliche Gruesse\nsaniPEP Sanitaetshaus",
};

function StaffAdminApp() {
  const [session, setSession] = useState<StaffSessionResponse | null>(null);
  const [workspace, setWorkspace] = useState<StaffRequestsResponse | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<StaffRequestDetail | null>(null);
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
  const [temporaryPassword, setTemporaryPassword] = useState<TemporaryPasswordNotice | null>(null);
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
          if (restored.session.role === "admin") await loadStaffUsers(active);
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

  const loadStaffUsers = async (active = true) => {
    const response = await staffAdminApi.listUsers();
    if (active) setStaffUsers(response.users);
    return response;
  };

  const handleLogin = async (input: { email: string; password: string }) => {
    setNotice(null);
    const login = await staffAdminApi.login(input);
    setSession(login);
    setStatusFilter("all");
    await loadRequests("all");
    if (login.session.role === "admin") await loadStaffUsers();
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
    setStaffUsers([]);
    setTemporaryPassword(null);
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

  const handleRefreshUsers = async () => {
    setBusy(true);
    setNotice(null);
    try {
      await loadStaffUsers();
    } catch (error) {
      setNotice(apiNotice(error, "Benutzerliste konnte nicht geladen werden."));
    } finally {
      setBusy(false);
    }
  };

  const handleCreateUser = async (input: { email: string; safeDisplayName: string; role: StaffRole }) => {
    if (!session) return;
    setBusy(true);
    setNotice(null);
    try {
      const result = await staffAdminApi.createUser(input, session.csrfToken);
      await loadStaffUsers();
      setTemporaryPassword({ email: result.user.email, password: result.temporaryPassword, reason: "created" });
      setNotice({
        tone: "positive",
        title: "Benutzer angelegt",
        body: `${result.user.safeDisplayName} kann sich mit dem einmalig angezeigten temporaeren Passwort anmelden.`,
      });
    } catch (error) {
      setNotice(apiNotice(error, "Benutzer konnte nicht angelegt werden."));
      throw error;
    } finally {
      setBusy(false);
    }
  };

  const handleUpdateUser = async (input: { userId: string; email: string; safeDisplayName: string; role: StaffRole; status: StaffUser["status"] }) => {
    if (!session) return;
    setBusy(true);
    setNotice(null);
    try {
      await staffAdminApi.updateUser(input, session.csrfToken);
      await loadStaffUsers();
      setNotice({
        tone: "positive",
        title: "Benutzer aktualisiert",
        body: "Rolle, Anzeige- oder Login-Daten wurden gespeichert.",
      });
    } catch (error) {
      setNotice(apiNotice(error, "Benutzer konnte nicht aktualisiert werden."));
      throw error;
    } finally {
      setBusy(false);
    }
  };

  const handleResetUserPassword = async (user: StaffUser) => {
    if (!session) return;
    setBusy(true);
    setNotice(null);
    try {
      const result = await staffAdminApi.resetUserPassword(user.userId, session.csrfToken);
      await loadStaffUsers();
      setTemporaryPassword({ email: result.user.email, password: result.temporaryPassword, reason: "reset" });
      setNotice({
        tone: "positive",
        title: "Passwort zurueckgesetzt",
        body: "Das temporaere Passwort wird einmalig angezeigt. Bestehende Sessions des Benutzers wurden beendet.",
      });
    } catch (error) {
      setNotice(apiNotice(error, "Passwort konnte nicht zurueckgesetzt werden."));
      throw error;
    } finally {
      setBusy(false);
    }
  };

  const handleDeactivateUser = async (user: StaffUser) => {
    if (!session) return;
    setBusy(true);
    setNotice(null);
    try {
      await staffAdminApi.deactivateUser(user.userId, session.csrfToken);
      await loadStaffUsers();
      setNotice({
        tone: "neutral",
        title: "Benutzer deaktiviert",
        body: "Der Zugang ist deaktiviert und bestehende Sessions wurden beendet.",
      });
    } catch (error) {
      setNotice(apiNotice(error, "Benutzer konnte nicht deaktiviert werden."));
      throw error;
    } finally {
      setBusy(false);
    }
  };

  const handleChangeOwnPassword = async (input: { oldPassword: string; newPassword: string }) => {
    if (!session) return;
    setBusy(true);
    setNotice(null);
    try {
      const result = await staffAdminApi.changeOwnPassword(input, session.csrfToken);
      setNotice({
        tone: "positive",
        title: "Passwort geaendert",
        body: result.sessionsInvalidated
          ? "Das Passwort wurde geaendert und bestehende Sessions wurden beendet."
          : "Das Passwort wurde geaendert. Bestehende Sessions laufen bis zur normalen Session-Grenze weiter.",
      });
    } catch (error) {
      setNotice(apiNotice(error, "Passwort konnte nicht geaendert werden."));
      throw error;
    } finally {
      setBusy(false);
    }
  };

  const handleSendEmailReply = async (input: { requestId: string; subject: string; body: string }) => {
    if (!session) return;
    setBusy(true);
    setNotice(null);
    try {
      const result = await staffAdminApi.sendEmailReply(input, session.csrfToken);
      setSelectedRequest(result.request);
      await loadRequests(statusFilter, input.requestId);
      setNotice({
        tone: "positive",
        title: "E-Mail gesendet",
        body: "Die Antwort wurde im Request-Verlauf gespeichert.",
      });
    } catch (error) {
      if (selectedRequest?.id === input.requestId) {
        await loadRequestDetail(input.requestId).catch(() => undefined);
      }
      setNotice(apiNotice(error, "E-Mail konnte nicht gesendet werden."));
      throw error;
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
            staffUsers={staffUsers}
            temporaryPassword={temporaryPassword}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            onApplyFilter={handleApplyFilter}
            onSelectRequest={handleSelectRequest}
            onStatusChange={handleStatusChange}
            onRefreshUsers={handleRefreshUsers}
            onCreateUser={handleCreateUser}
            onUpdateUser={handleUpdateUser}
            onResetUserPassword={handleResetUserPassword}
            onDeactivateUser={handleDeactivateUser}
            onClearTemporaryPassword={() => setTemporaryPassword(null)}
            onChangeOwnPassword={handleChangeOwnPassword}
            onSendEmailReply={handleSendEmailReply}
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
  staffUsers,
  temporaryPassword,
  statusFilter,
  onStatusFilterChange,
  onApplyFilter,
  onSelectRequest,
  onStatusChange,
  onRefreshUsers,
  onCreateUser,
  onUpdateUser,
  onResetUserPassword,
  onDeactivateUser,
  onClearTemporaryPassword,
  onChangeOwnPassword,
  onSendEmailReply,
}: {
  busy: boolean;
  session: StaffSessionResponse;
  workspace: StaffRequestsResponse | null;
  selectedRequest: StaffRequestDetail | null;
  staffUsers: StaffUser[];
  temporaryPassword: TemporaryPasswordNotice | null;
  statusFilter: StatusFilter;
  onStatusFilterChange: (value: StatusFilter) => void;
  onApplyFilter: () => Promise<void>;
  onSelectRequest: (request: StaffRequestListItem) => Promise<void>;
  onStatusChange: (status: StaffStatus) => Promise<void>;
  onRefreshUsers: () => Promise<void>;
  onCreateUser: (input: { email: string; safeDisplayName: string; role: StaffRole }) => Promise<void>;
  onUpdateUser: (input: { userId: string; email: string; safeDisplayName: string; role: StaffRole; status: StaffUser["status"] }) => Promise<void>;
  onResetUserPassword: (user: StaffUser) => Promise<void>;
  onDeactivateUser: (user: StaffUser) => Promise<void>;
  onClearTemporaryPassword: () => void;
  onChangeOwnPassword: (input: { oldPassword: string; newPassword: string }) => Promise<void>;
  onSendEmailReply: (input: { requestId: string; subject: string; body: string }) => Promise<void>;
}) {
  const statusModel = workspace?.statusModel ?? fallbackStatusModel;

  return (
    <View direction="column" gap={5}>
      <div className="gridAuto" aria-label="Staff Request Kennzahlen">
        <Kpi icon={ClipboardList} label="Requests" value={String(workspace?.requests.length ?? 0)} />
        <Kpi icon={CheckCircle} label="Neue" value={String(workspace?.requests.filter((request) => request.staffStatus === "new").length ?? 0)} />
        <Kpi icon={Clock} label="In Pruefung" value={String(workspace?.requests.filter((request) => request.staffStatus === "in_review").length ?? 0)} />
        <Kpi icon={AlertTriangle} label="Rueckfragen" value={String(workspace?.requests.filter((request) => request.staffStatus === "waiting_for_customer").length ?? 0)} />
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
          {busy && <StateNotice tone="neutral" title="Aktualisierung laeuft" body="Liste, Detailansicht oder Status werden gerade vom Backend geladen." />}
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
          onSendEmailReply={onSendEmailReply}
        />
      </div>

      <PasswordChangePanel busy={busy} onChangePassword={onChangeOwnPassword} />

      {session.session.role === "admin" && (
        <StaffUsersPanel
          busy={busy}
          users={staffUsers}
          temporaryPassword={temporaryPassword}
          onRefresh={onRefreshUsers}
          onCreate={onCreateUser}
          onUpdate={onUpdateUser}
          onResetPassword={onResetUserPassword}
          onDeactivate={onDeactivateUser}
          onClearTemporaryPassword={onClearTemporaryPassword}
        />
      )}
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
          <StateNotice tone="neutral" title="Keine Requests" body="Der aktuelle Filter liefert keine Treffer. Filter auf Alle stellen oder spaeter erneut aktualisieren." />
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
                    <Text weight="semibold">{requestTypeLabel(request)}</Text>
                    <Text variant="caption-1" color="neutral-faded">
                      {request.id}
                    </Text>
                  </View>
                  <div className="staffStatusBadgeGroup">
                    <Badge color={statusBadgeColor(request.staffStatus)} variant="faded">
                      {request.staffStatusLabel}
                    </Badge>
                  </div>
                </View>
                <Text variant="body-2" color="neutral-faded">
                  {request.safeSummary}
                </Text>
                <Text variant="caption-1" color="neutral-faded">
                  {nextActionHint(request)}
                </Text>
                <View direction="row" gap={2} wrap>
                  <Badge color={requestTypeBadgeColor(request)} variant="faded">
                    {requestTypeLabel(request)}
                  </Badge>
                  {request.requestType === "document" && (
                    <Badge color="warning" variant="faded">
                      Keine Datei
                    </Badge>
                  )}
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
  onSendEmailReply,
}: {
  request: StaffRequestDetail | null;
  statusModel: StaffRequestsResponse["statusModel"];
  busy: boolean;
  onStatusChange: (status: StaffStatus) => Promise<void>;
  onSendEmailReply: (input: { requestId: string; subject: string; body: string }) => Promise<void>;
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
  const documentRequest = request.publicRequest?.requestType === "document";

  return (
    <div className="plainPanel">
      <View direction="column" gap={4} padding={6}>
        <View direction="row" justify="space-between" align="start" gap={3} wrap>
          <View direction="column" gap={1}>
            <Text as="h2" variant="featured-5" weight="semibold">
              Request-Details
            </Text>
            <Text variant="body-2" color="neutral-faded">
              {request.id} · {requestTypeLabel(request)}
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

        <StateNotice tone="neutral" title="Naechster fachlicher Schritt" body={nextActionHint(request)} />

        {documentRequest && (
          <div className="staffDocumentNotice">
            <FileText aria-hidden />
            <View direction="column" gap={1}>
              <Text weight="semibold">Keine Datei uebertragen</Text>
              <Text variant="body-2" color="neutral-faded">
                Dieser Dokument-/Rezept-Request enthaelt nur Anfrage- und Metadaten. Es gibt keinen Dateinamen,
                kein Upload-Objekt und keine produktive Dateiuebertragung.
              </Text>
            </View>
          </div>
        )}

        <div className="staffAdminDetailGrid">
          {rows.map((row) => (
            <DataItem label={row.label} value={row.value} key={`${row.label}:${row.value}`} />
          ))}
        </div>

        <View direction="column" gap={3}>
          <Text as="h3" variant="featured-6" weight="semibold">
            Status setzen
          </Text>
          <Text variant="body-2" color="neutral-faded">
            {terminal ? "Terminaler Status: keine weitere Statusaktion im MVP." : statusHelpText[request.staffStatus]}
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

        <EmailReplyPanel request={request} busy={busy} onSendEmailReply={onSendEmailReply} />

        <CommunicationList messages={request.communication} />

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

function EmailReplyPanel({
  request,
  busy,
  onSendEmailReply,
}: {
  request: StaffRequestDetail;
  busy: boolean;
  onSendEmailReply: (input: { requestId: string; subject: string; body: string }) => Promise<void>;
}) {
  const [subject, setSubject] = useState(request.mail.defaultSubject);
  const [body, setBody] = useState("");
  const [template, setTemplate] = useState("none");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSubject(request.mail.defaultSubject);
    setBody("");
    setTemplate("none");
    setError(null);
  }, [request.id, request.mail.defaultSubject]);

  const applyTemplate = (value: string) => {
    setTemplate(value);
    setBody(replyTemplates[value] ?? "");
  };

  const send = async () => {
    setSending(true);
    setError(null);
    try {
      await onSendEmailReply({ requestId: request.id, subject, body });
      setBody("");
      setTemplate("none");
    } catch (caught) {
      setError(apiErrorText(caught));
    } finally {
      setSending(false);
    }
  };

  const disabledReason = request.mail.disabledReason;
  const canSend = request.mail.configured && request.mail.recipientAvailable && subject.trim().length >= 5 && body.trim().length >= 10;

  return (
    <View direction="column" gap={3}>
      <Text as="h3" variant="featured-6" weight="semibold">
        E-Mail-Antwort
      </Text>
      {disabledReason === "mail_disabled" && (
        <StateNotice tone="neutral" title="E-Mail-Versand nicht eingerichtet" body="MAIL_ENABLED=false: Das Backend versendet keine E-Mails." />
      )}
      {disabledReason === "smtp_not_configured" && (
        <StateNotice tone="warning" title="SMTP nicht vollstaendig" body="MAIL_ENABLED ist aktiv, aber die SMTP-Konfiguration ist nicht vollstaendig." />
      )}
      {disabledReason === "recipient_email_missing" && (
        <StateNotice tone="warning" title="Keine Empfaengeradresse" body="Diese Anfrage enthaelt keine E-Mail-Adresse." />
      )}
      <div className="staffAdminFormGrid">
        <FormControl>
          <FormControl.Label>Vorlage</FormControl.Label>
          <select className="nativeSelect" value={template} onChange={(event) => applyTemplate(event.currentTarget.value)}>
            <option value="none">Keine Vorlage</option>
            <option value="appointment">Termin-Rueckmeldung</option>
            <option value="contact-data">Rueckfrage Kontaktdaten</option>
            <option value="care">Pflege-/Versorgungs-Rueckfrage</option>
            <option value="document">Rezept/Dokument-Hinweis</option>
          </select>
        </FormControl>
        <FormControl>
          <FormControl.Label>Betreff</FormControl.Label>
          <TextField name="replySubject" value={subject} onChange={({ value }) => setSubject(value)} />
        </FormControl>
      </div>
      <FormControl>
        <FormControl.Label>Antworttext</FormControl.Label>
        <TextArea
          name="replyBody"
          value={body}
          onChange={({ value }) => setBody(value)}
          resize="auto"
        />
      </FormControl>
      <View direction="row" gap={3} align="center" wrap>
        <Button color="primary" onClick={send} disabled={busy || sending || !canSend}>
          <span className="buttonLabel">
            <Send aria-hidden />
            {sending ? "Senden laeuft" : "Antwort senden"}
          </span>
        </Button>
        <Text variant="caption-1" color="neutral-faded">
          Absender {request.mail.fromAddress}
        </Text>
      </View>
      {error && <StateNotice tone="warning" title="E-Mail-Antwort fehlgeschlagen" body={error} />}
    </View>
  );
}

function CommunicationList({ messages }: { messages: StaffRequestMessage[] }) {
  return (
    <View direction="column" gap={3}>
      <Text as="h3" variant="featured-6" weight="semibold">
        Verlauf
      </Text>
      {messages.length === 0 ? (
        <StateNotice tone="neutral" title="Noch keine Antworten" body="Fuer diesen Request wurde noch keine Staff-Antwort gespeichert." />
      ) : (
        <div className="staffAdminAuditList">
          {messages.map((message) => (
            <div className="safeRow" key={message.id}>
              <View direction="row" justify="space-between" gap={3} wrap>
                <Text weight="semibold">{message.subject}</Text>
                <Badge color={message.status === "sent" ? "positive" : "warning"} variant="faded">
                  {message.status === "sent" ? "gesendet" : "fehlgeschlagen"}
                </Badge>
              </View>
              <Text variant="caption-1" color="neutral-faded">
                {formatDateTime(message.sentAt ?? message.failedAt ?? message.createdAt)} · an {message.to}
              </Text>
              <Text variant="body-2" color="neutral-faded">
                {message.body}
              </Text>
              {message.errorCode && (
                <Text variant="caption-1" color="neutral-faded">
                  Fehlerzustand: {message.errorCode}
                </Text>
              )}
            </div>
          ))}
        </div>
      )}
    </View>
  );
}

function PasswordChangePanel({
  busy,
  onChangePassword,
}: {
  busy: boolean;
  onChangePassword: (input: { oldPassword: string; newPassword: string }) => Promise<void>;
}) {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (newPassword !== confirmPassword) {
      setError("Das neue Passwort und die Wiederholung stimmen nicht ueberein.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onChangePassword({ oldPassword, newPassword });
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (caught) {
      setError(apiErrorText(caught));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="plainPanel">
      <View direction="column" gap={4} padding={6}>
        <View direction="row" gap={3} align="center">
          <span className="iconBox" aria-hidden>
            <KeyRound />
          </span>
          <Text as="h2" variant="featured-5" weight="semibold">
            Eigenes Passwort
          </Text>
        </View>
        <div className="staffAdminFormGrid">
          <FormControl>
            <FormControl.Label>Altes Passwort</FormControl.Label>
            <TextField name="oldPassword" value={oldPassword} onChange={({ value }) => setOldPassword(value)} inputAttributes={{ type: "password", autoComplete: "current-password" }} />
          </FormControl>
          <FormControl>
            <FormControl.Label>Neues Passwort</FormControl.Label>
            <TextField name="newPassword" value={newPassword} onChange={({ value }) => setNewPassword(value)} inputAttributes={{ type: "password", autoComplete: "new-password" }} />
          </FormControl>
          <FormControl>
            <FormControl.Label>Neues Passwort wiederholen</FormControl.Label>
            <TextField name="confirmPassword" value={confirmPassword} onChange={({ value }) => setConfirmPassword(value)} inputAttributes={{ type: "password", autoComplete: "new-password" }} />
          </FormControl>
        </div>
        <Button color="primary" onClick={submit} disabled={busy || submitting || !oldPassword || !newPassword || !confirmPassword}>
          <span className="buttonLabel">
            <KeyRound aria-hidden />
            {submitting ? "Speichern laeuft" : "Passwort aendern"}
          </span>
        </Button>
        {error && <StateNotice tone="warning" title="Passwortwechsel fehlgeschlagen" body={error} />}
      </View>
    </div>
  );
}

function StaffUsersPanel({
  busy,
  users,
  temporaryPassword,
  onRefresh,
  onCreate,
  onUpdate,
  onResetPassword,
  onDeactivate,
  onClearTemporaryPassword,
}: {
  busy: boolean;
  users: StaffUser[];
  temporaryPassword: TemporaryPasswordNotice | null;
  onRefresh: () => Promise<void>;
  onCreate: (input: { email: string; safeDisplayName: string; role: StaffRole }) => Promise<void>;
  onUpdate: (input: { userId: string; email: string; safeDisplayName: string; role: StaffRole; status: StaffUser["status"] }) => Promise<void>;
  onResetPassword: (user: StaffUser) => Promise<void>;
  onDeactivate: (user: StaffUser) => Promise<void>;
  onClearTemporaryPassword: () => void;
}) {
  return (
    <div className="plainPanel">
      <View direction="column" gap={4} padding={6}>
        <View direction="row" justify="space-between" align="center" gap={3} wrap>
          <View direction="row" gap={3} align="center">
            <span className="iconBox" aria-hidden>
              <Users />
            </span>
            <Text as="h2" variant="featured-5" weight="semibold">
              Benutzer
            </Text>
          </View>
          <Button variant="outline" color="neutral" onClick={onRefresh} disabled={busy}>
            <span className="buttonLabel">
              <RefreshCw aria-hidden />
              Aktualisieren
            </span>
          </Button>
        </View>

        {temporaryPassword && (
          <div className="staffSecretBox">
            <View direction="row" justify="space-between" gap={3} wrap>
              <View direction="column" gap={1}>
                <Text weight="semibold">
                  Temporaeres Passwort fuer {temporaryPassword.email}
                </Text>
                <Text variant="body-2" color="neutral-faded">
                  {temporaryPassword.reason === "created" ? "Neu angelegt" : "Passwortreset"} · nur einmalig anzeigen.
                </Text>
              </View>
              <Button variant="outline" color="neutral" onClick={onClearTemporaryPassword}>
                Ausblenden
              </Button>
            </View>
            <code>{temporaryPassword.password}</code>
          </div>
        )}

        <StaffUserCreateForm busy={busy} onCreate={onCreate} />

        <div className="staffUserList">
          {users.map((user) => (
            <StaffUserRow
              busy={busy}
              user={user}
              key={user.userId}
              onUpdate={onUpdate}
              onResetPassword={onResetPassword}
              onDeactivate={onDeactivate}
            />
          ))}
        </div>
      </View>
    </div>
  );
}

function StaffUserCreateForm({
  busy,
  onCreate,
}: {
  busy: boolean;
  onCreate: (input: { email: string; safeDisplayName: string; role: StaffRole }) => Promise<void>;
}) {
  const [email, setEmail] = useState("");
  const [safeDisplayName, setSafeDisplayName] = useState("");
  const [role, setRole] = useState<StaffRole>("staff");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await onCreate({ email, safeDisplayName, role });
      setEmail("");
      setSafeDisplayName("");
      setRole("staff");
    } catch (caught) {
      setError(apiErrorText(caught));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="safeRow">
      <View direction="column" gap={3}>
        <Text weight="semibold">Benutzer anlegen</Text>
        <div className="staffAdminFormGrid">
          <FormControl>
            <FormControl.Label>E-Mail/Login</FormControl.Label>
            <TextField name="newUserEmail" value={email} onChange={({ value }) => setEmail(value)} inputAttributes={{ type: "email", autoComplete: "off" }} />
          </FormControl>
          <FormControl>
            <FormControl.Label>Anzeigename</FormControl.Label>
            <TextField name="newUserName" value={safeDisplayName} onChange={({ value }) => setSafeDisplayName(value)} inputAttributes={{ autoComplete: "off" }} />
          </FormControl>
          <FormControl>
            <FormControl.Label>Rolle</FormControl.Label>
            <select className="nativeSelect" value={role} onChange={(event) => setRole(event.currentTarget.value as StaffRole)}>
              <option value="staff">staff</option>
              <option value="admin">admin</option>
            </select>
          </FormControl>
        </div>
        <Button color="primary" onClick={submit} disabled={busy || submitting || !email.trim() || !safeDisplayName.trim()}>
          <span className="buttonLabel">
            <UserPlus aria-hidden />
            {submitting ? "Anlegen laeuft" : "Benutzer anlegen"}
          </span>
        </Button>
        {error && <StateNotice tone="warning" title="Benutzeranlage fehlgeschlagen" body={error} />}
      </View>
    </div>
  );
}

function StaffUserRow({
  busy,
  user,
  onUpdate,
  onResetPassword,
  onDeactivate,
}: {
  busy: boolean;
  user: StaffUser;
  onUpdate: (input: { userId: string; email: string; safeDisplayName: string; role: StaffRole; status: StaffUser["status"] }) => Promise<void>;
  onResetPassword: (user: StaffUser) => Promise<void>;
  onDeactivate: (user: StaffUser) => Promise<void>;
}) {
  const [email, setEmail] = useState(user.email);
  const [safeDisplayName, setSafeDisplayName] = useState(user.safeDisplayName);
  const [role, setRole] = useState<StaffRole>(user.role);
  const [status, setStatus] = useState<StaffUser["status"]>(user.status);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setEmail(user.email);
    setSafeDisplayName(user.safeDisplayName);
    setRole(user.role);
    setStatus(user.status);
    setError(null);
  }, [user]);

  const save = async () => {
    setError(null);
    try {
      await onUpdate({ userId: user.userId, email, safeDisplayName, role, status });
    } catch (caught) {
      setError(apiErrorText(caught));
    }
  };

  const resetPassword = async () => {
    setError(null);
    try {
      await onResetPassword(user);
    } catch (caught) {
      setError(apiErrorText(caught));
    }
  };

  const deactivate = async () => {
    setError(null);
    try {
      await onDeactivate(user);
    } catch (caught) {
      setError(apiErrorText(caught));
    }
  };

  return (
    <div className="staffUserCard">
      <View direction="column" gap={3}>
        <View direction="row" justify="space-between" gap={3} wrap>
          <View direction="column" gap={1}>
            <Text weight="semibold">{user.safeDisplayName}</Text>
            <Text variant="caption-1" color="neutral-faded">
              {user.email} · letzter Login {formatDateTime(user.lastLoginAt)}
            </Text>
          </View>
          <Badge color={user.status === "active" ? "positive" : "warning"} variant="faded">
            {user.status === "active" ? "aktiv" : "deaktiviert"}
          </Badge>
        </View>
        <div className="staffAdminFormGrid">
          <FormControl>
            <FormControl.Label>E-Mail/Login</FormControl.Label>
            <TextField name={`email-${user.userId}`} value={email} onChange={({ value }) => setEmail(value)} inputAttributes={{ type: "email", autoComplete: "off" }} />
          </FormControl>
          <FormControl>
            <FormControl.Label>Anzeigename</FormControl.Label>
            <TextField name={`name-${user.userId}`} value={safeDisplayName} onChange={({ value }) => setSafeDisplayName(value)} inputAttributes={{ autoComplete: "off" }} />
          </FormControl>
          <FormControl>
            <FormControl.Label>Rolle</FormControl.Label>
            <select className="nativeSelect" value={role} onChange={(event) => setRole(event.currentTarget.value as StaffRole)}>
              <option value="staff">staff</option>
              <option value="admin">admin</option>
            </select>
          </FormControl>
          <FormControl>
            <FormControl.Label>Status</FormControl.Label>
            <select className="nativeSelect" value={status} onChange={(event) => setStatus(event.currentTarget.value as StaffUser["status"])}>
              <option value="active">aktiv</option>
              <option value="disabled">deaktiviert</option>
            </select>
          </FormControl>
        </div>
        <View direction="row" gap={3} wrap>
          <Button color="primary" onClick={save} disabled={busy || !email.trim() || !safeDisplayName.trim()}>
            Speichern
          </Button>
          <Button variant="outline" color="neutral" onClick={resetPassword} disabled={busy}>
            <span className="buttonLabel">
              <KeyRound aria-hidden />
              Passwort resetten
            </span>
          </Button>
          <Button variant="outline" color="critical" onClick={deactivate} disabled={busy || user.status === "disabled"}>
            Deaktivieren
          </Button>
        </View>
        <Text variant="caption-1" color="neutral-faded">
          Angelegt {formatDateTime(user.createdAt)} · geaendert {formatDateTime(user.updatedAt)}
        </Text>
        {error && <StateNotice tone="warning" title="Benutzeraktion fehlgeschlagen" body={error} />}
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
  const metadataSummary = auditMetadataSummary(event);

  return (
    <div className="safeRow">
      <View direction="row" justify="space-between" gap={3} wrap>
        <Text weight="semibold">{auditActionLabel(event.action)}</Text>
        <Badge color={event.outcome === "rejected" || event.outcome === "blocked" ? "warning" : "positive"} variant="faded">
          {event.outcome}
        </Badge>
      </View>
      <Text variant="caption-1" color="neutral-faded">
        {formatDateTime(event.occurredAt)} · {auditActorLabel(event)}
      </Text>
      {metadataSummary && (
        <Text variant="body-2" color="neutral-faded">
          {metadataSummary}
        </Text>
      )}
    </div>
  );
}

function Kpi({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
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
    { label: "Request-Typ", value: requestTypeLabel(request) },
    { label: "Status", value: request.staffStatusLabel },
    { label: "Quelle", value: request.source },
    { label: "Schutzklasse", value: request.sensitivity },
    { label: "Kontakt vorhanden", value: request.contactAvailable ? "ja" : "nein" },
    { label: "Mitarbeiterpruefung", value: request.staffReviewRequired ? "ja" : "nein" },
    { label: "Omnia Write", value: request.omniaWriteAllowed ? "ja" : "nein" },
  ];
  const publicRequest = request.publicRequest;
  if (!publicRequest) return rows;

  rows.push({ label: "Dateiupload enthalten", value: publicRequest.boundary.fileUploadIncluded ? "ja" : "nein" });

  if (publicRequest.contact) {
    rows.push({ label: "Kontakt", value: publicRequest.contact.name });
    if (publicRequest.contact.email) rows.push({ label: "E-Mail", value: publicRequest.contact.email });
    if (publicRequest.contact.phone) rows.push({ label: "Telefon", value: publicRequest.contact.phone });
    if (publicRequest.contact.preferredChannel) rows.push({ label: "Kontaktweg", value: publicRequest.contact.preferredChannel });
  }
  if (publicRequest.document) {
    rows.push({ label: "Dokument", value: `${publicRequest.document.fileExtension.toUpperCase()} · ${formatBytes(publicRequest.document.sizeBytes)}` });
    rows.push({ label: "MIME", value: publicRequest.document.mimeType });
    rows.push({ label: "Upload-Modus", value: "nur Metadaten, keine Datei" });
    rows.push({ label: "Dateiname", value: "nicht gespeichert" });
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

function requestTypeLabel(request: Pick<StaffRequestListItem, "requestType" | "kindLabel">) {
  return requestTypeLabels[request.requestType] ?? request.kindLabel;
}

function requestTypeBadgeColor(request: Pick<StaffRequestListItem, "requestType">) {
  if (request.requestType === "document") return "warning";
  if (request.requestType === "appointment") return "primary";
  if (request.requestType === "care") return "positive";
  return "neutral";
}

function nextActionHint(request: StaffRequestListItem) {
  if (request.staffStatus === "completed") return "Erledigt: Vorgang nur noch auditieren oder bei Bedarf intern nachfassen.";
  if (request.staffStatus === "cancelled") return "Abgebrochen: kein weiterer Staff-MVP-Schritt vorgesehen.";
  if (request.staffStatus === "waiting_for_customer") return "Naechster Schritt: Antwort oder Rueckruf des Kunden abwarten und danach erneut pruefen.";
  if (request.requestType === "document") return "Naechster Schritt: Rezept-/Dokumentlage fachlich pruefen; keine Datei wurde uebertragen.";
  if (request.requestType === "appointment") return "Naechster Schritt: Terminwunsch und Kontaktweg pruefen, dann Rueckmeldung vorbereiten.";
  if (request.requestType === "care") return "Naechster Schritt: Bedarf, Rezeptlage und Versorgungsrhythmus pruefen.";
  if (request.requestType === "contact") return "Naechster Schritt: Fachbereich und gewuenschten Antwortweg klaeren.";
  return statusHelpText[request.staffStatus];
}

function statusBadgeColor(status: StaffStatus) {
  if (status === "completed") return "positive";
  if (status === "cancelled" || status === "waiting_for_customer") return "warning";
  if (status === "in_review") return "primary";
  return "neutral";
}

function auditActionLabel(action: string) {
  const labels: Record<string, string> = {
    "public-request-created": "Public Request erstellt",
    "public-request-submitted": "Public Request eingereicht",
    "portal-request-changed": "Staff Status geaendert",
    "portal-request-approved": "Request freigegeben",
    "portal-request-rejected": "Request abgelehnt",
    "portal-login-rate-limited": "Login begrenzt",
  };
  return labels[action] ?? action;
}

function auditActorLabel(event: StaffAuditEvent) {
  const actorStaffUserId = event.metadata.actorStaffUserId;
  const actorId = typeof actorStaffUserId === "string" ? actorStaffUserId : event.actorUserId;
  return actorId ? `${event.actorRole} · ${actorId}` : event.actorRole;
}

function auditMetadataSummary(event: StaffAuditEvent) {
  const previousStaffStatus = metadataText(event.metadata.previousStaffStatus);
  const nextStaffStatus = metadataText(event.metadata.nextStaffStatus);
  if (previousStaffStatus && nextStaffStatus) {
    return `Status: ${statusLabel(previousStaffStatus as StaffStatus, null)} -> ${statusLabel(nextStaffStatus as StaffStatus, null)}`;
  }

  const requestType = metadataText(event.metadata.requestType);
  const sensitivity = metadataText(event.metadata.sensitivity);
  if (requestType && sensitivity) return `Typ: ${requestType} · Schutzklasse: ${sensitivity}`;
  if (requestType) return `Typ: ${requestType}`;
  return undefined;
}

function metadataText(value: string | number | boolean | undefined) {
  if (value === undefined) return undefined;
  return String(value);
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
  if (error instanceof TypeError && /fetch|network|failed/i.test(error.message)) {
    return "Backend nicht erreichbar. Fuer lokale Tests Vite-Proxy oder VITE_PORTAL_BACKEND_URL pruefen.";
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
