export enum TicketStatus {
  PENDING = 'pending',
  ANALYZING = 'analyzing',
  PLANNING = 'planning',
  GENERATING = 'generating',
  TESTING = 'testing',
  CREATING_PR = 'creating_pr',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum TicketSeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

export interface JiraTicket {
  id: string;
  key: string;
  summary: string;
  description: string;
  priority: string;
  assignee?: string;
  status: string;
  labels: string[];
  created: string;
  updated: string;
}

export interface TicketAnalysis {
  ticketId: string;
  severity: TicketSeverity;
  complexity: 'simple' | 'moderate' | 'complex';
  estimatedTime: number; // in minutes
  requiredFiles: string[];
  dependencies: string[];
  risks: string[];
  subtasks: SubTask[];
  reasoning: string;
}

export interface SubTask {
  id: string;
  title: string;
  description: string;
  order: number;
  estimatedTime: number;
  dependencies: string[];
}

export interface GeneratedCode {
  filePath: string;
  content: string;
  language: string;
  action: 'create' | 'modify' | 'delete';
}

export interface TestResult {
  passed: boolean;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  duration: number;
  failures: TestFailure[];
  coverage?: CoverageReport;
}

export interface TestFailure {
  testName: string;
  error: string;
  stackTrace: string;
}

export interface CoverageReport {
  lines: number;
  statements: number;
  functions: number;
  branches: number;
}

export interface PullRequest {
  number: number;
  url: string;
  title: string;
  body: string;
  branch: string;
  baseBranch: string;
}

export interface AgentExecution {
  id: string;
  ticketId: string;
  ticketKey: string;
  status: TicketStatus;
  analysis?: TicketAnalysis;
  generatedCode?: GeneratedCode[];
  testResults?: TestResult;
  pullRequest?: PullRequest;
  error?: string;
  startedAt: Date;
  completedAt?: Date;
  logs: AgentLog[];
}

export interface AgentLog {
  timestamp: Date;
  level: 'info' | 'warn' | 'error';
  message: string;
  metadata?: Record<string, unknown>;
}

export interface WebhookPayload {
  webhookEvent: string;
  timestamp: string;
  issue?: JiraTicket;
  user?: {
    accountId: string;
    displayName: string;
  };
}

export interface GitHubWebhookPayload {
  action: string;
  issue?: {
    number: number;
    title: string;
    body: string;
    labels: Array<{ name: string }>;
  };
  pull_request?: {
    number: number;
    title: string;
    state: string;
  };
  repository: {
    full_name: string;
  };
}