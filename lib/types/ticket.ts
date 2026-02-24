import { z } from 'zod';

export const TicketPrioritySchema = z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']);
export type TicketPriority = z.infer<typeof TicketPrioritySchema>;

export const TicketStatusSchema = z.enum([
  'OPEN',
  'IN_PROGRESS',
  'ANALYZING',
  'GENERATING_CODE',
  'TESTING',
  'CREATING_PR',
  'COMPLETED',
  'FAILED'
]);
export type TicketStatus = z.infer<typeof TicketStatusSchema>;

export const SubtaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  estimatedComplexity: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  dependencies: z.array(z.string()).default([]),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED']).default('PENDING'),
  filesToModify: z.array(z.string()).optional(),
});
export type Subtask = z.infer<typeof SubtaskSchema>;

export const TicketSchema = z.object({
  id: z.string(),
  key: z.string(),
  title: z.string(),
  description: z.string(),
  priority: TicketPrioritySchema,
  status: TicketStatusSchema,
  assignee: z.string().optional(),
  reporter: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  labels: z.array(z.string()).default([]),
  projectKey: z.string(),
});
export type Ticket = z.infer<typeof TicketSchema>;

export const JiraWebhookEventSchema = z.object({
  webhookEvent: z.string(),
  issue_event_type_name: z.string().optional(),
  issue: z.object({
    id: z.string(),
    key: z.string(),
    fields: z.object({
      summary: z.string(),
      description: z.string().nullable(),
      priority: z.object({
        name: z.string(),
      }),
      status: z.object({
        name: z.string(),
      }),
      assignee: z.object({
        emailAddress: z.string(),
        displayName: z.string(),
      }).nullable(),
      reporter: z.object({
        emailAddress: z.string(),
        displayName: z.string(),
      }),
      created: z.string(),
      updated: z.string(),
      labels: z.array(z.string()),
      project: z.object({
        key: z.string(),
      }),
    }),
  }),
});
export type JiraWebhookEvent = z.infer<typeof JiraWebhookEventSchema>;