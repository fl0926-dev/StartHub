from flask import Blueprint, request

from server import config
from server.api.helpers import ok
from server.errors import NotFound
from server.storage.json_store import get_store

bp = Blueprint("articles", __name__, url_prefix="/api/articles")


@bp.get("")
def list_articles():
    items = get_store().list("articles")
    category = request.args.get("category")
    if category and category in config.ARTICLE_CATEGORIES:
        items = [a for a in items if a["category"] == category]
    items.sort(key=lambda a: a["published_at"], reverse=True)
    return ok({"items": items})


@bp.get("/<article_id>")
def get_article(article_id):
    store = get_store()
    with store.lock():
        article = store.get("articles", article_id)
        if article is None:
            raise NotFound("Article not found")
        article = store.update("articles", article_id, {"views": article["views"] + 1})
    return ok({"article": article})
