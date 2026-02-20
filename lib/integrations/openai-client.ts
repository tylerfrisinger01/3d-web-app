import OpenAI from 'openai';
import { TicketAnalysis, JiraTicket, GeneratedCode } from '@/lib/types/agent';

export class OpenAIClient {
  private client: OpenAI;

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }

    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async analyzeTicket(ticket: JiraTicket): Promise<TicketAnalysis> {
    try {
      const prompt = this.buildAnalysisPrompt(ticket);

      const response = await this.client.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are a Senior Software Architect analyzing tickets for an AI agent system.
Analyze the ticket and provide a structured breakdown including severity, complexity, required files, risks, and subtasks.
Return ONLY valid JSON matching the TicketAnalysis interface.`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from OpenAI');
      }

      const analysis = JSON.parse(content) as TicketAnalysis;
      analysis.ticketId = ticket.id;

      console.log('Ticket analysis completed', {
        ticketKey: ticket.key,
        severity: analysis.severity,
        complexity: analysis.complexity,
        subtaskCount: analysis.subtasks.length,
      });

      return analysis;
    } catch (error) {
      console.error('Failed to analyze ticket', {
        ticketKey: ticket.key,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error(`Ticket analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateCode(
    ticket: JiraTicket,
    analysis: TicketAnalysis,
    subtask: { title: string; description: string },
    existingFiles?: Map<string, string>
  ): Promise<GeneratedCode[]> {
    try {
      const prompt = this.buildCodeGenerationPrompt(ticket, analysis, subtask, existingFiles);

      const response = await this.client.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are a Senior Software Engineer implementing code changes.
Generate complete, production-ready code following best practices.
Return code in the exact format specified in the prompt.`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.2,
        max_tokens: 16000,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from OpenAI');
      }

      const generatedCode = this.parseGeneratedCode(content);

      console.log('Code generation completed', {
        ticketKey: ticket.key,
        subtask: subtask.title,
        filesGenerated: generatedCode.length,
      });

      return generatedCode;
    } catch (error) {
      console.error('Failed to generate code', {
        ticketKey: ticket.key,
        subtask: subtask.title,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error(`Code generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private buildAnalysisPrompt(ticket: JiraTicket): string {
    return `Analyze this ticket and provide a structured breakdown:

**Ticket Details:**
- Key: ${ticket.key}
- Summary: ${ticket.summary}
- Description: ${ticket.description}
- Priority: ${ticket.priority}
- Labels: ${ticket.labels.join(', ')}

**Required Output (JSON):**
{
  "severity": "critical|high|medium|low",
  "complexity": "simple|moderate|complex",
  "estimatedTime": <minutes>,
  "requiredFiles": ["path/to/file1.ts", "path/to/file2.ts"],
  "dependencies": ["package1", "package2"],
  "risks": ["risk description 1", "risk description 2"],
  "subtasks": [
    {
      "id": "subtask-1",
      "title": "Subtask title",
      "description": "Detailed description",
      "order": 1,
      "estimatedTime": <minutes>,
      "dependencies": []
    }
  ],
  "reasoning": "Detailed explanation of the analysis"
}

Consider:
1. Technical complexity and scope
2. Integration points and dependencies
3. Potential risks and edge cases
4. Logical breakdown into implementable subtasks
5. Estimated time for each subtask`;
  }

  private buildCodeGenerationPrompt(
    ticket: JiraTicket,
    analysis: TicketAnalysis,
    subtask: { title: string; description: string },
    existingFiles?: Map<string, string>
  ): string {
    let prompt = `Generate production-ready code for this subtask:

**Ticket Context:**
- Key: ${ticket.key}
- Summary: ${ticket.summary}
- Severity: ${analysis.severity}
- Complexity: ${analysis.complexity}

**Subtask:**
- Title: ${subtask.title}
- Description: ${subtask.description}

**Requirements:**
- Follow TypeScript best practices
- Include comprehensive error handling
- Add proper types (no 'any')
- Include logging for observability
- Write clean, maintainable code
- Add JSDoc comments for public APIs

**Output Format:**
Return code using EXACTLY this format:

### FILE: path/to/file1.ts
\`\`\`typescript
// Complete file content
\`\`\`

### FILE: path/to/file2.ts
\`\`\`typescript
// Complete file content
\`\`\`
`;

    if (existingFiles && existingFiles.size > 0) {
      prompt += '\n**Existing Files Context:**\n';
      existingFiles.forEach((content, path) => {
        prompt += `\n### ${path}\n\`\`\`\n${content.substring(0, 1000)}...\n\`\`\`\n`;
      });
    }

    return prompt;
  }

  private parseGeneratedCode(content: string): GeneratedCode[] {
    const files: GeneratedCode[] = [];
    const fileRegex = /### FILE: (.+?)\n