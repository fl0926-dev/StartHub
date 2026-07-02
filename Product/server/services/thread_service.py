from server import config
from server.errors import AlreadyVoted, NotFound, SelfVote, ValidationError
from server.services import token_service
from server.storage.json_store import get_store, new_id, now_iso

VOTE_TARGETS = {"thread": "threads", "reply": "replies"}


def _author_names(store):
    return {u["id"]: u["display_name"] for u in store.list("users")}


def list_threads(params):
    store = get_store()
    items = store.list("threads")

    category = params.get("category")
    if category and category in config.THREAD_CATEGORIES:
        items = [t for t in items if t["category"] == category]

    q = (params.get("q") or "").strip().lower()
    if q:
        items = [t for t in items if q in t["title"].lower() or q in t["body"].lower()]

    sort = params.get("sort") or "new"
    if sort == "top":
        items.sort(key=lambda t: (t["upvotes"], t["created_at"]), reverse=True)
    else:
        items.sort(key=lambda t: t["created_at"], reverse=True)

    names = _author_names(store)
    for t in items:
        t["author_name"] = names.get(t["author_id"], "?")
    return items


def get_thread_with_replies(thread_id, count_view=False):
    store = get_store()
    with store.lock():
        thread = store.get("threads", thread_id)
        if thread is None:
            raise NotFound("Thread not found")
        if count_view:
            thread = store.update("threads", thread_id, {"views": thread["views"] + 1})

    names = _author_names(store)
    thread["author_name"] = names.get(thread["author_id"], "?")

    replies = [r for r in store.list("replies") if r["thread_id"] == thread_id]
    replies.sort(key=lambda r: r["created_at"])
    for r in replies:
        r["author_name"] = names.get(r["author_id"], "?")
        r["children"] = []
    by_id = {r["id"]: r for r in replies}
    roots = []
    for r in replies:
        parent = by_id.get(r.get("parent_reply_id"))
        if parent is not None:
            parent["children"].append(r)
        else:
            roots.append(r)
    return thread, roots


def create_thread(user, body):
    category = body.get("category")
    title = (body.get("title") or "").strip()
    text = (body.get("body") or "").strip()
    if category not in config.THREAD_CATEGORIES:
        raise ValidationError("Unknown category")
    if not title or len(title) > 200:
        raise ValidationError("Title required (max 200 chars)")
    if not text:
        raise ValidationError("Body required")

    store = get_store()
    with store.lock():
        thread_id = new_id("thr")
        # Charge first: raises InsufficientTokens before anything is written.
        new_balance = token_service.charge(
            user["id"], config.TOKEN_COST_THREAD, "thread_post", "thread", thread_id
        )
        thread = {
            "id": thread_id,
            "author_id": user["id"],
            "category": category,
            "title": title,
            "body": text,
            "upvotes": 0,
            "reply_count": 0,
            "views": 0,
            "created_at": now_iso(),
        }
        store.insert("threads", thread)
    return thread, new_balance


def create_reply(user, thread_id, body):
    text = (body.get("body") or "").strip()
    if not text:
        raise ValidationError("Reply text required")

    store = get_store()
    with store.lock():
        thread = store.get("threads", thread_id)
        if thread is None:
            raise NotFound("Thread not found")

        parent_id = body.get("parent_reply_id") or None
        if parent_id:
            parent = store.get("replies", parent_id)
            if parent is None or parent["thread_id"] != thread_id:
                raise ValidationError("Parent reply not in this thread")
            if parent.get("parent_reply_id"):
                # Keep the tree one level deep: replying to a child attaches
                # to its top-level parent instead.
                parent_id = parent["parent_reply_id"]

        reply_id = new_id("rpl")
        new_balance = token_service.charge(
            user["id"], config.TOKEN_COST_REPLY, "reply_post", "reply", reply_id
        )
        reply = {
            "id": reply_id,
            "thread_id": thread_id,
            "author_id": user["id"],
            "parent_reply_id": parent_id,
            "body": text,
            "upvotes": 0,
            "created_at": now_iso(),
        }
        store.insert("replies", reply)
        store.update("threads", thread_id, {"reply_count": thread["reply_count"] + 1})
    return reply, new_balance


def vote(user, target_type, target_id):
    collection = VOTE_TARGETS.get(target_type)
    if collection is None:
        raise ValidationError("Unknown vote target")

    store = get_store()
    with store.lock():
        target = store.get(collection, target_id)
        if target is None:
            raise NotFound("Vote target not found")
        if target["author_id"] == user["id"]:
            raise SelfVote("You cannot vote for your own post")
        exists = any(
            v["user_id"] == user["id"]
            and v["target_type"] == target_type
            and v["target_id"] == target_id
            for v in store.list("votes")
        )
        if exists:
            raise AlreadyVoted("Already voted")
        store.insert("votes", {
            "id": new_id("vot"),
            "user_id": user["id"],
            "target_type": target_type,
            "target_id": target_id,
            "created_at": now_iso(),
        })
        updated = store.update(collection, target_id, {"upvotes": target["upvotes"] + 1})
        token_service.credit(
            target["author_id"], config.TOKEN_REWARD_UPVOTE,
            "upvote_received", target_type, target_id,
        )
    return updated["upvotes"]
