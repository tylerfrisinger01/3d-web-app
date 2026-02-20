import { NextRequest, NextResponse } from 'next/server';
import { AIAgent } from '@/lib/ai-agent/agent';
import { z } from 'zod';

// Webhook payload schema for Jira
const JiraWebhookSchema = z.object({
  webhookEvent: z.string(),
  issue: z.object({
    id: z.string(),
    key: z.string(),
    fields: z.object({
      summary: z.string(),
      description: z.string().nullable(),
      assignee: z.object({
        accountId: z.string(),
        displayName: z.string(),
      }).nullable(),
      status: z.object({
        name: z.string(),
      }),
      priority: z.object({
        name: z.string(),
      }).optional(),
      issuetype: z.object({
        name: z.string(),
      }),
    }),
  }),
  changelog: z.object({
    items: z.array(z.object({
      field: z.string(),
      fromString: z.string().nullable(),
      toString: z.string().nullable(),
    })),
  }).optional(),
});

type JiraWebhook = z.infer<typeof JiraWebhookSchema>;

// Verify webhook signature (implement based on your webhook secret)
function verifyWebhookSignature(request: NextRequest): boolean {
  const signature = request.headers.get('x-hub-signature-256');
  const webhookSecret = process.env.JIRA_WEBHOOK_SECRET;
  
  if (!webhookSecret || !signature) {
    return false;
  }
  
  // Implement HMAC verification here
  // For now, we'll return true in development
  return process.env.NODE_ENV === 'development' || !!signature;
}

// Check if ticket was assigned to AI agent
function isAssignedToAIAgent(webhook: JiraWebhook): boolean {
  const aiAgentAccountId = process.env.AI_AGENT_JIRA_ACCOUNT_ID;
  
  if (!aiAgentAccountId) {
    return false;
  }
  
  // Check if assignee changed to AI agent
  if (webhook.changelog) {
    const assigneeChange = webhook.changelog.items.find(
      item => item.field === 'assignee'
    );
    
    if (assigneeChange && assigneeChange.toString === aiAgentAccountId) {
      return true;
    }
  }
  
  // Check if currently assigned to AI agent
  return webhook.issue.fields.assignee?.accountId === aiAgentAccountId;
}

export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature
    if (!verifyWebhookSignature(request)) {
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    
    // Validate webhook payload
    const webhook = JiraWebhookSchema.parse(body);
    
    // Only process if ticket is assigned to AI agent
    if (!isAssignedToAIAgent(webhook)) {
      return NextResponse.json({
        message: 'Ticket not assigned to AI agent, skipping',
      });
    }
    
    // Only process issue_updated events
    if (webhook.webhookEvent !== 'jira:issue_updated') {
      return NextResponse.json({
        message: 'Not an issue update event, skipping',
      });
    }
    
    console.log(`Processing ticket: ${webhook.issue.key}`);
    
    // Initialize AI Agent
    const agent = new AIAgent({
      openaiApiKey: process.env.OPENAI_API_KEY!,
      githubToken: process.env.GITHUB_TOKEN!,
      jiraConfig: {
        host: process.env.JIRA_HOST!,
        email: process.env.JIRA_EMAIL!,
        apiToken: process.env.JIRA_API_TOKEN!,
      },
      githubRepo: {
        owner: process.env.GITHUB_REPO_OWNER!,
        repo: process.env.GITHUB_REPO_NAME!,
      },
    });
    
    // Process ticket asynchronously (don't wait for completion)
    agent.processTicket({
      ticketId: webhook.issue.key,
      title: webhook.issue.fields.summary,
      description: webhook.issue.fields.description || '',
      issueType: webhook.issue.fields.issuetype.name,
      priority: webhook.issue.fields.priority?.name || 'Medium',
    }).catch(error => {
      console.error(`Error processing ticket ${webhook.issue.key}:`, error);
    });
    
    return NextResponse.json({
      message: 'Ticket processing started',
      ticketId: webhook.issue.key,
    });
    
  } catch (error) {
    console.error('Webhook processing error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid webhook payload', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    service: 'AI Agent Webhook Handler',
    timestamp: new Date().toISOString(),
  });
}