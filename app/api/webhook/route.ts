import { NextRequest, NextResponse } from 'next/server';
import { AIAgent } from '@/lib/ai-agent';
import crypto from 'crypto';

// Verify webhook signature for security
function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const hmac = crypto.createHmac('sha256', secret);
  const digest = hmac.update(payload).digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(digest)
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-webhook-signature') || '';
    const webhookSecret = process.env.WEBHOOK_SECRET || '';

    // Verify webhook signature if secret is configured
    if (webhookSecret && !verifyWebhookSignature(body, signature, webhookSecret)) {
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 401 }
      );
    }

    const payload = JSON.parse(body);

    // Handle Jira webhook events
    if (payload.webhookEvent === 'jira:issue_updated') {
      const issue = payload.issue;
      const changelog = payload.changelog;

      // Check if ticket was assigned
      const assigneeChange = changelog?.items?.find(
        (item: any) => item.field === 'assignee'
      );

      if (assigneeChange && assigneeChange.toString === process.env.AI_AGENT_USER_ID) {
        console.log(`AI Agent assigned to ticket: ${issue.key}`);

        // Initialize AI Agent
        const aiAgent = new AIAgent({
          openaiApiKey: process.env.OPENAI_API_KEY || '',
          jiraConfig: {
            host: process.env.JIRA_HOST || '',
            email: process.env.JIRA_EMAIL || '',
            apiToken: process.env.JIRA_API_TOKEN || '',
          },
          githubConfig: {
            token: process.env.GITHUB_TOKEN || '',
            owner: process.env.GITHUB_OWNER || '',
            repo: process.env.GITHUB_REPO || '',
          },
        });

        // Process ticket asynchronously
        processTicketAsync(aiAgent, issue);

        return NextResponse.json({
          success: true,
          message: 'Ticket processing initiated',
          ticketKey: issue.key,
        });
      }
    }

    return NextResponse.json({ success: true, message: 'Webhook received' });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Process ticket asynchronously to avoid timeout
async function processTicketAsync(aiAgent: AIAgent, issue: any) {
  try {
    const ticketData = {
      key: issue.key,
      summary: issue.fields.summary,
      description: issue.fields.description,
      type: issue.fields.issuetype.name,
      priority: issue.fields.priority?.name,
      labels: issue.fields.labels || [],
      components: issue.fields.components?.map((c: any) => c.name) || [],
    };

    console.log(`Processing ticket ${ticketData.key}...`);

    // Step 1: Analyze ticket with AI
    const analysis = await aiAgent.analyzeTicket(ticketData);
    console.log(`Analysis complete for ${ticketData.key}`);

    // Step 2: Break down into subtasks
    const subtasks = await aiAgent.generateSubtasks(ticketData, analysis);
    console.log(`Generated ${subtasks.length} subtasks for ${ticketData.key}`);

    // Step 3: Create implementation plan
    const implementationPlan = await aiAgent.createImplementationPlan(
      ticketData,
      analysis,
      subtasks
    );
    console.log(`Implementation plan created for ${ticketData.key}`);

    // Step 4: Generate code
    const codeChanges = await aiAgent.generateCode(
      ticketData,
      implementationPlan
    );
    console.log(`Code generated for ${ticketData.key}: ${codeChanges.files.length} files`);

    // Step 5: Run tests (if configured)
    if (process.env.RUN_TESTS === 'true') {
      const testResults = await aiAgent.runTests(codeChanges);
      console.log(`Tests completed for ${ticketData.key}: ${testResults.passed ? 'PASSED' : 'FAILED'}`);

      if (!testResults.passed) {
        console.log(`Test failures for ${ticketData.key}:`, testResults.failures);
        // Optionally: attempt to fix failing tests
      }
    }

    // Step 6: Create pull request
    const pullRequest = await aiAgent.createPullRequest(
      ticketData,
      codeChanges,
      implementationPlan
    );
    console.log(`Pull request created for ${ticketData.key}: ${pullRequest.url}`);

    // Step 7: Update Jira ticket with PR link
    await aiAgent.updateJiraTicket(ticketData.key, {
      comment: `AI Agent has analyzed this ticket and created a pull request: ${pullRequest.url}\n\nImplementation Plan:\n${implementationPlan.summary}`,
      status: 'In Review',
    });

    console.log(`Ticket ${ticketData.key} processing complete`);
  } catch (error) {
    console.error(`Error processing ticket ${issue.key}:`, error);

    // Update Jira ticket with error
    try {
      await aiAgent.updateJiraTicket(issue.key, {
        comment: `AI Agent encountered an error while processing this ticket:\n\`\`\`\n${error instanceof Error ? error.message : 'Unknown error'}\n\`\`\``,
      });
    } catch (updateError) {
      console.error('Failed to update Jira ticket with error:', updateError);
    }
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'ok',
    message: 'AI Agent Webhook Endpoint',
    version: '1.0.0',
  });
}