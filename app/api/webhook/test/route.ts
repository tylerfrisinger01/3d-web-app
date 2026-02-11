import { NextRequest, NextResponse } from 'next/server';

// Test endpoint to simulate webhook calls for development
export async function POST(request: NextRequest) {
  const testPayload = {
    webhookEvent: 'jira:issue_updated',
    issue_event_type_name: 'issue_assigned',
    issue: {
      id: '10001',
      key: 'TEST-123',
      fields: {
        summary: 'Implement user authentication system',
        description:
          'Build a complete authentication system with login, registration, password reset, and JWT token management. Should support OAuth providers (Google, GitHub) and email/password authentication.',
        assignee: {
          displayName: 'AI Agent',
          emailAddress: 'ai-agent@example.com',
        },
        status: {
          name: 'To Do',
        },
        issuetype: {
          name: 'Story',
        },
        project: {
          key: 'TEST',
          name: 'Test Project',
        },
      },
    },
  };

  try {
    // Forward to the actual webhook endpoint
    const webhookUrl = new URL('/api/webhook', request.url);
    const response = await fetch(webhookUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-secret': process.env.JIRA_WEBHOOK_SECRET || 'test-secret',
      },
      body: JSON.stringify(testPayload),
    });

    const data = await response.json();

    return NextResponse.json({
      message: 'Test webhook sent',
      testPayload,
      response: data,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Test webhook failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}