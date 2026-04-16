"""
GitHub file fetcher service with demo fallback.
"""
import os
import re
import base64
import logging
import httpx

from demo_data import QUICKBITE_FILES

logger = logging.getLogger(__name__)

DEMO_REPO_PATTERNS = [
    "pradeepkundekar0101/quickbite-api",
    "quickbite-api",
]

RELEVANT_EXTENSIONS = {".ts", ".js", ".py", ".java"}
RELEVANT_PATH_PATTERNS = [
    "routes/", "controllers/", "api/", "middleware/", "models/",
    "src/routes/", "src/controllers/", "src/middleware/", "src/models/",
    "handlers/", "services/",
]
ROOT_FILE_PATTERNS = [
    "server.ts", "server.js", "app.ts", "app.js", "index.ts", "index.js",
    "src/server.ts", "src/server.js", "src/app.ts", "src/app.js",
    "src/index.ts", "src/index.js",
]


def is_demo_repo(repo_url: str) -> bool:
    url_lower = repo_url.lower().strip().rstrip("/")
    for pattern in DEMO_REPO_PATTERNS:
        if pattern in url_lower:
            return True
    return False


def parse_github_url(repo_url: str) -> tuple:
    """Extract owner and repo from GitHub URL."""
    # Handle https://github.com/owner/repo or github.com/owner/repo
    match = re.match(r"(?:https?://)?github\.com/([^/]+)/([^/]+?)(?:\.git)?/?$", repo_url.strip())
    if match:
        return match.group(1), match.group(2)
    return None, None


def is_relevant_file(path: str) -> bool:
    """Check if a file path is relevant for route discovery."""
    ext = os.path.splitext(path)[1].lower()
    if ext not in RELEVANT_EXTENSIONS:
        return False
    # Check path patterns
    for pattern in RELEVANT_PATH_PATTERNS:
        if pattern in path:
            return True
    # Check root-level files
    for root_file in ROOT_FILE_PATTERNS:
        if path == root_file or path.endswith("/" + root_file):
            return True
    return False


async def fetch_github_files(repo_url: str) -> dict:
    """
    Fetch source code files from a GitHub repository.
    Falls back to demo data for demo repo or on failure.
    """
    # Check demo repo first
    if is_demo_repo(repo_url):
        logger.info("Demo repo detected, using hardcoded QuickBite source code")
        return QUICKBITE_FILES

    owner, repo = parse_github_url(repo_url)
    if not owner or not repo:
        logger.warning(f"Could not parse GitHub URL: {repo_url}, using demo fallback")
        return QUICKBITE_FILES

    github_token = os.environ.get("GITHUB_TOKEN", "")
    headers = {"Accept": "application/vnd.github.v3+json"}
    if github_token:
        headers["Authorization"] = f"token {github_token}"

    files = {}
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            # Try main branch first, then master
            tree_url = None
            for branch in ["main", "master"]:
                url = f"https://api.github.com/repos/{owner}/{repo}/git/trees/{branch}?recursive=1"
                resp = await client.get(url, headers=headers)
                if resp.status_code == 200:
                    tree_url = resp.json()
                    break

            if not tree_url:
                logger.warning(f"Could not fetch repo tree for {owner}/{repo}, using demo fallback")
                return QUICKBITE_FILES

            # Filter relevant files
            relevant_paths = []
            for item in tree_url.get("tree", []):
                if item.get("type") == "blob" and is_relevant_file(item["path"]):
                    relevant_paths.append(item["path"])

            if not relevant_paths:
                logger.warning("No relevant files found in repo, using demo fallback")
                return QUICKBITE_FILES

            # Fetch content for each file (limit to 30 files)
            for path in relevant_paths[:30]:
                content_url = f"https://api.github.com/repos/{owner}/{repo}/contents/{path}"
                resp = await client.get(content_url, headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    if data.get("encoding") == "base64" and data.get("content"):
                        content = base64.b64decode(data["content"]).decode("utf-8", errors="replace")
                        files[path] = content

            if not files:
                logger.warning("Failed to fetch any file contents, using demo fallback")
                return QUICKBITE_FILES

            logger.info(f"Fetched {len(files)} files from {owner}/{repo}")
            return files

    except Exception as e:
        logger.error(f"GitHub API error: {e}, using demo fallback")
        return QUICKBITE_FILES
