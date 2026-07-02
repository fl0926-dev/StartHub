from flask import Blueprint

from server.api.helpers import ok
from server.services import mentorship_service
from server.services.auth_service import mentor_required

bp = Blueprint("mentorships", __name__, url_prefix="/api/mentorships")


@bp.get("")
@mentor_required
def list_mentorships(user):
    return ok({"items": mentorship_service.list_for_mentor(user)})


@bp.get("/<mentorship_id>")
@mentor_required
def get_mentorship(user, mentorship_id):
    return ok({"mentorship": mentorship_service.get_for_mentor(user, mentorship_id)})


@bp.post("/<mentorship_id>/advance")
@mentor_required
def advance(user, mentorship_id):
    return ok({"mentorship": mentorship_service.advance_stage(user, mentorship_id)})
