import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

export interface Ticket {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignee?: string;
  labels?: string[];
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
  estimatedHours: number;
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

export class AIAgentService {
  private anthropic: Anthropic;
  private openai: OpenAI;
  private model: 'gpt-4o' | 'claude-3-5-sonnet-20241022';

  constructor(
    apiKey: string,
    provider: 'openai' | 'anthropic' = 'openai',
    model?: string
  ) {
    if (provider === 'openai') {
      this.openai = new OpenAI({ apiKey });
      this.model = (model as 'gpt-4o') || 'gpt-4o';
    } else {
      this.anthropic = new Anthropic({ apiKey });
      this.model = (model as 'claude-3-5-sonnet-20241022') || 'claude-3-5-sonnet-20241022';
    }
  }

  /**
   * Analyzes a ticket and breaks it down into subtasks
   */
  async analyzeTicket(ticket: Ticket): Promise<TicketAnalysis> {
    const prompt = this.buildAnalysisPrompt(ticket);
    
    let response: string;
    
    if (this.openai) {
      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert software architect and project manager. Analyze tickets and break them down into actionable subtasks.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      });
      
      response = completion.choices[0].message.content || '{}';
    } else {
      const message = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: 4096,
        temperature: 0.3,
        system: 'You are an expert software architect and project manager. Analyze tickets and break them down into actionable subtasks.',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });
      
      const content = message.content[0];
      response = content.type === 'text' ? content.text : '{}';
    }

    return this.parseAnalysisResponse(response);
  }

  /**
   * Generates code for a specific subtask
   */
  async generateCode(
    subtask: Subtask,
    context: {
      projectStructure?: string[];
      existingFiles?: Record<string, string>;
      techStack?: string[];
    }
  ): Promise<CodeGeneration> {
    const prompt = this.buildCodeGenerationPrompt(subtask, context);
    
    let response: string;
    
    if (this.openai) {
      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `You are an expert software engineer. Generate code changes to implement the subtask. For every file you create or modify, you MUST also provide a corresponding test file.

Requirements for tests:
1. Use Vitest/Jest syntax.
2. If it's a React component, use React Testing Library to verify it renders.
3. If it's a utility, test edge cases.
4. If it's a new file, create a test file for it.
5. If it's a modified file, update the test file to match the new logic.

Return files using this EXACT format (no JSON):

### FILE: path/to/file1.js
\`\`\`
// Complete file content here
console.log("example");
\`\`\`

### FILE: path/to/file2.html
\`\`\`
<html>...</html>
\`\`\`

### FILE: path/to/file.test.ts
\`\`\`
// test code here
\`\`\`

Use exactly "### FILE: " followed by the path, then the code in triple backticks.`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.2,
      });
      
      response = completion.choices[0].message.content || '';
    } else {
      const message = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: 8000,
        temperature: 0.2,
        system: `You are an expert software engineer. Generate code changes to implement the subtask. For every file you create or modify, you MUST also provide a corresponding test file.

Requirements for tests:
1. Use Vitest/Jest syntax.
2. If it's a React component, use React Testing Library to verify it renders.
3. If it's a utility, test edge cases.
4. If it's a new file, create a test file for it.
5. If it's a modified file, update the test file to match the new logic.

Return files using this EXACT format (no JSON):

### FILE: path/to/file1.js
\`\`\`
// Complete file content here
console.log("example");
\`\`\`

### FILE: path/to/file2.html
\`\`\`
<html>...</html>
\`\`\`

### FILE: path/to/file.test.ts
\`\`\`
// test code here
\`\`\`

Use exactly "### FILE: " followed by the path, then the code in triple backticks.`,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });
      
      const content = message.content[0];
      response = content.type === 'text' ? content.text : '';
    }

    return this.parseCodeGenerationResponse(response);
  }

  /**
   * Reviews generated code for quality and potential issues
   */
  async reviewCode(codeGeneration: CodeGeneration): Promise<{
    approved: boolean;
    issues: Array<{
      severity: 'error' | 'warning' | 'info';
      message: string;
      file?: string;
      line?: number;
    }>;
    suggestions: string[];
  }> {
    const prompt = this.buildCodeReviewPrompt(codeGeneration);
    
    let response: string;
    
    if (this.openai) {
      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert code reviewer. Review code for quality, security, performance, and best practices.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' },
      });
      
      response = completion.choices[0].message.content || '{}';
    } else {
      const message = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: 4096,
        temperature: 0.2,
        system: 'You are an expert code reviewer. Review code for quality, security, performance, and best practices.',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });
      
      const content = message.content[0];
      response = content.type === 'text' ? content.text : '{}';
    }

    return this.parseCodeReviewResponse(response);
  }

  /**
   * Generates a pull request description
   */
  async generatePRDescription(
    ticket: Ticket,
    subtasks: Subtask[],
    codeChanges: CodeGeneration[]
  ): Promise<{
    title: string;
    description: string;
    labels: string[];
  }> {
    const prompt = this.buildPRDescriptionPrompt(ticket, subtasks, codeChanges);
    
    let response: string;
    
    if (this.openai) {
      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert at writing clear, comprehensive pull request descriptions.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      });
      
      response = completion.choices[0].message.content || '{}';
    } else {
      const message = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: 2048,
        temperature: 0.3,
        system: 'You are an expert at writing clear, comprehensive pull request descriptions.',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });
      
      const content = message.content[0];
      response = content.type === 'text' ? content.text : '{}';
    }

    return this.parsePRDescriptionResponse(response);
  }

  private buildAnalysisPrompt(ticket: Ticket): string {
    return `Analyze the following ticket and break it down into actionable subtasks.

Ticket ID: ${ticket.id}
Title: ${ticket.title}
Description: ${ticket.description}
Priority: ${ticket.priority}
Labels: ${ticket.labels?.join(', ') || 'None'}

Provide a JSON response with the following structure:
{
  "summary": "Brief summary of what needs to be done",
  "complexity": "simple|moderate|complex",
  "estimatedHours": number,
  "requiredSkills": ["skill1", "skill2"],
  "risks": ["risk1", "risk2"],
  "subtasks": [
    {
      "id": "unique-id",
      "title": "Subtask title",
      "description": "Detailed description",
      "estimatedComplexity": "simple|moderate|complex",
      "dependencies": ["subtask-id-1"],
      "files": ["path/to/file1.ts", "path/to/file2.ts"]
    }
  ]
}

Break down the work into logical, manageable subtasks. Each subtask should be independently testable.`;
  }

  private buildCodeGenerationPrompt(
    subtask: Subtask,
    context: {
      projectStructure?: string[];
      existingFiles?: Record<string, string>;
      techStack?: string[];
    }
  ): string {
    let prompt = `Generate code to implement the following subtask:

Subtask ID: ${subtask.id}
Title: ${subtask.title}
Description: ${subtask.description}
Complexity: ${subtask.estimatedComplexity}
Files to modify/create: ${subtask.files.join(', ')}
`;

    if (context.techStack && context.techStack.length > 0) {
      prompt += `\nTech Stack: ${context.techStack.join(', ')}`;
    }

    if (context.projectStructure && context.projectStructure.length > 0) {
      prompt += `\n\nProject Structure:\n${context.projectStructure.join('\n')}`;
    }

    if (context.existingFiles && Object.keys(context.existingFiles).length > 0) {
      prompt += '\n\nExisting Files:\n';
      for (const [path, content] of Object.entries(context.existingFiles)) {
        prompt += `\n### ${path}\n\`\`\`\n${content}\n\`\`\`\n`;
      }
    }

    prompt += `\n\nGenerate complete, production-ready code with proper error handling, types, and documentation. Include tests for all new functionality.`;

    return prompt;
  }

  private buildCodeReviewPrompt(codeGeneration: CodeGeneration): string {
    let prompt = `Review the following code changes:

Summary: ${codeGeneration.summary}

Files:
`;

    for (const file of codeGeneration.files) {
      prompt += `\n### ${file.path} (${file.action})\n\`\`\`\n${file.content}\n\`\`\`\n`;
    }

    prompt += `\n\nTest Files:\n`;
    for (const testFile of codeGeneration.testFiles) {
      prompt += `\n### ${testFile.path}\n\`\`\`\n${testFile.content}\n\`\`\`\n`;
    }

    prompt += `\n\nProvide a JSON response with:
{
  "approved": boolean,
  "issues": [
    {
      "severity": "error|warning|info",
      "message": "Description of the issue",
      "file": "path/to/file.ts",
      "line": 42
    }
  ],
  "suggestions": ["suggestion1", "suggestion2"]
}

Check for:
- Code quality and best practices
- Security vulnerabilities
- Performance issues
- Test coverage
- Type safety
- Error handling
- Documentation`;

    return prompt;
  }

  private buildPRDescriptionPrompt(
    ticket: Ticket,
    subtasks: Subtask[],
    codeChanges: CodeGeneration[]
  ): string {
    return `Generate a pull request description for the following changes:

Original Ticket:
- ID: ${ticket.id}
- Title: ${ticket.title}
- Description: ${ticket.description}

Completed Subtasks:
${subtasks.map((st, i) => `${i + 1}. ${st.title}`).join('\n')}

Code Changes:
${codeChanges.map((cc) => `- ${cc.summary}`).join('\n')}

Files Modified/Created:
${codeChanges.flatMap((cc) => cc.files.map((f) => `- ${f.path} (${f.action})`)).join('\n')}

Provide a JSON response with:
{
  "title": "PR title (max 72 chars)",
  "description": "Detailed markdown description with sections: Overview, Changes, Testing, Notes",
  "labels": ["label1", "label2"]
}`;
  }

  private parseAnalysisResponse(response: string): TicketAnalysis {
    try {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = response.match(/