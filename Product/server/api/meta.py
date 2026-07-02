from flask import Blueprint

from server import config
from server.api.helpers import ok

bp = Blueprint("meta", __name__, url_prefix="/api")


@bp.get("/health")
def health():
    return ok({"status": "up"})


@bp.get("/meta")
def meta():
    return ok({
        "regions": config.REGIONS,
        "industries": config.INDUSTRIES,
        "funding_stages": config.FUNDING_STAGES,
        "team_buckets": config.TEAM_BUCKETS,
        "thread_categories": config.THREAD_CATEGORIES,
        "article_categories": config.ARTICLE_CATEGORIES,
        "mentorship_stages": config.MENTORSHIP_STAGES,
        "token_costs": {
            "thread": config.TOKEN_COST_THREAD,
            "reply": config.TOKEN_COST_REPLY,
            "upvote_reward": config.TOKEN_REWARD_UPVOTE,
            "signup_bonus": config.SIGNUP_BONUS,
        },
    })
