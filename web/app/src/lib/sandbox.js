// Dữ liệu hiển thị cho khối Sandbox (UC09) — CHỈ UI, không chạy mã. Việc chấm thật do backend đảm nhận (BR3, NFR02).

export const SANDBOX_STEPS = [
  "Nhận mã",
  "Gán nhãn không tin cậy",
  "Tạo container",
  "Chép vào /tmp & biên dịch",
  "Chạy từng test case",
  "So sánh output, đo thời gian & bộ nhớ",
  "Hủy container, dọn /tmp",
];

export const SANDBOX_LIMITS = ["1 CPU", "256 MB RAM", "50 MB /tmp", "3 s / test", "Không mạng", "FS chỉ đọc"];

export const TEST_STATUS = {
  passed: { label: "Passed", tone: "success" },
  failed: { label: "Wrong Answer", tone: "danger" },
  tle: { label: "TLE", tone: "warning" },
  mle: { label: "MLE", tone: "warning" },
  re: { label: "Runtime Error", tone: "danger" },
};

/** Kết quả minh họa: Run (test mẫu, không tính điểm) và Submit (bộ test đầy đủ). */
export const MOCK_RESULTS = {
  run: {
    title: "Kết quả Run · test mẫu",
    summary: "2 / 2 Passed",
    tone: "success",
    note: "Chế độ Run không tính vào điểm bài nộp.",
    tests: [
      { name: "Test 1 (mẫu)", status: "passed", timeMs: 11, memMb: 14.1 },
      { name: "Test 2 (mẫu)", status: "passed", timeMs: 9, memMb: 14.0 },
    ],
  },
  submit: {
    title: "Kết quả Submit",
    summary: "4 / 5 Passed",
    tone: "warning",
    note: "Test 5 (dữ liệu lớn) vượt giới hạn 3 s — tiến trình bị ngắt, container đã hủy.",
    tests: [
      { name: "Test 1", status: "passed", timeMs: 12, memMb: 14.1 },
      { name: "Test 2", status: "passed", timeMs: 9, memMb: 14.2 },
      { name: "Test 3", status: "passed", timeMs: 11, memMb: 14.3 },
      { name: "Test 4", status: "passed", timeMs: 16, memMb: 14.6 },
      { name: "Test 5 (dữ liệu lớn)", status: "tle", timeMs: 3000, memMb: 21.4, detail: "Vượt giới hạn 3 s" },
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
