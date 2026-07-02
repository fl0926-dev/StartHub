import os

from flask import Flask, jsonify

from server import config
from server.errors import ApiError


def create_app():
    public_dir = os.path.join(config.BASE_DIR, "public")
    app = Flask(__name__, static_folder=public_dir, static_url_path="")
    app.config.update(
        SECRET_KEY=config.SECRET_KEY,
        SESSION_COOKIE_HTTPONLY=True,
        SESSION_COOKIE_SAMESITE="Lax",
        JSON_SORT_KEYS=False,
    )

    from server.api import articles, auth, mentorships, meta, profiles, threads, tokens
    for module in (auth, meta, profiles, threads, tokens, articles, mentorships):
        app.register_blueprint(module.bp)

    @app.get("/")
    def index():
        return app.send_static_file("index.html")

    @app.errorhandler(ApiError)
    def handle_api_error(err):
        body = {"ok": False, "error": {"code": err.code, "message": err.message, **err.payload}}
        return jsonify(body), err.status

    @app.errorhandler(404)
    def handle_404(err):
        return jsonify({"ok": False, "error": {"code": "NOT_FOUND", "message": "Not found"}}), 404

    @app.errorhandler(405)
    def handle_405(err):
        return jsonify({"ok": False, "error": {"code": "METHOD_NOT_ALLOWED", "message": "Method not allowed"}}), 405

    return app
