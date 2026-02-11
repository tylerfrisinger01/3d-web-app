import OpenAI from 'openai';
import { Octokit } from '@octokit/rest';
import axios from 'axios';

interface JiraConfig {
  host: string;
  email: string;
  apiToken: string;
}

interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
}

interface AIAgentConfig {
  openaiApiKey: string;
  jiraConfig: JiraConfig;
  githubConfig: GitHubConfig;
}

interface TicketData {
  key: string;
  summary: string;
  description: string;
  issueType: string;
  priority?: string;
  labels: string[];
  components: string[];
}

interface TicketAnalysis {
  complexity: 'low' | 'medium' | 'high';
  estimatedHours: number;
  requiredSkills: string[];
  dependencies: string[];
  risks: string[];
  recommendations: string[];
}

interface Subtask {
  title: string;
  description: string;
  estimatedHours: number;
  order: number;
}

interface ImplementationPlan {
  approach: string;
  filesToModify: string[];
  filesToCreate: string[];
  testingStrategy: string;
  steps: string[];
}

interface CodeChange {
  path: string;
  content: string;
  action: 'create' | 'modify' | 'delete';
}

interface TestResults {
  success: boolean;
  errors: string[];
  output: string;
}

export class AIAgent {
  private openai: OpenAI;
  private octokit: Octokit;
  private jiraConfig: JiraConfig;
  private githubConfig: GitHubConfig;

  constructor(config: AIAgentConfig) {
    this.openai = new OpenAI({ apiKey: config.openaiApiKey });
    this.octokit = new Octokit({ auth: config.githubConfig.token });
    this.jiraConfig = config.jiraConfig;
    this.githubConfig = config.githubConfig;
  }

  /**
   * Analyze ticket using GPT-4o
   */
  async analyzeTicket(ticket: TicketData): Promise<TicketAnalysis> {
    const prompt = `Analyze this software development ticket and provide a detailed assessment:

Ticket: ${ticket.key}
Summary: ${ticket.summary}
Description: ${ticket.description}
Type: ${ticket.issueType}
Priority: ${ticket.priority || 'Not specified'}
Labels: ${ticket.labels.join(', ') || 'None'}
Components: ${ticket.components.join(', ') || 'None'}

Provide analysis in JSON format with:
- complexity (low/medium/high)
- estimatedHours (number)
- requiredSkills (array of strings)
- dependencies (array of strings)
- risks (array of strings)
- recommendations (array of strings)`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are an expert software architect analyzing development tickets. Provide detailed, actionable analysis in JSON format.',
        },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const analysis = JSON.parse(response.choices[0].message.content || '{}');
    return analysis as TicketAnalysis;
  }

  /**
   * Create subtasks based on ticket analysis
   */
  async createSubtasks(ticket: TicketData, analysis: TicketAnalysis): Promise<Subtask[]> {
    const prompt = `Based on this ticket and analysis, break it down into specific subtasks:

Ticket: ${ticket.key} - ${ticket.summary}
Description: ${ticket.description}
Complexity: ${analysis.complexity}
Estimated Hours: ${analysis.estimatedHours}

Create 3-7 subtasks that are:
- Specific and actionable
- Ordered logically
- Include time estimates
- Cover implementation, testing, and documentation

Return JSON array with: title, description, estimatedHours, order`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a project manager breaking down development work into subtasks. Return JSON array format.',
        },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.4,
    });

    const result = JSON.parse(response.choices[0].message.content || '{"subtasks":[]}');
    return result.subtasks as Subtask[];
  }

  /**
   * Generate implementation plan
   */
  async generateImplementationPlan(
    ticket: TicketData,
    analysis: TicketAnalysis,
    subtasks: Subtask[]
  ): Promise<ImplementationPlan> {
    const prompt = `Create a detailed implementation plan for this ticket:

Ticket: ${ticket.key} - ${ticket.summary}
Description: ${ticket.description}
Complexity: ${analysis.complexity}

Subtasks:
${subtasks.map((st, i) => `${i + 1}. ${st.title}`).join('\n')}

Provide implementation plan in JSON format with:
- approach (overall strategy)
- filesToModify (array of file paths)
- filesToCreate (array of file paths)
- testingStrategy (description)
- steps (array of implementation steps)`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a senior software engineer creating implementation plans. Be specific about files and steps.',
        },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const plan = JSON.parse(response.choices[0].message.content || '{}');
    return plan as ImplementationPlan;
  }

  /**
   * Generate code changes
   */
  async generateCode(ticket: TicketData, plan: ImplementationPlan): Promise<CodeChange[]> {
    const codeChanges: CodeChange[] = [];

    // Get existing files content for modification
    const existingFiles = await this.getExistingFiles(plan.filesToModify);

    const prompt = `Generate complete code implementation for this ticket:

Ticket: ${ticket.key} - ${ticket.summary}
Description: ${ticket.description}

Implementation Plan:
${plan.approach}

Files to create: ${plan.filesToCreate.join(', ')}
Files to modify: ${plan.filesToModify.join(', ')}

Steps:
${plan.steps.map((step, i) => `${i + 1}. ${step}`).join('\n')}

Existing files content:
${existingFiles.map(f => `### FILE: ${f.path}\n\`\`\`\n${f.content}\n\`\`\``).join('\n\n')}

Generate COMPLETE file contents for all files (both new and modified).
Use this EXACT format:

### FILE: path/to/file.ts
\`\`\`
// Complete file content
\`\`\`

Include proper error handling, TypeScript types, comments, and follow best practices.`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are an expert software engineer. Generate production-ready code with proper error handling, types, and documentation.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
      max_tokens: 16000,
    });

    const generatedCode = response.choices[0].message.content || '';

    // Parse generated code
    const fileRegex = /### FILE: (.+?)\n