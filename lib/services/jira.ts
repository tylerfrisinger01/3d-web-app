import axios, { AxiosInstance } from 'axios';

interface JiraConfig {
  domain: string;
  email: string;
  apiToken: string;
}

interface JiraIssue {
  id: string;
  key: string;
  fields: {
    summary: string;
    description?: string;
    status: {
      name: string;
    };
    assignee?: {
      displayName: string;
      emailAddress: string;
    };
  };
}

interface CreateSubtaskParams {
  parentKey: string;
  summary: string;
  description: string;
  projectKey: string;
}

export class JiraService {
  private client: AxiosInstance;
  private config: JiraConfig;

  constructor(config?: JiraConfig) {
    this.config = config || {
      domain: process.env.JIRA_DOMAIN || '',
      email: process.env.JIRA_EMAIL || '',
      apiToken: process.env.JIRA_API_TOKEN || '',
    };

    if (!this.config.domain || !this.config.email || !this.config.apiToken) {
      throw new Error('Jira configuration is incomplete');
    }

    this.client = axios.create({
      baseURL: `https://${this.config.domain}/rest/api/3`,
      auth: {
        username: this.config.email,
        password: this.config.apiToken,
      },
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async getIssue(issueKey: string): Promise<JiraIssue> {
    try {
      const response = await this.client.get(`/issue/${issueKey}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching issue ${issueKey}:`, error);
      throw new Error(`Failed to fetch issue: ${issueKey}`);
    }
  }

  async createSubtask(params: CreateSubtaskParams): Promise<JiraIssue> {
    try {
      const response = await this.client.post('/issue', {
        fields: {
          project: {
            key: params.projectKey,
          },
          parent: {
            key: params.parentKey,
          },
          summary: params.summary,
          description: {
            type: 'doc',
            version: 1,
            content: [
              {
                type: 'paragraph',
                content: [
                  {
                    type: 'text',
                    text: params.description,
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

      return response.data;
    } catch (error) {
      console.error('Error creating subtask:', error);
      throw new Error('Failed to create subtask in Jira');
    }
  }

  async addComment(issueKey: string, comment: string): Promise<void> {
    try {
      await this.client.post(`/issue/${issueKey}/comment`, {
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
    } catch (error) {
      console.error(`Error adding comment to ${issueKey}:`, error);
      throw new Error('Failed to add comment to Jira issue');
    }
  }

  async transitionIssue(
    issueKey: string,
    transitionId: string
  ): Promise<void> {
    try {
      await this.client.post(`/issue/${issueKey}/transitions`, {
        transition: {
          id: transitionId,
        },
      });
    } catch (error) {
      console.error(`Error transitioning issue ${issueKey}:`, error);
      throw new Error('Failed to transition Jira issue');
    }
  }

  async getTransitions(issueKey: string): Promise<any[]> {
    try {
      const response = await this.client.get(`/issue/${issueKey}/transitions`);
      return response.data.transitions;
    } catch (error) {
      console.error(`Error fetching transitions for ${issueKey}:`, error);
      throw new Error('Failed to fetch issue transitions');
    }
  }
}