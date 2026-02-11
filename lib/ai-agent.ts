import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MODEL = 'gpt-4o';
const MAX_TOKENS = 16000;

export interface TicketData {
  key: string;
  summary: string;
  description: string;
  type: string;
  priority: string;
  assignee: string;
  labels: string[];
  components: string[];
  project: string;
}

export interface TicketAnalysis {
  summary: string;
  complexity: 'low' | 'medium' | 'high' | 'very-high';
  estimatedEffort: string;
  technicalRequirements: string[];
  potentialChallenges: string[];
  dependencies: string[];
  suggestedApproach: string;
}

export interface ImplementationPlan {
  subtasks: Subtask[];
  context: string;
  architecture: string;
  testingStrategy: string;
}

export interface Subtask {
  id: string;
  title: string;
  description: string;
  files: string[];
  dependencies: string[];
  estimatedTime: string;
}

export interface CodeChange {
  path: string;
  content: string;
  action: 'create' | 'modify' | 'delete';
}

/**
 * Analyze a ticket using GPT-4o to understand requirements
 */
export async function analyzeTicket(ticket: TicketData): Promise<TicketAnalysis> {
  const prompt = `You are an expert software engineer analyzing a ticket.

Ticket: ${ticket.key}
Type: ${ticket.type}
Priority: ${ticket.priority}
Summary: ${ticket.summary}

Description:
${ticket.description}

Labels: ${ticket.labels.join(', ')}
Components: ${ticket.components.join(', ')}

Analyze this ticket and provide:
1. A brief summary of what needs to be done
2. Complexity assessment (low/medium/high/very-high)
3. Estimated effort (e.g., "2-4 hours", "1-2 days")
4. Technical requirements and technologies involved
5. Potential challenges or risks
6. Dependencies on other systems or components
7. Suggested technical approach

Return your analysis as a JSON object with these fields:
{
  "summary": "brief summary",
  "complexity": "low|medium|high|very-high",
  "estimatedEffort": "time estimate",
  "technicalRequirements": ["requirement1", "requirement2"],
  "potentialChallenges": ["challenge1", "challenge2"],
  "dependencies": ["dependency1", "dependency2"],
  "suggestedApproach": "detailed approach description"
}`;

  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are an expert software engineer who analyzes tickets and provides detailed technical assessments. Always respond with valid JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 2000,
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No response from AI');
    }

    return JSON.parse(content) as TicketAnalysis;
  } catch (error) {
    console.error('Error analyzing ticket:', error);
    throw new Error(`Failed to analyze ticket: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate an implementation plan with subtasks
 */
export async function generateImplementationPlan(
  ticket: TicketData,
  analysis: TicketAnalysis
): Promise<ImplementationPlan> {
  const prompt = `You are an expert software engineer creating an implementation plan.

Ticket: ${ticket.key} - ${ticket.summary}
Description: ${ticket.description}

Analysis:
- Complexity: ${analysis.complexity}
- Estimated Effort: ${analysis.estimatedEffort}
- Suggested Approach: ${analysis.suggestedApproach}

Technical Requirements:
${analysis.technicalRequirements.map(req => `- ${req}`).join('\n')}

Create a detailed implementation plan that breaks down the work into subtasks.
Each subtask should:
1. Have a clear title and description
2. List the specific files that need to be created or modified
3. Identify dependencies on other subtasks
4. Include an estimated time

Also provide:
- Overall architecture/design approach
- Testing strategy

Return as JSON:
{
  "subtasks": [
    {
      "id": "subtask-1",
      "title": "Task title",
      "description": "Detailed description",
      "files": ["path/to/file1.ts", "path/to/file2.ts"],
      "dependencies": [],
      "estimatedTime": "30 minutes"
    }
  ],
  "context": "Overall context and approach",
  "architecture": "Architecture decisions and patterns",
  "testingStrategy": "How to test this implementation"
}`;

  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are an expert software architect who creates detailed implementation plans. Always respond with valid JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.4,
      max_tokens: 3000,
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No response from AI');
    }

    return JSON.parse(content) as ImplementationPlan;
  } catch (error) {
    console.error('Error generating implementation plan:', error);
    throw new Error(`Failed to generate plan: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate code for a specific subtask
 */
export async function generateCode(
  subtask: Subtask,
  context: string
): Promise<CodeChange[]> {
  const prompt = `You are an expert software engineer. Generate code to implement this subtask.

Context: ${context}

Subtask: ${subtask.title}
Description: ${subtask.description}
Files to modify/create: ${subtask.files.join(', ')}

Generate complete, production-ready code for each file.

IMPORTANT: Return files using this EXACT format (no JSON):

### FILE: path/to/file1.js
\`\`\`
// Complete file content here
console.log("example");
\`\`\`

### FILE: path/to/file2.html
\`\`\`
<html>...</html>
\`\`\`

Use exactly "### FILE: " followed by the path, then the code in triple backticks.

Requirements:
- Write clean, maintainable code
- Include proper error handling
- Add comments for complex logic
- Follow TypeScript/JavaScript best practices
- Include proper types and interfaces
- Make code production-ready`;

  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are an expert software engineer who writes clean, production-ready code. Follow the exact format specified for file output.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.2,
      max_tokens: MAX_TOKENS
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No response from AI');
    }

    return parseCodeChanges(content);
  } catch (error) {
    console.error('Error generating code:', error);
    throw new Error(`Failed to generate code: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Parse code changes from AI response
 */
function parseCodeChanges(content: string): CodeChange[] {
  const changes: CodeChange[] = [];
  const fileRegex = /### FILE: (.+?)\n