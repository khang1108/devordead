from __future__ import annotations

import json
import sqlite3
from contextlib import contextmanager
from datetime import datetime
from typing import Iterator

from .config import DB_PATH


@contextmanager
def get_db() -> Iterator[sqlite3.Connection]:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db() -> None:
    with get_db() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                name TEXT NOT NULL,
                initials TEXT NOT NULL,
                account_role TEXT NOT NULL DEFAULT 'candidate',
                role TEXT NOT NULL DEFAULT 'Backend',
                level TEXT NOT NULL DEFAULT 'Fresher',
                target_company TEXT DEFAULT '',
                interview_in_days INTEGER,
                streak_days INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS user_skills (
                id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                name TEXT NOT NULL,
                status TEXT NOT NULL,
                priority TEXT NOT NULL,
                PRIMARY KEY (user_id, id),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS taxonomy_domains (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT NOT NULL DEFAULT '',
                level TEXT DEFAULT '',
                roles_json TEXT NOT NULL DEFAULT '[]',
                disabled INTEGER NOT NULL DEFAULT 0,
                sort_order INTEGER NOT NULL DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS taxonomy_topics (
                id TEXT PRIMARY KEY,
                domain_id TEXT NOT NULL,
                name TEXT NOT NULL,
                short TEXT NOT NULL,
                jd INTEGER NOT NULL DEFAULT 0,
                description TEXT NOT NULL DEFAULT '',
                practiced INTEGER NOT NULL DEFAULT 0,
                avg_score REAL NOT NULL DEFAULT 0,
                last_practiced TEXT NOT NULL DEFAULT '—',
                level TEXT DEFAULT '',
                roles_json TEXT NOT NULL DEFAULT '[]',
                disabled INTEGER NOT NULL DEFAULT 0,
                sort_order INTEGER NOT NULL DEFAULT 0,
                questions_json TEXT NOT NULL DEFAULT '[]',
                FOREIGN KEY (domain_id) REFERENCES taxonomy_domains(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS taxonomy_competencies (
                id TEXT PRIMARY KEY,
                topic_id TEXT NOT NULL,
                name TEXT NOT NULL,
                mastery REAL NOT NULL DEFAULT 0,
                description TEXT NOT NULL DEFAULT '',
                level TEXT DEFAULT '',
                roles_json TEXT NOT NULL DEFAULT '[]',
                disabled INTEGER NOT NULL DEFAULT 0,
                sort_order INTEGER NOT NULL DEFAULT 0,
                FOREIGN KEY (topic_id) REFERENCES taxonomy_topics(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS taxonomy_logs (
                id TEXT PRIMARY KEY,
                at TEXT NOT NULL,
                who TEXT NOT NULL,
                what TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS problems (
                id TEXT PRIMARY KEY,
                slug TEXT UNIQUE NOT NULL,
                title TEXT NOT NULL,
                topic TEXT NOT NULL,
                difficulty TEXT NOT NULL,
                role TEXT NOT NULL,
                description TEXT NOT NULL,
                constraints_json TEXT NOT NULL,
                examples_json TEXT NOT NULL,
                tests_count INTEGER NOT NULL DEFAULT 5,
                approved_at TEXT NOT NULL,
                starter_json TEXT NOT NULL DEFAULT '{}'
            );

            CREATE TABLE IF NOT EXISTS submissions (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                problem_id TEXT NOT NULL,
                language TEXT NOT NULL,
                code TEXT NOT NULL,
                mode TEXT NOT NULL,
                verdict TEXT NOT NULL,
                passed INTEGER NOT NULL,
                total INTEGER NOT NULL,
                time_ms INTEGER NOT NULL,
                mem_mb REAL NOT NULL,
                result_json TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS interview_sessions (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                mode TEXT NOT NULL,
                duration INTEGER NOT NULL,
                difficulty TEXT NOT NULL,
                use_cv INTEGER NOT NULL DEFAULT 1,
                plan_json TEXT NOT NULL,
                problem_id TEXT,
                turns_json TEXT NOT NULL,
                stage_index INTEGER NOT NULL DEFAULT 0,
                hints_used INTEGER NOT NULL DEFAULT 0,
                star_json TEXT NOT NULL DEFAULT '{}',
                started_at TEXT NOT NULL,
                ended_at TEXT,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS reports (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                session_id TEXT,
                type TEXT NOT NULL,
                duration INTEGER NOT NULL,
                date TEXT NOT NULL,
                status TEXT NOT NULL,
                overall REAL,
                correctness_json TEXT,
                reasoning_json TEXT,
                competencies_json TEXT,
                strengths_json TEXT,
                weaknesses_json TEXT,
                suggestions_json TEXT,
                transcript_json TEXT,
                code_snapshot TEXT,
                test_results_json TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS reevaluations (
                id TEXT PRIMARY KEY,
                report_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                competency_id TEXT NOT NULL,
                reason TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'pending',
                submitted_at TEXT NOT NULL,
                UNIQUE (report_id, competency_id),
                FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS moderation_queue (
                id TEXT PRIMARY KEY,
                kind TEXT NOT NULL,
                title TEXT NOT NULL,
                source TEXT NOT NULL,
                topic TEXT NOT NULL,
                competency TEXT NOT NULL,
                difficulty TEXT NOT NULL,
                created_at TEXT NOT NULL,
                reference TEXT NOT NULL,
                criteria_json TEXT NOT NULL,
                revision INTEGER NOT NULL DEFAULT 1
            );

            CREATE TABLE IF NOT EXISTS moderation_history (
                id TEXT PRIMARY KEY,
                kind TEXT NOT NULL,
                title TEXT NOT NULL,
                decision TEXT NOT NULL,
                reason TEXT,
                processed_at TEXT NOT NULL
            );
            """
        )

        _seed_official_catalog(conn)


def _seed_official_catalog(conn: sqlite3.Connection) -> None:
    """Seed official Admin-approved (BR4) curriculum, coding problems, and moderation queue once on empty DB."""
    domain_count = conn.execute("SELECT COUNT(*) FROM taxonomy_domains").fetchone()[0]
    if domain_count == 0:
        domains = [
            ("db", "Cơ sở dữ liệu", "PostgreSQL, Indexing, ACID, Transaction & Query Optimization", "Fresher", ["Backend", "Fullstack", "Data Engineer"]),
            ("net", "Mạng & HTTP", "Giao thức HTTP/REST, Idempotency, TCP/UDP và bảo mật truyền tải", "Fresher", ["Backend", "Frontend", "Fullstack"]),
            ("os", "Hệ điều hành", "Process, Thread, đồng bộ hóa và quản lý bộ nhớ", "Fresher", ["Backend", "Mobile"]),
            ("dsa", "Cấu trúc dữ liệu & Giải thuật", "Phân tích Big-O, Hash map, Sliding Window, Graph và Heap", "Intern", ["Backend", "Frontend", "Fullstack", "AI Engineer"]),
            ("sd", "System Design", "Caching, Redis, Rate Limiting và mở rộng dịch vụ web", "Junior", ["Backend", "Fullstack"]),
        ]
        for idx, (did, name, desc, level, roles) in enumerate(domains):
            conn.execute(
                "INSERT INTO taxonomy_domains (id, name, description, level, roles_json, sort_order) VALUES (?, ?, ?, ?, ?, ?)",
                (did, name, desc, level, json.dumps(roles, ensure_ascii=False), idx),
            )

        topics = [
            (
                "indexing",
                "db",
                "Indexing trong PostgreSQL",
                "Indexing",
                1,
                "B-Tree index, composite index, đọc EXPLAIN ANALYZE và các trường hợp PostgreSQL bỏ qua index.",
                "Fresher",
                ["Backend", "Data Engineer"],
                [
                    "Index B-Tree trong PostgreSQL được tổ chức thế nào và vì sao tìm kiếm nhanh?",
                    "Khi nào PostgreSQL không dùng index B-Tree dù cột đã được đánh index?",
                    "Composite index (a, b) có dùng được cho truy vấn chỉ lọc theo b không? Vì sao?",
                    "Bạn đọc kết quả EXPLAIN ANALYZE thế nào để biết truy vấn chậm ở đâu?",
                    "Khi nào việc thêm nhiều index lại làm hệ thống chậm đi?",
                ],
                [
                    ("c-idx-1", "Hiểu cấu trúc B-Tree index"),
                    ("c-idx-2", "Composite index & thứ tự cột"),
                    ("c-idx-3", "Đọc EXPLAIN ANALYZE"),
                    ("c-idx-4", "Khi nào index không được dùng"),
                ],
            ),
            (
                "acid",
                "db",
                "Transaction & ACID",
                "Transaction",
                0,
                "Tính chất ACID, mức cô lập (Isolation Levels), MVCC và xử lý deadlock trong CSDL quan hệ.",
                "Fresher",
                ["Backend", "Fullstack"],
                [
                    "Trình bày 4 tính chất ACID trong giao dịch cơ sở dữ liệu.",
                    "Phân biệt Read Committed và Repeatable Read trong PostgreSQL.",
                    "Deadlock xảy ra khi nào và bạn xử lý thế nào ở tầng ứng dụng?",
                ],
                [
                    ("c-acid-1", "4 tính chất ACID"),
                    ("c-acid-2", "Isolation level & MVCC"),
                ],
            ),
            (
                "http",
                "net",
                "HTTP & REST API",
                "HTTP & REST",
                1,
                "Phương thức HTTP, mã trạng thái, idempotency, xác thực JWT và OAuth2.",
                "Fresher",
                ["Backend", "Frontend", "Fullstack"],
                [
                    "Idempotency trong REST API là gì? Vì sao PUT và DELETE mang tính idempotent còn POST thì không?",
                    "Phân biệt mã lỗi 401 Unauthorized và 403 Forbidden.",
                    "So sánh xác thực bằng Session Cookie và JWT Bearer Token.",
                ],
                [
                    ("c-http-1", "Idempotency & REST semantics"),
                    ("c-http-2", "JWT & OAuth2 authentication"),
                ],
            ),
            (
                "proc",
                "os",
                "Process & Thread",
                "Concurrency",
                0,
                "Khác biệt giữa tiến trình, luồng, race condition, mutex và event loop.",
                "Fresher",
                ["Backend", "Mobile"],
                [
                    "Khác biệt cốt lõi giữa Process và Thread về vùng nhớ và chi phí chuyển ngữ cảnh?",
                    "Race condition xảy ra khi nào và làm sao phòng tránh?",
                ],
                [
                    ("c-os-1", "Process vs Thread"),
                    ("c-os-2", "Race condition & Lock"),
                ],
            ),
            (
                "complexity",
                "dsa",
                "Độ phức tạp & Big-O",
                "Big-O",
                1,
                "Phân tích độ phức tạp thời gian, bộ nhớ phụ và đánh đổi thời gian/không gian bằng Hash Map.",
                "Intern",
                ["Backend", "Frontend", "Fullstack"],
                [
                    "Phân tích sự đánh đổi giữa thời gian và bộ nhớ phụ khi dùng Hash Map cho bài Two Sum.",
                    "Khi nào độ phức tạp trung bình O(1) của Hash Table bị suy biến thành O(n)?",
                ],
                [
                    ("c-dsa-1", "Phân tích độ phức tạp thời gian"),
                    ("c-dsa-2", "Phân tích bộ nhớ phụ"),
                ],
            ),
            (
                "cache",
                "sd",
                "Caching với Redis",
                "Caching",
                1,
                "Chiến lược Cache-Aside, TTL, Cache Stampede và vô hiệu hóa cache nhất quán.",
                "Junior",
                ["Backend", "Fullstack"],
                [
                    "Trình bày luồng hoạt động của mẫu Cache-Aside với Redis và PostgreSQL.",
                    "Cache Stampede (Thundering Herd) là gì và cách giảm thiểu?",
                ],
                [
                    ("c-sd-1", "Chiến lược Cache-Aside & TTL"),
                    ("c-sd-2", "Xử lý Cache Invalidation"),
                ],
            ),
        ]

        for idx, (tid, did, name, short, jd, desc, level, roles, questions, comps) in enumerate(topics):
            conn.execute(
                """
                INSERT INTO taxonomy_topics
                (id, domain_id, name, short, jd, description, level, roles_json, sort_order, questions_json)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    tid,
                    did,
                    name,
                    short,
                    jd,
                    desc,
                    level,
                    json.dumps(roles, ensure_ascii=False),
                    idx,
                    json.dumps(questions, ensure_ascii=False),
                ),
            )
            for c_idx, (cid, cname) in enumerate(comps):
                conn.execute(
                    """
                    INSERT INTO taxonomy_competencies
                    (id, topic_id, name, mastery, level, roles_json, sort_order)
                    VALUES (?, ?, ?, 0, ?, ?, ?)
                    """,
                    (cid, tid, cname, level, json.dumps(roles, ensure_ascii=False), c_idx),
                )

        conn.execute(
            "INSERT INTO taxonomy_logs (id, at, who, what) VALUES (?, ?, ?, ?)",
            ("log-init-1", datetime.now().strftime("%d/%m %H:%M"), "Hệ thống", "Khởi tạo cây tri thức chuẩn (BR4 đã phê duyệt)"),
        )

    prob_count = conn.execute("SELECT COUNT(*) FROM problems").fetchone()[0]
    if prob_count == 0:
        official_problems = [
            (
                "001",
                "two-sum",
                "Two Sum",
                "Hash map",
                "easy",
                "Backend",
                "Cho mảng số nguyên nums và số nguyên target, trả về chỉ số của hai phần tử có tổng bằng target. Mỗi đầu vào có đúng một đáp án và không được dùng cùng một phần tử hai lần.",
                ["2 ≤ nums.length ≤ 10⁴", "−10⁹ ≤ nums[i], target ≤ 10⁹", "Yêu cầu: O(n) thời gian"],
                [
                    {"input": "nums = [2, 7, 11, 15], target = 9", "output": "[0, 1]"},
                    {"input": "nums = [3, 2, 4], target = 6", "output": "[1, 2]"},
                ],
                5,
                "12/11/2026",
                {
                    "python": "class Solution:\n    def twoSum(self, nums: list[int], target: int) -> list[int]:\n        # Viết lời giải O(n) bằng bảng băm ở đây\n        seen = {}\n        for i, num in enumerate(nums):\n            need = target - num\n            if need in seen:\n                return [seen[need], i]\n            seen[num] = i\n        return []\n",
                    "javascript": "/**\n * @param {number[]} nums\n * @param {number} target\n * @return {number[]}\n */\nfunction twoSum(nums, target) {\n  const seen = new Map();\n  for (let i = 0; i < nums.length; i++) {\n    const need = target - nums[i];\n    if (seen.has(need)) return [seen.get(need), i];\n    seen.set(nums[i], i);\n  }\n  return [];\n}\n",
                    "cpp": "class Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        // Viết lời giải của bạn ở đây\n        return {};\n    }\n};\n",
                    "java": "class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        // Viết lời giải của bạn ở đây\n        return new int[]{};\n    }\n}\n",
                },
            ),
            (
                "002",
                "valid-parentheses",
                "Valid Parentheses",
                "Stack",
                "easy",
                "Chung",
                "Cho chuỗi s chỉ gồm các ký tự '(', ')', '{', '}', '[' và ']'. Xác định chuỗi đầu vào có đóng mở ngoặc đúng thứ tự và hợp lệ hay không.",
                ["1 ≤ s.length ≤ 10⁴", "s chỉ gồm các ký tự ngoặc ()[]{}"],
                [
                    {"input": 's = "()[]{}"', "output": "true"},
                    {"input": 's = "(]"', "output": "false"},
                ],
                5,
                "10/11/2026",
                {
                    "python": "class Solution:\n    def isValid(self, s: str) -> bool:\n        # Viết lời giải dùng Stack ở đây\n        pass\n",
                    "javascript": "function isValid(s) {\n  // Viết lời giải dùng Stack ở đây\n}\n",
                    "cpp": "class Solution {\npublic:\n    bool isValid(string s) {\n        return false;\n    }\n};\n",
                    "java": "class Solution {\n    public boolean isValid(String s) {\n        return false;\n    }\n}\n",
                },
            ),
            (
                "003",
                "longest-substring",
                "Longest Substring Without Repeating Characters",
                "Sliding window",
                "medium",
                "Backend",
                "Cho chuỗi s, tìm độ dài chuỗi con liên tiếp dài nhất không chứa ký tự lặp lại.",
                ["0 ≤ s.length ≤ 5·10⁴", "s gồm ký tự ASCII thông dụng"],
                [
                    {"input": 's = "abcabcbb"', "output": "3"},
                    {"input": 's = "bbbbb"', "output": "1"},
                ],
                5,
                "10/11/2026",
                {
                    "python": "class Solution:\n    def lengthOfLongestSubstring(self, s: str) -> int:\n        # Viết lời giải Sliding Window ở đây\n        pass\n",
                    "javascript": "function lengthOfLongestSubstring(s) {\n  // Viết lời giải Sliding Window ở đây\n}\n",
                },
            ),
            (
                "004",
                "merge-intervals",
                "Merge Intervals",
                "Sorting",
                "medium",
                "Chung",
                "Cho mảng các khoảng intervals[i] = [start_i, end_i], gộp tất cả các khoảng chồng lấn và trả về danh sách các khoảng không chồng lấn phủ toàn bộ đầu vào.",
                ["1 ≤ intervals.length ≤ 10⁴", "0 ≤ start_i ≤ end_i ≤ 10⁴"],
                [
                    {"input": "intervals = [[1,3],[2,6],[8,10],[15,18]]", "output": "[[1,6],[8,10],[15,18]]"},
                    {"input": "intervals = [[1,4],[4,5]]", "output": "[[1,5]]"},
                ],
                5,
                "08/11/2026",
                {
                    "python": "class Solution:\n    def merge(self, intervals: list[list[int]]) -> list[list[int]]:\n        # Viết lời giải ở đây\n        pass\n",
                    "javascript": "function merge(intervals) {\n  // Viết lời giải ở đây\n}\n",
                },
            ),
            (
                "005",
                "top-k-frequent",
                "Top K Frequent Elements",
                "Heap",
                "medium",
                "Data",
                "Cho mảng số nguyên nums và số nguyên k, trả về k phần tử xuất hiện nhiều nhất theo bất kỳ thứ tự nào.",
                ["1 ≤ nums.length ≤ 10⁵", "1 ≤ k ≤ số phần tử phân biệt"],
                [
                    {"input": "nums = [1,1,1,2,2,3], k = 2", "output": "[1, 2]"},
                    {"input": "nums = [1], k = 1", "output": "[1]"},
                ],
                5,
                "05/11/2026",
                {
                    "python": "class Solution:\n    def topKFrequent(self, nums: list[int], k: int) -> list[int]:\n        # Viết lời giải ở đây\n        pass\n",
                    "javascript": "function topKFrequent(nums, k) {\n  // Viết lời giải ở đây\n}\n",
                },
            ),
            (
                "006",
                "rate-limiter",
                "Rate Limiter (Token Bucket)",
                "System Design",
                "hard",
                "Backend",
                "Cài đặt hàm kiểm tra giới hạn tốc độ theo thuật toán Token Bucket: cho capacity, refill_per_sec và danh sách timestamp (giây) của các request, trả về mảng boolean cho biết mỗi request có được phép đi qua hay không.",
                ["1 ≤ capacity ≤ 1000", "Tối đa 10⁵ request theo thứ tự thời gian tăng dần"],
                [
                    {"input": "capacity = 2, rate = 1, timestamps = [0, 0, 0, 1]", "output": "[true, true, false, true]"},
                ],
                5,
                "05/11/2026",
                {
                    "python": "class Solution:\n    def allowRequests(self, capacity: int, rate: float, timestamps: list[float]) -> list[bool]:\n        # Viết lời giải Token Bucket ở đây\n        pass\n",
                    "javascript": "function allowRequests(capacity, rate, timestamps) {\n  // Viết lời giải Token Bucket ở đây\n}\n",
                },
            ),
        ]
        for row in official_problems:
            conn.execute(
                """
                INSERT INTO problems
                (id, slug, title, topic, difficulty, role, description, constraints_json, examples_json, tests_count, approved_at, starter_json)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    row[0],
                    row[1],
                    row[2],
                    row[3],
                    row[4],
                    row[5],
                    row[6],
                    json.dumps(row[7], ensure_ascii=False),
                    json.dumps(row[8], ensure_ascii=False),
                    row[9],
                    row[10],
                    json.dumps(row[11], ensure_ascii=False),
                ),
            )

    mod_count = conn.execute("SELECT COUNT(*) FROM moderation_queue").fetchone()[0]
    mod_hist_count = conn.execute("SELECT COUNT(*) FROM moderation_history").fetchone()[0]
    if mod_count == 0 and mod_hist_count == 0:
        queue = [
            (
                "q-101",
                "question",
                "Khi nào partial index hữu ích hơn B-Tree index toàn bảng?",
                "AI đề xuất theo JD Backend",
                "Indexing trong PostgreSQL",
                "Khi nào index không được dùng",
                "medium",
                "22/11 14:05",
                "Dùng partial index (CREATE INDEX ... WHERE condition) khi truy vấn thường xuyên chỉ lọc một tập con nhỏ dòng dữ liệu (vd. status = 'active'), giúp index nhỏ hơn và giảm chi phí ghi.",
                ["Nêu đúng điều kiện WHERE của partial index", "So sánh dung lượng index & chi phí INSERT/UPDATE"],
            ),
            (
                "q-102",
                "problem",
                "Kth Largest Element in a Stream",
                "AI đề xuất theo lộ trình Heap",
                "Heap",
                "Phân tích độ phức tạp thời gian",
                "medium",
                "22/11 11:40",
                "Duy trì min-heap kích thước k; mỗi lần thêm phần tử mất O(log k) và đỉnh heap luôn là phần tử lớn thứ k.",
                ["Đảm bảo O(log k) mỗi thao tác add", "Xử lý đúng trường hợp k = 1 và phần tử trùng"],
            ),
        ]
        for item in queue:
            conn.execute(
                """
                INSERT INTO moderation_queue
                (id, kind, title, source, topic, competency, difficulty, created_at, reference, criteria_json)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (*item[:9], json.dumps(item[9], ensure_ascii=False)),
            )
