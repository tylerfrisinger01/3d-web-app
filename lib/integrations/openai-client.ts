import OpenAI from 'openai';

export class OpenAIClient {
  private client: OpenAI;
  private model: string;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }

    this.client = new OpenAI({ apiKey });
    this.model = process.env.OPENAI_MODEL || 'gpt-4o';
  }

  async chat(messages: OpenAI.Chat.ChatCompletionMessageParam[], options?: {
    temperature?: number;
    maxTokens?: number;
    responseFormat?: { type: 'json_object' };
  }): Promise<string> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 4000,
        response_format: options?.responseFormat,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content in OpenAI response');
      }

      return content;
    } catch (error) {
      console.error('OpenAI API error:', { error, model: this.model });
      throw new Error(`OpenAI API call failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async analyzeTicket(ticket: {
    title: string;
    description: string;
    priority: string;
  }): Promise<{
    summary: string;
    complexity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    estimatedTime: string;
    risks: string[];
    subtasks: Array<{
      title: string;
      description: string;
      estimatedComplexity: string;
      filesToModify: string[];
    }>;
  }> {
    const prompt = `You are a senior software engineer analyzing a ticket. Provide a structured analysis.

Ticket Title: ${ticket.title}
Ticket Description: ${ticket.description}
Priority: ${ticket.priority}

Analyze this ticket and provide:
1. A brief summary of what needs to be done
2. Complexity assessment (LOW/MEDIUM/HIGH/CRITICAL)
3. Estimated time to complete
4. Potential risks
5. Break down into subtasks with files to modify

Respond in JSON format with keys: summary, complexity, estimatedTime, risks (array), subtasks (array with title, description, estimatedComplexity, filesToModify).`;

    const response = await this.chat([
      { role: 'system', content: 'You are a senior software engineer and technical architect.' },
      { role: 'user', content: prompt }
    ], {
      temperature: 0.3,
      responseFormat: { type: 'json_object' }
    });

    return JSON.parse(response);
  }

  async generateCode(request: {
    ticketDescription: string;
    subtask: {
      title: string;
      description: string;
      filesToModify: string[];
    };
    context?: {
      existingCode?: string;
      dependencies?: Record<string, string>;
    };
  }): Promise<Array<{ path: string; content: string; type: 'SOURCE' | 'TEST' | 'CONFIG' }>> {
    const prompt = `You are an expert software engineer. Generate production-ready code for this task.

Task: ${request.subtask.title}
Description: ${request.subtask.description}
Ticket Context: ${request.ticketDescription}

Files to create/modify: ${request.subtask.filesToModify.join(', ')}

${request.context?.existingCode ? `Existing Code Context:\n${request.context.existingCode}` : ''}

Requirements:
1. Generate complete, production-ready code
2. Include proper error handling and logging
3. Use TypeScript with strict types
4. Follow best practices and design patterns
5. Include comprehensive tests for each file
6. Add JSDoc comments for public APIs

Output format (STRICT):
### FILE: path/to/file.ts
\`\`\`typescript
// Complete file content
\`\`\`

### FILE: path/to/__tests__/file.test.ts
\`\`\`typescript
// Test file content
\`\`\`

Generate ALL necessary files including tests.`;

    const response = await this.chat([
      { role: 'system', content: 'You are a senior software engineer who writes clean, tested, production-ready code.' },
      { role: 'user', content: prompt }
    ], {
      temperature: 0.2,
      maxTokens: 8000
    });

    return this.parseGeneratedFiles(response);
  }

  private parseGeneratedFiles(response: string): Array<{ path: string; content: string; type: 'SOURCE' | 'TEST' | 'CONFIG' }> {
    const files: Array<{ path: string; content: string; type: 'SOURCE' | 'TEST' | 'CONFIG' }> = [];
    const fileRegex = /### FILE: (.+?)\n