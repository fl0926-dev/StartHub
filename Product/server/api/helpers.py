from flask import jsonify, request

from server.errors import ValidationError


def ok(data, status=200):
    return jsonify({"ok": True, "data": data}), status


def body_json():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        raise ValidationError("JSON body required")
    return data
