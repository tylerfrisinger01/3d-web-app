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
        const agent = new AIAgent({
          openaiApiKey: process.env.OPENAI_API_KEY!,
          jiraConfig: {
            host: process.env.JIRA_HOST!,
            email: process.env.JIRA_EMAIL!,
            apiToken: process.env.JIRA_API_TOKEN!,
          },
          githubConfig: {
            token: process.env.GITHUB_TOKEN!,
            owner: process.env.GITHUB_OWNER!,
            repo: process.env.GITHUB_REPO!,
          },
        });

        // Process ticket asynchronously
        processTicketAsync(agent, issue);

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
async function processTicketAsync(agent: AIAgent, issue: any) {
  try {
    const ticketData = {
      key: issue.key,
      summary: issue.fields.summary,
      description: issue.fields.description,
      issueType: issue.fields.issuetype.name,
      priority: issue.fields.priority?.name,
      labels: issue.fields.labels || [],
      components: issue.fields.components?.map((c: any) => c.name) || [],
    };

    console.log(`Processing ticket ${ticketData.key}...`);

    // Step 1: Analyze ticket with AI
    const analysis = await agent.analyzeTicket(ticketData);
    console.log(`Analysis complete for ${ticketData.key}`);

    // Step 2: Break down into subtasks
    const subtasks = await agent.createSubtasks(ticketData, analysis);
    console.log(`Created ${subtasks.length} subtasks for ${ticketData.key}`);

    // Step 3: Generate implementation plan
    const plan = await agent.generateImplementationPlan(ticketData, analysis, subtasks);
    console.log(`Implementation plan generated for ${ticketData.key}`);

    // Step 4: Generate code
    const codeChanges = await agent.generateCode(ticketData, plan);
    console.log(`Code generated for ${ticketData.key}`);

    // Step 5: Create branch and commit
    const branchName = await agent.createBranch(ticketData.key);
    await agent.commitChanges(branchName, codeChanges, ticketData);

    // Step 6: Run tests (if configured)
    if (process.env.RUN_TESTS === 'true') {
      const testResults = await agent.runTests(branchName);
      if (!testResults.success) {
        console.error(`Tests failed for ${ticketData.key}:`, testResults.errors);
        await agent.updateTicketStatus(ticketData.key, 'In Progress', 'Tests failed. Manual intervention required.');
        return;
      }
    }

    // Step 7: Create pull request
    const prUrl = await agent.createPullRequest(branchName, ticketData, plan);
    console.log(`Pull request created for ${ticketData.key}: ${prUrl}`);

    // Step 8: Update ticket with PR link
    await agent.updateTicketStatus(
      ticketData.key,
      'In Review',
      `Implementation complete. Pull request: ${prUrl}`
    );

    console.log(`Successfully processed ticket ${ticketData.key}`);
  } catch (error) {
    console.error(`Error processing ticket ${issue.key}:`, error);
    try {
      await agent.updateTicketStatus(
        issue.key,
        'In Progress',
        `Error during automated processing: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } catch (updateError) {
      console.error('Failed to update ticket status:', updateError);
    }
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'healthy',
    service: 'AI Agent Webhook',
    timestamp: new Date().toISOString(),
  });
}