from flask import Blueprint

from server.api.helpers import body_json, ok
from server.services import auth_service

bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@bp.post("/signup")
def signup():
    data = body_json()
    user = auth_service.signup(
        data.get("email"), data.get("password"), data.get("display_name")
    )
    return ok({"user": user}, status=201)


@bp.post("/login")
def login():
    data = body_json()
    user = auth_service.login(data.get("email"), data.get("password"))
    return ok({"user": user})


@bp.post("/logout")
def logout():
    auth_service.logout()
    return ok({})


@bp.get("/me")
def me():
    user = auth_service.current_user()
    if user is None:
        return ok({"user": None})
    return ok({"user": auth_service.public_user(user)})
