export interface JiraTicket {
  id: string;
  key: string;
  summary: string;
  description: string;
  priority: string;
  status: string;
  assignee?: {
    accountId: string;
    displayName: string;
    emailAddress: string;
  };
  reporter: {
    accountId: string;
    displayName: string;
  };
  created: string;
  updated: string;
  labels: string[];
  components: Array<{ name: string }>;
}

export interface SubTask {
  id: string;
  title: string;
  description: string;
  type: 'analysis' | 'implementation' | 'testing' | 'documentation';
  estimatedComplexity: 'low' | 'medium' | 'high';
  dependencies: string[];
  files: string[];
}

export interface TicketAnalysis {
  ticketKey: string;
  summary: string;
  complexity: 'low' | 'medium' | 'high' | 'critical';
  estimatedHours: number;
  requiredSkills: string[];
  subtasks: SubTask[];
  technicalApproach: string;
  risks: string[];
  testingStrategy: string;
  affectedComponents: string[];
}

export interface CodeGenerationRequest {
  subtask: SubTask;
  context: {
    ticketAnalysis: TicketAnalysis;
    existingFiles?: Record<string, string>;
    dependencies?: string[];
  };
}

export interface GeneratedCode {
  files: Array<{
    path: string;
    content: string;
    action: 'create' | 'modify' | 'delete';
  }>;
  testFiles: Array<{
    path: string;
    content: string;
  }>;
  dependencies?: Array<{
    name: string;
    version: string;
  }>;
}

export interface TestResult {
  passed: boolean;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  coverage?: number;
  errors?: Array<{
    test: string;
    error: string;
    stack?: string;
  }>;
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
  ticketKey: string;
  status: 'pending' | 'analyzing' | 'generating' | 'testing' | 'creating_pr' | 'completed' | 'failed';
  startedAt: Date;
  completedAt?: Date;
  analysis?: TicketAnalysis;
  generatedCode?: GeneratedCode;
  testResults?: TestResult;
  pullRequest?: PullRequest;
  error?: {
    message: string;
    stack?: string;
    phase: string;
  };
  logs: Array<{
    timestamp: Date;
    level: 'info' | 'warn' | 'error';
    message: string;
    metadata?: Record<string, unknown>;
  }>;
}

export interface WebhookPayload {
  webhookEvent: string;
  timestamp: number;
  issue?: JiraTicket;
  user?: {
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

export interface AgentConfig {
  openaiApiKey: string;
  openaiModel: string;
  jiraBaseUrl: string;
  jiraEmail: string;
  jiraApiToken: string;
  githubToken: string;
  githubOwner: string;
  githubRepo: string;
  maxTokenBudget: number;
  enableAutoMerge: boolean;
  requireReview: boolean;
}