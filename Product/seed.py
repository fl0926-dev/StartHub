"""Idempotent seeder: overwrites every data/*.json with demo content.

Demo accounts (password for all: starthub123)
  demo@starthub.kr    startup role, owns the "그린웨이브" profile
  ocean@starthub.kr   startup role, second account for vote/reply testing
  mentor@starthub.kr  mentor role, sees the mentoring dashboard
"""

import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from werkzeug.security import generate_password_hash

from server import config

PASSWORD = "starthub123"
T = "2026-06-{d:02d}T0{h}:00:00+00:00"


def ts(day, h=9):
    return T.format(d=day, h=h)


def write(collection, items):
    os.makedirs(config.DATA_DIR, exist_ok=True)
    path = os.path.join(config.DATA_DIR, f"{collection}.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump({"items": items}, f, ensure_ascii=False, indent=2)
    print(f"  {collection}.json: {len(items)} items")


PROFILE_ROWS = [
    # (id, name, one_liner_ko, region, industry, stage, year, team, tags, mau, revenue, growth, funding)
    ("prf_greenwave", "그린웨이브", "부산 해양 폐플라스틱을 재생 소재로 바꾸는 업사이클링 플랫폼",
     "busan", "energy_env", "seed", 2023, 8, ["업사이클링", "해양폐기물", "ESG"], 4200, "1억~5억", 38.0, 800_000_000),
    ("prf_farmlink", "팜링크", "경북 과수 농가와 도시 소비자를 잇는 산지직송 구독 커머스",
     "gyeongbuk", "agri_food", "pre_a", 2022, 14, ["산지직송", "구독", "푸드테크"], 18500, "5억~10억", 24.5, 2_400_000_000),
    ("prf_medisync", "메디싱크", "대구 지역 병원 간 진료 데이터 연동 SaaS",
     "daegu", "biohealth", "series_a", 2021, 27, ["의료데이터", "SaaS", "인터오퍼러빌리티"], 950, "10억+", 41.2, 7_500_000_000),
    ("prf_hanbat_ai", "한밭에이아이", "대전 제조 중소기업을 위한 불량 검출 비전 AI",
     "daejeon", "ai_data", "seed", 2023, 6, ["비전AI", "스마트팩토리", "제조혁신"], 320, "1억 미만", 55.0, 1_200_000_000),
    ("prf_jeju_stay", "제주스테이랩", "제주 빈집을 워케이션 스테이로 재생하는 로컬 플랫폼",
     "jeju", "tourism_local", "pre_seed", 2024, 4, ["워케이션", "빈집재생", "로컬"], 2800, "1억 미만", 62.0, 300_000_000),
    ("prf_gwangju_ev", "루멘모빌리티", "광주 초소형 전기화물차 라스트마일 물류 솔루션",
     "gwangju", "mobility", "seed", 2022, 11, ["전기차", "라스트마일", "물류"], 1500, "1억~5억", 29.8, 1_800_000_000),
    ("prf_ulsan_h2", "수소나래", "울산 산단 부생수소를 활용한 소규모 연료전지 발전",
     "ulsan", "energy_env", "pre_a", 2021, 18, ["수소", "분산발전", "탄소중립"], 90, "5억~10억", 19.5, 4_000_000_000),
    ("prf_gangwon_agri", "설악팜", "강원 고랭지 채소 스마트팜 재배 데이터 서비스",
     "gangwon", "agri_food", "pre_seed", 2024, 3, ["스마트팜", "고랭지", "데이터"], 640, "1억 미만", 48.0, 200_000_000),
    ("prf_chungbuk_bio", "오송바이오웍스", "충북 오송 기반 mRNA 원료 정제 소재 개발",
     "chungbuk", "biohealth", "series_a", 2020, 32, ["바이오소재", "mRNA", "오송클러스터"], 45, "10억+", 22.3, 12_000_000_000),
    ("prf_jeonbuk_food", "전주미식단", "전북 로컬 식자재 B2B 큐레이션 및 새벽 배송",
     "jeonbuk", "commerce", "seed", 2022, 9, ["로컬푸드", "B2B", "새벽배송"], 5400, "1억~5억", 33.1, 900_000_000),
    ("prf_jeonnam_sea", "완도블루푸드", "전남 해조류 기반 대체 단백질 식품 개발",
     "jeonnam", "agri_food", "pre_a", 2021, 12, ["대체단백질", "해조류", "푸드테크"], 780, "5억~10억", 27.7, 3_200_000_000),
    ("prf_gyeongnam_robot", "창원로보틱스", "경남 조선소 용접 자동화 협동로봇 시스템",
     "gyeongnam", "manufacturing", "series_b_plus", 2019, 45, ["협동로봇", "조선", "자동화"], 60, "10억+", 18.9, 21_000_000_000),
    ("prf_sejong_edu", "세종러닝랩", "세종 초중등 대상 AI 맞춤 학습 진단 서비스",
     "sejong", "edu_content", "seed", 2023, 7, ["에듀테크", "AI진단", "맞춤학습"], 12800, "1억~5억", 35.6, 700_000_000),
    ("prf_chungnam_fin", "당진페이", "충남 전통시장 소상공인 간편결제·정산 핀테크",
     "chungnam", "fintech", "pre_seed", 2024, 5, ["간편결제", "소상공인", "지역화폐"], 3600, "1억 미만", 58.4, 400_000_000),
    ("prf_busan_tour", "港투어", "부산 원도심 골목 여행 코스 큐레이션 앱",
     "busan", "tourism_local", "pre_seed", 2023, 4, ["로컬여행", "큐레이션", "원도심"], 8900, "1억 미만", 44.2, 250_000_000),
]

DESC_KO = (
    "{name}은(는) {year}년 창업한 {region_label} 기반 스타트업입니다. "
    "지역의 산업 기반과 인재를 연결해 수도권 밖에서도 성장 가능한 비즈니스를 증명하고 있습니다. "
    "현재 팀원 {team}명이 함께하고 있으며, 다음 라운드 투자 유치와 전국 단위 확장을 준비 중입니다."
)

REGION_LABELS_KO = {
    "busan": "부산", "daegu": "대구", "gwangju": "광주", "daejeon": "대전",
    "ulsan": "울산", "sejong": "세종", "gangwon": "강원", "chungbuk": "충북",
    "chungnam": "충남", "jeonbuk": "전북", "jeonnam": "전남",
    "gyeongbuk": "경북", "gyeongnam": "경남", "jeju": "제주",
}


def build_users_and_profiles():
    pw = generate_password_hash(PASSWORD)
    users, profiles = [], []

    def add_user(uid, email, name, role, balance, profile_id=None, day=1):
        users.append({
            "id": uid, "email": email, "password_hash": pw,
            "display_name": name, "role": role, "token_balance": balance,
            "profile_id": profile_id, "created_at": ts(day),
        })

    for i, row in enumerate(PROFILE_ROWS):
        (pid, name, one_liner, region, industry, stage, year, team,
         tags, mau, revenue, growth, funding) = row
        uid = pid.replace("prf_", "usr_")
        owner_email = f"{pid.replace('prf_', '')}@starthub.kr"
        add_user(uid, owner_email, name, "startup", 20, pid, day=1 + i % 10)
        profiles.append({
            "id": pid, "user_id": uid, "name": name, "one_liner": one_liner,
            "description": DESC_KO.format(
                name=name, year=year, region_label=REGION_LABELS_KO[region], team=team
            ),
            "region": region, "industry": industry, "funding_stage": stage,
            "founded_year": year, "team_size": team,
            "team_bucket": config.team_bucket_for(team),
            "hashtags": tags,
            "metrics": {
                "mau": mau, "revenue_band": revenue,
                "growth_rate_pct": growth, "total_funding_krw": funding,
            },
            "views": (i * 37) % 180 + 12,
            "created_at": ts(2 + i % 12), "updated_at": ts(2 + i % 12),
        })

    # Demo startup account owns 그린웨이브 (swap ownership onto demo user).
    demo = {
        "id": "usr_demo", "email": "demo@starthub.kr", "password_hash": pw,
        "display_name": "그린웨이브", "role": "startup", "token_balance": 16,
        "profile_id": "prf_greenwave", "created_at": ts(1),
    }
    users = [u for u in users if u["id"] != "usr_greenwave"]
    for p in profiles:
        if p["id"] == "prf_greenwave":
            p["user_id"] = "usr_demo"
    users.insert(0, demo)

    add_user("usr_ocean", "ocean@starthub.kr", "오션테크", "startup", 20, None, day=2)
    add_user("usr_mentor", "mentor@starthub.kr", "나눔엔젤스 김멘토", "mentor", 20, None, day=1)
    return users, profiles


THREAD_ROWS = [
    # (id, author, category, title, body, upvotes, views, day)
    ("thr_seed01", "usr_farmlink", "funding",
     "지방 소재 스타트업 시리즈A 준비, IR 자료에서 '지역 리스크' 질문 어떻게 방어하시나요?",
     "수도권 VC 미팅마다 '팀이 지방에 있는데 채용은 어떻게 할 거냐'는 질문을 받습니다. "
     "저희는 오히려 이탈률이 낮다는 데이터로 대응 중인데, 다른 대표님들은 어떤 논리로 풀어가시는지 궁금합니다.",
     14, 220, 10),
    ("thr_seed02", "usr_hanbat_ai", "tech",
     "제조 현장 엣지 디바이스에서 비전 모델 경량화 경험 공유합니다",
     "대전 산단 고객사 라인에 Jetson 기반으로 배포하면서 얻은 교훈 정리했습니다. "
     "양자화보다 입력 해상도 조정이 체감 효과가 컸고, 현장 조도 변화 대응이 제일 어려웠습니다. "
     "비슷한 환경 겪으신 분들과 노하우 나누고 싶습니다.",
     22, 340, 12),
    ("thr_seed03", "usr_jeju_stay", "marketing",
     "로컬 서비스 초기 유저 확보, 인스타 릴스 vs 네이버 플레이스 어디에 집중?",
     "제주 워케이션 스테이 운영 중입니다. 마케팅 예산이 월 100만원 수준인데 채널을 하나로 몰아야 할지, "
     "둘 다 얇게 가져가야 할지 고민입니다. 숙박/로컬 쪽 전환율 데이터 있으신 분 계신가요?",
     9, 180, 14),
    ("thr_seed04", "usr_ocean", "qna",
     "예비창업패키지 사업계획서, 기술성 파트에 특허 출원 '예정'만 있어도 감점일까요?",
     "출원 준비 중인 상태로 제출하려고 합니다. 심사 경험 있으신 분들 조언 부탁드립니다.",
     6, 150, 16),
    ("thr_seed05", "usr_jeonnam_sea", "funding",
     "지역 모태펀드 (지역혁신 벤처펀드) 실제로 받아보신 분 후기 궁금합니다",
     "전남권에서 대체식품 개발 중인데, 지역혁신 벤처펀드 출자 GP 리스트를 보고 콜드메일을 돌리는 게 나을지, "
     "지자체 연계 프로그램을 먼저 타는 게 나을지 판단이 안 섭니다.",
     11, 190, 18),
    ("thr_seed06", "usr_sejong_edu", "marketing",
     "B2B2C 에듀테크, 학교 영업과 학부모 직접 마케팅 병행 전략 공유",
     "세종/충청권 학교 30곳 파일럿 돌리면서 배운 점: 결정권자는 교장이 아니라 부장교사인 경우가 많았습니다. "
     "학부모 커뮤니티 카페 운영 노하우도 댓글로 나눠요.",
     17, 260, 20),
    ("thr_seed07", "usr_gyeongnam_robot", "tech",
     "조선소 현장 PoC에서 배운 것: 하드웨어 스타트업의 현장 검증 체크리스트",
     "3년간 현장 PoC 7번 실패하고 정리한 체크리스트입니다. 안전 인증, 현장 노조 커뮤니케이션, "
     "예비 부품 리드타임까지—하드웨어 하시는 분들께 도움이 되길 바랍니다.",
     31, 410, 22),
    ("thr_seed08", "usr_chungnam_fin", "qna",
     "전통시장 상인회와 제휴 계약서 쓸 때 주의할 점 있을까요?",
     "지역화폐 연동 결제 서비스를 시장 단위로 계약하려고 합니다. 상인회가 법인이 아닌 경우가 많던데 "
     "계약 주체를 어떻게 잡아야 하는지 경험담 부탁드립니다.",
     4, 95, 24),
]

REPLY_ROWS = [
    # (id, thread, author, parent, body, upvotes, day)
    ("rpl_a1", "thr_seed01", "usr_medisync", None,
     "저희는 '지역 거점 병원 네트워크가 진입장벽'이라는 프레임으로 뒤집었습니다. 지역이 리스크가 아니라 해자라는 걸 숫자로 보여주면 분위기가 바뀝니다.",
     8, 11),
    ("rpl_a2", "thr_seed01", "usr_gyeongnam_robot", None,
     "시리즈B까지 창원에서 왔습니다. 핵심 직군은 원격+분기 오프사이트로 풀었고, IR에서는 인건비 효율을 강조했습니다.",
     6, 11),
    ("rpl_a3", "thr_seed01", "usr_demo", "rpl_a1",
     "해자 프레임 좋네요. 저희도 부산 항만 인프라 접근성을 같은 방식으로 정리해봐야겠습니다.",
     2, 12),
    ("rpl_b1", "thr_seed02", "usr_ulsan_h2", None,
     "조도 문제는 저희도 겪었습니다. 결국 조명 표준화를 고객사 설비 투자로 넣는 게 모델 튜닝보다 쌌습니다.",
     7, 13),
    ("rpl_b2", "thr_seed02", "usr_ocean", None,
     "혹시 데이터 라벨링은 현장 인력이 하시나요, 외주인가요? 저희는 검수 품질 편차 때문에 고민입니다.",
     3, 13),
    ("rpl_c1", "thr_seed03", "usr_busan_tour", None,
     "로컬 여행 쪽 경험상 네이버 플레이스 리뷰 20개가 릴스 조회수 10만보다 예약 전환이 좋았습니다. 검색 의도가 있는 채널부터 잡으세요.",
     5, 15),
    ("rpl_d1", "thr_seed04", "usr_hanbat_ai", None,
     "작년 선정 경험상 '출원 예정'은 감점보다는 무근거가 문제입니다. 선행기술조사 결과와 출원 일정표를 붙이면 충분히 커버됩니다.",
     4, 17),
    ("rpl_e1", "thr_seed07", "usr_demo", None,
     "체크리스트 정말 유용합니다. 안전 인증 항목은 해양 쪽에도 그대로 적용되네요. 공유 감사합니다.",
     3, 23),
]

VOTE_ROWS = [
    ("vot_%03d" % i, user, ttype, tid, ts(25, h=1 + i % 8))
    for i, (user, ttype, tid) in enumerate([
        ("usr_demo", "thread", "thr_seed02"),
        ("usr_demo", "thread", "thr_seed07"),
        ("usr_ocean", "thread", "thr_seed01"),
        ("usr_ocean", "thread", "thr_seed07"),
        ("usr_medisync", "thread", "thr_seed07"),
        ("usr_farmlink", "reply", "rpl_b1"),
        ("usr_demo", "reply", "rpl_a1"),
        ("usr_ocean", "reply", "rpl_a1"),
    ])
]

ARTICLE_ROWS = [
    ("art_01", "policy",
     "2026년 지역 창업 지원 정책 총정리: 비수도권 가점이 커졌다",
     "A complete guide to Korea's 2026 regional startup policy: bigger incentives outside Seoul",
     "올해 정부 창업 지원 사업에서 비수도권 소재 기업 가점이 대폭 확대됐다. 예비·초기 패키지 기준 지역 기업 선정 비율이 40%까지 올라간다.",
     "This year's government startup programs sharply expand scoring bonuses for companies outside the capital region, with regional selection ratios rising to 40% for early-stage packages.",
     "중소벤처기업부가 발표한 2026년 창업 지원 통합 공고에 따르면, 비수도권 소재 스타트업은 주요 사업에서 서류 평가 가점과 별도 선정 트랙을 동시에 적용받는다.\n\n특히 지역혁신 벤처펀드의 출자 규모가 전년 대비 30% 늘며, 지역 거점 도시의 초기 투자 생태계에 직접적인 자금이 유입될 전망이다.\n\n전문가들은 '가점보다 중요한 것은 지역 기업의 데이터 축적'이라며, 지원 사업 이력과 성과 지표를 체계적으로 관리할 것을 권고했다.",
     "According to the Ministry of SMEs and Startups' 2026 integrated announcement, startups based outside the Seoul metropolitan area receive both document-screening bonuses and dedicated selection tracks.\n\nThe regional innovation venture fund grows 30% year over year, channeling capital directly into early-stage ecosystems in regional hub cities.\n\nExperts note that systematic tracking of program history and performance metrics matters more than the bonus points themselves.",
     "중소벤처기업부", "https://www.mss.go.kr", 3, 1240),
    ("art_02", "funding_news",
     "부산 해양 스타트업, 상반기 시드 투자 유치 급증",
     "Busan ocean-tech startups see seed funding surge in H1",
     "부산 지역 해양·수산 분야 스타트업의 상반기 시드 투자 유치 건수가 전년 동기 대비 2배로 늘었다.",
     "Seed rounds for Busan's ocean and fisheries startups doubled year over year in the first half.",
     "부산창조경제혁신센터 집계에 따르면 올해 상반기 부산 해양 스타트업 시드 투자는 총 18건으로 전년 동기 9건에서 두 배 증가했다.\n\n업계는 항만 물류 데이터 개방과 해양 폐기물 규제 강화가 신규 비즈니스 기회를 만든 것으로 분석한다.\n\n다만 후속 투자(시리즈A) 전환율은 여전히 수도권의 절반 수준으로, 브릿지 단계의 지역 자본 공백이 과제로 남아 있다.",
     "Busan Creative Economy Innovation Center counted 18 seed deals in H1, up from 9 a year earlier.\n\nThe industry credits opened port-logistics data and tighter marine-waste regulation with creating new business opportunities.\n\nSeries A conversion, however, remains at half the rate of the capital region, leaving a bridge-stage capital gap.",
     "부산창조경제혁신센터", "https://ccei.creativekorea.or.kr/busan", 6, 890),
    ("art_03", "trend",
     "글로벌 톱 액셀러레이터가 말하는 '초기 커뮤니티 100명'의 법칙",
     "What top global accelerators say about your first 100 community members",
     "YC와 테크스타즈 출신 파트너들이 공통적으로 강조하는 초기 커뮤니티 구축 전략을 정리했다.",
     "A synthesis of early-community playbooks from YC and Techstars partners.",
     "글로벌 액셀러레이터 파트너들은 초기 커뮤니티의 질이 이후 그로스의 상한선을 결정한다고 입을 모은다.\n\n핵심은 세 가지다. 첫째, 100명이 될 때까지는 자동화하지 말 것. 둘째, 기여자에게 명확한 보상 루프를 설계할 것. 셋째, 콘텐츠보다 '질문'이 오가는 구조를 만들 것.\n\n특히 포인트·토큰 등 기여 보상 시스템은 초기 커뮤니티의 참여 밀도를 3배까지 끌어올린 사례가 보고됐다.",
     "Partners agree that early community quality caps later growth.\n\nThree rules recur: don't automate before 100 members; design explicit reward loops for contributors; structure the space around questions, not content.\n\nContribution rewards such as points or tokens have been reported to triple early engagement density.",
     "StartHub Research", "https://example.com/research/community-100", 10, 2100),
    ("art_04", "regional",
     "대전·세종 딥테크 벨트, 정부출연연 스핀오프가 이끈다",
     "Daejeon–Sejong deep-tech belt led by government-lab spinoffs",
     "대덕특구 출연연 스핀오프 창업이 5년 만에 3배 늘며 충청권 딥테크 생태계가 재편되고 있다.",
     "Spinoffs from Daedeok research institutes tripled in five years, reshaping the deep-tech scene.",
     "대덕연구개발특구의 연구소기업 등록 수가 5년 만에 3배 증가했다. 특히 AI·로봇·바이오 소재 분야가 전체의 70%를 차지한다.\n\n출연연 연구자의 겸직 창업 요건이 완화되면서, 기술이전이 아닌 '연구자 직접 창업' 모델이 주류로 자리잡는 모습이다.\n\n지역 VC들은 딥테크 특성상 긴 회수 기간을 감안한 전용 펀드 조성이 필요하다고 지적한다.",
     "Registered research-institute companies in Daedeok tripled over five years, with AI, robotics, and bio-materials making up 70%.\n\nRelaxed rules on concurrent positions have made founder-researchers, rather than tech transfer, the dominant model.\n\nRegional VCs call for dedicated funds that accommodate deep tech's longer exit horizons.",
     "연구개발특구진흥재단", "https://www.innopolis.or.kr", 12, 760),
    ("art_05", "trend",
     "지방 스타트업 채용, '완전 원격'보다 '거점 하이브리드'가 이겼다",
     "For regional startups, hub-hybrid beats fully remote hiring",
     "비수도권 스타트업 120곳 조사: 완전 원격보다 지역 거점+원격 혼합이 채용과 리텐션 모두 우수했다.",
     "A survey of 120 regional startups finds hub-plus-remote hybrid outperforms fully remote on both hiring and retention.",
     "비수도권 스타트업 120곳을 대상으로 한 채용 실태 조사에서, 지역 거점 오피스를 유지하며 원격을 혼합한 기업이 완전 원격 기업보다 1년 리텐션이 18%p 높았다.\n\n핵심 직군의 수도권 거주 인재는 '월 1회 오프사이트+숙박 지원' 조합에 가장 긍정적으로 반응했다.\n\n조사팀은 지역 기업이 원격 제도를 '서울 인재 유치 도구'가 아니라 '지역 정착 브릿지'로 설계할 것을 제안했다.",
     "Among 120 regional startups surveyed, hybrid companies kept a regional hub and saw one-year retention 18 points higher than fully remote peers.\n\nSeoul-based talent in key roles responded best to a monthly offsite plus lodging support.\n\nThe researchers suggest framing remote policy as a bridge to relocation, not a Seoul-talent acquisition tool.",
     "StartHub Research", "https://example.com/research/hybrid-hiring", 15, 1430),
    ("art_06", "funding_news",
     "호남권 첫 임팩트 펀드 결성… 농식품·에너지 전환에 500억",
     "Honam region closes first impact fund: ₩50B for agri-food and energy transition",
     "광주·전남·전북을 커버하는 첫 임팩트 전용 펀드가 500억 규모로 결성됐다.",
     "A ₩50 billion impact-only fund covering Gwangju, Jeonnam, and Jeonbuk has closed.",
     "호남권을 주 투자 지역으로 하는 임팩트 펀드가 500억 원 규모로 최종 결성됐다. 주목적 투자 분야는 농식품 전환, 재생에너지, 지역 돌봄 서비스다.\n\n운용사는 재무 수익률과 함께 지역 고용 창출을 핵심 성과 지표로 삼는다고 밝혔다.\n\n지역 창업 지원 기관들은 이번 펀드가 '시드 이후 자금 공백'을 메우는 첫 단추가 될 것으로 기대하고 있다.",
     "The fund's mandate covers agri-food transition, renewable energy, and regional care services.\n\nThe GP will track regional job creation alongside financial returns as a core KPI.\n\nLocal support organizations hope it becomes the first plug for the post-seed capital gap.",
     "한국벤처투자", "https://www.kvic.or.kr", 18, 540),
    ("art_07", "policy",
     "지역화폐 연동 API 전면 개방: 소상공인 핀테크의 기회",
     "Local-currency APIs fully opened: an opening for small-merchant fintech",
     "행안부가 지역사랑상품권 정산 API를 민간에 개방하면서 지역 핀테크 스타트업의 신규 서비스가 가능해졌다.",
     "With settlement APIs for local gift certificates opened to the private sector, regional fintech startups gain new service opportunities.",
     "행정안전부가 지역사랑상품권 발행·정산 데이터를 표준 API로 개방했다. 그동안 지자체별로 파편화됐던 연동 방식이 통일되면서, 전통시장 결제·정산 서비스를 만드는 스타트업의 개발 부담이 크게 줄었다.\n\n다만 정산 주기와 수수료 구조는 지자체 조례에 따라 달라 사업 모델 설계 시 주의가 필요하다.\n\n업계는 상권 데이터 분석, 상인 대상 선정산 서비스 등 파생 비즈니스가 이어질 것으로 본다.",
     "The Ministry of the Interior standardized issuance and settlement data as open APIs, unifying what had been fragmented per municipality.\n\nSettlement cycles and fee structures still vary by local ordinance, so business models need care.\n\nThe industry expects derivative businesses such as commercial-district analytics and merchant advance-settlement services.",
     "행정안전부", "https://www.mois.go.kr", 21, 980),
    ("art_08", "regional",
     "경남 제조 스타트업의 역설: 일감은 넘치는데 사람이 없다",
     "The Gyeongnam manufacturing paradox: full order books, empty talent pipelines",
     "조선·방산 호황으로 경남 제조 스타트업 수주가 급증했지만, 기술 인력난이 성장의 병목이 되고 있다.",
     "Orders surge on shipbuilding and defense booms, but the technical-talent shortage bottlenecks growth.",
     "창원·거제 일대 제조 자동화 스타트업들은 올해 수주 잔고가 사상 최대치를 기록했다. 그러나 로봇·제어 분야 경력 인력의 수도권 유출이 계속되며 납기 리스크가 커지고 있다.\n\n일부 기업은 지역 대학과 계약학과를 만들어 채용 파이프라인을 직접 구축하는 방식으로 대응하고 있다.\n\n전문가들은 지역 제조 스타트업 간 인력 공유·공동 교육 모델 등 협업 구조가 필요하다고 조언한다.",
     "Automation startups around Changwon and Geoje report record backlogs, while experienced robotics and controls engineers keep leaving for the capital.\n\nSome firms are building their own pipelines through contract departments with regional universities.\n\nExperts advise cooperative structures such as shared-talent pools and joint training programs.",
     "경남테크노파크", "https://www.gntp.or.kr", 24, 670),
]

MENTORSHIP_ROWS = [
    # (id, profile, stage, progress, kpis, note, start_day)
    ("mnt_01", "prf_jeju_stay", "matching", 40,
     [{"key": "mau", "value": "2,800", "delta_pct": 12.0},
      {"key": "runway_months", "value": "9", "delta_pct": 0.0}],
     "초기 미팅 완료, 상호 목표 정렬 문서 작성 중.", 2),
    ("mnt_02", "prf_hanbat_ai", "diagnosis", 65,
     [{"key": "pilot_lines", "value": "3", "delta_pct": 50.0},
      {"key": "mrr", "value": "₩12M", "delta_pct": 8.5}],
     "재무 구조 진단 완료. 단가 정책 재설계가 핵심 과제로 식별됨.", 5),
    ("mnt_03", "prf_farmlink", "tasks", 30,
     [{"key": "subscribers", "value": "4,100", "delta_pct": 15.2},
      {"key": "churn_pct", "value": "6.8%", "delta_pct": -1.1}],
     "과제 1(물류비 구조 개선) 진행 중, 과제 2(리텐션)는 다음 주 착수.", 8),
    ("mnt_04", "prf_gwangju_ev", "tasks", 80,
     [{"key": "fleet", "value": "42대", "delta_pct": 20.0},
      {"key": "utilization", "value": "71%", "delta_pct": 5.4}],
     "물류사 제휴 과제 마무리 단계. 최종 리뷰 일정 조율 중.", 8),
    ("mnt_05", "prf_jeonbuk_food", "review", 100,
     [{"key": "gmv", "value": "₩380M", "delta_pct": 22.0},
      {"key": "b2b_accounts", "value": "86", "delta_pct": 30.3}],
     "멘토링 종료. 후속 시드 브릿지 라운드 투자 검토 의견서 작성 완료.", 1),
]


def build_mentorships():
    items = []
    for mid, pid, stage, progress, kpis, note, day in MENTORSHIP_ROWS:
        idx = config.MENTORSHIP_STAGES.index(stage)
        history = [
            {"stage": s, "entered_at": ts(day + i * 3)}
            for i, s in enumerate(config.MENTORSHIP_STAGES[: idx + 1])
        ]
        items.append({
            "id": mid, "mentor_id": "usr_mentor", "startup_profile_id": pid,
            "stage": stage, "stage_progress_pct": progress, "kpis": kpis,
            "history": history, "notes": note,
            "started_at": ts(day), "updated_at": ts(day + idx * 3),
        })
    return items


PRODUCT_ROWS = [
    ("prd_pack_s", "pack", "토큰 100개", "100 Tokens", 100, 4900, None,
     ["게시글 20개 또는 댓글 50개", "유효기간 없음"],
     ["20 posts or 50 replies", "Never expires"], False, 1),
    ("prd_pack_m", "pack", "토큰 300개", "300 Tokens", 300, 12900, None,
     ["12% 할인", "게시글 60개 분량", "유효기간 없음"],
     ["12% off", "Enough for 60 posts", "Never expires"], True, 2),
    ("prd_pack_l", "pack", "토큰 1,000개", "1,000 Tokens", 1000, 39000, None,
     ["21% 할인", "팀 단위 사용 추천", "유효기간 없음"],
     ["21% off", "Great for teams", "Never expires"], False, 3),
    ("prd_mem_basic", "membership", "베이직 멤버십", "Basic Membership", None, 9900, "monthly",
     ["매월 토큰 200개 지급", "프로필 노출 부스트", "뉴스레터 구독"],
     ["200 tokens monthly", "Profile visibility boost", "Newsletter access"], False, 4),
    ("prd_mem_pro", "membership", "프로 멤버십", "Pro Membership", None, 29000, "monthly",
     ["매월 토큰 700개 지급", "프로필 상단 고정 1회/월", "투자자 열람 알림", "우선 지원"],
     ["700 tokens monthly", "1 pinned profile slot/month", "Investor view alerts", "Priority support"], True, 5),
    ("prd_mem_ent", "membership", "엔터프라이즈", "Enterprise", None, 99000, "monthly",
     ["토큰 무제한", "팀 계정 5석", "멘토링 대시보드 연동", "전담 매니저"],
     ["Unlimited tokens", "5 team seats", "Mentoring dashboard access", "Dedicated manager"], False, 6),
]


def main():
    print(f"Seeding {config.DATA_DIR}")
    users, profiles = build_users_and_profiles()

    threads = [{
        "id": tid, "author_id": author, "category": cat, "title": title,
        "body": body, "upvotes": up, "reply_count": 0, "views": views,
        "created_at": ts(day),
    } for tid, author, cat, title, body, up, views, day in THREAD_ROWS]

    replies = [{
        "id": rid, "thread_id": tid, "author_id": author,
        "parent_reply_id": parent, "body": body, "upvotes": up,
        "created_at": ts(day, h=2),
    } for rid, tid, author, parent, body, up, day in REPLY_ROWS]

    counts = {}
    for r in replies:
        counts[r["thread_id"]] = counts.get(r["thread_id"], 0) + 1
    for t in threads:
        t["reply_count"] = counts.get(t["id"], 0)

    votes = [{
        "id": vid, "user_id": uid, "target_type": ttype,
        "target_id": tid, "created_at": created,
    } for vid, uid, ttype, tid, created in VOTE_ROWS]

    ledger = []
    for u in users:
        ledger.append({
            "id": f"led_signup_{u['id']}", "user_id": u["id"], "delta": config.SIGNUP_BONUS,
            "reason": "signup_bonus", "ref_type": "user", "ref_id": u["id"],
            "balance_after": config.SIGNUP_BONUS, "created_at": u["created_at"],
        })
    # Demo user's ledger matches its seeded balance: 20 (bonus) - 2 - 2 (two replies) = 16.
    ledger += [
        {"id": "led_demo_r1", "user_id": "usr_demo", "delta": -2, "reason": "reply_post",
         "ref_type": "reply", "ref_id": "rpl_a3", "balance_after": 18, "created_at": ts(12, h=3)},
        {"id": "led_demo_r2", "user_id": "usr_demo", "delta": -2, "reason": "reply_post",
         "ref_type": "reply", "ref_id": "rpl_e1", "balance_after": 16, "created_at": ts(23, h=3)},
    ]

    articles = [{
        "id": aid, "category": cat,
        "title_ko": tko, "title_en": ten,
        "summary_ko": sko, "summary_en": sen,
        "body_ko": bko, "body_en": ben,
        "source_name": src, "source_url": url,
        "published_at": ts(day), "views": views,
    } for aid, cat, tko, ten, sko, sen, bko, ben, src, url, day, views in ARTICLE_ROWS]

    products = [{
        "id": pid, "kind": kind, "name_ko": nko, "name_en": nen,
        "tokens": tokens, "price_krw": price, "period": period,
        "perks_ko": pko, "perks_en": pen, "highlight": hl, "sort_order": order,
    } for pid, kind, nko, nen, tokens, price, period, pko, pen, hl, order in PRODUCT_ROWS]

    write("users", users)
    write("profiles", profiles)
    write("threads", threads)
    write("replies", replies)
    write("votes", votes)
    write("ledger", ledger)
    write("articles", articles)
    write("mentorships", build_mentorships())
    write("products", products)
    print("Done. Demo logins (password: starthub123):")
    print("  demo@starthub.kr (startup) / ocean@starthub.kr (startup) / mentor@starthub.kr (mentor)")


if __name__ == "__main__":
    main()
