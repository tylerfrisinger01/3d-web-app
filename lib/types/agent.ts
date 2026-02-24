import { z } from 'zod';

export const AgentTaskSchema = z.object({
  id: z.string(),
  ticketId: z.string(),
  ticketKey: z.string(),
  status: z.enum([
    'QUEUED',
    'ANALYZING',
    'PLANNING',
    'GENERATING_CODE',
    'RUNNING_TESTS',
    'CREATING_PR',
    'COMPLETED',
    'FAILED'
  ]),
  startedAt: z.string(),
  completedAt: z.string().optional(),
  error: z.string().optional(),
  analysis: z.object({
    summary: z.string(),
    complexity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
    estimatedTime: z.string(),
    risks: z.array(z.string()),
    subtasks: z.array(z.any()),
  }).optional(),
  generatedFiles: z.array(z.object({
    path: z.string(),
    content: z.string(),
    type: z.enum(['SOURCE', 'TEST', 'CONFIG']),
  })).optional(),
  testResults: z.object({
    passed: z.number(),
    failed: z.number(),
    total: z.number(),
    details: z.array(z.object({
      name: z.string(),
      status: z.enum(['PASSED', 'FAILED']),
      error: z.string().optional(),
    })),
  }).optional(),
  pullRequest: z.object({
    number: z.number(),
    url: z.string(),
    branch: z.string(),
  }).optional(),
});
export type AgentTask = z.infer<typeof AgentTaskSchema>;

export const CodeGenerationRequestSchema = z.object({
  ticketId: z.string(),
  ticketKey: z.string(),
  description: z.string(),
  subtasks: z.array(z.any()),
  context: z.object({
    existingFiles: z.array(z.string()).optional(),
    dependencies: z.record(z.string()).optional(),
    framework: z.string().optional(),
  }).optional(),
});
export type CodeGenerationRequest = z.infer<typeof CodeGenerationRequestSchema>;

export const GeneratedFileSchema = z.object({
  path: z.string(),
  content: z.string(),
  type: z.enum(['SOURCE', 'TEST', 'CONFIG']),
  language: z.string().optional(),
});
export type GeneratedFile = z.infer<typeof GeneratedFileSchema>;