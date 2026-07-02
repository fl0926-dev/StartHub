from flask import Blueprint

from server.api.helpers import body_json, ok
from server.errors import NotFound
from server.services import token_service
from server.services.auth_service import login_required
from server.storage.json_store import get_store

bp = Blueprint("tokens", __name__, url_prefix="/api")


@bp.get("/tokens/balance")
@login_required
def balance(user):
    return ok({"balance": token_service.balance(user["id"])})


@bp.get("/tokens/ledger")
@login_required
def ledger(user):
    return ok({"items": token_service.ledger_for(user["id"])})


@bp.get("/products")
def products():
    items = sorted(get_store().list("products"), key=lambda p: p["sort_order"])
    return ok({
        "packs": [p for p in items if p["kind"] == "pack"],
        "memberships": [p for p in items if p["kind"] == "membership"],
    })


@bp.post("/purchase/mock")
@login_required
def mock_purchase(user):
    data = body_json()
    product = get_store().get("products", data.get("product_id") or "")
    if product is None:
        raise NotFound("Product not found")
    # Payment is out of scope for the MVP: acknowledge without granting tokens.
    return ok({"status": "coming_soon", "product_id": product["id"]})
