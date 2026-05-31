from db.sqlite.agent_repository_sqlite import SQLiteAgentRepository
from db.sqlite.workflow_repository_sqlite import SQLiteWorkflowRepository
from db.sqlite.workflow_run_repository_sqlite import (
    SQLiteWorkflowRunRepository, )
from db.sqlite.message_repository_sqlite import (
    SQLiteMessageRepository, )

agent_repo = SQLiteAgentRepository()

workflow_repo = SQLiteWorkflowRepository()

workflow_run_repo = SQLiteWorkflowRunRepository()

message_repo = SQLiteMessageRepository()
