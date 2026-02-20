import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { AIAgent } from '@/lib/ai-agent/agent';
import { JiraWebhookPayload, TicketAssignmentEvent } from '@/lib/ai-agent/types';

const JIRA_WEBHOOK_SECRET = process.env.JIRA_WEBHOOK_SECRET;

/**
 * Validates Jira webhook signature to ensure authenticity
 */
function validateJiraSignature(payload: string, signature: string | null): boolean {
  if (!JIRA_WEBHOOK_SECRET || !signature) {
    console.error('Missing webhook secret or signature', {
      hasSecret: !!JIRA_WEBHOOK_SECRET,
      hasSignature: !!signature,
    });
    return false;
  }

  try {
    const hmac = crypto.createHmac('sha256', JIRA_WEBHOOK_SECRET);
    const expectedSignature = hmac.update(payload).digest('hex');
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    console.error('Signature validation failed', { error });
    return false;
  }
}

/**
 * Extracts ticket assignment event from Jira webhook payload
 */
function parseTicketAssignment(payload: JiraWebhookPayload): TicketAssignmentEvent | null {
  try {
    const { webhookEvent, issue, changelog } = payload;

    // Only process issue assignment events
    if (webhookEvent !== 'jira:issue_updated') {
      return null;
    }

    // Check if assignee was changed
    const assigneeChange = changelog?.items?.find(
      (item) => item.field === 'assignee'
    );

    if (!assigneeChange) {
      return null;
    }

    // Check if assigned to AI agent (configurable bot user)
    const aiAgentEmail = process.env.JIRA_AI_AGENT_EMAIL || 'ai-agent@tasksmind.com';
    const newAssignee = assigneeChange.toString || assigneeChange.to;

    if (!newAssignee || !newAssignee.includes(aiAgentEmail)) {
      return null;
    }

    return {
      ticketId: issue.key,
      ticketUrl: `${process.env.JIRA_BASE_URL}/browse/${issue.key}`,
      title: issue.fields.summary,
      description: issue.fields.description || '',
      priority: issue.fields.priority?.name || 'Medium',
      labels: issue.fields.labels || [],
      assignee: newAssignee,
      projectKey: issue.fields.project.key,
      issueType: issue.fields.issuetype.name,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Failed to parse ticket assignment', { error, payload });
    return null;
  }
}

/**
 * POST /api/webhooks/jira
 * Receives Jira webhook events and triggers AI agent for assigned tickets
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let ticketId = 'unknown';

  try {
    // Read raw body for signature validation
    const rawBody = await request.text();
    const signature = request.headers.get('x-hub-signature-256');

    // Validate webhook signature
    if (!validateJiraSignature(rawBody, signature)) {
      console.warn('Invalid Jira webhook signature', {
        hasSignature: !!signature,
        bodyLength: rawBody.length,
      });
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Parse payload
    const payload: JiraWebhookPayload = JSON.parse(rawBody);
    const assignmentEvent = parseTicketAssignment(payload);

    // Ignore non-assignment events
    if (!assignmentEvent) {
      console.info('Ignoring non-assignment webhook event', {
        webhookEvent: payload.webhookEvent,
        issueKey: payload.issue?.key,
      });
      return NextResponse.json({ status: 'ignored' }, { status: 200 });
    }

    ticketId = assignmentEvent.ticketId;

    console.info('Processing ticket assignment', {
      ticketId,
      title: assignmentEvent.title,
      priority: assignmentEvent.priority,
    });

    // Initialize AI agent
    const agent = new AIAgent({
      ticketEvent: assignmentEvent,
      githubToken: process.env.GITHUB_TOKEN!,
      openaiApiKey: process.env.OPENAI_API_KEY!,
      jiraBaseUrl: process.env.JIRA_BASE_URL!,
      jiraEmail: process.env.JIRA_EMAIL!,
      jiraApiToken: process.env.JIRA_API_TOKEN!,
    });

    // Process ticket asynchronously (don't block webhook response)
    agent.processTicket().catch((error) => {
      console.error('Agent processing failed', {
        ticketId,
        error: error.message,
        stack: error.stack,
      });
    });

    const duration = Date.now() - startTime;
    console.info('Webhook processed successfully', {
      ticketId,
      duration,
    });

    return NextResponse.json(
      {
        status: 'processing',
        ticketId,
        message: 'AI agent started processing ticket',
      },
      { status: 202 }
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('Webhook processing error', {
      ticketId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      duration,
    });

    return NextResponse.json(
      {
        error: 'Internal server error',
        ticketId,
      },
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
    status: 'healthy',
    service: 'jira-webhook',
    timestamp: new Date().toISOString(),
  });
}