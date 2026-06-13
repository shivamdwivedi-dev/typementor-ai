export interface CodeTemplate {
  language: string;
  code: string;
}

export const CODING_TEMPLATES: Record<string, CodeTemplate[]> = {
  Python: [
    {
      language: 'Python',
      code: 'def calculate_fibonacci(n):\n    if n <= 1:\n        return n\n    return calculate_fibonacci(n-1) + calculate_fibonacci(n-2)'
    },
    {
      language: 'Python',
      code: 'class TypingEngine:\n    def __init__(self, wpm, accuracy):\n        self.wpm = wpm\n        self.accuracy = accuracy\n        self.is_cheater = False'
    },
    {
      language: 'Python',
      code: 'import json\n\ndef parse_dna(signature):\n    data = json.loads(signature)\n    return data.get("dwellTimes", {})'
    },
    {
      language: 'Python',
      code: 'def merge_sort(arr):\n    if len(arr) <= 1:\n        return arr\n    mid = len(arr) // 2\n    left = merge_sort(arr[:mid])\n    right = merge_sort(arr[mid:])\n    return merge(left, right)'
    },
    {
      language: 'Python',
      code: 'with open("data.json", "r") as f:\n    records = json.load(f)\n\nfiltered = [r for r in records if r["score"] >= 90]\nprint(f"Top performers: {len(filtered)}")'
    },
    {
      language: 'Python',
      code: 'from dataclasses import dataclass\n\n@dataclass\nclass Session:\n    user_id: str\n    wpm: float\n    accuracy: float\n    duration: int\n\n    def is_elite(self) -> bool:\n        return self.wpm >= 80 and self.accuracy >= 97'
    },
  ],

  JavaScript: [
    {
      language: 'JavaScript',
      code: 'const verifySignature = (baseline, test) => {\n  const holdDiff = Math.abs(baseline.averageHold - test.averageHold);\n  return Math.max(0, 100 - holdDiff * 2);\n};'
    },
    {
      language: 'JavaScript',
      code: 'import { create } from "zustand";\nexport const useStore = create((set) => ({\n  currentIndex: 0,\n  increment: () => set((state) => ({ currentIndex: state.currentIndex + 1 }))\n}));'
    },
    {
      language: 'JavaScript',
      code: 'app.use((err, req, res, next) => {\n  console.error(err.stack);\n  res.status(500).json({ error: "Internal Server Error" });\n});'
    },
    {
      language: 'JavaScript',
      code: 'async function fetchUserSessions(userId) {\n  const res = await fetch(`/api/sessions/${userId}`);\n  if (!res.ok) throw new Error("Failed to load sessions");\n  return res.json();\n}'
    },
    {
      language: 'JavaScript',
      code: 'const debounce = (fn, delay) => {\n  let timer;\n  return (...args) => {\n    clearTimeout(timer);\n    timer = setTimeout(() => fn(...args), delay);\n  };\n};'
    },
    {
      language: 'JavaScript',
      code: 'const pipeline = (...fns) => (x) => fns.reduce((v, f) => f(v), x);\n\nconst processScore = pipeline(\n  (s) => s * 1.1,\n  (s) => Math.round(s),\n  (s) => Math.min(s, 100)\n);'
    },
  ],

  Java: [
    {
      language: 'Java',
      code: 'public class TypingDNA {\n    private Map<String, Double> dwellTimes;\n    public TypingDNA() {\n        this.dwellTimes = new HashMap<>();\n    }\n}'
    },
    {
      language: 'Java',
      code: 'public static void main(String[] args) {\n    System.out.println("Verification Score: " + score);\n}'
    },
    {
      language: 'Java',
      code: 'public Optional<User> findByEmail(String email) {\n    return userRepository\n        .findAll()\n        .stream()\n        .filter(u -> u.getEmail().equals(email))\n        .findFirst();\n}'
    },
    {
      language: 'Java',
      code: '@RestController\n@RequestMapping("/api/sessions")\npublic class SessionController {\n    @GetMapping("/{id}")\n    public ResponseEntity<Session> getSession(@PathVariable Long id) {\n        return service.findById(id).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());\n    }\n}'
    },
    {
      language: 'Java',
      code: 'List<Integer> squares = IntStream\n    .rangeClosed(1, 10)\n    .map(n -> n * n)\n    .filter(n -> n % 2 == 0)\n    .boxed()\n    .collect(Collectors.toList());'
    },
  ],

  SQL: [
    {
      language: 'SQL',
      code: 'SELECT u.id, u.email, SUM(s.wpm) / COUNT(s.id) AS avg_wpm\nFROM users u\nLEFT JOIN sessions s ON u.id = s.user_id\nGROUP BY u.id\nHAVING avg_wpm > 60;'
    },
    {
      language: 'SQL',
      code: 'INSERT INTO mistake_summaries (user_id, expected_key, pressed_key, count)\nVALUES ($1, $2, $3, 1)\nON CONFLICT (user_id, expected_key, pressed_key)\nDO UPDATE SET count = count + 1;'
    },
    {
      language: 'SQL',
      code: 'WITH ranked AS (\n  SELECT user_id, wpm, accuracy,\n    RANK() OVER (PARTITION BY user_id ORDER BY wpm DESC) AS rnk\n  FROM sessions\n)\nSELECT * FROM ranked WHERE rnk = 1;'
    },
    {
      language: 'SQL',
      code: 'UPDATE users\nSET streak = streak + 1,\n    last_active_at = NOW(),\n    xp = xp + 50\nWHERE id = $1\n  AND last_active_at >= NOW() - INTERVAL \'1 day\';'
    },
    {
      language: 'SQL',
      code: 'CREATE INDEX CONCURRENTLY idx_sessions_user_wpm\nON sessions (user_id, wpm DESC)\nWHERE accuracy >= 90;'
    },
    {
      language: 'SQL',
      code: 'SELECT\n  date_trunc(\'week\', created_at) AS week,\n  AVG(wpm) AS avg_wpm,\n  AVG(accuracy) AS avg_accuracy,\n  COUNT(*) AS session_count\nFROM sessions\nGROUP BY 1\nORDER BY 1 DESC\nLIMIT 12;'
    },
  ],
};
