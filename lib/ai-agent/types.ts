/**
 * Type definitions for AI Software Engineer Agent
 */

export interface JiraWebhookPayload {
  webhookEvent: string;
  issue: {
    key: string;
    fields: {
      summary: string;
      description?: string;
      priority?: {
        name: string;
      };
      labels?: string[];
      project: {
        key: string;
      };
      issuetype: {
        name: string;
      };
      assignee?: {
        emailAddress: string;
        displayName: string;
      };
    };
  };
  changelog?: {
    items?: Array<{
      field: string;
      toString?: string;
      to?: string;
      fromString?: string;
      from?: string;
    }>;
  };
}

export interface TicketAssignmentEvent {
  ticketId: string;
  ticketUrl: string;
  title: string;
  description: string;
  priority: string;
  labels: string[];
  assignee: string;
  projectKey: string;
  issueType: string;
  timestamp: string;
}

export interface AIAgentConfig {
  ticketEvent: TicketAssignmentEvent;
  githubToken: string;
  openaiApiKey: string;
  jiraBaseUrl: string;
  jiraEmail: string;
  jiraApiToken: string;
}

export interface TicketAnalysis {
  summary: string;
  complexity: 'low' | 'medium' | 'high' | 'critical';
  estimatedHours: number;
  requiredSkills: string[];
  dependencies: string[];
  risks: string[];
  subtasks: Subtask[];
}

export interface Subtask {
  id: string;
  title: string;
  description: string;
  type: 'research' | 'implementation' | 'testing' | 'documentation';
  estimatedMinutes: number;
  dependencies: string[];
  files: string[];
}

export interface CodeGenerationRequest {
  subtask: Subtask;
  context: {
    ticketDescription: string;
    relatedFiles: string[];
    codebaseContext: string;
  };
}

export interface GeneratedCode {
  files: GeneratedFile[];
  testFiles: GeneratedFile[];
  summary: string;
  warnings: string[];
}

export interface GeneratedFile {
  path: string;
  content: string;
  language: string;
  operation: 'create' | 'modify' | 'delete';
}

export interface TestResult {
  passed: boolean;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  errors: TestError[];
  coverage?: {
    lines: number;
    statements: number;
    functions: number;
    branches: number;
  };
}

export interface TestError {
  testName: string;
  error: string;
  stack?: string;
}

export interface PullRequest {
  url: string;
  number: number;
  title: string;
  body: string;
  branch: string;
  baseBranch: string;
}

export interface AgentState {
  ticketId: string;
  status: 'analyzing' | 'planning' | 'implementing' | 'testing' | 'reviewing' | 'completed' | 'failed';
  currentSubtask?: string;
  analysis?: TicketAnalysis;
  generatedCode?: GeneratedCode;
  testResults?: TestResult;
  pullRequest?: PullRequest;
  errors: string[];
  startedAt: string;
  completedAt?: string;
  tokenUsage: {
    prompt: number;
    completion: number;
    total: number;
  };
}

export interface GitHubPROptions {
  owner: string;
  repo: string;
  title: string;
  body: string;
  head: string;
  base: string;
  draft?: boolean;
}

export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenAIResponse {
  content: string;
  tokenUsage: {
    prompt: number;
    completion: number;
    total: number;
  };
}