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
import { installDesignTokens } from "../../shared/design/saniPepDesignTokens";
import { serverAuthBoundary } from "../../shared/security/accessControl";
import {
  portalApi,
  PortalApiError,
  type CreatePortalRequestInput,
  type PortalDashboardResponse,
  type PortalRequestDto,
  type PortalSessionResponse,
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

const acceptedUploadExtensions = ".pdf,.jpg,.jpeg,.png,.heic,.heif";

function PortalMvpApp() {
  const [session, setSession] = useState<PortalSessionResponse | null>(null);
  const [dashboard, setDashboard] = useState<PortalDashboardResponse | null>(null);
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
          setDashboard(await portalApi.dashboard());
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

  const refreshDashboard = async () => {
    const refreshed = await portalApi.dashboard();
    setDashboard(refreshed);
    return refreshed;
  };

  const handleLogin = async (input: { email: string; password: string }) => {
    setNotice(null);
    const login = await portalApi.login(input);
    setSession(login);
    const nextDashboard = await portalApi.dashboard();
    setDashboard(nextDashboard);
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
    setNotice({
      tone: "neutral",
      title: "Abgemeldet",
      body: "Das Backend hat das Session-Cookie geloescht.",
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
        ) : (
          <PortalDashboard
            session={session}
            dashboard={dashboard}
            onRefresh={refreshDashboard}
            onCreateRequest={handleCreateRequest}
          />
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
  const [email, setEmail] = useState("demo@example.test");
  const [password, setPassword] = useState("demo-passwort");
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
          <View direction="column" gap={1}>
            <Text as="h2" variant="featured-4" weight="semibold">
              Backend Login
            </Text>
            <Text variant="body-2" color="neutral-faded">
              Demo-Zugang: `demo@example.test` mit `demo-passwort`. Die Session kommt vom Backend-Cookie.
            </Text>
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
