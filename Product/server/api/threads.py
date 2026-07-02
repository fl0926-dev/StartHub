from flask import Blueprint, request

from server.api.helpers import body_json, ok
from server.services import thread_service
from server.services.auth_service import login_required

bp = Blueprint("threads", __name__, url_prefix="/api")


@bp.get("/threads")
def list_threads():
    return ok({"items": thread_service.list_threads(request.args)})


@bp.get("/threads/<thread_id>")
def get_thread(thread_id):
    thread, replies = thread_service.get_thread_with_replies(thread_id, count_view=True)
    return ok({"thread": thread, "replies": replies})


@bp.post("/threads")
@login_required
def create_thread(user):
    thread, balance = thread_service.create_thread(user, body_json())
    return ok({"thread": thread, "token_balance": balance}, status=201)


@bp.post("/threads/<thread_id>/replies")
@login_required
def create_reply(user, thread_id):
    reply, balance = thread_service.create_reply(user, thread_id, body_json())
    return ok({"reply": reply, "token_balance": balance}, status=201)


@bp.post("/threads/<thread_id>/vote")
@login_required
def vote_thread(user, thread_id):
    upvotes = thread_service.vote(user, "thread", thread_id)
    return ok({"upvotes": upvotes})


@bp.post("/replies/<reply_id>/vote")
@login_required
def vote_reply(user, reply_id):
    upvotes = thread_service.vote(user, "reply", reply_id)
    return ok({"upvotes": upvotes})
