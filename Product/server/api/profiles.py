from flask import Blueprint, request

from server.api.helpers import body_json, ok
from server.services import profile_service
from server.services.auth_service import login_required

bp = Blueprint("profiles", __name__, url_prefix="/api/profiles")


@bp.get("")
def search():
    return ok(profile_service.search(request.args))


@bp.get("/me")
@login_required
def mine(user):
    return ok({"profile": profile_service.get_mine(user)})


@bp.get("/<profile_id>")
def detail(profile_id):
    return ok({"profile": profile_service.get(profile_id, count_view=True)})


@bp.post("")
@login_required
def create(user):
    profile = profile_service.create(user, body_json())
    return ok({"profile": profile}, status=201)


@bp.put("/<profile_id>")
@login_required
def update(user, profile_id):
    profile = profile_service.update(user, profile_id, body_json())
    return ok({"profile": profile})
