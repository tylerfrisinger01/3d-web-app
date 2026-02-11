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

  // In production, implement proper HMAC verification
  // For now, simple comparison
  const crypto = require('crypto');
  const expectedSignature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(body)
    .digest('hex');

  return signature === expectedSignature;
}

/**
 * POST /api/webhook
 * Receives webhook events from Jira when tickets are assigned
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    
    // Verify webhook signature in production
    if (process.env.NODE_ENV === 'production') {
      if (!verifyWebhookSignature(request, body)) {
        return NextResponse.json(
          { error: 'Invalid webhook signature' },
          { status: 401 }
        );
      }
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

    // Step 2: Generate implementation plan
    const plan = await generateImplementationPlan(ticket, analysis);

    // Step 3: Generate code based on the plan
    const codeChanges = await generateCode(plan, ticket);

    // Step 4: Run tests (if applicable)
    const testResults = await runTests(codeChanges);

    if (!testResults.passed) {
      console.error('Tests failed:', testResults.errors);
      await updateTicketStatus(ticket.key, 'Failed', {
        comment: `Automated implementation failed tests:\n${testResults.errors.join('\n')}`
      });
      
      return NextResponse.json({
        success: false,
        message: 'Tests failed',
        errors: testResults.errors
      }, { status: 200 });
    }

    // Step 5: Create pull request
    const prUrl = await createPullRequest({
      ticketKey: ticket.key,
      title: `[${ticket.key}] ${ticket.summary}`,
      description: generatePRDescription(ticket, analysis, plan),
      changes: codeChanges,
      branch: `feature/${ticket.key.toLowerCase()}-ai-implementation`
    });

    // Update ticket with PR link
    await updateTicketStatus(ticket.key, 'In Review', {
      comment: `Pull request created: ${prUrl}\n\nImplementation plan:\n${formatPlan(plan)}`
    });

    return NextResponse.json({
      success: true,
      ticketKey: ticket.key,
      prUrl,
      analysis,
      plan
    });

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

  // GitHub issue assignment
  if (payload.action === 'assigned' && payload.issue) {
    return true;
  }

  return false;
}

/**
 * Extract ticket data from webhook payload
 */
function extractTicketData(payload: any): TicketData {
  // Jira format
  if (payload.issue && payload.issue.key) {
    return {
      key: payload.issue.key,
      summary: payload.issue.fields.summary,
      description: payload.issue.fields.description || '',
      type: payload.issue.fields.issuetype.name,
      priority: payload.issue.fields.priority?.name || 'Medium',
      assignee: payload.issue.fields.assignee?.displayName || 'AI Agent',
      labels: payload.issue.fields.labels || [],
      project: payload.issue.fields.project.key
    };
  }

  // GitHub format
  if (payload.issue) {
    return {
      key: `GH-${payload.issue.number}`,
      summary: payload.issue.title,
      description: payload.issue.body || '',
      type: 'Task',
      priority: 'Medium',
      assignee: payload.assignee?.login || 'AI Agent',
      labels: payload.issue.labels?.map((l: any) => l.name) || [],
      project: payload.repository.name
    };
  }

  throw new Error('Invalid webhook payload format');
}

/**
 * Generate code based on implementation plan
 */
async function generateCode(plan: ImplementationPlan, ticket: TicketData): Promise<CodeChange[]> {
  const { generateCodeFromPlan } = await import('@/lib/ai-agent');
  return generateCodeFromPlan(plan, ticket);
}

/**
 * Run tests on generated code
 */
async function runTests(codeChanges: CodeChange[]): Promise<TestResults> {
  // In a real implementation, this would:
  // 1. Create a temporary branch
  // 2. Apply code changes
  // 3. Run test suite
  // 4. Return results

  // For now, return mock success
  return {
    passed: true,
    errors: [],
    coverage: 85
  };
}

/**
 * Generate PR description
 */
function generatePRDescription(
  ticket: TicketData,
  analysis: TicketAnalysis,
  plan: ImplementationPlan
): string {
  return `## ${ticket.key}: ${ticket.summary}

### Description
${ticket.description}

### AI Analysis
**Complexity:** ${analysis.complexity}
**Estimated Effort:** ${analysis.estimatedEffort}

**Key Requirements:**
${analysis.requirements.map(r => `- ${r}`).join('\n')}

**Potential Risks:**
${analysis.risks.map(r => `- ${r}`).join('\n')}

### Implementation Plan
${plan.subtasks.map((task, i) => `
#### ${i + 1}. ${task.title}
${task.description}
**Files:** ${task.files.join(', ')}
`).join('\n')}

### Testing
- [ ] Unit tests added/updated
- [ ] Integration tests passing
- [ ] Manual testing completed

---
*This PR was automatically generated by AI Software Engineer Agent*
`;
}

/**
 * Format plan for ticket comment
 */
function formatPlan(plan: ImplementationPlan): string {
  return plan.subtasks.map((task, i) => 
    `${i + 1}. ${task.title}\n   ${task.description}`
  ).join('\n\n');
}

// Type definitions
interface TicketData {
  key: string;
  summary: string;
  description: string;
  type: string;
  priority: string;
  assignee: string;
  labels: string[];
  project: string;
}

interface TicketAnalysis {
  complexity: 'low' | 'medium' | 'high';
  estimatedEffort: string;
  requirements: string[];
  risks: string[];
  dependencies: string[];
}

interface ImplementationPlan {
  subtasks: Subtask[];
  architecture: string;
  testingStrategy: string;
}

interface Subtask {
  title: string;
  description: string;
  files: string[];
  dependencies: string[];
}

interface CodeChange {
  path: string;
  content: string;
  action: 'create' | 'modify' | 'delete';
}

interface TestResults {
  passed: boolean;
  errors: string[];
  coverage?: number;
}