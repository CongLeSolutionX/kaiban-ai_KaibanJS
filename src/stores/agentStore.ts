/**
 * Agent Store Configuration.
 *
 * This file configures a Zustand store specifically for managing the state of agents within the KaibanJS library.
 * It outlines actions and state changes related to the lifecycle of agents, including task execution, status updates, and error handling.
 *
 * Usage:
 * Employ this store to handle state updates for agents dynamically throughout the lifecycle of their tasks and interactions.
 */

import { StateCreator } from 'zustand';
import {
  AgentBlockLog,
  AgentEndThinkingLog,
  AgentFinalAnswerLog,
  AgentIssuesParsingLLMOutputLog,
  AgentIterationLog,
  AgentLoopErrorLog,
  AgentObservationLog,
  AgentPausedLog,
  AgentResumedLog,
  AgentStartThinkingLog,
  AgentStatusLog,
  AgentTaskAbortedLog,
  AgentTaskCompletedLog,
  AgentThinkingErrorLog,
  AgentThoughtLog,
  AgentToolDoesNotExistLog,
  AgentToolEndLog,
  AgentToolErrorLog,
  AgentToolStartLog,
  AgentWeirdLLMOutputLog,
} from '../types/logs';
import { AGENT_STATUS_enum } from '../utils/enums';
import { TaskBlockError } from '../utils/errors';
import { logger } from '../utils/logger';
import { getTaskTitleForLogs } from '../utils/tasks';
import {
  AgentStoreState,
  NewAgentStatusUpdateLogParams,
} from './agentStore.types';
import { CombinedStoresState } from './teamStore.types';

export const useAgentStore: StateCreator<
  CombinedStoresState,
  [],
  [],
  AgentStoreState
> = (set, get) => ({
  handleAgentIterationStart: ({
    agent,
    task,
    iterations,
    maxAgentIterations,
  }) => {
    agent.status = AGENT_STATUS_enum.ITERATION_START;
    const newLog = get().prepareAgentStatusUpdateLog<AgentIterationLog>({
      agent,
      task,
      logDescription: `🏁 Agent ${agent.name} - ${
        AGENT_STATUS_enum.ITERATION_START
      } (${iterations + 1}/${maxAgentIterations})`,
      metadata: { iterations, maxAgentIterations },
      logType: 'AgentStatusUpdate',
    });

    logger.trace(
      `🏁 ${AGENT_STATUS_enum.ITERATION_START}: Agent ${agent.name} -  (${
        iterations + 1
      }/${maxAgentIterations})`
    );
    set((state) => ({ workflowLogs: [...state.workflowLogs, newLog] }));
  },

  handleAgentIterationEnd: ({
    agent,
    task,
    iterations,
    maxAgentIterations,
  }) => {
    agent.status = AGENT_STATUS_enum.ITERATION_END;
    const newLog = get().prepareAgentStatusUpdateLog<AgentIterationLog>({
      agent,
      task,
      logDescription: `🔄 Agent ${agent.name} - ${AGENT_STATUS_enum.ITERATION_END}`,
      metadata: { iterations, maxAgentIterations },
      logType: 'AgentStatusUpdate',
    });

    logger.trace(
      `🔄 ${AGENT_STATUS_enum.ITERATION_END}: Agent ${agent.name} ended another iteration.`
    );
    set((state) => ({ workflowLogs: [...state.workflowLogs, newLog] }));
  },

  handleAgentThinkingStart: ({ agent, task, messages }) => {
    agent.status = AGENT_STATUS_enum.THINKING;
    const newLog = get().prepareAgentStatusUpdateLog<AgentStartThinkingLog>({
      agent,
      task,
      logDescription: `🤔 Agent ${agent.name} starts thinking...`,
      metadata: { messages },
      logType: 'AgentStatusUpdate',
    });

    logger.info(
      `🤔 ${AGENT_STATUS_enum.THINKING}: Agent ${agent.name} starts thinking...`
    );
    logger.debug('System Message:', messages[0]);
    logger.debug('Feedback Message:', messages[messages.length - 1].content);
    logger.debug('All Messages', messages);
    set((state) => ({ workflowLogs: [...state.workflowLogs, newLog] }));
  },

  handleAgentThinkingEnd: ({ agent, task, output }) => {
    agent.status = AGENT_STATUS_enum.THINKING_END;
    const newLog = get().prepareAgentStatusUpdateLog<AgentEndThinkingLog>({
      agent,
      task,
      logDescription: `🤔 Agent ${agent.name} finished thinking.`,
      metadata: { output },
      logType: 'AgentStatusUpdate',
    });

    logger.info(
      `💡 ${AGENT_STATUS_enum.THINKING_END}: Agent ${agent.name} finished thinking.`
    );
    logger.trace(`Output:`, output.parsedLLMOutput);
    logger.trace(`Usage:`, output.llmUsageStats);
    set((state) => ({ workflowLogs: [...state.workflowLogs, newLog] }));
  },

  handleAgentThinkingError: ({ agent, task, error }) => {
    const errorToLog = error.originalError || error;
    agent.status = AGENT_STATUS_enum.THINKING_ERROR;
    const newLog = get().prepareAgentStatusUpdateLog<AgentThinkingErrorLog>({
      agent,
      task,
      logDescription: `🛑 Agent ${agent.name} encountered an error during ${AGENT_STATUS_enum.THINKING}.`,
      metadata: { error: errorToLog },
      logType: 'AgentStatusUpdate',
    });

    logger.error(
      `🛑 ${AGENT_STATUS_enum.THINKING_ERROR}: Agent ${
        agent.name
      } encountered an error thinking. Further details: ${
        error.name ? error.name : 'No additional error details'
      }`,
      errorToLog.message
    );
    set((state) => ({
      workflowLogs: [...state.workflowLogs, newLog],
    }));
    get().handleTaskBlocked({
      task,
      error: new TaskBlockError(
        error.message,
        error.originalError?.message || '',
        agent.name,
        false
      ),
    });
  },

  handleAgentIssuesParsingLLMOutput: ({ agent, task, output, error }) => {
    agent.status = AGENT_STATUS_enum.ISSUES_PARSING_LLM_OUTPUT;
    const newLog =
      get().prepareAgentStatusUpdateLog<AgentIssuesParsingLLMOutputLog>({
        agent,
        task,
        logDescription: `😡 Agent ${agent.name} found some ${AGENT_STATUS_enum.ISSUES_PARSING_LLM_OUTPUT}. ${error.message}`,
        metadata: { output, error },
        logType: 'AgentStatusUpdate',
      });

    logger.debug(
      `😡 ${AGENT_STATUS_enum.ISSUES_PARSING_LLM_OUTPUT}: Agent ${agent.name} found issues parsing the LLM output. ${error.message}`
    );
    set((state) => ({ workflowLogs: [...state.workflowLogs, newLog] }));
  },

  handleAgentIssuesParsingSchemaOutput: ({ agent, task, output, error }) => {
    agent.status = AGENT_STATUS_enum.ISSUES_PARSING_SCHEMA_OUTPUT;
    const newLog =
      get().prepareAgentStatusUpdateLog<AgentIssuesParsingLLMOutputLog>({
        agent,
        task,
        logDescription: `😡 Agent ${agent.name} found some ${AGENT_STATUS_enum.ISSUES_PARSING_SCHEMA_OUTPUT}. ${error.message}`,
        metadata: { output, error },
        logType: 'AgentStatusUpdate',
      });

    logger.debug(
      `😡 ${AGENT_STATUS_enum.ISSUES_PARSING_SCHEMA_OUTPUT}: Agent ${agent.name} found issues parsing the Schema output. ${error.message}`
    );

    set((state) => ({ workflowLogs: [...state.workflowLogs, newLog] }));
  },

  handleAgentFinalAnswer: ({ agent, task, output }) => {
    agent.status = AGENT_STATUS_enum.FINAL_ANSWER;
    const newLog = get().prepareAgentStatusUpdateLog<AgentFinalAnswerLog>({
      agent,
      task,
      logDescription: `🥳 Agent ${agent.name} got the ${AGENT_STATUS_enum.FINAL_ANSWER}`,
      metadata: { output },
      logType: 'AgentStatusUpdate',
    });

    logger.info(
      `🥳 ${AGENT_STATUS_enum.FINAL_ANSWER}: Agent ${agent.name} arrived to the Final Answer.`
    );
    set((state) => ({ workflowLogs: [...state.workflowLogs, newLog] }));
  },

  handleAgentThought: ({ agent, task, output }) => {
    agent.status = AGENT_STATUS_enum.THOUGHT;
    const newLog = get().prepareAgentStatusUpdateLog<AgentThoughtLog>({
      agent,
      task,
      logDescription: `💭 Agent ${agent.name} ${AGENT_STATUS_enum.THOUGHT}.`,
      metadata: { output },
      logType: 'AgentStatusUpdate',
    });

    logger.info(
      `💭 ${AGENT_STATUS_enum.THOUGHT}: Agent ${agent.name} has a cool though.`
    );
    logger.info(`${output.thought}`);
    set((state) => ({ workflowLogs: [...state.workflowLogs, newLog] }));
  },

  handleAgentSelfQuestion: ({ agent, task, output }) => {
    agent.status = AGENT_STATUS_enum.SELF_QUESTION;
    const newLog = get().prepareAgentStatusUpdateLog<AgentThoughtLog>({
      agent,
      task,
      logDescription: `❓Agent ${agent.name} have a ${AGENT_STATUS_enum.SELF_QUESTION}`,
      metadata: { output },
      logType: 'AgentStatusUpdate',
    });

    logger.info(
      `❓${AGENT_STATUS_enum.SELF_QUESTION}: Agent ${agent.name} have a self question.`
    );
    set((state) => ({ workflowLogs: [...state.workflowLogs, newLog] }));
  },

  handleAgentToolStart: ({ agent, task, tool, input }) => {
    agent.status = AGENT_STATUS_enum.USING_TOOL;
    const newLog = get().prepareAgentStatusUpdateLog<AgentToolStartLog>({
      agent,
      task,
      logDescription: `🛠️⏳ Agent ${agent.name} is ${AGENT_STATUS_enum.USING_TOOL} ${tool.name}...`,
      metadata: { tool: tool, input },
      // metadata: { tool: tool.name, input },
      logType: 'AgentStatusUpdate',
    });

    logger.info(
      `🛠️⏳ ${AGENT_STATUS_enum.USING_TOOL}: Agent ${agent.name} is  using ${tool.name}...`
    );
    logger.debug(`Tool Input:`, input);
    set((state) => ({ workflowLogs: [...state.workflowLogs, newLog] }));
  },

  handleAgentToolEnd: ({ agent, task, output, tool }) => {
    agent.status = AGENT_STATUS_enum.USING_TOOL_END;
    const newLog = get().prepareAgentStatusUpdateLog<AgentToolEndLog>({
      agent,
      task,
      logDescription: `🛠️✅ ${AGENT_STATUS_enum.USING_TOOL_END}: Agent ${agent.name} - got  results from tool:${tool.name}`,
      metadata: { output },
      // metadata: { output, tool: tool.name },
      logType: 'AgentStatusUpdate',
    });

    logger.info(
      `🛠️✅ ${AGENT_STATUS_enum.USING_TOOL_END}: Agent ${agent.name} - got  results from tool:${tool.name}`
    );
    logger.debug(
      `Tool Output:`,
      typeof output === 'string' ? output : JSON.stringify(output)
    );
    set((state) => ({
      workflowLogs: [...state.workflowLogs, newLog],
    }));
  },

  handleAgentToolError: ({ agent, task, tool, error }) => {
    agent.status = AGENT_STATUS_enum.USING_TOOL_ERROR;
    const newLog = get().prepareAgentStatusUpdateLog<AgentToolErrorLog>({
      agent,
      task,
      logDescription: 'Error during tool use',
      metadata: { error, tool: tool.name },
      // metadata: { error, tool: tool.name },
      logType: 'AgentStatusUpdate',
    });

    logger.error(
      `🛠️🛑 ${AGENT_STATUS_enum.USING_TOOL_ERROR}: Agent ${agent.name} found an error using the tool: ${tool.name}`
    );
    logger.error(error);
    set((state) => ({ workflowLogs: [...state.workflowLogs, newLog] }));
  },

  handleAgentToolDoesNotExist: ({ agent, task, toolName }) => {
    agent.status = AGENT_STATUS_enum.USING_TOOL_ERROR;
    const newLog = get().prepareAgentStatusUpdateLog<AgentToolDoesNotExistLog>({
      agent,
      task,
      logDescription: `🛠️🚫 Agent ${agent.name} - Oops... it seems that the tool:${toolName} ${AGENT_STATUS_enum.TOOL_DOES_NOT_EXIST}.`,
      metadata: { toolName },
      // metadata: { tool: toolName, error: new Error('Tool does not exist') },
      logType: 'AgentStatusUpdate',
    });

    logger.warn(
      `🛠️🚫 ${AGENT_STATUS_enum.TOOL_DOES_NOT_EXIST}: Agent ${agent.name} - is trying to use a tool that does not exist. Tool Name:${toolName}.`
    );
    set((state) => ({ workflowLogs: [...state.workflowLogs, newLog] }));
  },

  handleAgentObservation: ({ agent, task, output }) => {
    agent.status = AGENT_STATUS_enum.OBSERVATION;
    const newLog = get().prepareAgentStatusUpdateLog<AgentObservationLog>({
      agent,
      task,
      logDescription: `🔍 Agent ${agent.name} - ${AGENT_STATUS_enum.OBSERVATION}`,
      metadata: { output },
      logType: 'AgentStatusUpdate',
    });

    logger.info(
      `🔍 ${AGENT_STATUS_enum.OBSERVATION}: Agent ${agent.name} made an observation.`
    );
    logger.debug(`${output.observation}`);
    set((state) => ({ workflowLogs: [...state.workflowLogs, newLog] }));
  },

  handleWeirdOutput: ({ agent, task, output }) => {
    agent.status = AGENT_STATUS_enum.WEIRD_LLM_OUTPUT;
    const newLog = get().prepareAgentStatusUpdateLog<AgentWeirdLLMOutputLog>({
      agent,
      task,
      logDescription: `🤔 Agent ${agent.name} - ${AGENT_STATUS_enum.WEIRD_LLM_OUTPUT}`,
      metadata: { output },
      logType: 'AgentStatusUpdate',
    });

    logger.warn(
      `🤔 ${AGENT_STATUS_enum.WEIRD_LLM_OUTPUT} - Agent: ${agent.name}`
    );
    set((state) => ({ workflowLogs: [...state.workflowLogs, newLog] }));
  },

  handleAgentLoopError: ({
    agent,
    task,
    error,
    iterations,
    maxAgentIterations,
  }) => {
    agent.status = AGENT_STATUS_enum.AGENTIC_LOOP_ERROR;
    const newLog = get().prepareAgentStatusUpdateLog<AgentLoopErrorLog>({
      agent,
      task,
      logDescription: `🚨 Agent ${agent.name} - ${AGENT_STATUS_enum.AGENTIC_LOOP_ERROR} | Iterations: ${iterations}/${maxAgentIterations}`,
      metadata: { error, iterations, maxAgentIterations },
      logType: 'AgentStatusUpdate',
    });

    logger.error(
      `🚨 ${AGENT_STATUS_enum.AGENTIC_LOOP_ERROR}  - Agent: ${agent.name} | Iterations: ${iterations}/${maxAgentIterations}`,
      error.message
    );
    set((state) => ({
      workflowLogs: [...state.workflowLogs, newLog],
    }));
    get().handleTaskBlocked({
      task,
      error: new TaskBlockError(
        error.message,
        error.originalError?.message || '',
        agent.name,
        false
      ),
    });
  },

  handleAgentTaskAborted: ({ task, error }) => {
    task.agent.setStatus(AGENT_STATUS_enum.TASK_ABORTED);

    const newLog = get().prepareWorkflowStatusUpdateLog<AgentTaskAbortedLog>({
      agent: task.agent,
      task,
      logDescription: `🛑 Agent ${task.agent.name} - ${AGENT_STATUS_enum.TASK_ABORTED}`,
      metadata: { error },
      logType: 'AgentStatusUpdate',
    });

    logger.info(
      `🛑 ${AGENT_STATUS_enum.TASK_ABORTED}: Agent ${task.agent.name} - Task Aborted.`
    );
    set((state) => ({ workflowLogs: [...state.workflowLogs, newLog] }));
  },

  handleAgentTaskPaused: ({ task }) => {
    task.agent.setStatus(AGENT_STATUS_enum.PAUSED);
    const newLog = get().prepareAgentStatusUpdateLog<AgentPausedLog>({
      agent: task.agent,
      task,
      logDescription: `🛑 Agent ${task.agent.name} - ${AGENT_STATUS_enum.PAUSED}`,
      metadata: {
        message: 'Task paused by agent',
      },
      logType: 'AgentStatusUpdate',
      agentStatus: AGENT_STATUS_enum.PAUSED,
    });

    logger.info(
      `🛑 ${AGENT_STATUS_enum.PAUSED}: Agent ${task.agent.name} - Paused.`
    );
    set((state) => ({ workflowLogs: [...state.workflowLogs, newLog] }));
    get().handleTaskPaused({ task });
  },

  handleAgentTaskResumed: ({ task }) => {
    task.agent.setStatus(AGENT_STATUS_enum.RESUMED);
    const newLog = get().prepareWorkflowStatusUpdateLog<AgentResumedLog>({
      agent: task.agent,
      task,
      logDescription: `🔄 Agent ${task.agent.name} - ${AGENT_STATUS_enum.RESUMED}`,
      metadata: {
        message: 'Task resumed by agent',
      },
      logType: 'AgentStatusUpdate',
    });

    logger.info(
      `🔄 ${AGENT_STATUS_enum.RESUMED}: Agent ${task.agent.name} - Resumed.`
    );
    set((state) => ({ workflowLogs: [...state.workflowLogs, newLog] }));
    get().handleTaskResumed({ task });
  },

  handleAgentMaxIterationsError: ({
    agent,
    task,
    error,
    iterations = -1,
    maxAgentIterations = -1,
  }) => {
    agent.status = AGENT_STATUS_enum.MAX_ITERATIONS_ERROR;
    const newLog = get().prepareAgentStatusUpdateLog<AgentLoopErrorLog>({
      agent,
      task,
      logDescription: `🛑 Agent ${agent.name} - ${AGENT_STATUS_enum.MAX_ITERATIONS_ERROR} | Iterations: ${iterations}`,
      metadata: {
        error,
        iterations,
        maxAgentIterations,
      },
      logType: 'AgentStatusUpdate',
    });

    logger.error(
      `🛑 ${AGENT_STATUS_enum.MAX_ITERATIONS_ERROR} - Agent ${agent.name} | Iterations: ${iterations}/${maxAgentIterations}. You can adjust the maxAgentIterations property in the agent initialization. Current value is ${maxAgentIterations}`
    );
    set((state) => ({
      workflowLogs: [...state.workflowLogs, newLog],
    }));
    get().handleTaskBlocked({
      task,
      error: new TaskBlockError(
        error.message,
        error.originalError?.message || '',
        task.agent.name,
        false
      ),
    });
  },

  handleAgentTaskCompleted: ({
    agent,
    task,
    result,
    iterations,
    maxAgentIterations,
  }) => {
    agent.status = AGENT_STATUS_enum.TASK_COMPLETED;
    const newLog = get().prepareAgentStatusUpdateLog<AgentTaskCompletedLog>({
      agent,
      task,
      logDescription: `🏁 Agent ${agent.name} - ${AGENT_STATUS_enum.TASK_COMPLETED}`,
      metadata: {
        result,
        iterations,
        maxAgentIterations,
      },
      logType: 'AgentStatusUpdate',
    });

    logger.info(
      `🏁 ${AGENT_STATUS_enum.TASK_COMPLETED}: Agent ${agent.name} finished the given task.`
    );
    set((state) => ({
      workflowLogs: [...state.workflowLogs, newLog],
    }));
    get().handleTaskCompleted({ agent, task, result });
  },

  handleAgentBlockTask: ({ agent, task, reason, metadata }) => {
    agent.status = AGENT_STATUS_enum.DECIDED_TO_BLOCK_TASK;
    const newLog = get().prepareAgentStatusUpdateLog<AgentBlockLog>({
      agent,
      task,
      logDescription: `🚫 Agent ${agent.name} decided to block task: ${reason}`,
      metadata: {
        isAgentDecision: true,
        blockReason: reason,
        blockedBy: metadata.blockedBy || agent.name,
      },
      logType: 'AgentStatusUpdate',
    });

    logger.warn(`🚫 Agent ${agent.name} has decided to block task:`, {
      reason,
      metadata: newLog.metadata,
    });

    set((state) => ({
      workflowLogs: [...state.workflowLogs, newLog],
    }));

    const blockError = new TaskBlockError(
      reason,
      reason,
      metadata.blockedBy || agent.name,
      true
    );

    get().handleTaskBlocked({ task, error: blockError });
  },
  prepareAgentStatusUpdateLog: <T extends AgentStatusLog>({
    agent,
    task,
    logDescription,
    workflowStatus,
    taskStatus,
    agentStatus,
    metadata,
    logType = 'AgentStatusUpdate' as T['logType'],
  }: NewAgentStatusUpdateLogParams<T>): T => {
    const timestamp = Date.now();

    let newLog: T = {
      timestamp,
      logDescription,
      metadata,
      logType,
    } as T;

    if (agent && task) {
      newLog = {
        ...newLog,
        task,
        agent,
        agentName: agent.name || 'Unknown Agent',
        taskTitle: task ? getTaskTitleForLogs(task) : 'Untitled Task',
        taskStatus: taskStatus || task.status,
        agentStatus: agentStatus || agent.status,
      } as T;
    }

    if (workflowStatus) {
      newLog = {
        ...newLog,
        workflowStatus,
      } as T;
    }

    return newLog;
  },
});
