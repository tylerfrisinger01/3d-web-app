import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

interface ImplementationPlan {
  summary: string;
  analysis: string;
  subtasks: Array<{
    title: string;
    description: string;
    estimatedComplexity: 'low' | 'medium' | 'high';
    dependencies: string[];
  }>;
  technicalApproach: string;
  filesAffected: string[];
  testingStrategy: string;
  risks: string[];
}

export async function POST(request: NextRequest) {
  try {
    const payload: JiraWebhookPayload = await request.json();

    // Verify webhook authenticity (basic check)
    const webhookSecret = request.headers.get('x-webhook-secret');
    if (webhookSecret !== process.env.JIRA_WEBHOOK_SECRET) {
      return NextResponse.json(
        { error: 'Unauthorized webhook request' },
        { status: 401 }
      );
    }

    // Check if this is a ticket assignment event
    if (
      payload.webhookEvent !== 'jira:issue_updated' ||
      payload.issue_event_type_name !== 'issue_assigned'
    ) {
      return NextResponse.json(
        { message: 'Event ignored - not a ticket assignment' },
        { status: 200 }
      );
    }

    const issue = payload.issue;
    if (!issue) {
      return NextResponse.json(
        { error: 'No issue data in webhook payload' },
        { status: 400 }
      );
    }

    console.log(`Processing ticket assignment: ${issue.key}`);

    // Generate implementation plan using AI
    const plan = await generateImplementationPlan(issue);

    // Store the plan (in a real implementation, save to database)
    console.log('Generated Implementation Plan:', JSON.stringify(plan, null, 2));

    // TODO: Create subtasks in Jira
    // TODO: Initialize GitHub branch
    // TODO: Queue code generation tasks

    return NextResponse.json({
      success: true,
      ticketKey: issue.key,
      plan: plan,
      message: 'Ticket processed and implementation plan generated',
    });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      {
        error: 'Failed to process webhook',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

async function generateImplementationPlan(
  issue: JiraWebhookPayload['issue']
): Promise<ImplementationPlan> {
  if (!issue) {
    throw new Error('Issue data is required');
  }

  const prompt = `You are an expert software engineer analyzing a ticket to create an implementation plan.

Ticket: ${issue.key}
Title: ${issue.fields.summary}
Description: ${issue.fields.description || 'No description provided'}
Type: ${issue.fields.issuetype.name}
Project: ${issue.fields.project.name}

Analyze this ticket and provide a detailed implementation plan in JSON format with the following structure:

{
  "summary": "Brief overview of what needs to be done",
  "analysis": "Detailed analysis of the requirements and technical considerations",
  "subtasks": [
    {
      "title": "Subtask title",
      "description": "Detailed description",
      "estimatedComplexity": "low|medium|high",
      "dependencies": ["list of other subtask titles this depends on"]
    }
  ],
  "technicalApproach": "Explanation of the technical approach and architecture decisions",
  "filesAffected": ["list of files that will need to be created or modified"],
  "testingStrategy": "How to test this implementation",
  "risks": ["potential risks or challenges"]
}

Provide a comprehensive, actionable plan that can be used to implement this ticket.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content:
            'You are an expert software engineer who creates detailed, actionable implementation plans. Always respond with valid JSON.',
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

    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error('No response from OpenAI');
    }

    const plan: ImplementationPlan = JSON.parse(responseContent);

    // Validate the plan structure
    if (!plan.summary || !plan.subtasks || !Array.isArray(plan.subtasks)) {
      throw new Error('Invalid plan structure returned from AI');
    }

    return plan;
  } catch (error) {
    console.error('Error generating implementation plan:', error);
    throw new Error(
      `Failed to generate implementation plan: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    );
  }
}

// Health check endpoint
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'healthy',
    service: 'AI Software Engineer Webhook',
    timestamp: new Date().toISOString(),
  });
}