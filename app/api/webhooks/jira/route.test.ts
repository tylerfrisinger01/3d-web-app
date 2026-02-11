import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, GET } from './route';
import { NextRequest } from 'next/server';
import { AIAgent } from '@/lib/ai/agent';

// Mock dependencies
vi.mock('@/lib/ai/agent');
vi.mock('next/headers', () => ({
  headers: vi.fn(() => ({
    get: vi.fn((key: string) => {
      if (key === 'x-hub-signature-256') return 'valid-signature';
      return null;
    }),
  })),
}));

describe('Jira Webhook Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JIRA_WEBHOOK_SECRET = 'test-secret';
    process.env.AI_AGENT_EMAIL = 'ai-agent@example.com';
    process.env.OPENAI_API_KEY = 'test-openai-key';
    process.env.GITHUB_TOKEN = 'test-github-token';
    process.env.JIRA_API_TOKEN = 'test-jira-token';
    process.env.JIRA_EMAIL = 'test@example.com';
    process.env.JIRA_BASE_URL = 'https://test.atlassian.net';
  });

  describe('GET', () => {
    it('should return health check status', async () => {
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('ok');
      expect(data.message).toBe('Jira webhook endpoint is active');
    });
  });

  describe('POST', () => {
    it('should process ticket when assigned to AI agent', async () => {
      const mockProcessTicket = vi.fn().mockResolvedValue(undefined);
      vi.mocked(AIAgent).mockImplementation(
        () =>
          ({
            processTicket: mockProcessTicket,
          } as any)
      );

      const payload = {
        webhookEvent: 'jira:issue_updated',
        changelog: {
          items: [
            {
              field: 'assignee',
              toString: 'AI Agent',
            },
          ],
        },
        issue: {
          key: 'TEST-123',
          fields: {
            summary: 'Test ticket',
            description: 'Test description',
            project: { key: 'TEST' },
            assignee: {
              emailAddress: 'ai-agent@example.com',
              displayName: 'AI Agent',
            },
          },
        },
      };

      const request = new NextRequest('http://localhost:3000/api/webhooks/jira', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(202);
      expect(data.message).toBe('Ticket processing started');
      expect(data.ticketId).toBe('TEST-123');
    });

    it('should ignore non-assignment events', async () => {
      const payload = {
        webhookEvent: 'jira:issue_updated',
        changelog: {
          items: [
            {
              field: 'status',
              toString: 'In Progress',
            },
          ],
        },
        issue: {
          key: 'TEST-123',
          fields: {
            summary: 'Test ticket',
          },
        },
      };

      const request = new NextRequest('http://localhost:3000/api/webhooks/jira', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Event ignored - not an assignment');
    });

    it('should ignore tickets not assigned to AI agent', async () => {
      const payload = {
        webhookEvent: 'jira:issue_updated',
        changelog: {
          items: [
            {
              field: 'assignee',
              toString: 'Human Developer',
            },
          ],
        },
        issue: {
          key: 'TEST-123',
          fields: {
            summary: 'Test ticket',
            assignee: {
              emailAddress: 'human@example.com',
              displayName: 'Human Developer',
            },
          },
        },
      };

      const request = new NextRequest('http://localhost:3000/api/webhooks/jira', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Not assigned to AI agent');
    });

    it('should return 400 when issue is missing', async () => {
      const payload = {
        webhookEvent: 'jira:issue_updated',
        changelog: {
          items: [
            {
              field: 'assignee',
              toString: 'AI Agent',
            },
          ],
        },
      };

      const request = new NextRequest('http://localhost:3000/api/webhooks/jira', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('No issue in payload');
    });

    it('should handle errors gracefully', async () => {
      const request = new NextRequest('http://localhost:3000/api/webhooks/jira', {
        method: 'POST',
        body: 'invalid json',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });
});