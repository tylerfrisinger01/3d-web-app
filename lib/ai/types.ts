/**
 * Type definitions for AI Agent system
 */

export interface JiraWebhookPayload {
  webhookEvent: string;
  issue?: {
    key: string;
    fields?: {
      summary?: string;
      description?: string;
      project?: {
        key: string;
      };
      assignee?: {
        emailAddress?: string;
        displayName?: string;
      };
    };
  };
  changelog?: {
    items?: Array<{
      field: string;
      toString?: string;
    }>;
  };
}

export interface TicketInfo {
  ticketId: string;
  title: string;
  description: string;
  projectKey: string;
}

export interface Subtask {
  id: string;
  title: string;
  description: string;
  estimatedComplexity: 'low' | 'medium' | 'high';
  dependencies: string[];
}

export interface AnalysisResult {
  summary: string;
  subtasks: Subtask[];
  technicalApproach: string;
  estimatedEffort: string;
  risks: string[];
}

export interface CodeChange {
  filePath: string;
  content: string;
  action: 'create' | 'modify' | 'delete';
}

export interface GeneratedCode {
  changes: CodeChange[];
  commitMessage: string;
  branchName: string;
  testsPassed: boolean;
}

export interface AIAgentConfig {
  openaiApiKey: string;
  githubToken: string;
  jiraApiToken: string;
  jiraEmail: string;
  jiraBaseUrl: string;
  model?: string;
  maxTokens?: number;
}

export interface PullRequest {
  url: string;
  number: number;
  title: string;
  body: string;
}

export interface TestResult {
  passed: boolean;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  output: string;
  errors?: string[];
}