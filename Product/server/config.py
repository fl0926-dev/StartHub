import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.environ.get("STARTHUB_DATA_DIR", os.path.join(BASE_DIR, "data"))
SECRET_KEY = os.environ.get("STARTHUB_SECRET_KEY", "dev-only-secret-change-me")

TOKEN_COST_THREAD = 5
TOKEN_COST_REPLY = 2
TOKEN_REWARD_UPVOTE = 1
SIGNUP_BONUS = 20

REGIONS = [
    "busan", "daegu", "gwangju", "daejeon", "ulsan", "sejong",
    "gangwon", "chungbuk", "chungnam", "jeonbuk", "jeonnam",
    "gyeongbuk", "gyeongnam", "jeju",
]

INDUSTRIES = [
    "ai_data", "biohealth", "fintech", "manufacturing", "agri_food",
    "mobility", "energy_env", "edu_content", "commerce", "tourism_local",
]

FUNDING_STAGES = ["pre_seed", "seed", "pre_a", "series_a", "series_b_plus"]

TEAM_BUCKETS = ["1_5", "6_10", "11_30", "31_plus"]

THREAD_CATEGORIES = ["marketing", "funding", "qna", "tech"]

ARTICLE_CATEGORIES = ["policy", "funding_news", "regional", "trend"]

MENTORSHIP_STAGES = ["matching", "diagnosis", "tasks", "review"]

COLLECTIONS = [
    "users", "profiles", "threads", "replies", "votes",
    "ledger", "articles", "mentorships", "products",
]


def team_bucket_for(team_size):
    if team_size <= 5:
        return "1_5"
    if team_size <= 10:
        return "6_10"
    if team_size <= 30:
        return "11_30"
    return "31_plus"
