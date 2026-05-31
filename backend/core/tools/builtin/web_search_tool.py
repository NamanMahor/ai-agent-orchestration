from typing import Type

import httpx
from bs4 import BeautifulSoup
from pydantic import BaseModel, Field

from core.tools.base import PlatformTool


class WebSearchInput(BaseModel):

    query: str = Field(..., description="The query to search the web for")


class WebSearchTool(PlatformTool):

    name: str = "web_search"

    description: str = "Search the web for up-to-date information"

    args_schema: Type[BaseModel] = WebSearchInput

    async def _arun(self, query: str):

        headers = {
            "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"https://html.duckduckgo.com/html/?q={query}",
                    headers=headers,
                    follow_redirects=True,
                    timeout=8.0)

            if response.status_code != 200:
                return {
                    "error":
                    f"Search engine returned status code {response.status_code}"
                }

            soup = BeautifulSoup(response.text, "html.parser")
            results = []

            for div in soup.find_all("div", class_="result"):
                title_elem = div.find("a", class_="result__url")
                snippet_elem = div.find("a", class_="result__snippet")
                if title_elem and snippet_elem:
                    title = title_elem.get_text().strip()
                    link = title_elem["href"]
                    snippet = snippet_elem.get_text().strip()
                    results.append({
                        "title": title,
                        "link": link,
                        "snippet": snippet
                    })
                    if len(results) >= 4:  # Get top 4 results
                        break

            if not results:
                return {"results": ["No matching web search results found."]}

            return {"results": results}

        except Exception as e:
            return {"error": f"Web search failed: {str(e)}"}

    def _run(self, query: str):

        headers = {
            "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }

        try:
            response = httpx.get(
                f"https://html.duckduckgo.com/html/?q={query}",
                headers=headers,
                follow_redirects=True,
                timeout=8.0)

            if response.status_code != 200:
                return {
                    "error":
                    f"Search engine returned status code {response.status_code}"
                }

            soup = BeautifulSoup(response.text, "html.parser")
            results = []

            for div in soup.find_all("div", class_="result"):
                title_elem = div.find("a", class_="result__url")
                snippet_elem = div.find("a", class_="result__snippet")
                if title_elem and snippet_elem:
                    title = title_elem.get_text().strip()
                    link = title_elem["href"]
                    snippet = snippet_elem.get_text().strip()
                    results.append({
                        "title": title,
                        "link": link,
                        "snippet": snippet
                    })
                    if len(results) >= 4:
                        break

            if not results:
                return {"results": ["No matching web search results found."]}

            return {"results": results}

        except Exception as e:
            return {"error": f"Web search failed: {str(e)}"}
