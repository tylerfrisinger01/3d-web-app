import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import crypto from 'crypto';
import { AIAgent } from '@/lib/ai/agent';
import { JiraWebhookPayload } from '@/lib/ai/types';

/**
 * Verify Jira webhook signature
 */
function verifyJiraSignature(payload: string, signature: string): boolean {
  if (!process.env.JIRA_WEBHOOK_SECRET) {
    console.warn('JIRA_WEBHOOK_SECRET not set, skipping signature verification');
    return true;
  }

  const hmac = crypto.createHmac('sha256', process.env.JIRA_WEBHOOK_SECRET);
  const digest = hmac.update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

/**
 * POST /api/webhooks/jira
 * Handles Jira webhook events for ticket assignments
 */
export async function POST(request: NextRequest) {
  try {
    const headersList = headers();
    const signature = headersList.get('x-hub-signature-256') || '';
    const body = await request.text();

    // Verify webhook signature
    if (!verifyJiraSignature(body, signature)) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    const payload: JiraWebhookPayload = JSON.parse(body);

    // Only process issue assignment events
    if (
      payload.webhookEvent !== 'jira:issue_updated' ||
      !payload.changelog?.items?.some(
        (item) => item.field === 'assignee' && item.toString
      )
    ) {
      return NextResponse.json(
        { message: 'Event ignored - not an assignment' },
        { status: 200 }
      );
    }

    const issue = payload.issue;
    if (!issue) {
      return NextResponse.json(
        { error: 'No issue in payload' },
        { status: 400 }
      );
    }

    // Check if assigned to AI agent
    const assignee = issue.fields?.assignee?.emailAddress || '';
    const isAIAgent =
      assignee === process.env.AI_AGENT_EMAIL ||
      issue.fields?.assignee?.displayName?.toLowerCase().includes('ai agent');

    if (!isAIAgent) {
      return NextResponse.json(
        { message: 'Not assigned to AI agent' },
        { status: 200 }
      );
    }

    // Initialize AI Agent
    const agent = new AIAgent({
      openaiApiKey: process.env.OPENAI_API_KEY!,
      githubToken: process.env.GITHUB_TOKEN!,
      jiraApiToken: process.env.JIRA_API_TOKEN!,
      jiraEmail: process.env.JIRA_EMAIL!,
      jiraBaseUrl: process.env.JIRA_BASE_URL!,
    });

    // Process ticket asynchronously
    // In production, this should be queued to a background job
    agent
      .processTicket({
        ticketId: issue.key,
        title: issue.fields?.summary || '',
        description: issue.fields?.description || '',
        projectKey: issue.fields?.project?.key || '',
      })
      .catch((error) => {
        console.error('Error processing ticket:', error);
      });

    return NextResponse.json(
      {
        message: 'Ticket processing started',
        ticketId: issue.key,
      },
      { status: 202 }
    );
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/webhooks/jira
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Jira webhook endpoint is active',
  });
}