import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

export interface Ticket {
  id: string;
  title: string;
  description: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  labels?: string[];
  assignee?: string;
}

export interface Subtask {
  id: string;
  title: string;
  description: string;
  estimatedComplexity: 'simple' | 'moderate' | 'complex';
  dependencies: string[];
  files: string[];
}

export interface TicketAnalysis {
  summary: string;
  complexity: 'simple' | 'moderate' | 'complex';
  estimatedEffort: string;
  requiredSkills: string[];
  risks: string[];
  subtasks: Subtask[];
}

export interface CodeGeneration {
  files: Array<{
    path: string;
    content: string;
    action: 'create' | 'modify' | 'delete';
  }>;
  testFiles: Array<{
    path: string;
    content: string;
  }>;
  summary: string;
}

export interface AgentConfig {
  aiProvider: 'openai' | 'anthropic';
  apiKey: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export class AIAgentService {
  private openai?: OpenAI;
  private anthropic?: Anthropic;
  private config: AgentConfig;

  constructor(config: AgentConfig) {
    this.config = {
      model: config.aiProvider === 'openai' ? 'gpt-4o' : 'claude-3-5-sonnet-20241022',
      maxTokens: 200000,
      temperature: 0.7,
      ...config,
    };

    if (config.aiProvider === 'openai') {
      this.openai = new OpenAI({ apiKey: config.apiKey });
    } else {
      this.anthropic = new Anthropic({ apiKey: config.apiKey });
    }
  }

  /**
   * Analyzes a ticket and breaks it down into subtasks
   */
  async analyzeTicket(ticket: Ticket): Promise<TicketAnalysis> {
    const prompt = this.buildTicketAnalysisPrompt(ticket);
    
    try {
      const response = await this.callAI(prompt);
      return this.parseTicketAnalysis(response);
    } catch (error) {
      throw new Error(`Failed to analyze ticket: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generates code for a specific subtask
   */
  async generateCode(
    ticket: Ticket,
    subtask: Subtask,
    context?: string
  ): Promise<CodeGeneration> {
    const prompt = this.buildCodeGenerationPrompt(ticket, subtask, context);
    
    try {
      const response = await this.callAI(prompt);
      return this.parseCodeGeneration(response);
    } catch (error) {
      throw new Error(`Failed to generate code: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Reviews generated code and suggests improvements
   */
  async reviewCode(
    code: CodeGeneration,
    ticket: Ticket
  ): Promise<{
    approved: boolean;
    suggestions: string[];
    issues: Array<{ severity: 'low' | 'medium' | 'high'; description: string }>;
  }> {
    const prompt = this.buildCodeReviewPrompt(code, ticket);
    
    try {
      const response = await this.callAI(prompt);
      return this.parseCodeReview(response);
    } catch (error) {
      throw new Error(`Failed to review code: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generates a pull request description
   */
  async generatePRDescription(
    ticket: Ticket,
    codeChanges: CodeGeneration
  ): Promise<string> {
    const prompt = `Generate a comprehensive pull request description for the following ticket and code changes:

Ticket: ${ticket.title}
Description: ${ticket.description}

Files Changed:
${codeChanges.files.map(f => `- ${f.action.toUpperCase()}: ${f.path}`).join('\n')}

Summary: ${codeChanges.summary}

Generate a PR description that includes:
1. Overview of changes
2. What was implemented
3. Testing approach
4. Any breaking changes or migration notes
5. Related ticket reference

Format it in Markdown.`;

    try {
      const response = await this.callAI(prompt);
      return response.trim();
    } catch (error) {
      throw new Error(`Failed to generate PR description: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calls the configured AI provider
   */
  private async callAI(prompt: string): Promise<string> {
    if (this.config.aiProvider === 'openai' && this.openai) {
      const response = await this.openai.chat.completions.create({
        model: this.config.model!,
        messages: [
          {
            role: 'system',
            content: 'You are an expert software engineer AI assistant. Provide detailed, accurate, and actionable responses.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
      });

      return response.choices[0]?.message?.content || '';
    } else if (this.config.aiProvider === 'anthropic' && this.anthropic) {
      const response = await this.anthropic.messages.create({
        model: this.config.model!,
        max_tokens: this.config.maxTokens!,
        temperature: this.config.temperature,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const content = response.content[0];
      return content.type === 'text' ? content.text : '';
    }

    throw new Error('AI provider not configured');
  }

  /**
   * Builds the prompt for ticket analysis
   */
  private buildTicketAnalysisPrompt(ticket: Ticket): string {
    return `Analyze the following software development ticket and break it down into actionable subtasks:

Ticket ID: ${ticket.id}
Title: ${ticket.title}
Description: ${ticket.description}
Priority: ${ticket.priority || 'medium'}
Labels: ${ticket.labels?.join(', ') || 'none'}

Please provide a JSON response with the following structure:
{
  "summary": "Brief summary of what needs to be done",
  "complexity": "simple|moderate|complex",
  "estimatedEffort": "Estimated time (e.g., '2-4 hours', '1-2 days')",
  "requiredSkills": ["skill1", "skill2"],
  "risks": ["potential risk 1", "potential risk 2"],
  "subtasks": [
    {
      "id": "subtask-1",
      "title": "Subtask title",
      "description": "Detailed description",
      "estimatedComplexity": "simple|moderate|complex",
      "dependencies": ["subtask-id-this-depends-on"],
      "files": ["path/to/file1.ts", "path/to/file2.ts"]
    }
  ]
}

Ensure subtasks are:
1. Atomic and independently testable
2. Ordered by dependencies
3. Include specific file paths that need to be created/modified
4. Have clear acceptance criteria in the description`;
  }

  /**
   * Builds the prompt for code generation
   */
  private buildCodeGenerationPrompt(
    ticket: Ticket,
    subtask: Subtask,
    context?: string
  ): string {
    return `Generate complete, production-ready code for the following subtask:

Ticket: ${ticket.title}
Ticket Description: ${ticket.description}

Subtask: ${subtask.title}
Subtask Description: ${subtask.description}
Files to modify/create: ${subtask.files.join(', ')}

${context ? `Additional Context:\n${context}\n` : ''}

Requirements:
1. Generate complete file contents (not snippets)
2. Include proper error handling
3. Add TypeScript types where applicable
4. Follow best practices and design patterns
5. Include comments for complex logic
6. For EVERY file you create or modify, also generate a corresponding test file
7. Use Vitest for testing with React Testing Library for components

Return the response in this EXACT format:

### FILE: path/to/file1.ts
\`\`\`typescript
// Complete file content
\`\`\`

### FILE: path/to/file1.test.ts
\`\`\`typescript
// Complete test file content using Vitest
\`\`\`

### SUMMARY
Brief summary of changes made

IMPORTANT: Use exactly "### FILE: " followed by the path, then code in triple backticks.`;
  }

  /**
   * Builds the prompt for code review
   */
  private buildCodeReviewPrompt(code: CodeGeneration, ticket: Ticket): string {
    const filesContent = code.files
      .map(f => `### ${f.path} (${f.action})\n\`\`\`\n${f.content}\n\`\`\``)
      .join('\n\n');

    return `Review the following code changes for the ticket:

Ticket: ${ticket.title}
Description: ${ticket.description}

Code Changes:
${filesContent}

Test Files:
${code.testFiles.map(f => `### ${f.path}\n\`\`\`\n${f.content}\n\`\`\``).join('\n\n')}

Provide a JSON response with:
{
  "approved": true/false,
  "suggestions": ["suggestion 1", "suggestion 2"],
  "issues": [
    {
      "severity": "low|medium|high",
      "description": "Issue description"
    }
  ]
}

Check for:
1. Code quality and best practices
2. Security vulnerabilities
3. Performance issues
4. Test coverage
5. Error handling
6. Type safety
7. Documentation`;
  }

  /**
   * Parses the ticket analysis response
   */
  private parseTicketAnalysis(response: string): TicketAnalysis {
    try {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = response.match(/