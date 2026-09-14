import os
import re
import datetime
import requests
from dotenv import load_dotenv
from slack_bolt import App
from slack_bolt.adapter.socket_mode import SocketModeHandler
import anthropic

load_dotenv()

app = App(token=os.environ["SLACK_BOT_TOKEN"])
claude = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
bot_user_id = app.client.auth_test()["user_id"]

NOTION_DATABASE_ID = os.environ["NOTION_DATABASE_ID"]
SESSION_LOG_DATABASE_ID = os.environ["NOTION_SESSION_LOG_DATABASE_ID"]
NOTION_HEADERS = {
    "Authorization": f"Bearer {os.environ['NOTION_API_KEY']}",
    "Notion-Version": "2022-06-28",
    "Content-Type": "application/json",
}


def clean(text):
    return re.sub(r"<@[^>]+>", "", text or "").strip()


TOOLS = [
    {
        "name": "list_projects",
        "description": "List every project in the Ly Labs Notion directory along with its current status.",
        "input_schema": {"type": "object", "properties": {}},
    },
    {
        "name": "log_project",
        "description": "Create a new project entry, or update an existing one, in the Ly Labs Notion directory. Use this whenever the team discusses a project's status or wants something written down for the record.",
        "input_schema": {
            "type": "object",
            "properties": {
                "name": {"type": "string", "description": "The project's name."},
                "status": {
                    "type": "string",
                    "enum": ["Not started", "In progress", "Done"],
                },
                "note": {
                    "type": "string",
                    "description": "A short note or summary to add to the project's page.",
                },
            },
            "required": ["name"],
        },
    },
    {
        "name": "recall",
        "description": "Retrieve everything logged so far in the Ly Labs Notion directory: every project with its status, and a summary of every recorded work session. Use this whenever someone asks about past discussions, decisions, or what happened previously.",
        "input_schema": {"type": "object", "properties": {}},
    },
]


def find_project_page(name):
    resp = requests.post(
        f"https://api.notion.com/v1/databases/{NOTION_DATABASE_ID}/query",
        headers=NOTION_HEADERS,
        json={"filter": {"property": "Name", "title": {"equals": name}}},
    )
    resp.raise_for_status()
    results = resp.json()["results"]
    return results[0] if results else None


def list_projects():
    resp = requests.post(
        f"https://api.notion.com/v1/databases/{NOTION_DATABASE_ID}/query",
        headers=NOTION_HEADERS,
    )
    resp.raise_for_status()
    pages = resp.json()["results"]
    if not pages:
        return "No projects logged yet."

    lines = []
    for page in pages:
        props = page["properties"]
        title = props["Name"]["title"]
        name = title[0]["plain_text"] if title else "Untitled"
        select = props["Status"]["select"]
        status = select["name"] if select else "No status"
        lines.append(f"- {name}: {status}")
    return "\n".join(lines)


def log_project(name, status=None, note=None):
    today = datetime.date.today().isoformat()
    page = find_project_page(name)
    properties = {"Last updated": {"date": {"start": today}}}
    if status:
        properties["Status"] = {"select": {"name": status}}

    if page:
        page_id = page["id"]
        requests.patch(
            f"https://api.notion.com/v1/pages/{page_id}",
            headers=NOTION_HEADERS,
            json={"properties": properties},
        ).raise_for_status()
        action = "updated"
    else:
        properties["Name"] = {"title": [{"text": {"content": name}}]}
        resp = requests.post(
            "https://api.notion.com/v1/pages",
            headers=NOTION_HEADERS,
            json={
                "parent": {"database_id": NOTION_DATABASE_ID},
                "properties": properties,
            },
        )
        resp.raise_for_status()
        page_id = resp.json()["id"]
        action = "created"

    if note:
        requests.patch(
            f"https://api.notion.com/v1/blocks/{page_id}/children",
            headers=NOTION_HEADERS,
            json={
                "children": [
                    {
                        "object": "block",
                        "type": "paragraph",
                        "paragraph": {
                            "rich_text": [{"type": "text", "text": {"content": note}}]
                        },
                    }
                ]
            },
        ).raise_for_status()

    return f"Project '{name}' {action} in Notion."


def heading_block(text):
    return {
        "object": "block",
        "type": "heading_2",
        "heading_2": {"rich_text": [{"type": "text", "text": {"content": text}}]},
    }


def paragraph_blocks(text, chunk_size=1900):
    chunks = [text[i : i + chunk_size] for i in range(0, len(text), chunk_size)] or [""]
    return [
        {
            "object": "block",
            "type": "paragraph",
            "paragraph": {"rich_text": [{"type": "text", "text": {"content": c}}]},
        }
        for c in chunks
    ]


def create_session_log(title, related_project, summary, transcript):
    today = datetime.date.today().isoformat()
    properties = {
        "Name": {"title": [{"text": {"content": title}}]},
        "Date": {"date": {"start": today}},
    }
    if related_project:
        properties["Related project"] = {
            "rich_text": [{"text": {"content": related_project}}]
        }

    resp = requests.post(
        "https://api.notion.com/v1/pages",
        headers=NOTION_HEADERS,
        json={
            "parent": {"database_id": SESSION_LOG_DATABASE_ID},
            "properties": properties,
        },
    )
    resp.raise_for_status()
    page_id = resp.json()["id"]

    blocks = (
        [heading_block("Summary")]
        + paragraph_blocks(summary)
        + [heading_block("Full transcript")]
        + paragraph_blocks(transcript)
    )
    for i in range(0, len(blocks), 90):
        requests.patch(
            f"https://api.notion.com/v1/blocks/{page_id}/children",
            headers=NOTION_HEADERS,
            json={"children": blocks[i : i + 90]},
        ).raise_for_status()


def transcribe_audio(audio_bytes, mimetype):
    resp = requests.post(
        "https://api.deepgram.com/v1/listen",
        headers={
            "Authorization": f"Token {os.environ['DEEPGRAM_API_KEY']}",
            "Content-Type": mimetype,
        },
        params={"model": "nova-2", "smart_format": "true", "punctuate": "true"},
        data=audio_bytes,
    )
    resp.raise_for_status()
    return resp.json()["results"]["channels"][0]["alternatives"][0]["transcript"]


SUMMARY_TOOL = {
    "name": "summarize_session",
    "description": "Provide a structured summary of a transcribed Ly Labs work session.",
    "input_schema": {
        "type": "object",
        "properties": {
            "title": {"type": "string", "description": "A short descriptive title."},
            "related_project": {
                "type": "string",
                "description": "Name of an existing tracked project this session relates to, or an empty string if none.",
            },
            "summary": {
                "type": "string",
                "description": "A concise summary: key points, decisions, and action items.",
            },
        },
        "required": ["title", "summary"],
    },
}


def summarize_transcript(transcript, caption):
    prompt = "Here is a transcript of a Ly Labs work session"
    if caption:
        prompt += f' (caption: "{caption}")'
    prompt += (
        f":\n\n{transcript}\n\nCall summarize_session with a short title, a concise "
        "summary covering key points, decisions, and action items, and the related "
        "project name if one is evident from the discussion."
    )

    response = claude.messages.create(
        model="claude-sonnet-5",
        max_tokens=1024,
        tools=[SUMMARY_TOOL],
        tool_choice={"type": "tool", "name": "summarize_session"},
        messages=[{"role": "user", "content": prompt}],
    )
    for block in response.content:
        if block.type == "tool_use":
            return block.input
    return {"title": "Untitled session", "summary": transcript[:500], "related_project": ""}


def get_session_summary_text(page_id):
    resp = requests.get(
        f"https://api.notion.com/v1/blocks/{page_id}/children",
        headers=NOTION_HEADERS,
        params={"page_size": 100},
    )
    resp.raise_for_status()
    lines = []
    capturing = False
    for block in resp.json()["results"]:
        btype = block["type"]
        if btype == "heading_2":
            heading_text = "".join(
                rt["plain_text"] for rt in block["heading_2"]["rich_text"]
            )
            capturing = heading_text.strip().lower() == "summary"
            continue
        if capturing and btype == "paragraph":
            lines.append(
                "".join(rt["plain_text"] for rt in block["paragraph"]["rich_text"])
            )
    return " ".join(lines)


def recall():
    resp = requests.post(
        f"https://api.notion.com/v1/databases/{SESSION_LOG_DATABASE_ID}/query",
        headers=NOTION_HEADERS,
    )
    resp.raise_for_status()
    pages = resp.json()["results"]

    session_lines = []
    for page in pages:
        props = page["properties"]
        title = props["Name"]["title"]
        name = title[0]["plain_text"] if title else "Untitled"
        date_prop = props["Date"]["date"]
        date = date_prop["start"] if date_prop else "unknown date"
        related = props["Related project"]["rich_text"]
        related_text = f" (related project: {related[0]['plain_text']})" if related else ""
        summary = get_session_summary_text(page["id"])
        session_lines.append(f"- [{date}] {name}{related_text}: {summary}")

    sessions_text = "\n".join(session_lines) if session_lines else "No sessions logged yet."
    return f"PROJECTS:\n{list_projects()}\n\nSESSIONS:\n{sessions_text}"


def run_tool(tool_name, tool_input):
    if tool_name == "list_projects":
        return list_projects()
    if tool_name == "log_project":
        return log_project(
            tool_input.get("name"), tool_input.get("status"), tool_input.get("note")
        )
    if tool_name == "recall":
        return recall()
    return "Unknown tool."


SYSTEM_PROMPT = (
    "You are the Ly Labs Slack bot, an internal assistant and secretary for a "
    "small team. You are connected to a shared Notion workspace through several "
    "tools: list_projects (see every tracked project and its status), log_project "
    "(create or update a project entry), and recall (retrieve every project plus "
    "a summary of every recorded work session — the team's full history). Use "
    "recall whenever someone asks about past discussions, decisions, or what "
    "happened previously; use list_projects/log_project for quick status checks "
    "and updates. Never claim you lack access to project records or memory of "
    "the team's work — check with the tools instead. Separately, when someone "
    "uploads a recording, it is automatically transcribed and summarized into "
    "the Notion Session Log, which recall can then retrieve later."
)


def ask_claude(history):
    response = claude.messages.create(
        model="claude-sonnet-5",
        max_tokens=1024,
        system=SYSTEM_PROMPT,
        tools=TOOLS,
        messages=history,
    )

    while response.stop_reason == "tool_use":
        history.append({"role": "assistant", "content": response.content})
        tool_results = []
        for block in response.content:
            if block.type == "tool_use":
                result = run_tool(block.name, block.input)
                tool_results.append(
                    {"type": "tool_result", "tool_use_id": block.id, "content": result}
                )
        history.append({"role": "user", "content": tool_results})
        response = claude.messages.create(
            model="claude-sonnet-5",
            max_tokens=1024,
            system=SYSTEM_PROMPT,
            tools=TOOLS,
            messages=history,
        )

    return "".join(block.text for block in response.content if block.type == "text")


def process_audio_files(files, caption, say, thread_ts):
    audio_files = [
        f
        for f in files
        if f.get("mimetype", "").startswith("audio")
        or f.get("mimetype", "").startswith("video")
    ]
    if not audio_files:
        return False

    say(text="Got it — transcribing now, this may take a minute...", thread_ts=thread_ts)
    for f in audio_files:
        audio_resp = requests.get(
            f["url_private"],
            headers={"Authorization": f"Bearer {os.environ['SLACK_BOT_TOKEN']}"},
        )
        audio_resp.raise_for_status()
        transcript = transcribe_audio(audio_resp.content, f["mimetype"])
        info = summarize_transcript(transcript, caption)
        create_session_log(
            info["title"], info.get("related_project"), info["summary"], transcript
        )
        say(
            text=f"*{info['title']}*\n{info['summary']}\n\n_Logged to the Session Log in Notion._",
            thread_ts=thread_ts,
        )
    return True


@app.event("message")
def handle_file_upload(event, say):
    if event.get("bot_id") or not event.get("files"):
        return
    thread_ts = event.get("thread_ts", event["ts"])
    caption = clean(event.get("text", ""))
    process_audio_files(event["files"], caption, say, thread_ts)


@app.event("app_mention")
def handle_mention(event, say, client):
    channel = event["channel"]
    thread_ts = event.get("thread_ts", event["ts"])

    if event.get("files"):
        # The "message" event handler (handle_file_upload) already processes
        # any attached audio, so avoid transcribing it twice here.
        return

    history = []
    if "thread_ts" in event:
        replies = client.conversations_replies(channel=channel, ts=thread_ts)
        for msg in replies["messages"]:
            text = clean(msg.get("text", ""))
            if not text:
                continue
            role = "assistant" if msg.get("user") == bot_user_id else "user"
            history.append({"role": role, "content": text})
    else:
        history.append({"role": "user", "content": clean(event["text"])})

    reply = ask_claude(history)
    say(text=reply, thread_ts=thread_ts)


if __name__ == "__main__":
    handler = SocketModeHandler(app, os.environ["SLACK_APP_TOKEN"])
    handler.start()
