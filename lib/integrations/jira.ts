import axios, { AxiosInstance } from 'axios';
import { JiraTicket } from '../types/agent';

export class JiraClient {
  private client: AxiosInstance;
  private baseUrl: string;

  constructor(baseUrl: string, email: string, apiToken: string) {
    this.baseUrl = baseUrl;
    this.client = axios.create({
      baseURL: `${baseUrl}/rest/api/3`,
      auth: {
        username: email,
        password: apiToken,
      },
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      timeout: 30000,
    });
  }

  async getTicket(ticketKey: string): Promise<JiraTicket> {
    try {
      const response = await this.client.get(`/issue/${ticketKey}`, {
        params: {
          fields: 'summary,description,priority,status,assignee,reporter,created,updated,labels,components',
        },
      });

      const issue = response.data;
      return {
        id: issue.id,
        key: issue.key,
        summary: issue.fields.summary,
        description: issue.fields.description || '',
        priority: issue.fields.priority?.name || 'Medium',
        status: issue.fields.status?.name || 'Open',
        assignee: issue.fields.assignee ? {
          accountId: issue.fields.assignee.accountId,
          displayName: issue.fields.assignee.displayName,
          emailAddress: issue.fields.assignee.emailAddress,
        } : undefined,
        reporter: {
          accountId: issue.fields.reporter.accountId,
          displayName: issue.fields.reporter.displayName,
        },
        created: issue.fields.created,
        updated: issue.fields.updated,
        labels: issue.fields.labels || [],
        components: issue.fields.components || [],
      };
    } catch (error) {
      console.error('Failed to fetch Jira ticket', {
        ticketKey,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error(`Failed to fetch ticket ${ticketKey}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async addComment(ticketKey: string, comment: string): Promise<void> {
    try {
      await this.client.post(`/issue/${ticketKey}/comment`, {
        body: {
          type: 'doc',
          version: 1,
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: comment,
                },
              ],
            },
          ],
        },
      });
      console.log('Added comment to Jira ticket', { ticketKey });
    } catch (error) {
      console.error('Failed to add comment to Jira ticket', {
        ticketKey,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error(`Failed to add comment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateStatus(ticketKey: string, transitionName: string): Promise<void> {
    try {
      // First, get available transitions
      const transitionsResponse = await this.client.get(`/issue/${ticketKey}/transitions`);
      const transitions = transitionsResponse.data.transitions;
      
      const transition = transitions.find(
        (t: { name: string }) => t.name.toLowerCase() === transitionName.toLowerCase()
      );

      if (!transition) {
        console.warn('Transition not found', { ticketKey, transitionName, availableTransitions: transitions.map((t: { name: string }) => t.name) });
        return;
      }

      await this.client.post(`/issue/${ticketKey}/transitions`, {
        transition: {
          id: transition.id,
        },
      });

      console.log('Updated Jira ticket status', { ticketKey, transitionName });
    } catch (error) {
      console.error('Failed to update Jira ticket status', {
        ticketKey,
        transitionName,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error(`Failed to update status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async createSubtask(parentKey: string, summary: string, description: string): Promise<string> {
    try {
      // Get parent issue to extract project key
      const parent = await this.getTicket(parentKey);
      const projectKey = parent.key.split('-')[0];

      const response = await this.client.post('/issue', {
        fields: {
          project: {
            key: projectKey,
          },
          parent: {
            key: parentKey,
          },
          summary,
          description: {
            type: 'doc',
            version: 1,
            content: [
              {
                type: 'paragraph',
                content: [
                  {
                    type: 'text',
                    text: description,
                  },
                ],
              },
            ],
          },
          issuetype: {
            name: 'Subtask',
          },
        },
      });

      const subtaskKey = response.data.key;
      console.log('Created Jira subtask', { parentKey, subtaskKey, summary });
      return subtaskKey;
    } catch (error) {
      console.error('Failed to create Jira subtask', {
        parentKey,
        summary,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error(`Failed to create subtask: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async verifyWebhookSignature(payload: string, signature: string, secret: string): Promise<boolean> {
    try {
      const crypto = await import('crypto');
      const hmac = crypto.createHmac('sha256', secret);
      hmac.update(payload);
      const expectedSignature = hmac.digest('hex');
      return signature === expectedSignature;
    } catch (error) {
      console.error('Failed to verify webhook signature', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }
}