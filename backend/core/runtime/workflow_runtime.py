import asyncio
import json
from datetime import datetime
import logging

from langchain_core.messages import HumanMessage, AIMessage

from core.channels.registry import channel_registry
from core.runtime.agent_runtime import agent_runtime
from core.runtime.events import event_bus
from core.workflows.message_models import Message
from core.workflows.run_models import WorkflowRun
from db.manager import agent_repo, message_repo, workflow_run_repo

logger = logging.getLogger(__name__)


def create_event(event_type: str, data: dict = {}):
    return {
        "type": event_type,
        "timestamp": datetime.utcnow().isoformat(),
        **data,
    }


class WorkflowRuntime:

    def execute_async(self,
                      workflow,
                      user_message: str,
                      session_id: str = None) -> WorkflowRun:
        run = WorkflowRun(
            workflow_id=workflow.id,
            status="running",
        )
        run = workflow_run_repo.create(run)

        # Trigger execution loop in background
        asyncio.create_task(
            self.execute_run(run, workflow, user_message, session_id))
        return run

    async def execute(self,
                      workflow,
                      user_message: str,
                      session_id: str = None):
        run = WorkflowRun(
            workflow_id=workflow.id,
            status="running",
        )
        run = workflow_run_repo.create(run)
        return await self.execute_run(run, workflow, user_message, session_id)

    async def resume(self,
                     run: WorkflowRun,
                     workflow,
                     user_message: str,
                     session_id: str = None):
        run.status = "running"
        run.completed_at = None
        workflow_run_repo.update(run.id, run)
        return await self.execute_run(run, workflow, user_message, session_id, is_resume=True)

    async def execute_run(self,
                           run: WorkflowRun,
                           workflow,
                           user_message: str,
                           session_id: str = None,
                           is_resume: bool = False):
        logger.info(
            f"Starting execution of workflow '{workflow.name}' (Run ID: {run.id}) [is_resume={is_resume}]"
        )
        if not is_resume:
            # Save user message if session is active
            if session_id:
                run.state["session_id"] = session_id
                logger.debug(
                    f"Saving user message for session_id '{session_id}' in run '{run.id}'"
                )
                message_repo.create(
                    Message(
                        run_id=run.id,
                        session_id=session_id,
                        from_node="user",
                        content=user_message,
                    ))

            await event_bus.publish(
                run.id,
                {
                    "type": "run_started",
                    "run_id": run.id,
                    "workflow_name": workflow.name,
                },
            )

            state_message = user_message
            history = []

            # 1. Determine starting node (Entry Point) via Start Node
            start_node = next(
                (n for n in workflow.graph.nodes if n.type == "start"),
                None
            )
            if start_node:
                start_node_id = start_node.id
            else:
                start_node_id = workflow.entry_point
                if not start_node_id and workflow.graph.nodes:
                    # Find nodes with no incoming edges
                    incoming_targets = {e.target for e in workflow.graph.edges}
                    source_nodes = [
                        n.id for n in workflow.graph.nodes
                        if n.id not in incoming_targets
                    ]
                    if source_nodes:
                        start_node_id = source_nodes[0]
                    else:
                        start_node_id = workflow.graph.nodes[0].id
        else:
            if session_id:
                logger.debug(
                    f"Saving user message for session_id '{session_id}' in run '{run.id}' (resume)"
                )
                message_repo.create(
                    Message(
                        run_id=run.id,
                        session_id=session_id,
                        from_node="user",
                        content=user_message,
                    ))

            await event_bus.publish(
                run.id,
                {
                    "type": "run_resumed",
                    "run_id": run.id,
                    "workflow_name": workflow.name,
                },
            )

            state_message = user_message
            history = run.messages or []
            start_node_id = run.state.get("current_node_id")

        current_node_id = start_node_id
        logger.debug(f"Entry point node determined as: '{current_node_id}'")
        executed_steps = 0
        max_steps = 20  # Feedback loop protection

        while current_node_id is not None:
            logger.info(
                f"Workflow '{workflow.name}' (Run ID: {run.id}) executing node '{current_node_id}'"
            )
            if executed_steps >= max_steps:
                # Feedback loop safety cutoff
                error_msg = f"Safety cutoff: Workflow exceeded maximum of {max_steps} steps."
                logger.error(f"Workflow '{workflow.name}' failed: {error_msg}")
                run.status = "failed"
                run.logs.append({
                    "timestamp": datetime.utcnow().isoformat(),
                    "log": error_msg
                })
                await event_bus.publish(
                    run.id,
                    {
                        "type": "run_failed",
                        "run_id": run.id,
                        "error": error_msg,
                    },
                )
                break

            node = next(
                (n for n in workflow.graph.nodes if n.id == current_node_id),
                None,
            )
            if not node:
                logger.warning(
                    f"Node ID '{current_node_id}' not found in workflow graph nodes."
                )
                break

            executed_steps += 1
            node_type = node.type

            if node_type == "agent":
                agent = agent_repo.get(node.ref)
                if not agent:
                    err_msg = f"Agent referencing id '{node.ref}' not found."
                    logger.error(err_msg)
                    run.logs.append({
                        "timestamp": datetime.utcnow().isoformat(),
                        "log": err_msg
                    })
                    current_node_id = self._get_next_default_node(
                        workflow, current_node_id)
                    continue

                logger.debug(
                    f"Executing Agent Node '{node.id}' referencing Agent '{agent.name}'"
                )
                await event_bus.publish(
                    run.id,
                    create_event(
                        "agent_started",
                        {
                            "agent": agent.name,
                            "node_id": node.id,
                        },
                    ),
                )

                # Initialize flags and execution context
                blocked = False
                block_reason = ""
                output = ""
                p_tok = 0
                c_tok = 0
                t_tok = 0

                # 1. Guardrail Pre-Check (Input Check)
                block_keywords = agent.guardrails.get(
                    "block_keywords", []) if isinstance(
                        agent.guardrails, dict) else []
                for kw in block_keywords:
                    if kw.strip() and kw.lower() in state_message.lower():
                        blocked = True
                        block_reason = f"Input contains blocked term: '{kw}'"
                        break

                if blocked:
                    output = f"Execution blocked by safety guardrails. Reason: {block_reason}"
                    run.logs.append({
                        "timestamp":
                        datetime.utcnow().isoformat(),
                        "log":
                        f"Guardrail Alert: {block_reason} (agent: {agent.name})"
                    })
                else:
                # 2. Conversational Memory Check
                    history_messages = []
                    if session_id and agent.memory_config and agent.memory_config.get(
                            "type") == "buffer":
                        past_messages = message_repo.list_by_session(
                            session_id, limit=10)
                        for pm in past_messages:
                            if pm.from_node == node.id or pm.from_node == agent.name:
                                history_messages.append(
                                    AIMessage(content=pm.content))
                            else:
                                history_messages.append(
                                    HumanMessage(content=pm.content))

                    runtime = agent_runtime.build(agent)
                    try:
                        input_messages = history_messages + [
                            HumanMessage(content=state_message)
                        ]
                        result = await runtime.ainvoke(
                            {"messages": input_messages},
                            config={"recursion_limit": 15}
                        )
                        last_msg = result["messages"][-1]
                        
                        tool_calls = getattr(last_msg, "tool_calls", None)
                        complete_called = False
                        complete_output = ""
                        if tool_calls:
                            for tc in tool_calls:
                                if tc["name"] == "complete_task":
                                    complete_called = True
                                    complete_output = tc["args"].get("output", "")
                                    if not isinstance(complete_output, str):
                                        complete_output = json.dumps(complete_output)
                                    break

                        if complete_called:  
                            output = complete_output
                        else:
                            output = last_msg.content

                        # Extract token usage if present, else estimate
                        metadata = getattr(last_msg, "response_metadata",
                                           {}) or {}
                        usage = metadata.get("token_usage", {}) or {}

                        if usage:
                            p_tok = usage.get("prompt_tokens", 0)
                            c_tok = usage.get("completion_tokens", 0)
                            t_tok = usage.get("total_tokens", 0)
                        else:
                            p_tok = sum(
                                len(m.content.split())
                                for m in input_messages) + len(
                                    agent.system_prompt.split()) + 15
                            c_tok = len(output.split())
                            t_tok = p_tok + c_tok

                        run.token_usage["prompt_tokens"] = run.token_usage.get(
                            "prompt_tokens", 0) + p_tok
                        run.token_usage[
                            "completion_tokens"] = run.token_usage.get(
                                "completion_tokens", 0) + c_tok
                        run.token_usage["total_tokens"] = run.token_usage.get(
                            "total_tokens", 0) + t_tok
                        run.token_usage["cost"] = round(
                            run.token_usage.get("total_tokens", 0) * 0.0000015,
                            6)

                        # 3. Guardrail Post-Check (Output Check)
                        for kw in block_keywords:
                            if kw.strip() and kw.lower() in output.lower():
                                output = f"Output blocked by safety guardrails. Reason: Output contains restricted term: '{kw}'"
                                run.logs.append({
                                    "timestamp":
                                    datetime.utcnow().isoformat(),
                                    "log":
                                    f"Guardrail Alert: Blocked keyword '{kw}' detected in agent output (agent: {agent.name})."
                                })
                                break

                    except Exception as e:
                        output = f"Execution failed: {str(e)}"
                        logger.error(
                            f"Agent '{agent.name}' execution failed: {str(e)}",
                            exc_info=True)
                        run.logs.append({
                            "timestamp":
                            datetime.utcnow().isoformat(),
                            "log":
                            f"Agent error: {output}"
                        })

                if not blocked and not complete_called and agent.channels :
                    # Conversation in workflow is not finished -> PAUSE
                    run.status = "paused"
                    run.state["current_node_id"] = current_node_id
                    run.state["last_state_message"] = state_message

                    message_repo.create(
                        Message(
                            run_id=run.id,
                            session_id=session_id,
                            from_node=node.id,
                            content=output,
                        ))
                    history.append({
                        "node_id": node.id,
                        "node_type": "agent",
                        "agent": agent.name,
                        "output": output,
                    })
                    run.messages = history
                    run.completed_at = datetime.utcnow()
                    workflow_run_repo.update(run.id, run)

                    await event_bus.publish(
                        run.id,
                        {
                            "type": "run_paused",
                            "run_id": run.id,
                            "status": "paused",
                            "output": output,
                        },
                    )

                    if agent.channels:
                        for channel_name in agent.channels:
                            channel = channel_registry.get(channel_name)
                            if channel:
                                await channel.send_message(session_id, output)
                    return

                history.append({
                    "node_id": node.id,
                    "node_type": "agent",
                    "agent": agent.name,
                    "output": output,
                })

                message_repo.create(
                    Message(
                        run_id=run.id,
                        session_id=session_id,
                        from_node=node.id,
                        content=output,
                    ))

                await event_bus.publish(
                    run.id,
                    {
                        "type": "agent_completed",
                        "agent": agent.name,
                        "node_id": node.id,
                        "output": output,
                        "token_usage": run.token_usage,
                    },
                )
                state_message = output
                current_node_id = self._get_next_default_node(
                    workflow, current_node_id)

            elif node_type == "start":
                await event_bus.publish(
                    run.id,
                    create_event(
                        "start_reached",
                        {
                            "node_id": node.id,
                        },
                    ),
                )
                current_node_id = self._get_next_default_node(
                    workflow, current_node_id)

            elif node_type == "end":
                await event_bus.publish(
                    run.id,
                    create_event(
                        "end_reached",
                        {
                            "node_id": node.id,
                        },
                    ),
                )
                break

            elif node_type == "condition":
                await event_bus.publish(
                    run.id,
                    create_event(
                        "condition_started",
                        {
                            "node_id": node.id,
                        },
                    ),
                )

                outgoing_edges = [
                    e for e in workflow.graph.edges if e.source == node.id
                ]
                matched_edge = None

                # Perform condition evaluation (e.g. check if condition text is in output message)
                for edge in outgoing_edges:
                    if edge.condition:
                        if edge.condition.lower() in state_message.lower():
                            matched_edge = edge
                            break

                if not matched_edge and outgoing_edges:
                    # Fallback to an edge with no condition, or the first one
                    matched_edge = next(
                        (e for e in outgoing_edges if not e.condition),
                        outgoing_edges[0],
                    )

                if matched_edge:
                    output = f"Condition matched: routing to target node '{matched_edge.target}'."
                    await event_bus.publish(
                        run.id,
                        {
                            "type": "condition_completed",
                            "node_id": node.id,
                            "output": output,
                            "target": matched_edge.target,
                        },
                    )
                    history.append({
                        "node_id": node.id,
                        "node_type": "condition",
                        "agent": "Decision Gateway",
                        "output": output,
                    })
                    current_node_id = matched_edge.target
                else:
                    output = "Condition matched no outgoing paths. Terminating."
                    await event_bus.publish(
                        run.id,
                        {
                            "type": "condition_completed",
                            "node_id": node.id,
                            "output": output,
                            "target": None,
                        },
                    )
                    current_node_id = None


            else:
                # Unknown node type, default advance
                current_node_id = self._get_next_default_node(
                    workflow, current_node_id)

        if run.status == "running":
            run.status = "completed"

        run.messages = history
        run.completed_at = datetime.utcnow()
        workflow_run_repo.update(run.id, run)

        await event_bus.publish(
            run.id,
            {
                "type":
                "run_completed" if run.status == "completed" else "run_failed",
                "run_id": run.id,
                "status": run.status,
                "output": state_message,
            },
        )

        return {
            "run_id": run.id,
            "output": state_message,
            "history": history,
            "status": run.status,
            "token_usage": run.token_usage,
        }

    def _get_next_default_node(self, workflow, current_node_id: str):
        outgoing = [
            e for e in workflow.graph.edges if e.source == current_node_id
        ]
        if outgoing:
            return outgoing[0].target
        return None


workflow_runtime = WorkflowRuntime()
