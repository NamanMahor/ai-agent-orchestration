from typing import Type

from pydantic import BaseModel, Field

from core.tools.base import PlatformTool


class CompleteTaskInput(BaseModel):
    output: str = Field(
        ...,
        description=(
            """
            Only call this tool after:
            - you have presented the final result to the user
            - the user explicitly replies with approval such as 'approve', 'approved', 'looks good', 'ship it', or equivalent
            Never call this tool before receiving explicit approval.
            """
        ),
    )


class CompleteTaskTool(PlatformTool):

    name: str = "complete_task"

    description: str = (
        """
         Only call this tool after:
            - you have presented the final result to the user
            - the user explicitly replies with approval such as 'approve', 'approved', 'looks good', 'ship it', or equivalent
            Never call this tool before receiving explicit approval.
        """
    )

    args_schema: Type[BaseModel] = CompleteTaskInput

    async def _arun(self, output: str):
        return {"output": output}

    def _run(self, output: str):
        return {"output": output}