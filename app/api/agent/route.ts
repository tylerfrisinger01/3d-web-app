import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Types for webhook payloads
interface JiraWebhookPayload {
  webhookEvent: string;
  issue_event_type_name?: string;
  issue?: {
    id: string;
    key: string;
    fields: {
      summary: string;
      description?: string;
      assignee?: {
        displayName: string;
        emailAddress: string;
      };
      status: {
        name: string;
      };
      issuetype: {
        name: string;
      };
      project: {
        key: string;
        name: string;
      };
    };
  };
}

interface SubTask {
  title: string;
  description: string;
  estimatedComplexity: 'low' | 'medium' | 'high';
  dependencies: string[];
}

interface ImplementationPlan {
  summary: string;
  analysis: string;
  subtasks: SubTask[];
  technicalApproach: string;
  filesAffected: string[];
  testingStrategy: string;
  risks: string[];
}

// Verify webhook signature (basic implementation)
function verifyWebhookSignature(req: NextRequest): boolean {
  const signature = req.headers.get('x-hub-signature-256');
  const webhookSecret = process.env.WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    console.warn('WEBHOOK_SECRET not configured, skipping verification');
    return true; // Allow in development
  }
  
  // In production, implement proper HMAC verification
  return !!signature;
}

// Analyze ticket with GPT-4o
async function analyzeTicket(
  ticketKey: string,
  summary: string,
  description: string
): Promise<ImplementationPlan> {
  const prompt = `You are an expert software engineer analyzing a ticket for implementation.

Ticket: ${ticketKey}
Summary: ${summary}
Description: ${description || 'No description provided'}

Analyze this ticket and provide a detailed implementation plan in JSON format with the following structure:
{
  "summary": "Brief overview of what needs to be done",
  "analysis": "Detailed technical analysis of the requirements",
  "subtasks": [
    {
      "title": "Subtask title",
      "description": "What needs to be done",
      "estimatedComplexity": "low|medium|high",
      "dependencies": ["other subtask titles this depends on"]
    }
  ],
  "technicalApproach": "Recommended technical approach and architecture",
  "filesAffected": ["list of files that will need to be created or modified"],
  "testingStrategy": "How to test this implementation",
  "risks": ["potential risks or challenges"]
}

Provide a comprehensive, actionable plan that a developer could follow.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are an expert software engineer who creates detailed, actionable implementation plans. Always respond with valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 4000,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    const plan: ImplementationPlan = JSON.parse(content);
    return plan;
  } catch (error) {
    console.error('Error analyzing ticket with AI:', error);
    throw new Error('Failed to analyze ticket with AI');
  }
}

// Generate code implementation
async function generateCode(
  plan: ImplementationPlan,
  ticketKey: string,
  summary: string
): Promise<{ files: Array<{ path: string; content: string }> }> {
  const prompt = `You are an expert software engineer. Generate code to implement this ticket.

Ticket: ${ticketKey}
Summary: ${summary}

Implementation Plan:
${JSON.stringify(plan, null, 2)}

Generate complete, production-ready code for all files needed. Use modern best practices, include error handling, and add comments.

IMPORTANT: Return files using this EXACT format (no JSON):

### FILE: path/to/file1.ts
\`\`\`
// Complete file content here
export function example() {
  return "hello";
}
\`\`\`

### FILE: path/to/file2.ts
\`\`\`
// Complete file content here
export function another() {
  return "world";
}
\`\`\`

Use exactly "### FILE: " followed by the path, then the code in triple backticks.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are an expert software engineer who writes clean, production-ready code. Follow the exact file format specified.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 8000,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    // Parse the file format
    const files = parseGeneratedFiles(content);
    return { files };
  } catch (error) {
    console.error('Error generating code:', error);
    throw new Error('Failed to generate code');
  }
}

// Parse generated files from AI response
function parseGeneratedFiles(content: string): Array<{ path: string; content: string }> {
  const files: Array<{ path: string; content: string }> = [];
  const fileRegex = /### FILE: (.+?)\n