import { NextRequest, NextResponse } from 'next/server';
import { AIAgent } from '@/lib/ai-agent';
import crypto from 'crypto';

// Webhook secret for verification (should be in environment variables)
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || '';

/**
 * Verify webhook signature from Jira
 */
function verifyWebhookSignature(
  payload: string,
  signature: string | null
): boolean {
  if (!WEBHOOK_SECRET || !signature) {
    return false;
  }

  const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
  const digest = hmac.update(payload).digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(digest)
  );
}

/**
 * Extract ticket information from Jira webhook payload
 */
function extractTicketInfo(payload: any) {
  const issue = payload.issue;
  
  return {
    ticketId: issue?.key || '',
    title: issue?.fields?.summary || '',
    description: issue?.fields?.description || '',
    assignee: issue?.fields?.assignee?.displayName || '',
    status: issue?.fields?.status?.name || '',
    priority: issue?.fields?.priority?.name || '',
    issueType: issue?.fields?.issuetype?.name || '',
    project: issue?.fields?.project?.key || '',
    labels: issue?.fields?.labels || [],
    components: issue?.fields?.components?.map((c: any) => c.name) || [],
  };
}

/**
 * Check if ticket was assigned (not just updated)
 */
function isTicketAssignment(payload: any): boolean {
  const webhookEvent = payload.webhookEvent;
  const changelog = payload.changelog;
  
  // Check if this is an issue update event
  if (webhookEvent !== 'jira:issue_updated') {
    return false;
  }
  
  // Check if assignee field was changed
  if (changelog?.items) {
    return changelog.items.some(
      (item: any) => item.field === 'assignee' && item.toString !== null
    );
  }
  
  return false;
}

/**
 * POST /api/webhook
 * Receives webhooks from Jira when tickets are assigned
 */
export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await request.text();
    const signature = request.headers.get('x-hub-signature-256');
    
    // Verify webhook signature in production
    if (process.env.NODE_ENV === 'production') {
      if (!verifyWebhookSignature(rawBody, signature)) {
        console.error('Invalid webhook signature');
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        );
      }
    }
    
    // Parse payload
    const payload = JSON.parse(rawBody);
    
    // Log webhook event
    console.log('Received webhook:', {
      event: payload.webhookEvent,
      issueKey: payload.issue?.key,
    });
    
    // Check if this is a ticket assignment
    if (!isTicketAssignment(payload)) {
      return NextResponse.json({
        message: 'Not a ticket assignment event',
        processed: false,
      });
    }
    
    // Extract ticket information
    const ticketInfo = extractTicketInfo(payload);
    
    console.log('Processing ticket assignment:', ticketInfo.ticketId);
    
    // Initialize AI Agent
    const aiAgent = new AIAgent({
      openaiApiKey: process.env.OPENAI_API_KEY || '',
      githubToken: process.env.GITHUB_TOKEN || '',
      jiraApiToken: process.env.JIRA_API_TOKEN || '',
      jiraBaseUrl: process.env.JIRA_BASE_URL || '',
      jiraEmail: process.env.JIRA_EMAIL || '',
    });
    
    // Process ticket asynchronously (don't block webhook response)
    // In production, this should use a queue system like Bull or AWS SQS
    processTicketAsync(aiAgent, ticketInfo);
    
    return NextResponse.json({
      message: 'Ticket assignment received and queued for processing',
      ticketId: ticketInfo.ticketId,
      processed: true,
    });
    
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Process ticket asynchronously
 */
async function processTicketAsync(aiAgent: AIAgent, ticketInfo: any) {
  try {
    console.log(`Starting AI processing for ticket: ${ticketInfo.ticketId}`);
    
    // Analyze ticket and generate implementation plan
    const result = await aiAgent.processTicket(ticketInfo);
    
    console.log(`Successfully processed ticket: ${ticketInfo.ticketId}`);
    console.log('Implementation plan:', result.plan);
    
    // Store result in database or send notification
    // This is where you'd integrate with your database
    
  } catch (error) {
    console.error(`Error processing ticket ${ticketInfo.ticketId}:`, error);
    
    // In production, you'd want to:
    // 1. Log to error tracking service (Sentry, etc.)
    // 2. Update ticket with error comment
    // 3. Notify team of failure
  }
}

/**
 * GET /api/webhook
 * Health check endpoint
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'ok',
    message: 'AI Agent Webhook Endpoint',
    timestamp: new Date().toISOString(),
  });
}