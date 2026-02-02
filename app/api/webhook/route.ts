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
  if (!issue) {
    return null;
  }

  return {
    key: issue.key,
    summary: issue.fields?.summary || '',
    description: issue.fields?.description || '',
    assignee: issue.fields?.assignee?.displayName || '',
    assigneeEmail: issue.fields?.assignee?.emailAddress || '',
    status: issue.fields?.status?.name || '',
    priority: issue.fields?.priority?.name || '',
    issueType: issue.fields?.issuetype?.name || '',
    projectKey: issue.fields?.project?.key || '',
    labels: issue.fields?.labels || [],
    components: issue.fields?.components?.map((c: any) => c.name) || [],
  };
}

/**
 * Check if the webhook event is a ticket assignment
 */
function isTicketAssignment(payload: any): boolean {
  const webhookEvent = payload.webhookEvent;
  const changelog = payload.changelog;

  // Check if it's an issue update event
  if (webhookEvent !== 'jira:issue_updated') {
    return false;
  }

  // Check if assignee was changed
  if (changelog?.items) {
    return changelog.items.some(
      (item: any) => item.field === 'assignee' && item.toString
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

    // Verify webhook signature (optional but recommended)
    if (WEBHOOK_SECRET && !verifyWebhookSignature(rawBody, signature)) {
      console.error('Invalid webhook signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Parse the payload
    const payload = JSON.parse(rawBody);

    console.log('Received webhook event:', payload.webhookEvent);

    // Check if this is a ticket assignment event
    if (!isTicketAssignment(payload)) {
      console.log('Not a ticket assignment event, ignoring');
      return NextResponse.json({
        message: 'Event ignored - not a ticket assignment',
      });
    }

    // Extract ticket information
    const ticketInfo = extractTicketInfo(payload);
    if (!ticketInfo) {
      console.error('Failed to extract ticket information');
      return NextResponse.json(
        { error: 'Invalid ticket data' },
        { status: 400 }
      );
    }

    console.log('Processing ticket assignment:', ticketInfo.key);

    // Initialize AI Agent
    const aiAgent = new AIAgent();

    // Process the ticket asynchronously (don't block webhook response)
    processTicketAsync(aiAgent, ticketInfo).catch((error) => {
      console.error('Error processing ticket:', error);
    });

    // Return immediate response to webhook
    return NextResponse.json({
      message: 'Ticket assignment received and processing started',
      ticketKey: ticketInfo.key,
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
    console.log(`Starting AI analysis for ticket ${ticketInfo.key}`);

    // Step 1: Analyze the ticket with AI
    const analysis = await aiAgent.analyzeTicket(ticketInfo);
    console.log('Ticket analysis complete:', analysis.summary);

    // Step 2: Break down into subtasks
    const subtasks = await aiAgent.breakdownIntoSubtasks(ticketInfo, analysis);
    console.log(`Generated ${subtasks.length} subtasks`);

    // Step 3: Generate implementation plan
    const plan = await aiAgent.generateImplementationPlan(
      ticketInfo,
      analysis,
      subtasks
    );
    console.log('Implementation plan generated');

    // Step 4: Generate code for each subtask
    const codeChanges = await aiAgent.generateCode(ticketInfo, plan);
    console.log(`Generated code changes for ${codeChanges.files.length} files`);

    // Step 5: Run tests (if configured)
    if (process.env.RUN_TESTS === 'true') {
      const testResults = await aiAgent.runTests(codeChanges);
      console.log('Test results:', testResults.summary);

      // If tests fail, attempt to fix
      if (!testResults.passed) {
        console.log('Tests failed, attempting to fix...');
        const fixedCode = await aiAgent.fixFailingTests(
          codeChanges,
          testResults
        );
        codeChanges.files = fixedCode.files;
      }
    }

    // Step 6: Create pull request
    const pullRequest = await aiAgent.createPullRequest(
      ticketInfo,
      codeChanges,
      plan
    );
    console.log(`Pull request created: ${pullRequest.url}`);

    // Step 7: Update Jira ticket with PR link
    await aiAgent.updateJiraTicket(ticketInfo.key, {
      comment: `AI Agent has analyzed this ticket and created a pull request: ${pullRequest.url}`,
      prLink: pullRequest.url,
    });

    console.log(`Successfully processed ticket ${ticketInfo.key}`);
  } catch (error) {
    console.error(`Error in async ticket processing:`, error);

    // Update Jira ticket with error
    try {
      await aiAgent.updateJiraTicket(ticketInfo.key, {
        comment: `AI Agent encountered an error while processing this ticket: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      });
    } catch (updateError) {
      console.error('Failed to update Jira ticket with error:', updateError);
    }
  }
}

/**
 * GET /api/webhook
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'AI Agent webhook endpoint is running',
    timestamp: new Date().toISOString(),
  });
}