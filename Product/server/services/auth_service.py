from functools import wraps

from flask import session
from werkzeug.security import check_password_hash, generate_password_hash

from server import config
from server.errors import (
    AuthRequired, Conflict, InvalidCredentials, MentorOnly, ValidationError,
)
from server.services import token_service
from server.storage.json_store import get_store, new_id, now_iso


def public_user(user):
    return {
        "id": user["id"],
        "email": user["email"],
        "display_name": user["display_name"],
        "role": user["role"],
        "token_balance": user["token_balance"],
        "profile_id": user.get("profile_id"),
    }


def signup(email, password, display_name):
    email = (email or "").strip().lower()
    if not email or "@" not in email:
        raise ValidationError("Valid email required")
    if not password or len(password) < 8:
        raise ValidationError("Password must be at least 8 characters")
    display_name = (display_name or "").strip()
    if not display_name:
        raise ValidationError("Display name required")

    store = get_store()
    with store.lock():
        if any(u["email"] == email for u in store.list("users")):
            raise Conflict("Email already registered")
        user = {
            "id": new_id("usr"),
            "email": email,
            "password_hash": generate_password_hash(password),
            "display_name": display_name,
            "role": "startup",
            "token_balance": 0,
            "profile_id": None,
            "created_at": now_iso(),
        }
        store.insert("users", user)
        token_service.credit(
            user["id"], config.SIGNUP_BONUS, "signup_bonus", "user", user["id"]
        )
        user = store.get("users", user["id"])
    session["user_id"] = user["id"]
    return public_user(user)


def login(email, password):
    email = (email or "").strip().lower()
    store = get_store()
    user = next((u for u in store.list("users") if u["email"] == email), None)
    if user is None or not check_password_hash(user["password_hash"], password or ""):
        raise InvalidCredentials("Wrong email or password")
    session["user_id"] = user["id"]
    return public_user(user)


def logout():
    session.pop("user_id", None)


def current_user():
    user_id = session.get("user_id")
    if not user_id:
        return None
    return get_store().get("users", user_id)


def login_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        user = current_user()
        if user is None:
            raise AuthRequired("Login required")
        return fn(user, *args, **kwargs)
    return wrapper


def mentor_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        user = current_user()
        if user is None:
            raise AuthRequired("Login required")
        if user["role"] != "mentor":
            raise MentorOnly("Mentor account required")
        return fn(user, *args, **kwargs)
    return wrapper
