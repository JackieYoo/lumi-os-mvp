import { completeLLM } from '../llm/router.js';
import { getOrCreatePersonalityProfile, buildPersonalityContext } from '../personality/engine.js';
import { buildMemoryContext } from '../memory/context.js';
import { logger } from '../lib/logger.js';
import { getOrCreateUserSettings } from '../db/settings.js';
import { listTools } from '../tools/registry.js';
import { listMCPTools } from '../mcp/tools.js';
import { getUserToolPreferenceMap } from '../db/tool-preferences.js';

export interface PlannedStep {
  description: string;
  toolName?: string;
  toolArgs?: Record<string, unknown>;
}

export interface TaskPlan {
  title: string;
  description: string;
  steps: PlannedStep[];
}

const PLANNER_SYSTEM_PROMPT = `You are a task planner for a personal AI assistant.
Your job is to take the user's goal and break it into a short sequence of concrete steps.
Each step should be actionable and may optionally specify a tool to call.

Return ONLY a JSON object in this exact shape:
{
  "title": "Short task title",
  "description": "What this task will accomplish",
  "steps": [
    { "description": "Step description", "toolName": "optional_tool", "toolArgs": { "key": "value" } },
    { "description": "Another step" }
  ]
}

Keep steps concise. If the goal is simple, use a single step. Do not include markdown or explanations outside the JSON.`;

export async function planTask(userId: string, goal: string): Promise<TaskPlan> {
  try {
    const [personalityProfile, memoryContext, userSettings] = await Promise.all([
      getOrCreatePersonalityProfile(userId),
      buildMemoryContext(userId, goal),
      getOrCreateUserSettings(userId),
    ]);

    const personalityContext = buildPersonalityContext(personalityProfile);
    const availableTools = await buildAvailableToolList(userId);

    const messages = [
      { role: 'system' as const, content: `${PLANNER_SYSTEM_PROMPT}\n\n${availableTools}` },
      {
        role: 'system' as const,
        content: [
          'Context about the user:',
          personalityContext,
          memoryContext.summary || 'No relevant memories.',
        ]
          .filter(Boolean)
          .join('\n\n'),
      },
      { role: 'user' as const, content: `Plan this task: ${goal}` },
    ];

    const response = await completeLLM({
      provider: userSettings.provider,
      model: userSettings.model || undefined,
      messages,
      temperature: 0.3,
    });

    const parsed = parsePlanResponse(response.content, goal);
    return {
      title: parsed.title || goal,
      description: parsed.description || `Task derived from: ${goal}`,
      steps: parsed.steps.length > 0 ? parsed.steps : [{ description: goal }],
    };
  } catch (err) {
    logger.error('Task planning failed', { userId, goal, error: getErrorMessage(err) });
    return {
      title: goal,
      description: `Task derived from: ${goal}`,
      steps: [{ description: goal }],
    };
  }
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

async function buildAvailableToolList(userId: string): Promise<string> {
  const prefMap = await getUserToolPreferenceMap(userId);
  const isEnabled = (name: string): boolean => prefMap[name] !== false;

  const builtinLines = listTools()
    .filter((tool) => isEnabled(tool.name))
    .map((tool) => `- ${tool.name}`);

  const mcpLines = listMCPTools()
    .filter((tool) => isEnabled(tool.name))
    .map((tool) => `- ${tool.name} (MCP, qualified name)`);

  const lines = [...builtinLines, ...mcpLines];
  if (lines.length === 0) {
    return 'No tools are currently enabled. Plan steps that do not require tool calls.';
  }

  return `Available tools include:\n${lines.join('\n')}\n\nUse the exact toolName when specifying a tool. For MCP tools, use the qualified name shown above.`;
}

interface RawPlan {
  title?: unknown;
  description?: unknown;
  steps?: unknown;
}

function parsePlanResponse(content: string, goal: string): TaskPlan {
  try {
    const parsed = (tryParseJson(content) || tryParseMarkdownJson(content)) as RawPlan | null;
    if (!parsed) {
      throw new Error('No valid JSON found');
    }

    if (!Array.isArray(parsed.steps)) {
      throw new Error('Missing steps array');
    }

    const steps: PlannedStep[] = parsed.steps.map((step: unknown) => {
      if (typeof step !== 'object' || step === null) {
        return { description: String(step) };
      }
      const s = step as Record<string, unknown>;
      const description = typeof s.description === 'string' ? s.description : String(step);
      const toolName = typeof s.toolName === 'string' ? s.toolName : undefined;
      const toolArgs = typeof s.toolArgs === 'object' && s.toolArgs !== null ? (s.toolArgs as Record<string, unknown>) : undefined;

      if (toolName === undefined || toolName === '') {
        return { description };
      }
      return { description, toolName, toolArgs };
    });

    return {
      title: typeof parsed.title === 'string' ? parsed.title : '',
      description: typeof parsed.description === 'string' ? parsed.description : '',
      steps,
    };
  } catch (err) {
    logger.warn('Failed to parse task plan, using fallback', { error: getErrorMessage(err), content });
    return {
      title: goal,
      description: `Task derived from: ${goal}`,
      steps: [{ description: goal }],
    };
  }
}

function tryParseJson(content: string): unknown {
  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}

function tryParseMarkdownJson(content: string): unknown {
  const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
  if (!jsonMatch) return null;
  try {
    return JSON.parse(jsonMatch[1]);
  } catch {
    return null;
  }
}
