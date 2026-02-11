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
    projectKey: issue?.fields?.project?.key || '',
    issueType: issue?.fields?.issuetype?.name || '',
    labels: issue?.fields?.labels || [],
    components: issue?.fields?.components?.map((c: any) => c.name) || [],
  };
}

/**
 * Check if the webhook event should trigger the AI agent
 */
function shouldProcessWebhook(payload: any): boolean {
  const webhookEvent = payload.webhookEvent;
  const issue = payload.issue;
  
  // Process when issue is assigned or updated with specific labels
  if (webhookEvent === 'jira:issue_updated') {
    const changelog = payload.changelog;
    
    // Check if assignee was changed
    const assigneeChanged = changelog?.items?.some(
      (item: any) => item.field === 'assignee'
    );
    
    // Check if AI label was added
    const aiLabelAdded = issue?.fields?.labels?.includes('ai-agent') ||
                         issue?.fields?.labels?.includes('auto-implement');
    
    return assigneeChanged || aiLabelAdded;
  }
  
  return webhookEvent === 'jira:issue_created' && 
         issue?.fields?.labels?.includes('ai-agent');
}

/**
 * POST handler for webhook events
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
    
    // Parse the payload
    const payload = JSON.parse(rawBody);
    
    // Check if we should process this webhook
    if (!shouldProcessWebhook(payload)) {
      return NextResponse.json({
        message: 'Webhook received but not processed',
        reason: 'Event type or conditions not met'
      });
    }
    
    // Extract ticket information
    const ticketInfo = extractTicketInfo(payload);
    
    console.log('Processing ticket:', ticketInfo.ticketId);
    
    // Initialize AI Agent
    const aiAgent = new AIAgent({
      openaiApiKey: process.env.OPENAI_API_KEY || '',
      githubToken: process.env.GITHUB_TOKEN || '',
      jiraConfig: {
        host: process.env.JIRA_HOST || '',
        email: process.env.JIRA_EMAIL || '',
        apiToken: process.env.JIRA_API_TOKEN || '',
      },
    });
    
    // Process the ticket asynchronously (don't wait for completion)
    // This prevents webhook timeout
    aiAgent.processTicket(ticketInfo).catch((error) => {
      console.error('Error processing ticket:', error);
      // Log error to monitoring service
    });
    
    return NextResponse.json({
      success: true,
      message: 'Ticket processing initiated',
      ticketId: ticketInfo.ticketId,
    });
    
  } catch (error) {
    console.error('Webhook error:', error);
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
 * GET handler for health check
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'ok',
    service: 'AI Agent Webhook Handler',
    timestamp: new Date().toISOString(),
  });
}