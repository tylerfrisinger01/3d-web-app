import { NextRequest, NextResponse } from 'next/server';
import { analyzeTicket, generateImplementationPlan } from '@/lib/ai-agent';
import { createPullRequest } from '@/lib/github';
import { updateTicketStatus } from '@/lib/jira';

// Webhook secret for verification
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || '';

/**
 * Verify webhook signature to ensure request is authentic
 */
function verifyWebhookSignature(request: NextRequest, body: string): boolean {
  const signature = request.headers.get('x-webhook-signature');
  
  if (!signature || !WEBHOOK_SECRET) {
    return false;
  }

  // Implement HMAC verification
  const crypto = require('crypto');
  const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
  const digest = hmac.update(body).digest('hex');
  
  return signature === digest;
}

/**
 * POST /api/webhook
 * Receives webhook events from Jira when tickets are assigned
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    
    // Verify webhook signature for security
    if (WEBHOOK_SECRET && !verifyWebhookSignature(request, body)) {
      console.error('Invalid webhook signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    const payload = JSON.parse(body);
    
    // Check if this is a ticket assignment event
    if (!isTicketAssignmentEvent(payload)) {
      return NextResponse.json(
        { message: 'Event ignored - not a ticket assignment' },
        { status: 200 }
      );
    }

    const ticket = extractTicketData(payload);
    
    console.log(`Processing ticket: ${ticket.key} - ${ticket.summary}`);

    // Update ticket status to "In Progress"
    await updateTicketStatus(ticket.key, 'In Progress');

    // Step 1: Analyze the ticket with AI
    const analysis = await analyzeTicket(ticket);
    
    console.log('Ticket analysis complete:', analysis);

    // Step 2: Generate implementation plan
    const plan = await generateImplementationPlan(ticket, analysis);
    
    console.log('Implementation plan generated:', plan);

    // Step 3: Generate code for each subtask
    const codeChanges = await generateCodeChanges(plan);
    
    console.log(`Generated ${codeChanges.length} file changes`);

    // Step 4: Run tests (if configured)
    if (process.env.RUN_TESTS === 'true') {
      const testResults = await runTests(codeChanges);
      
      if (!testResults.passed) {
        console.error('Tests failed:', testResults.errors);
        await updateTicketStatus(ticket.key, 'Failed Tests', testResults.errors.join('\n'));
        
        return NextResponse.json({
          success: false,
          message: 'Tests failed',
          errors: testResults.errors
        }, { status: 200 });
      }
    }

    // Step 5: Create pull request
    const prUrl = await createPullRequest({
      ticketKey: ticket.key,
      title: `${ticket.key}: ${ticket.summary}`,
      description: generatePRDescription(ticket, plan, analysis),
      changes: codeChanges,
      branch: `feature/${ticket.key.toLowerCase()}`
    });

    console.log(`Pull request created: ${prUrl}`);

    // Update ticket with PR link
    await updateTicketStatus(
      ticket.key,
      'Code Review',
      `Pull request created: ${prUrl}`
    );

    return NextResponse.json({
      success: true,
      ticket: ticket.key,
      pullRequest: prUrl,
      analysis,
      plan
    }, { status: 200 });

  } catch (error) {
    console.error('Webhook processing error:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/webhook
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'AI Software Engineer Webhook',
    timestamp: new Date().toISOString()
  });
}

/**
 * Check if the webhook event is a ticket assignment
 */
function isTicketAssignmentEvent(payload: any): boolean {
  // Jira webhook structure
  if (payload.webhookEvent === 'jira:issue_updated') {
    const changelog = payload.changelog;
    if (changelog && changelog.items) {
      return changelog.items.some(
        (item: any) => item.field === 'assignee' && item.toString !== null
      );
    }
  }
  
  // Also handle issue creation events
  if (payload.webhookEvent === 'jira:issue_created') {
    return payload.issue?.fields?.assignee !== null;
  }
  
  return false;
}

/**
 * Extract ticket data from webhook payload
 */
function extractTicketData(payload: any) {
  const issue = payload.issue;
  
  return {
    key: issue.key,
    summary: issue.fields.summary,
    description: issue.fields.description || '',
    type: issue.fields.issuetype?.name || 'Task',
    priority: issue.fields.priority?.name || 'Medium',
    assignee: issue.fields.assignee?.displayName || 'Unknown',
    labels: issue.fields.labels || [],
    components: issue.fields.components?.map((c: any) => c.name) || [],
    project: issue.fields.project?.key || ''
  };
}

/**
 * Generate code changes based on implementation plan
 */
async function generateCodeChanges(plan: any) {
  const { generateCode } = await import('@/lib/ai-agent');
  
  const changes = [];
  
  for (const subtask of plan.subtasks) {
    const code = await generateCode(subtask, plan.context);
    changes.push(...code);
  }
  
  return changes;
}

/**
 * Run tests on generated code
 */
async function runTests(codeChanges: any[]) {
  // This would integrate with your test runner
  // For now, return a mock result
  return {
    passed: true,
    errors: []
  };
}

/**
 * Generate pull request description
 */
function generatePRDescription(ticket: any, plan: any, analysis: any): string {
  return `## ${ticket.key}: ${ticket.summary}

### Description
${ticket.description}

### AI Analysis
${analysis.summary}

**Complexity:** ${analysis.complexity}
**Estimated Effort:** ${analysis.estimatedEffort}

### Implementation Plan
${plan.subtasks.map((task: any, index: number) => 
  `${index + 1}. ${task.title}\n   - ${task.description}`
).join('\n')}

### Files Changed
${plan.subtasks.map((task: any) => 
  task.files.map((file: string) => `- \`${file}\``).join('\n')
).join('\n')}

### Testing
- [ ] Unit tests added/updated
- [ ] Integration tests passing
- [ ] Manual testing completed

---
*This pull request was automatically generated by AI Software Engineer Agent*
`;
}