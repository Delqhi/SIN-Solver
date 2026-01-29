/**
 * SIN-Solver Dashboard API - TypeScript Type Definitions
 * 
 * @version 1.0.0
 * @module types
 */

// ============================================================================
// CAPTCHA WORKER TYPES
// ============================================================================

/**
 * Status des Captcha Workers
 */
export type WorkerStatus = 'healthy' | 'degraded' | 'down' | 'maintenance';

/**
 * Status des YOLO-Modells
 */
export type YoloModelStatus = 'trained' | 'not_trained' | 'training' | 'error';

/**
 * Status der OCR-Engine
 */
export type OcrEngineStatus = 'ready' | 'error' | 'initializing';

/**
 * Unterstützte CAPTCHA-Typen
 */
export type CaptchaType = 
  | 'alphanumeric' 
  | 'math' 
  | 'image' 
  | 'slider' 
  | 'click' 
  | 'puzzle';

/**
 * Verwendeter Solver-Typ
 */
export type SolverType = 'yolo' | 'ocr' | 'consensus' | 'ai_vision';

/**
 * Captcha Worker Status Response
 */
export interface CaptchaStatus {
  /** Gesamtstatus des Workers */
  worker_status: WorkerStatus;
  /** Status des YOLO-Modells */
  yolo_model: YoloModelStatus;
  /** Status der OCR-Engine */
  ocr_engine: OcrEngineStatus;
  /** Zeitpunkt der letzten Aktualisierung */
  last_updated: string; // ISO 8601
  /** Version des Captcha Workers */
  version?: string;
  /** Laufzeit in Sekunden */
  uptime_seconds?: number;
  /** Anzahl der wartenden Aufgaben */
  queue_depth?: number;
  /** Aktuell laufende Lösungen */
  active_solves?: number;
}

/**
 * Optionen für CAPTCHA-Lösung
 */
export interface CaptchaSolveOptions {
  /** Timeout in Sekunden (5-120, default: 30) */
  timeout?: number;
  /** Minimale Konfidenz für Akzeptanz (0-1, default: 0.8) */
  confidence_threshold?: number;
  /** Anzahl der Wiederholungsversuche (0-5, default: 2) */
  retry_count?: number;
}

/**
 * Request zum Lösen eines CAPTCHA
 */
export interface CaptchaSolveRequest {
  /** Base64-kodiertes CAPTCHA-Bild (max 10MB) */
  image: string;
  /** Typ des CAPTCHA */
  type: CaptchaType;
  /** Zusätzliche Optionen */
  options?: CaptchaSolveOptions;
}

/**
 * Alternative Lösung (bei niedriger Konfidenz)
 */
export interface CaptchaAlternative {
  /** Alternative Lösung */
  result: string;
  /** Konfidenz-Score */
  confidence: number;
}

/**
 * Ergebnis einer CAPTCHA-Lösung
 */
export interface CaptchaResult {
  /** Ob die Lösung erfolgreich war */
  success: boolean;
  /** Die erkannte Lösung */
  result: string;
  /** Konfidenz-Score (0-1) */
  confidence: number;
  /** Verarbeitungszeit in Millisekunden */
  processing_time_ms: number;
  /** Verwendeter Solver */
  solver_type?: SolverType;
  /** Version des verwendeten Modells */
  model_version?: string;
  /** Alternative Lösungen */
  alternatives?: CaptchaAlternative[];
}

/**
 * Stündliche Statistik
 */
export interface HourlyStat {
  /** Stunde im Format "HH:00" */
  hour: string;
  /** Anzahl gelöster CAPTCHAs */
  count: number;
  /** Erfolgsrate */
  success_rate: number;
}

/**
 * CAPTCHA Statistiken
 */
export interface CaptchaStats {
  /** Heute gelöste CAPTCHAs */
  today_solved: number;
  /** Insgesamt gelöste CAPTCHAs */
  total_solved: number;
  /** Erfolgsrate (0-1) */
  success_rate: number;
  /** Durchschnittliche Lösungszeit in ms */
  avg_time_ms: number;
  /** Aufschlüsselung nach Typ */
  by_type?: Record<CaptchaType, number>;
  /** Aufschlüsselung nach Stunde */
  by_hour?: HourlyStat[];
}

/**
 * Informationen zu einem CAPTCHA-Typ
 */
export interface CaptchaTypeInfo {
  /** Typ-Identifikator */
  type: CaptchaType;
  /** Anzeigename */
  display_name: string;
  /** Beschreibung */
  description: string;
  /** Ob der Typ unterstützt wird */
  supported: boolean;
  /** Durchschnittliche Konfidenz */
  avg_confidence?: number;
  /** Durchschnittliche Zeit in ms */
  avg_time_ms?: number;
}

/**
 * Liste der CAPTCHA-Typen
 */
export interface CaptchaTypesResponse {
  types: CaptchaTypeInfo[];
}

// ============================================================================
// WORKFLOW TYPES
// ============================================================================

/**
 * Workflow-Komplexität
 */
export type WorkflowComplexity = 'low' | 'medium' | 'high';

/**
 * Workflow-Status
 */
export type WorkflowStatus = 'running' | 'error' | 'completed' | 'paused' | 'draft';

/**
 * Trigger-Typ für Workflows
 */
export type WorkflowTriggerType = 'webhook' | 'schedule' | 'manual' | 'event';

/**
 * Kontext für Workflow-Generierung
 */
export interface WorkflowGenerateContext {
  /** Art des Triggers */
  trigger_type?: WorkflowTriggerType;
  /** Erforderliche Nodes */
  required_nodes?: string[];
  /** Zielsystem */
  target_system?: string;
  /** ID eines bestehenden Workflows als Basis */
  existing_workflow_id?: string;
}

/**
 * Request zur Workflow-Generierung
 */
export interface WorkflowGenerateRequest {
  /** Beschreibung des gewünschten Workflows */
  prompt: string;
  /** Zusätzlicher Kontext */
  context?: WorkflowGenerateContext;
}

/**
 * Response der Workflow-Generierung
 */
export interface WorkflowGenerateResponse {
  /** Eindeutige Workflow-ID */
  workflow_id: string;
  /** Der generierte n8n Workflow */
  workflow_json: Workflow;
  /** Direktlink zum Workflow in n8n */
  n8n_url?: string;
  /** Geschätzte Komplexität */
  estimated_complexity: WorkflowComplexity;
  /** Zeitpunkt der Generierung */
  generated_at: string;
  /** Verwendetes AI-Modell */
  ai_model_used?: string;
}

/**
 * Request zur Workflow-Korrektur
 */
export interface WorkflowCorrectRequest {
  /** Fehler-Log oder Beschreibung des Problems */
  error_log: string;
  /** Spezifische Anweisungen zur Korrektur */
  correction_prompt?: string;
  /** Nodes die erhalten bleiben sollen */
  preserve_nodes?: string[];
}

/**
 * Response der Workflow-Korrektur
 */
export interface WorkflowCorrectResponse {
  /** Der korrigierte Workflow */
  corrected_workflow: Workflow;
  /** Liste der durchgeführten Änderungen */
  changes_made: string[];
  /** Konfidenz der Korrektur (0-1) */
  confidence: number;
  /** Korrektur-ID */
  correction_id?: string;
  /** Erklärung der Korrekturen */
  explanation?: string;
}

/**
 * Position eines Workflow-Nodes
 */
export interface WorkflowNodePosition {
  x: number;
  y: number;
}

/**
 * Einzelner Workflow-Node
 */
export interface WorkflowNode {
  /** Eindeutige Node-ID */
  id: string;
  /** Node-Typ (n8n-node-type) */
  type: string;
  /** Anzeigename */
  name: string;
  /** Node-Parameter */
  parameters?: Record<string, unknown>;
  /** Position im Canvas [x, y] */
  position?: [number, number];
  /** Node-Version */
  typeVersion?: number;
}

/**
 * Workflow-Verbindung
 */
export interface WorkflowConnection {
  /** Quell-Node-ID */
  node: string;
  /** Ausgabe-Index */
  type: string;
  /** Ziel-Node-ID */
  index: number;
}

/**
 * Workflow-Verbindungen
 */
export interface WorkflowConnections {
  [nodeId: string]: {
    [connectionType: string]: WorkflowConnection[][];
  };
}

/**
 * Workflow-Einstellungen
 */
export interface WorkflowSettings {
  /** Ausführungs-Reihenfolge */
  executionOrder?: 'v1' | 'v2';
  /** Fehler-Verhalten */
  errorWorkflow?: string;
  /** Zeitlimit */
  executionTimeout?: number;
  /** Speicherlimit */
  executionTimeoutMax?: number;
  /** Speicher für Ausführung */
  saveDataErrorExecution?: 'all' | 'none';
  /** Speicher für erfolgreiche Ausführung */
  saveDataSuccessExecution?: 'all' | 'none';
}

/**
 * Vollständiger Workflow
 */
export interface Workflow {
  /** Eindeutige ID */
  id: string;
  /** Workflow-Name */
  name: string;
  /** Beschreibung */
  description?: string;
  /** Workflow-Nodes */
  nodes: WorkflowNode[];
  /** Verbindungen zwischen Nodes */
  connections: WorkflowConnections;
  /** Workflow-Einstellungen */
  settings?: WorkflowSettings;
  /** Tags */
  tags?: string[];
  /** Erstellungszeitpunkt */
  created_at?: string;
  /** Letzte Aktualisierung */
  updated_at?: string;
  /** Anzahl der Ausführungen */
  execution_count?: number;
  /** Letzte Ausführung */
  last_execution?: string;
}

/**
 * Zusammenfassung eines Workflows (für Listen)
 */
export interface WorkflowSummary {
  /** Workflow-ID */
  id: string;
  /** Workflow-Name */
  name: string;
  /** Aktueller Status */
  status: WorkflowStatus;
  /** Letzte Ausführung */
  last_run?: string;
  /** Anzahl der Ausführungen */
  execution_count?: number;
  /** Fehlermeldung (bei Status error) */
  error_message?: string;
}

/**
 * Liste aktiver Workflows
 */
export interface ActiveWorkflowsResponse {
  workflows: WorkflowSummary[];
  total: number;
}

/**
 * Workflow-Ausführungs-Request
 */
export interface WorkflowExecuteRequest {
  /** Eingabedaten für den Workflow */
  data?: Record<string, unknown>;
}

/**
 * Workflow-Ausführungs-Response
 */
export interface WorkflowExecuteResponse {
  /** Ausführungs-ID */
  execution_id: string;
  /** Status der Ausführung */
  status: 'queued' | 'running';
}

// ============================================================================
// CHAT TYPES
// ============================================================================

/**
 * Chat-Rolle
 */
export type ChatRole = 'user' | 'assistant' | 'system';

/**
 * Typ einer Chat-Aktion
 */
export type ChatActionType = 
  | 'fix_workflow' 
  | 'view_workflow' 
  | 'create_workflow' 
  | 'run_workflow' 
  | 'open_docs' 
  | 'execute_command';

/**
 * Workflow-Kontext für Chat
 */
export interface ChatWorkflowContext {
  /** Workflow-ID */
  id: string;
  /** Workflow-Name */
  name: string;
  /** Aktueller Status */
  status: WorkflowStatus;
}

/**
 * Kontext für Chat-Nachricht
 */
export interface ChatMessageContext {
  /** Verfügbare Workflows */
  workflows?: ChatWorkflowContext[];
  /** Aktuelle Seite */
  current_page?: string;
  /** Ausgewählter Workflow */
  selected_workflow?: string;
}

/**
 * Request zum Senden einer Chat-Nachricht
 */
export interface ChatMessageRequest {
  /** Die Nachricht des Benutzers */
  message: string;
  /** Eindeutige Session-ID */
  session_id: string;
  /** Zusätzlicher Kontext */
  context?: ChatMessageContext;
}

/**
 * Chat-Aktion
 */
export interface ChatAction {
  /** Typ der Aktion */
  type: ChatActionType;
  /** Betroffene Workflow-ID */
  workflow_id?: string;
  /** Beschreibung der Aktion */
  description?: string;
  /** Zusätzliche Parameter */
  parameters?: Record<string, unknown>;
}

/**
 * Response auf eine Chat-Nachricht
 */
export interface ChatMessageResponse {
  /** Die AI-Antwort */
  message: string;
  /** Ausführbare Aktionen */
  actions?: ChatAction[];
  /** Vorgeschlagene nächste Schritte */
  suggestions?: string[];
  /** Konfidenz der Antwort (0-1) */
  confidence?: number;
  /** Verarbeitungszeit in ms */
  processing_time_ms?: number;
  /** Verwandte Workflows */
  related_workflows?: string[];
}

/**
 * Einzelne Chat-Nachricht
 */
export interface ChatMessage {
  /** Rolle (user/assistant/system) */
  role: ChatRole;
  /** Nachrichteninhalt */
  content: string;
  /** Zeitstempel */
  timestamp: string;
  /** Ausführbare Aktionen (nur bei assistant) */
  actions?: ChatAction[];
  /** Metadaten */
  metadata?: Record<string, unknown>;
}

/**
 * Chat-Verlauf Response
 */
export interface ChatHistoryResponse {
  /** Session-ID */
  session_id: string;
  /** Nachrichten */
  messages: ChatMessage[];
  /** Ob weitere Nachrichten verfügbar */
  has_more: boolean;
}

/**
 * Chat-Session Info
 */
export interface ChatSession {
  /** Session-ID */
  session_id: string;
  /** Erstellungszeitpunkt */
  created_at: string;
  /** Zeitpunkt der letzten Nachricht */
  last_message_at?: string;
  /** Anzahl der Nachrichten */
  message_count: number;
}

/**
 * Liste der Chat-Sessions
 */
export interface ChatSessionsResponse {
  sessions: ChatSession[];
}

// ============================================================================
// SYSTEM TYPES
// ============================================================================

/**
 * Service-Status
 */
export type ServiceStatus = 'healthy' | 'degraded' | 'unhealthy';

/**
 * System-Service Status
 */
export interface SystemServiceStatus {
  /** Status des Services */
  status: ServiceStatus;
  /** Latenz in ms */
  latency_ms?: number;
  /** Zusätzliche Nachricht */
  message?: string;
}

/**
 * System Health Response
 */
export interface SystemHealth {
  /** Gesamtstatus */
  status: ServiceStatus;
  /** API-Version */
  version?: string;
  /** Zeitstempel */
  timestamp: string;
  /** Laufzeit in Sekunden */
  uptime_seconds?: number;
  /** Status einzelner Services */
  services: Record<string, SystemServiceStatus>;
}

/**
 * Einfacher Health-Check Response
 */
export interface HealthCheckResponse {
  /** Status */
  status: ServiceStatus;
  /** Zeitstempel */
  timestamp: string;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

/**
 * API-Fehler-Codes
 */
export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'RATE_LIMITED'
  | 'CAPTCHA_TIMEOUT'
  | 'CAPTCHA_UNRECOGNIZED'
  | 'CAPTCHA_UNSUPPORTED'
  | 'WORKFLOW_GENERATION_FAILED'
  | 'WORKFLOW_CORRECTION_FAILED'
  | 'SERVICE_UNAVAILABLE'
  | 'INTERNAL_ERROR';

/**
 * API-Fehler
 */
export interface ApiError {
  /** Fehler-Code */
  code: ApiErrorCode;
  /** Fehler-Nachricht */
  message: string;
  /** Zusätzliche Details */
  details?: Record<string, unknown>;
  /** Request-ID für Debugging */
  request_id?: string;
}

/**
 * API-Error Response
 */
export interface ApiErrorResponse {
  success: false;
  error: ApiError;
}

// ============================================================================
// SYSTEM EVENT TYPES
// ============================================================================

/**
 * Typ eines System-Events
 */
export type SystemEventType =
  | 'captcha.solved'
  | 'captcha.failed'
  | 'workflow.created'
  | 'workflow.updated'
  | 'workflow.deleted'
  | 'workflow.executed'
  | 'workflow.execution_failed'
  | 'chat.message_received'
  | 'chat.session_created'
  | 'system.health_changed'
  | 'system.maintenance_started'
  | 'system.maintenance_ended';

/**
 * System-Event
 */
export interface SystemEvent {
  /** Eindeutige Event-ID */
  id: string;
  /** Event-Typ */
  type: SystemEventType;
  /** Zeitstempel */
  timestamp: string;
  /** Event-Payload */
  payload: SystemEventPayload;
  /** Benutzer-ID (falls zutreffend) */
  user_id?: string;
  /** Session-ID (falls zutreffend) */
  session_id?: string;
}

/**
 * System-Event Payload (Discriminated Union)
 */
export type SystemEventPayload =
  | CaptchaSolvedEvent
  | CaptchaFailedEvent
  | WorkflowCreatedEvent
  | WorkflowExecutedEvent
  | ChatMessageReceivedEvent
  | SystemHealthChangedEvent;

/**
 * CAPTCHA gelöst Event
 */
export interface CaptchaSolvedEvent {
  task_id: string;
  type: CaptchaType;
  result: string;
  confidence: number;
  processing_time_ms: number;
}

/**
 * CAPTCHA fehlgeschlagen Event
 */
export interface CaptchaFailedEvent {
  task_id: string;
  type: CaptchaType;
  error_code: ApiErrorCode;
  error_message: string;
}

/**
 * Workflow erstellt Event
 */
export interface WorkflowCreatedEvent {
  workflow_id: string;
  name: string;
  complexity: WorkflowComplexity;
  generated_by_ai: boolean;
}

/**
 * Workflow ausgeführt Event
 */
export interface WorkflowExecutedEvent {
  workflow_id: string;
  execution_id: string;
  status: 'success' | 'error';
  execution_time_ms?: number;
  error_message?: string;
}

/**
 * Chat-Nachricht erhalten Event
 */
export interface ChatMessageReceivedEvent {
  session_id: string;
  message_id: string;
  role: ChatRole;
  has_actions: boolean;
}

/**
 * System-Health geändert Event
 */
export interface SystemHealthChangedEvent {
  previous_status: ServiceStatus;
  current_status: ServiceStatus;
  affected_services: string[];
  message: string;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Paginierte Response
 */
export interface PaginatedResponse<T> {
  /** Daten */
  data: T[];
  /** Gesamtanzahl */
  total: number;
  /** Aktuelle Seite */
  page: number;
  /** Anzahl pro Seite */
  per_page: number;
  /** Ob weitere Seiten existieren */
  has_more: boolean;
}

/**
 * API-Response Wrapper
 */
export interface ApiResponse<T> {
  /** Erfolg */
  success: boolean;
  /** Daten */
  data: T;
  /** Zeitstempel */
  timestamp: string;
  /** Request-ID */
  request_id: string;
}

/**
 * Rate Limit Info
 */
export interface RateLimitInfo {
  /** Limit */
  limit: number;
  /** Verbleibend */
  remaining: number;
  /** Reset-Zeitpunkt (Unix-Timestamp) */
  reset: number;
  /** Retry-After (Sekunden) */
  retry_after?: number;
}

// ============================================================================
// EXPORT ALL TYPES
// ============================================================================

export * from './types';