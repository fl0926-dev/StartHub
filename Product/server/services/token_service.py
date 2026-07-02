"""Single enforcement point for the token economy.

Both functions must be called while holding store.lock() when combined
with other writes (thread/reply/vote creation)."""

from server.errors import InsufficientTokens, NotFound
from server.storage.json_store import get_store, new_id, now_iso


def _apply(user_id, delta, reason, ref_type, ref_id):
    store = get_store()
    user = store.get("users", user_id)
    if user is None:
        raise NotFound("User not found")
    balance = user["token_balance"] + delta
    if balance < 0:
        raise InsufficientTokens(
            "Not enough tokens",
            payload={"required": -delta, "balance": user["token_balance"]},
        )
    store.update("users", user_id, {"token_balance": balance})
    store.insert("ledger", {
        "id": new_id("led"),
        "user_id": user_id,
        "delta": delta,
        "reason": reason,
        "ref_type": ref_type,
        "ref_id": ref_id,
        "balance_after": balance,
        "created_at": now_iso(),
    })
    return balance


def charge(user_id, amount, reason, ref_type=None, ref_id=None):
    """Deduct tokens; raises InsufficientTokens before any write."""
    return _apply(user_id, -abs(amount), reason, ref_type, ref_id)


def credit(user_id, amount, reason, ref_type=None, ref_id=None):
    return _apply(user_id, abs(amount), reason, ref_type, ref_id)


def balance(user_id):
    store = get_store()
    user = store.get("users", user_id)
    if user is None:
        raise NotFound("User not found")
    return user["token_balance"]


def ledger_for(user_id):
    store = get_store()
    entries = [e for e in store.list("ledger") if e["user_id"] == user_id]
    entries.sort(key=lambda e: e["created_at"], reverse=True)
    return entries
