class ApiError(Exception):
    status = 400
    code = "BAD_REQUEST"

    def __init__(self, message=None, payload=None):
        super().__init__(message or self.code)
        self.message = message or self.code
        self.payload = payload or {}


class ValidationError(ApiError):
    status = 400
    code = "VALIDATION"


class AuthRequired(ApiError):
    status = 401
    code = "AUTH_REQUIRED"


class InvalidCredentials(ApiError):
    status = 401
    code = "INVALID_CREDENTIALS"


class InsufficientTokens(ApiError):
    status = 402
    code = "INSUFFICIENT_TOKENS"


class Forbidden(ApiError):
    status = 403
    code = "FORBIDDEN"


class SelfVote(ApiError):
    status = 403
    code = "SELF_VOTE"


class MentorOnly(ApiError):
    status = 403
    code = "MENTOR_ONLY"


class NotOwner(ApiError):
    status = 403
    code = "NOT_OWNER"


class NotFound(ApiError):
    status = 404
    code = "NOT_FOUND"


class Conflict(ApiError):
    status = 409
    code = "CONFLICT"


class AlreadyVoted(ApiError):
    status = 409
    code = "ALREADY_VOTED"


class ProfileExists(ApiError):
    status = 409
    code = "PROFILE_EXISTS"


class AlreadyFinal(ApiError):
    status = 409
    code = "ALREADY_FINAL"
