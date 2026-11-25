// Dữ liệu hiển thị cho khối Zero-Trust Docker Sandbox (UC09, BR3, NFR02) — CHỈ UI, không thực thi mã.

export const SANDBOX_STEPS = [
  "Nhận mã nguồn",
  "Gán nhãn untrusted",
  "Khởi tạo cgroups v2",
  "Chép /tmp & biên dịch",
  "Chạy bộ test case",
  "Đo thời gian & RAM",
  "Hủy container & dọn /tmp",
];

export const SANDBOX_LIMITS = [
  "cgroups v2",
  "1 vCPU",
  "256 MB RAM",
  "50 MB /tmp",
  "network=none",
  "ro-rootfs",
  "timeout 3s",
];

export const SANDBOX_CONSTRAINTS_SPEC =
  "cgroups v2 · 1 vCPU · 256 MB RAM · 50 MB /tmp · network=none · ro-rootfs · timeout 3s";

export const TEST_STATUS = {
  passed: { label: "Passed", tone: "success" },
  failed: { label: "Wrong answer", tone: "danger" },
  tle: { label: "TLE", tone: "warning" },
  mle: { label: "MLE", tone: "warning" },
  re: { label: "Runtime error", tone: "danger" },
};

/** Kết quả minh họa: Run (test mẫu, không tính điểm) và các kịch bản Submit (TLE / Accepted / MLE / Runtime error). */
export const MOCK_RESULTS = {
  run: {
    title: "Kết quả Run · test mẫu",
    summary: "2 / 2 đạt",
    tone: "success",
    totalTime: "20 ms",
    peakMem: "14.1 MB",
    exitCode: "exit 0 · container destroyed",
    note: "Chế độ Run chỉ kiểm tra bộ test mẫu công khai và không tính vào điểm bài nộp (UC09 · A1).",
    tests: [
      { name: "Test 1 (mẫu)", status: "passed", timeMs: 11, memMb: 14.1, detail: "nums=[2,7,11,15], target=9 → [0,1]" },
      { name: "Test 2 (mẫu)", status: "passed", timeMs: 9, memMb: 14.0, detail: "nums=[3,2,4], target=6 → [1,2]" },
    ],
  },
  submit: {
    title: "Kết quả Submit · bộ test đầy đủ",
    summary: "4 / 5 đạt · TLE",
    tone: "warning",
    totalTime: "> 3000 ms",
    peakMem: "21.4 MB",
    exitCode: "SIGKILL (137) · timeout 3s · container destroyed",
    note: "Test 5 (n = 10⁴) vượt giới hạn 3,0 giây — cgroups v2 ngắt tiến trình và hủy container.",
    coachTitle: "4 / 5 test đã đạt — Test dữ liệu lớn chạm ngưỡng 3 giây",
    coachBody:
      "Vòng lặp lồng O(n²) vượt quá thời gian ở n = 10⁴. Hãy lưu phần tử đã duyệt vào bảng băm (dict / Map) để đưa độ phức tạp về O(n).",
    tests: [
      { name: "Test 1", status: "passed", timeMs: 12, memMb: 14.1 },
      { name: "Test 2", status: "passed", timeMs: 9, memMb: 14.2 },
      { name: "Test 3", status: "passed", timeMs: 11, memMb: 14.3 },
      { name: "Test 4 (âm & trùng)", status: "passed", timeMs: 16, memMb: 14.6 },
      { name: "Test 5 (n = 10⁴)", status: "tle", timeMs: 3000, memMb: 21.4, detail: "Vượt timeout 3s" },
    ],
  },
  accepted: {
    title: "Kết quả Submit · Accepted",
    summary: "5 / 5 đạt",
    tone: "success",
    totalTime: "54 ms",
    peakMem: "16.8 MB",
    exitCode: "exit 0 · container destroyed",
    note: "Toàn bộ 5 test case vượt qua trong giới hạn O(n). Bằng chứng đã cập nhật vào hồ sơ năng lực.",
    coachTitle: "Hoàn thành — Đạt chuẩn O(n) thời gian",
    coachBody:
      "Lời giải Hash Map vượt qua test n = 10⁴ trong 18 ms và dùng 16.8 MB / 256 MB RAM.",
    tests: [
      { name: "Test 1", status: "passed", timeMs: 10, memMb: 14.1 },
      { name: "Test 2", status: "passed", timeMs: 8, memMb: 14.2 },
      { name: "Test 3", status: "passed", timeMs: 11, memMb: 14.5 },
      { name: "Test 4 (âm & trùng)", status: "passed", timeMs: 7, memMb: 14.8 },
      { name: "Test 5 (n = 10⁴)", status: "passed", timeMs: 18, memMb: 16.8 },
    ],
  },
  mle: {
    title: "Kết quả Submit · Vượt bộ nhớ (UC09 · E3)",
    summary: "3 / 5 đạt · MLE",
    tone: "warning",
    totalTime: "184 ms",
    peakMem: "256.0 MB",
    exitCode: "OOMKilled (137) · memory > 256 MB · container destroyed",
    note: "Cấp phát vượt trần 256 MB RAM (NFR02). Kernel cgroups v2 kích hoạt OOM Killer và dọn sạch /tmp.",
    coachTitle: "Vượt giới hạn bộ nhớ 256 MB (MLE)",
    coachBody:
      "Tránh khởi tạo bảng hai chiều n × n. Chỉ cần một từ điển ánh xạ giá trị sang chỉ số với bộ nhớ phụ O(n).",
    tests: [
      { name: "Test 1", status: "passed", timeMs: 12, memMb: 18.4 },
      { name: "Test 2", status: "passed", timeMs: 14, memMb: 24.0 },
      { name: "Test 3", status: "passed", timeMs: 38, memMb: 92.6 },
      { name: "Test 4 (n = 10⁴)", status: "mle", timeMs: 120, memMb: 256.0, detail: "Chạm trần 256 MB" },
      { name: "Test 5 (n = 10⁴)", status: "mle", timeMs: 0, memMb: 256.0, detail: "Bỏ qua sau OOMKilled" },
    ],
  },
  re: {
    title: "Kết quả Submit · Runtime error (UC09 · E4)",
    summary: "2 / 5 đạt · RE",
    tone: "danger",
    totalTime: "31 ms",
    peakMem: "14.4 MB",
    exitCode: "SIGSYS / exit 1 · blocked syscall · container destroyed",
    note: "Tiến trình ném ngoại lệ hoặc gọi syscall mạng/ghi ngoài /tmp bị chặn bởi seccomp + ro-rootfs (BR3).",
    coachTitle: "Runtime error trong container cô lập (BR3)",
    coachBody:
      "Kiểm tra truy cập chỉ số ngoài biên mảng hoặc thao tác I/O ngoài chuẩn stdout. Sandbox chặn mạng và ghi lên rootfs.",
    tests: [
      { name: "Test 1", status: "passed", timeMs: 11, memMb: 14.1 },
      { name: "Test 2", status: "passed", timeMs: 9, memMb: 14.2 },
      { name: "Test 3", status: "re", timeMs: 11, memMb: 14.4, detail: "IndexError / blocked syscall" },
      { name: "Test 4 (âm & trùng)", status: "re", timeMs: 0, memMb: 14.4, detail: "Ngắt phiên thực thi" },
      { name: "Test 5 (n = 10⁴)", status: "re", timeMs: 0, memMb: 14.4, detail: "Ngắt phiên thực thi" },
    ],
  },
};

/** Lời giải minh họa dùng cho snapshot (UC13) và editor trong phiên Technical. */
export const SAMPLE_SOLUTION = `class Solution:
    def twoSum(self, nums, target):
        seen = {}
        for i, x in enumerate(nums):
            need = target - x
            if need in seen:
                return [seen[need], i]
            seen[x] = i
        return []
`;
