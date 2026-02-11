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
      issuetype: {
        name: string;
      };
      priority?: {
        name: string;
      };
      assignee?: {
        displayName: string;
        emailAddress: string;
      };
      status: {
        name: string;
      };
    };
  };
}

interface ImplementationPlan {
  ticketKey: string;
  summary: string;
  analysis: string;
  subtasks: Subtask[];
  estimatedComplexity: 'low' | 'medium' | 'high';
  filesToModify: string[];
  testingStrategy: string;
  risks: string[];
}

interface Subtask {
  id: string;
  title: string;
  description: string;
  estimatedEffort: string;
  dependencies: string[];
}

// Verify webhook signature (basic implementation)
function verifyWebhookSignature(request: NextRequest): boolean {
  const signature = request.headers.get('x-hub-signature-256');
  const webhookSecret = process.env.WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    console.warn('WEBHOOK_SECRET not configured');
    return true; // Allow in development
  }
  
  // In production, implement proper HMAC verification
  return !!signature;
}

// Analyze ticket with GPT-4o
async function analyzeTicketWithAI(
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
  "analysis": "Brief analysis of what needs to be done",
  "subtasks": [
    {
      "id": "subtask-1",
      "title": "Subtask title",
      "description": "Detailed description",
      "estimatedEffort": "1-2 hours",
      "dependencies": []
    }
  ],
  "estimatedComplexity": "low|medium|high",
  "filesToModify": ["path/to/file1.ts", "path/to/file2.tsx"],
  "testingStrategy": "Description of testing approach",
  "risks": ["Risk 1", "Risk 2"]
}

Provide a practical, actionable plan that can be implemented immediately.`;

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
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    });

    const responseContent = completion.choices[0].message.content;
    if (!responseContent) {
      throw new Error('No response from AI');
    }

    const aiResponse = JSON.parse(responseContent);

    return {
      ticketKey,
      summary,
      analysis: aiResponse.analysis,
      subtasks: aiResponse.subtasks || [],
      estimatedComplexity: aiResponse.estimatedComplexity || 'medium',
      filesToModify: aiResponse.filesToModify || [],
      testingStrategy: aiResponse.testingStrategy || 'Manual testing required',
      risks: aiResponse.risks || [],
    };
  } catch (error) {
    console.error('Error analyzing ticket with AI:', error);
    throw new Error('Failed to analyze ticket with AI');
  }
}

// Generate code implementation
async function generateCodeImplementation(
  plan: ImplementationPlan
): Promise<{ file: string; content: string }[]> {
  const codeGenerationPrompt = `Based on this implementation plan, generate the complete code for the files that need to be modified.

Ticket: ${plan.ticketKey}
Summary: ${plan.summary}
Analysis: ${plan.analysis}

Files to modify: ${plan.filesToModify.join(', ')}

Subtasks:
${plan.subtasks.map((st, i) => `${i + 1}. ${st.title}: ${st.description}`).join('\n')}

Generate complete, production-ready code for each file. Include:
- Proper TypeScript types
- Error handling
- Comments for complex logic
- Best practices

Return the response in this exact format:
{
  "files": [
    {
      "path": "path/to/file.ts",
      "content": "complete file content here"
    }
  ]
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are an expert software engineer who writes clean, production-ready code. Always respond with valid JSON containing the complete file contents.',
        },
        {
          role: 'user',
          content: codeGenerationPrompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 4000,
      response_format: { type: 'json_object' },
    });

    const responseContent = completion.choices[0].message.content;
    if (!responseContent) {
      throw new Error('No response from AI');
    }

    const aiResponse = JSON.parse(responseContent);
    
    return aiResponse.files.map((f: any) => ({
      file: f.path,
      content: f.content,
    }));
  } catch (error) {
    console.error('Error generating code:', error);
    throw new Error('Failed to generate code implementation');
  }
}

// Main webhook handler
export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature
    if (!verifyWebhookSignature(request)) {
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 401 }
      );
    }

    // Parse webhook payload
    const payload: JiraWebhookPayload = await request.json();

    // Check if this is a ticket assignment event
    const isAssignmentEvent =
      payload.webhookEvent === 'jira:issue_updated' &&
      payload.issue_event_type_name === 'issue_assigned';

    if (!isAssignmentEvent || !payload.issue) {
      return NextResponse.json({
        message: 'Event ignored - not a ticket assignment',
        eventType: payload.webhookEvent,
      });
    }

    const issue = payload.issue;
    const ticketKey = issue.key;
    const summary = issue.fields.summary;
    const description = issue.fields.description || '';

    console.log(`Processing ticket assignment: ${ticketKey}`);

    // Step 1: Analyze ticket with AI
    const implementationPlan = await analyzeTicketWithAI(
      ticketKey,
      summary,
      description
    );

    console.log(`Analysis complete for ${ticketKey}:`, {
      complexity: implementationPlan.estimatedComplexity,
      subtaskCount: implementationPlan.subtasks.length,
      filesCount: implementationPlan.filesToModify.length,
    });

    // Step 2: Generate code (if complexity is low or medium)
    let generatedCode: { file: string; content: string }[] = [];
    
    if (implementationPlan.estimatedComplexity !== 'high') {
      try {
        generatedCode = await generateCodeImplementation(implementationPlan);
        console.log(`Generated code for ${generatedCode.length} files`);
      } catch (error) {
        console.error('Code generation failed:', error);
        // Continue without code generation
      }
    }

    // Step 3: Return implementation plan
    // In a full implementation, this would:
    // - Create a branch
    // - Commit the generated code
    // - Run tests
    // - Create a pull request
    
    return NextResponse.json({
      success: true,
      ticketKey,
      message: 'Ticket analyzed successfully',
      plan: implementationPlan,
      generatedFiles: generatedCode.map(f => f.file),
      nextSteps: [
        'Review implementation plan',
        'Generated code is ready for commit',
        'Run automated tests',
        'Create pull request',
      ],
    });
  } catch (error) {
    console.error('Error processing webhook:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to process webhook',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'healthy',
    service: 'AI Agent API',
    version: '1.0.0',
    capabilities: [
      'Webhook processing',
      'AI ticket analysis',
      'Code generation',
      'Implementation planning',
    ],
    configuration: {
      openaiConfigured: !!process.env.OPENAI_API_KEY,
      webhookSecretConfigured: !!process.env.WEBHOOK_SECRET,
    },
  });
}