export interface JiraTicket {
  id: string;
  key: string;
  summary: string;
  description: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  assignee?: string;
  status: string;
  created: string;
  updated: string;
}

export interface SubTask {
  id: string;
  title: string;
  description: string;
  estimatedComplexity: 'low' | 'medium' | 'high';
  dependencies: string[];
  files: string[];
}

export interface TicketAnalysis {
  ticketId: string;
  summary: string;
  technicalRequirements: string[];
  subTasks: SubTask[];
  estimatedEffort: string;
  risks: string[];
  testingStrategy: string;
}

export interface GeneratedCode {
  filePath: string;
  content: string;
  language: string;
  purpose: string;
}

export interface TestResult {
  passed: boolean;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  errors: string[];
  duration: number;
}

export interface PullRequest {
  number: number;
  url: string;
  title: string;
  body: string;
  branch: string;
  status: 'open' | 'closed' | 'merged';
}

export interface AgentExecution {
  id: string;
  ticketId: string;
  status: 'pending' | 'analyzing' | 'generating' | 'testing' | 'creating_pr' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
  analysis?: TicketAnalysis;
  generatedFiles?: GeneratedCode[];
  testResults?: TestResult;
  pullRequest?: PullRequest;
  error?: string;
  logs: string[];
}

export interface WebhookPayload {
  event: string;
  timestamp: string;
  data: any;
}

export interface JiraWebhookPayload extends WebhookPayload {
  webhookEvent: string;
  issue: JiraTicket;
  user: {
    accountId: string;
    displayName: string;
  };
  changelog?: {
    items: Array<{
      field: string;
      fromString: string;
      toString: string;
    }>;
  };
}

export interface GitHubWebhookPayload extends WebhookPayload {
  action: string;
  pull_request?: {
    number: number;
    state: string;
    title: string;
    user: {
      login: string;
    };
  };
  repository: {
    full_name: string;
  };
}