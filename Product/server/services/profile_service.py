from server import config
from server.errors import NotFound, NotOwner, ProfileExists, ValidationError
from server.storage.json_store import get_store, new_id, now_iso

SORTS = {
    "newest": lambda p: p["created_at"],
    "views": lambda p: p["views"],
    "stage": lambda p: config.FUNDING_STAGES.index(p["funding_stage"]),
    "name": lambda p: p["name"],
}


def _validate(body, partial=False):
    fields = {}

    def take(key, cast=None, required=True):
        if key in body and body[key] not in (None, ""):
            value = body[key]
            if cast:
                try:
                    value = cast(value)
                except (TypeError, ValueError):
                    raise ValidationError(f"Invalid value for {key}")
            fields[key] = value
        elif required and not partial:
            raise ValidationError(f"{key} is required")

    take("name", str)
    take("one_liner", str)
    # description may be cleared: an explicit empty string is a valid value
    if "description" in body:
        fields["description"] = str(body["description"] or "")
    take("region", str)
    take("industry", str)
    take("funding_stage", str)
    take("founded_year", int)
    take("team_size", int)

    if "region" in fields and fields["region"] not in config.REGIONS:
        raise ValidationError("Unknown region")
    if "industry" in fields and fields["industry"] not in config.INDUSTRIES:
        raise ValidationError("Unknown industry")
    if "funding_stage" in fields and fields["funding_stage"] not in config.FUNDING_STAGES:
        raise ValidationError("Unknown funding stage")
    if "team_size" in fields:
        fields["team_size"] = max(1, fields["team_size"])
        fields["team_bucket"] = config.team_bucket_for(fields["team_size"])
    if "founded_year" in fields and not 1990 <= fields["founded_year"] <= 2100:
        raise ValidationError("Unrealistic founded year")

    if "hashtags" in body:
        tags = body["hashtags"]
        if isinstance(tags, str):
            tags = [t for t in tags.replace("#", " ").split() if t]
        if not isinstance(tags, list):
            raise ValidationError("hashtags must be a list")
        fields["hashtags"] = [str(t).lstrip("#").strip() for t in tags if str(t).strip()][:12]
    elif not partial:
        fields["hashtags"] = []

    if "metrics" in body and isinstance(body["metrics"], dict):
        m = body["metrics"]
        fields["metrics"] = {
            "mau": int(m.get("mau") or 0),
            "revenue_band": str(m.get("revenue_band") or ""),
            "growth_rate_pct": float(m.get("growth_rate_pct") or 0),
            "total_funding_krw": int(m.get("total_funding_krw") or 0),
        }
    elif not partial:
        fields["metrics"] = {
            "mau": 0, "revenue_band": "", "growth_rate_pct": 0, "total_funding_krw": 0,
        }

    return fields


def create(user, body):
    store = get_store()
    with store.lock():
        fresh = store.get("users", user["id"])
        if fresh.get("profile_id"):
            raise ProfileExists("This account already has a profile")
        fields = _validate(body)
        profile = {
            "id": new_id("prf"),
            "user_id": user["id"],
            **fields,
            "views": 0,
            "created_at": now_iso(),
            "updated_at": now_iso(),
        }
        store.insert("profiles", profile)
        store.update("users", user["id"], {"profile_id": profile["id"]})
    return profile


def update(user, profile_id, body):
    store = get_store()
    with store.lock():
        profile = store.get("profiles", profile_id)
        if profile is None:
            raise NotFound("Profile not found")
        if profile["user_id"] != user["id"]:
            raise NotOwner("You can only edit your own profile")
        fields = _validate(body, partial=True)
        fields["updated_at"] = now_iso()
        return store.update("profiles", profile_id, fields)


def get(profile_id, count_view=False):
    store = get_store()
    with store.lock():
        profile = store.get("profiles", profile_id)
        if profile is None:
            raise NotFound("Profile not found")
        if count_view:
            profile = store.update("profiles", profile_id, {"views": profile["views"] + 1})
    return profile


def get_mine(user):
    if not user.get("profile_id"):
        raise NotFound("No profile yet", payload={"code_hint": "NO_PROFILE"})
    return get(user["profile_id"])


def search(params):
    store = get_store()
    items = store.list("profiles")

    q = (params.get("q") or "").strip().lower()
    if q:
        items = [
            p for p in items
            if q in p["name"].lower()
            or q in p["one_liner"].lower()
            or q in (p.get("description") or "").lower()
            or any(q in t.lower() for t in p["hashtags"])
        ]

    regions = params.getlist("region") if hasattr(params, "getlist") else params.get("region", [])
    if regions:
        items = [p for p in items if p["region"] in regions]

    industry = params.get("industry")
    if industry:
        items = [p for p in items if p["industry"] == industry]

    stage = params.get("stage")
    if stage:
        items = [p for p in items if p["funding_stage"] == stage]

    team_bucket = params.get("team_bucket")
    if team_bucket:
        items = [p for p in items if p["team_bucket"] == team_bucket]

    def int_or_none(value):
        try:
            return int(value)
        except (TypeError, ValueError):
            return None

    founded_from = int_or_none(params.get("founded_from"))
    if founded_from is not None:
        items = [p for p in items if p["founded_year"] >= founded_from]
    founded_to = int_or_none(params.get("founded_to"))
    if founded_to is not None:
        items = [p for p in items if p["founded_year"] <= founded_to]

    hashtag = (params.get("hashtag") or "").lstrip("#").lower()
    if hashtag:
        items = [p for p in items if any(t.lower() == hashtag for t in p["hashtags"])]

    sort = params.get("sort") or "newest"
    key = SORTS.get(sort, SORTS["newest"])
    items.sort(key=key, reverse=sort in ("newest", "views"))

    total = len(items)
    try:
        page = max(1, int(params.get("page") or 1))
        limit = min(48, max(1, int(params.get("limit") or 24)))
    except ValueError:
        page, limit = 1, 24
    start = (page - 1) * limit
    return {"items": items[start:start + limit], "total": total, "page": page, "limit": limit}
