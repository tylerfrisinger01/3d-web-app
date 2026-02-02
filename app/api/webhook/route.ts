import { NextRequest, NextResponse } from 'next/server';
import { AIAgent } from '@/lib/ai-agent';
import crypto from 'crypto';

// Webhook endpoint for receiving ticket assignments from Jira
export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature if configured
    const signature = request.headers.get('x-hub-signature-256');
    const webhookSecret = process.env.WEBHOOK_SECRET;
    
    if (webhookSecret && signature) {
      const body = await request.text();
      const expectedSignature = 'sha256=' + crypto
        .createHmac('sha256', webhookSecret)
        .update(body)
        .digest('hex');
      
      if (signature !== expectedSignature) {
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        );
      }
      
      // Parse the body after verification
      const payload = JSON.parse(body);
      return await processWebhook(payload);
    } else {
      // No signature verification needed
      const payload = await request.json();
      return await processWebhook(payload);
    }
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function processWebhook(payload: any) {
  // Check if this is a ticket assignment event
  const webhookEvent = payload.webhookEvent;
  const issue = payload.issue;
  
  if (!issue) {
    return NextResponse.json(
      { message: 'No issue data in webhook' },
      { status: 200 }
    );
  }

  // Detect ticket assignment events
  const isAssignment = 
    webhookEvent === 'jira:issue_updated' && 
    payload.changelog?.items?.some((item: any) => 
      item.field === 'assignee' && item.toString
    );

  const isCreated = webhookEvent === 'jira:issue_created';

  if (!isAssignment && !isCreated) {
    return NextResponse.json(
      { message: 'Not a relevant event' },
      { status: 200 }
    );
  }

  // Extract ticket information
  const ticketData = {
    id: issue.id,
    key: issue.key,
    summary: issue.fields.summary,
    description: issue.fields.description || '',
    issueType: issue.fields.issuetype?.name,
    priority: issue.fields.priority?.name,
    assignee: issue.fields.assignee?.displayName,
    reporter: issue.fields.reporter?.displayName,
    status: issue.fields.status?.name,
    labels: issue.fields.labels || [],
    components: issue.fields.components?.map((c: any) => c.name) || [],
    project: issue.fields.project?.key,
  };

  console.log('Processing ticket:', ticketData.key);

  // Initialize AI Agent
  const agent = new AIAgent({
    openaiApiKey: process.env.OPENAI_API_KEY!,
    githubToken: process.env.GITHUB_TOKEN!,
    jiraConfig: {
      host: process.env.JIRA_HOST!,
      email: process.env.JIRA_EMAIL!,
      apiToken: process.env.JIRA_API_TOKEN!,
    },
  });

  // Process ticket asynchronously (don't block webhook response)
  agent.processTicket(ticketData).catch((error) => {
    console.error('Error processing ticket:', error);
  });

  return NextResponse.json({
    message: 'Ticket received and processing started',
    ticketKey: ticketData.key,
  });
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    service: 'AI Agent Webhook',
    timestamp: new Date().toISOString(),
  });
}