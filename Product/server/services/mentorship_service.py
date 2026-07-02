from server import config
from server.errors import AlreadyFinal, NotFound, NotOwner
from server.storage.json_store import get_store, now_iso

STAGES = config.MENTORSHIP_STAGES  # matching -> diagnosis -> tasks -> review


def _join_startup(store, mentorship):
    profile = store.get("profiles", mentorship["startup_profile_id"])
    mentorship["startup"] = None if profile is None else {
        "id": profile["id"],
        "name": profile["name"],
        "region": profile["region"],
        "industry": profile["industry"],
        "funding_stage": profile["funding_stage"],
        "one_liner": profile["one_liner"],
    }
    return mentorship


def list_for_mentor(mentor):
    store = get_store()
    items = [m for m in store.list("mentorships") if m["mentor_id"] == mentor["id"]]
    items.sort(key=lambda m: m["started_at"])
    return [_join_startup(store, m) for m in items]


def get_for_mentor(mentor, mentorship_id):
    store = get_store()
    m = store.get("mentorships", mentorship_id)
    if m is None:
        raise NotFound("Mentorship not found")
    if m["mentor_id"] != mentor["id"]:
        raise NotOwner("Not your mentorship")
    return _join_startup(store, m)


def advance_stage(mentor, mentorship_id):
    store = get_store()
    with store.lock():
        m = store.get("mentorships", mentorship_id)
        if m is None:
            raise NotFound("Mentorship not found")
        if m["mentor_id"] != mentor["id"]:
            raise NotOwner("Not your mentorship")
        index = STAGES.index(m["stage"])
        if index >= len(STAGES) - 1:
            raise AlreadyFinal("Mentorship already at final stage")
        next_stage = STAGES[index + 1]
        history = m.get("history", []) + [{"stage": next_stage, "entered_at": now_iso()}]
        updated = store.update("mentorships", mentorship_id, {
            "stage": next_stage,
            "stage_progress_pct": 0,
            "history": history,
            "updated_at": now_iso(),
        })
    return _join_startup(store, updated)
