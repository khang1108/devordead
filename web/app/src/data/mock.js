// DỮ LIỆU MINH HỌA — không phải kết quả thật của hệ thống (proposal mục 5.1).
// Mọi màn hình đọc dữ liệu từ đây để số liệu giữa các màn khớp nhau.

export const currentUser = {
  name: "Nguyễn Minh Anh",
  initials: "MA",
  subtitle: "Backend · Fresher",
  email: "minhanh@email.com",
  role: "Backend",
  level: "Fresher",
  targetCompany: "ACME Tech",
  interviewInDays: 12,
  streakDays: 5,
};

export const adminUser = { name: "Admin Curator", initials: "AC", subtitle: "Quản trị viên" };

export const ROLE_FAMILIES = [
  { family: "Phát triển phần mềm", roles: ["Backend", "Frontend", "Fullstack", "Mobile"] },
  { family: "Dữ liệu & AI", roles: ["AI Engineer", "Data Engineer", "Data Analyst"] },
];
export const LEVELS = ["Intern", "Fresher", "Junior"];
export const LANGUAGES = [
  { value: "python", label: "Python 3" },
  { value: "javascript", label: "JavaScript" },
  { value: "cpp", label: "C++ 17" },
  { value: "java", label: "Java 17" },
];

/** Mức nắm theo competency (0..1) — Dashboard, Báo cáo */
export const competencySummary = [
  { name: "Cấu trúc dữ liệu", mastery: 0.72 },
  { name: "Thuật toán", mastery: 0.58 },
  { name: "Cơ sở dữ liệu", mastery: 0.64 },
  { name: "System Design", mastery: 0.31 },
  { name: "Giao tiếp & STAR (EN)", mastery: 0.55 },
];

export const dashboardStats = [
  { label: "Phiên đã luyện", value: "12", delta: "+3 so với tuần trước" },
  { label: "Bài code đã nộp", value: "34", delta: "+6 bài Passed" },
  { label: "Điểm lập luận TB", value: "7.4", delta: "+0.6 / 10" },
  { label: "Chuỗi ngày luyện", value: "5 ngày", delta: "Kỷ lục: 9 ngày", deltaTone: "ink2" },
];

/** Cây tri thức Domain → Topic → Competency (UC04, UC17) */
export const knowledgeTree = [
  {
    id: "db",
    name: "Cơ sở dữ liệu",
    topics: [
      {
        id: "indexing",
        name: "Indexing trong PostgreSQL",
        short: "Indexing",
        jd: true,
        description:
          "B-Tree index, composite index, đọc kế hoạch truy vấn và các trường hợp PostgreSQL bỏ qua index. JD của bạn yêu cầu tối ưu truy vấn nên topic này được ưu tiên.",
        competencies: [
          { name: "Hiểu cấu trúc B-Tree index", mastery: 0.6 },
          { name: "Composite index & thứ tự cột", mastery: 0.4 },
          { name: "Đọc EXPLAIN ANALYZE", mastery: 0.2 },
          { name: "Khi nào index không được dùng", mastery: 0 },
        ],
        practiced: 7,
        avgScore: 6.8,
        lastPracticed: "20/11",
      },
      { id: "acid", name: "Transaction & ACID", short: "Transaction & ACID", jd: false, description: "Tính chất ACID, mức cô lập, deadlock.", competencies: [{ name: "4 tính chất ACID", mastery: 0.7 }, { name: "Isolation level", mastery: 0.45 }], practiced: 4, avgScore: 7.1, lastPracticed: "18/11" },
      { id: "normalization", name: "Normalization", short: "Normalization", jd: false, description: "1NF–3NF, BCNF, khi nào nên phi chuẩn hóa.", competencies: [{ name: "Dạng chuẩn 1NF–3NF", mastery: 0.8 }], practiced: 3, avgScore: 7.8, lastPracticed: "10/11" },
      { id: "query-opt", name: "Query Optimization", short: "Query Optimization", jd: true, description: "Tối ưu truy vấn, N+1, phân trang.", competencies: [{ name: "Nhận diện N+1 query", mastery: 0.35 }, { name: "Phân trang keyset", mastery: 0.1 }], practiced: 1, avgScore: 5.5, lastPracticed: "05/11" },
    ],
  },
  { id: "net", name: "Mạng & HTTP", topics: [{ id: "http", name: "HTTP & REST", short: "HTTP & REST", jd: true, description: "Phương thức, mã trạng thái, idempotency.", competencies: [{ name: "Idempotency", mastery: 0.5 }], practiced: 5, avgScore: 7.4, lastPracticed: "19/11" }, { id: "tcp", name: "TCP vs UDP", short: "TCP vs UDP", jd: false, description: "Bắt tay 3 bước, độ tin cậy.", competencies: [{ name: "Bắt tay 3 bước", mastery: 0.65 }], practiced: 2, avgScore: 7, lastPracticed: "02/11" }] },
  { id: "os", name: "Hệ điều hành", topics: [{ id: "proc", name: "Process & Thread", short: "Process & Thread", jd: false, description: "Tiến trình, luồng, race condition.", competencies: [{ name: "Race condition", mastery: 0.4 }], practiced: 2, avgScore: 6.2, lastPracticed: "01/11" }] },
  { id: "dsa", name: "Cấu trúc dữ liệu & Giải thuật", topics: [{ id: "complexity", name: "Độ phức tạp & Big-O", short: "Big-O", jd: true, description: "Phân tích thời gian, bộ nhớ.", competencies: [{ name: "Phân tích Big-O", mastery: 0.45 }], practiced: 6, avgScore: 6.0, lastPracticed: "22/11" }] },
  { id: "sd", name: "System Design", topics: [{ id: "cache", name: "Caching cơ bản", short: "Caching", jd: true, description: "Cache-aside, TTL, Redis.", competencies: [{ name: "Chiến lược cache", mastery: 0.25 }], practiced: 1, avgScore: 5.0, lastPracticed: "12/11" }] },
];

/** Câu hỏi luyện giọng nói cho topic Indexing (UC05) */
export const voiceSession = {
  topicId: "indexing",
  topicName: "Indexing trong PostgreSQL",
  questions: [
    "Index B-Tree trong PostgreSQL được tổ chức thế nào và vì sao tìm kiếm nhanh?",
    "Khi nào PostgreSQL không dùng index B-Tree dù cột đã được đánh index?",
    "Composite index (a, b) có dùng được cho truy vấn chỉ lọc theo b không? Vì sao?",
    "Bạn đọc kết quả EXPLAIN ANALYZE thế nào để biết truy vấn chậm ở đâu?",
    "Khi nào việc thêm index lại làm hệ thống chậm đi?",
  ],
  // Phản hồi minh họa cho câu 2 (UC06)
  sampleTranscript:
    "Khi điều kiện lọc trả về quá nhiều dòng thì planner thấy quét tuần tự rẻ hơn, ví dụ cột có ít giá trị khác nhau. Ngoài ra nếu mình bọc cột trong hàm như lower(email) thì index thường cũng không dùng được.",
  sampleFeedback: {
    score: 7,
    correct: ["Selectivity thấp → Seq Scan rẻ hơn Index Scan", "Hàm trên cột làm mất index → cần expression index"],
    missing: ["Thống kê cũ khiến planner ước lượng sai (cần ANALYZE)", "Kiểu dữ liệu không khớp gây ép kiểu ngầm"],
    wrong: [],
    followUp: "Vậy bạn tạo index thế nào để truy vấn WHERE lower(email) = $1 dùng được index?",
  },
};

export const DIFFICULTY = {
  easy: { label: "Dễ", tone: "success" },
  medium: { label: "Trung bình", tone: "warning" },
  hard: { label: "Khó", tone: "danger" },
};
export const PROBLEM_STATUS = {
  solved: { label: "Đã giải", tone: "success" },
  attempted: { label: "Đang làm", tone: "brand" },
  todo: { label: "Chưa làm", tone: "neutral" },
};

/** Ngân hàng bài tập — chỉ bài đã được Admin duyệt (BR4) */
export const problems = [
  {
    id: "001", slug: "two-sum", title: "Two Sum", topic: "Hash map", difficulty: "easy", role: "Backend", status: "solved",
    description: "Cho mảng số nguyên nums và số target, trả về chỉ số của hai phần tử có tổng bằng target. Mỗi input có đúng một đáp án, không dùng một phần tử hai lần.",
    constraints: ["2 ≤ nums.length ≤ 10⁴", "−10⁹ ≤ nums[i], target ≤ 10⁹", "Yêu cầu: O(n) thời gian"],
    examples: [{ input: "nums = [2,7,11,15], target = 9", output: "[0,1]" }, { input: "nums = [3,2,4], target = 6", output: "[1,2]" }],
    tests: 5, approvedAt: "12/11/2026",
    starter: {
      python: "class Solution:\n    def twoSum(self, nums, target):\n        # Viết lời giải của bạn ở đây\n        pass\n",
      javascript: "/**\n * @param {number[]} nums\n * @param {number} target\n * @return {number[]}\n */\nfunction twoSum(nums, target) {\n  // Viết lời giải của bạn ở đây\n}\n",
      cpp: "class Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        // Viết lời giải của bạn ở đây\n    }\n};\n",
      java: "class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        // Viết lời giải của bạn ở đây\n    }\n}\n",
    },
  },
  { id: "002", slug: "valid-parentheses", title: "Valid Parentheses", topic: "Stack", difficulty: "easy", role: "Chung", status: "solved", description: "Kiểm tra chuỗi ngoặc có hợp lệ.", constraints: ["1 ≤ s.length ≤ 10⁴"], examples: [{ input: 's = "()[]{}"', output: "true" }], tests: 6, approvedAt: "10/11/2026" },
  { id: "003", slug: "longest-substring", title: "Longest Substring Without Repeating", topic: "Sliding window", difficulty: "medium", role: "Backend", status: "attempted", description: "Tìm độ dài chuỗi con dài nhất không có ký tự lặp.", constraints: ["0 ≤ s.length ≤ 5·10⁴"], examples: [{ input: 's = "abcabcbb"', output: "3" }], tests: 8, approvedAt: "10/11/2026" },
  { id: "004", slug: "lru-cache", title: "LRU Cache", topic: "Hash map + DLL", difficulty: "medium", role: "Backend", status: "todo", description: "Thiết kế cache LRU với get/put O(1).", constraints: ["1 ≤ capacity ≤ 3000"], examples: [{ input: "LRUCache(2), put(1,1), put(2,2), get(1)", output: "1" }], tests: 10, approvedAt: "08/11/2026" },
  { id: "005", slug: "merge-intervals", title: "Merge Intervals", topic: "Sorting", difficulty: "medium", role: "Chung", status: "todo", description: "Gộp các khoảng chồng lấn.", constraints: ["1 ≤ intervals.length ≤ 10⁴"], examples: [{ input: "[[1,3],[2,6],[8,10]]", output: "[[1,6],[8,10]]" }], tests: 7, approvedAt: "08/11/2026" },
  { id: "006", slug: "rate-limiter", title: "Rate Limiter (Token Bucket)", topic: "Thiết kế", difficulty: "hard", role: "Backend", status: "todo", description: "Cài đặt bộ giới hạn tốc độ theo token bucket.", constraints: ["Tối đa 10⁵ lời gọi"], examples: [{ input: "allow(t=0), allow(t=0)…", output: "true, false…" }], tests: 12, approvedAt: "05/11/2026" },
  { id: "007", slug: "top-k-frequent", title: "Top K Frequent Elements", topic: "Heap", difficulty: "medium", role: "Data", status: "todo", description: "Trả về k phần tử xuất hiện nhiều nhất.", constraints: ["1 ≤ k ≤ số phần tử khác nhau"], examples: [{ input: "nums = [1,1,1,2,2,3], k = 2", output: "[1,2]" }], tests: 6, approvedAt: "05/11/2026" },
  { id: "008", slug: "course-schedule", title: "Course Schedule", topic: "Graph · BFS", difficulty: "hard", role: "Backend", status: "todo", description: "Kiểm tra có hoàn thành được mọi khóa học với điều kiện tiên quyết.", constraints: ["1 ≤ numCourses ≤ 2000"], examples: [{ input: "2, [[1,0]]", output: "true" }], tests: 9, approvedAt: "01/11/2026" },
];

/** Kế hoạch phiên phỏng vấn (UC11, UC12) */
export const hrPlan = ["Introduction", "Project experience", "Behavioral (STAR)", "Situational", "Culture fit"];
export const hrScript = [
  { who: "ai", text: "Hi Minh Anh, thanks for joining. Could you briefly introduce yourself?" },
  { who: "you", text: "Hi, I'm Minh Anh, a fresh graduate in Computer Science. I focus on backend development with Node.js and PostgreSQL." },
  { who: "ai", text: "Can you walk me through your capstone project?" },
  { who: "you", text: "We built a booking API with Node.js and PostgreSQL. I owned the payment module and the retry logic for failed transactions." },
  { who: "ai", text: "Tell me about a time you disagreed with a teammate. How did you handle it, and what was the result?" },
];
export const techPlan = ["Giới thiệu & dự án", "Kiến thức: HTTP & REST", "Kiến thức: Indexing", "Live coding: Two Sum", "Độ phức tạp & edge case"];
export const techScript = [
  { who: "ai", text: "Chào Minh Anh. Bạn giải thích giúp mình idempotency trong REST API là gì?" },
  { who: "you", text: "Idempotent nghĩa là gọi nhiều lần cũng cho cùng kết quả như gọi một lần, ví dụ PUT và DELETE." },
  { who: "ai", text: "Tốt. Giờ mình chuyển sang live coding: bài Two Sum. Bạn vừa code vừa giải thích hướng làm nhé." },
];

/** Báo cáo năng lực (UC14) */
export const reports = [
  {
    id: "r-2211", type: "Technical & Live Coding", duration: 30, date: "22/11/2026", status: "done",
    overall: 7.2,
    correctness: { score: 8.0, passed: 4, total: 5, note: "Chấm từ kết quả test case trong sandbox" },
    reasoning: { score: 6.4, note: "Chấm theo rubric qua LLM, dựa trên transcript" },
    competencies: [
      { id: "c1", name: "Hash map & tra cứu O(1)", score: 8.5, evidence: "Chọn hash map ngay từ đầu, giải thích được vì sao O(n)." },
      { id: "c2", name: "Phân tích độ phức tạp", score: 5.0, evidence: "Nhầm độ phức tạp bộ nhớ là O(1) ở phút 14:20." },
      { id: "c3", name: "Xử lý edge case", score: 6.0, evidence: "Chưa nêu trường hợp phần tử trùng nhau." },
      { id: "c4", name: "REST & idempotency", score: 7.5, evidence: "Nêu đúng PUT/DELETE, thiếu ví dụ idempotency key." },
      { id: "c5", name: "Giao tiếp kỹ thuật (think aloud)", score: 7.0, evidence: "Trình bày mạch lạc, đôi lúc im lặng lâu khi code." },
    ],
    strengths: ["Chọn cấu trúc dữ liệu phù hợp nhanh", "Code gọn, đặt tên biến rõ ràng", "Trả lời lý thuyết REST chắc"],
    weaknesses: ["Phân tích bộ nhớ chưa chính xác", "Bỏ sót edge case trùng phần tử", "Test 5 bị TLE do vòng lặp lồng ở bản đầu"],
    suggestions: ["Ôn Big-O cho bộ nhớ phụ", "Luyện 3 bài Sliding Window", "Tập nói edge case trước khi code"],
  },
  { id: "r-1911", type: "HR — Behavioral (EN)", duration: 15, date: "19/11/2026", status: "done", overall: 6.8 },
  { id: "r-1511", type: "Technical & Live Coding", duration: 15, date: "15/11/2026", status: "done", overall: 6.1 },
  { id: "r-1011", type: "Technical & Live Coding", duration: 30, date: "10/11/2026", status: "interrupted", overall: null },
];

/** Lộ trình học thích ứng (UC15) */
export const roadmapItems = [
  { id: "rm1", type: "topic", title: "Ôn Big-O cho bộ nhớ phụ", priority: "high", difficulty: "medium", reason: "Điểm “Phân tích độ phức tạp” 5.0/10 ở phiên 22/11.", to: "/knowledge" },
  { id: "rm2", type: "problem", title: "Longest Substring Without Repeating", priority: "high", difficulty: "medium", reason: "Bài Sliding Window đang làm dở; chủ đề yếu theo 3 phiên gần nhất.", to: "/problems/003" },
  { id: "rm3", type: "voice", title: "Luyện giọng nói: Khi nào index không được dùng", priority: "medium", difficulty: "medium", reason: "Competency 0% — JD yêu cầu tối ưu truy vấn.", to: "/practice/voice" },
  { id: "rm4", type: "interview", title: "Phỏng vấn HR (EN) 15 phút", priority: "medium", difficulty: "easy", reason: "Kể dự án theo STAR mới đạt 6.8/10.", to: "/interview/setup" },
  { id: "rm5", type: "problem", title: "LRU Cache", priority: "low", difficulty: "medium", reason: "Củng cố hash map + danh sách liên kết (JD: Redis/cache).", to: "/problems/004" },
  { id: "rm6", type: "topic", title: "Caching cơ bản", priority: "low", difficulty: "easy", reason: "JD ưu tiên Redis; chưa có bằng chứng luyện tập.", to: "/knowledge" },
];
export const ROADMAP_HUBS = [
  { name: "Nền tảng", state: "done" },
  { name: "Cấu trúc dữ liệu", state: "done" },
  { name: "Thuật toán", state: "current" },
  { name: "System Design", state: "todo" },
];

/** Hàng chờ kiểm duyệt (UC18) */
export const moderationQueue = [
  { id: "q-101", kind: "question", title: "Khi nào partial index hữu ích hơn index thường?", source: "AI đề xuất từ JD (ACME Tech)", topic: "Indexing trong PostgreSQL", competency: "Khi nào index không được dùng", difficulty: "medium", createdAt: "22/11 14:05", reference: "Khi chỉ một tập con dòng được truy vấn thường xuyên (vd. WHERE status = 'active'): index nhỏ hơn, ghi rẻ hơn.", criteria: ["Nêu được điều kiện WHERE của partial index", "So sánh kích thước / chi phí ghi"] },
  { id: "q-102", kind: "problem", title: "Kth Largest Element in a Stream", source: "AI đề xuất (lộ trình Heap)", topic: "Heap", competency: "Heap / Priority queue", difficulty: "medium", createdAt: "22/11 11:40", reference: "Duy trì min-heap kích thước k.", criteria: ["8 test case, gồm k = 1 và phần tử trùng"] },
  { id: "q-103", kind: "question", title: "Giải thích khác biệt giữa 401 và 403.", source: "AI đề xuất", topic: "HTTP & REST", competency: "Mã trạng thái HTTP", difficulty: "easy", createdAt: "21/11 17:22", reference: "401: chưa xác thực; 403: đã xác thực nhưng không có quyền.", criteria: ["Phân biệt authentication và authorization"] },
  { id: "q-104", kind: "question", title: "Mô tả cách hoạt động của MVCC trong PostgreSQL.", source: "Curator thêm thủ công", topic: "Transaction & ACID", competency: "Isolation level", difficulty: "hard", createdAt: "21/11 09:10", reference: "Mỗi transaction thấy snapshot; dòng có xmin/xmax…", criteria: ["Nêu snapshot, xmin/xmax", "Liên hệ isolation level"] },
];

/** Nhật ký thay đổi taxonomy (UC17) */
export const taxonomyLog = [
  { at: "22/11 15:12", who: "Admin Curator", what: "Thêm topic “Query Optimization” vào domain Cơ sở dữ liệu" },
  { at: "21/11 10:03", who: "Admin Curator", what: "Liên kết competency “Idempotency” với Backend · Fresher" },
  { at: "20/11 16:40", who: "Admin Curator", what: "Vô hiệu hóa topic “SOAP” (đang được tham chiếu)" },
];
