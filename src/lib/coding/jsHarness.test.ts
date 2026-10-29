import { describe, expect, it, vi } from "vitest";
import problems from "./problems.public.json";
import { ADAPTERS, matches, run, TreeNode } from "./jsHarness";
import type { PublicProblem } from "./types";

const real = (id: string) => {
  const p = (problems as unknown as PublicProblem[]).find((x) => x.id === id);
  if (!p) throw new Error(`no problem ${id}`);
  return p;
};
// hand-made problems only carry the fields the harness reads
const make = (p: Record<string, unknown>) => p as unknown as PublicProblem;
const allPass = (code: string, problem: PublicProblem) => {
  const rows = run(code, problem, false);
  expect(rows.map((r) => r.error)).toEqual(rows.map(() => null));
  expect(rows.length).toBe(problem.tests.length);
  expect(rows.every((r) => r.passed)).toBe(true);
};

const TWO_SUM = `function twoSum(nums, target) {
  const seen = new Map();
  for (let i = 0; i < nums.length; i++) {
    if (seen.has(target - nums[i])) return [seen.get(target - nums[i]), i];
    seen.set(nums[i], i);
  }
}`;

describe("real problems solved in JavaScript", () => {
  it("two sum (custom validator), camelCase name", () => allPass(TWO_SUM, real("code-two-sum")));

  it("reverse linked list", () =>
    allPass(
      `var reverseList = function (head) {
        let prev = null;
        while (head) { const next = head.next; head.next = prev; prev = head; head = next; }
        return prev;
      };`,
      real("code-reverse-linked-list"),
    ));

  it("max depth of a tree, snake_case name", () =>
    allPass(
      "function max_depth(root) { return root ? 1 + Math.max(max_depth(root.left), max_depth(root.right)) : 0; }",
      real("code-maximum-depth-of-binary-tree"),
    ));

  it("clone graph (graph_copy)", () =>
    allPass(
      `function cloneGraph(node) {
        const copies = new Map();
        const copy = (n) => {
          if (!copies.has(n)) { copies.set(n, new Node(n.val)); copies.get(n).neighbors = n.neighbors.map(copy); }
          return copies.get(n);
        };
        return node ? copy(node) : null;
      }`,
      real("code-clone-graph"),
    ));

  it("median finder (design + float)", () =>
    allPass(
      `class MedianFinder {
        constructor() { this.nums = []; }
        addNum(n) { this.nums.push(n); }
        findMedian() { const s = [...this.nums].sort((a, b) => a - b), n = s.length; return (s[(n - 1) >> 1] + s[n >> 1]) / 2; }
      }`,
      real("code-find-median-from-data-stream"),
    ));

  it("implement trie (design + exact)", () =>
    allPass(
      `class Trie {
        constructor() { this.words = []; }
        insert(w) { this.words.push(w); }
        search(w) { return this.words.includes(w); }
        startsWith(p) { return this.words.some((w) => w.startsWith(p)); }
      }`,
      real("code-implement-trie"),
    ));

  it("serialize / deserialize tree (roundtrip)", () =>
    allPass(
      `class Codec {
        serialize(root) {
          const out = [];
          const walk = (n) => { if (!n) { out.push("#"); return; } out.push(n.val); walk(n.left); walk(n.right); };
          walk(root);
          return out.join(",");
        }
        deserialize(data) {
          const parts = data.split(","); let i = 0;
          const build = () => { const v = parts[i++]; if (v === "#") return null; return new TreeNode(Number(v), build(), build()); };
          return build();
        }
      }`,
      real("code-serialize-deserialize-binary-tree"),
    ));

  it("encode / decode strings (roundtrip with encode/decode)", () =>
    allPass(
      `class Codec {
        encode(strs) { return strs.map((s) => s.length + "#" + s).join(""); }
        decode(s) {
          const out = []; let i = 0;
          while (i < s.length) { const j = s.indexOf("#", i); const n = Number(s.slice(i, j)); out.push(s.slice(j + 1, j + 1 + n)); i = j + 1 + n; }
          return out;
        }
      }`,
      real("code-encode-and-decode-strings"),
    ));

  it("3sum (unordered_nested)", () =>
    allPass(
      `function threeSum(nums) {
        nums.sort((a, b) => a - b);
        const out = [];
        for (let i = 0; i < nums.length; i++) {
          if (i && nums[i] === nums[i - 1]) continue;
          let l = i + 1, r = nums.length - 1;
          while (l < r) {
            const s = nums[i] + nums[l] + nums[r];
            if (s < 0) l++; else if (s > 0) r--;
            else { out.push([nums[r], nums[i], nums[l]]); l++; while (l < r && nums[l] === nums[l - 1]) l++; }
          }
        }
        return out.reverse();
      }`,
      real("code-3sum"),
    ));

  it("rotate image (checkArg, in place)", () =>
    allPass(
      `function rotate(matrix) {
        const copy = matrix.map((r) => [...r]), n = matrix.length;
        for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) matrix[j][n - 1 - i] = copy[i][j];
        return "ignored";
      }`,
      real("code-rotate-image"),
    ));

  it("reorder list (checkArg converts the linked list argument back)", () =>
    allPass(
      `function reorderList(head) {
        const nodes = [];
        while (head) { nodes.push(head); head = head.next; }
        if (!nodes.length) return;
        let i = 0, j = nodes.length - 1;
        while (i < j) { nodes[i].next = nodes[j]; i++; if (i === j) break; nodes[j].next = nodes[i]; j--; }
        nodes[i].next = null;
      }`,
      real("code-reorder-list"),
    ));

  it("lowest common ancestor (tree_node args, node_value return)", () =>
    allPass(
      `function lowestCommonAncestor(root, p, q) {
        while (true) {
          if (p.val < root.val && q.val < root.val) root = root.left;
          else if (p.val > root.val && q.val > root.val) root = root.right;
          else return root;
        }
      }`,
      real("code-lowest-common-ancestor-of-a-binary-search-tree"),
    ));

  it("linked list cycle", () =>
    allPass(
      "function hasCycle(head) { const seen = new Set(); while (head && !seen.has(head)) { seen.add(head); head = head.next; } return head != null; }",
      real("code-linked-list-cycle"),
    ));

  it("merge k sorted lists (linked_list_list)", () =>
    allPass(
      `function mergeKLists(lists) {
        const vals = [];
        for (let n of lists) while (n) { vals.push(n.val); n = n.next; }
        vals.sort((a, b) => a - b);
        let head = null;
        for (let i = vals.length - 1; i >= 0; i--) head = new ListNode(vals[i], head);
        return head;
      }`,
      real("code-merge-k-sorted-lists"),
    ));
});

describe("result rows", () => {
  it("have the documented shape and are JSON-safe", () => {
    const rows = run("function isValid(s) { return undefined; }", real("code-valid-parentheses"), false);
    for (const [i, r] of rows.entries()) {
      expect(Object.keys(r).sort()).toEqual(["error", "expected", "got", "index", "ms", "passed", "stdout"]);
      expect(r.index).toBe(i);
      expect(r.got).toBeNull();
      expect(r.ms).toBeGreaterThanOrEqual(0);
    }
    expect(JSON.parse(JSON.stringify(rows))).toEqual(rows);
  });

  it("onlyVisible runs the visible tests", () => {
    const p = real("code-two-sum");
    expect(run(TWO_SUM, p, true)).toHaveLength(p.visibleTestCount);
  });

  it("unknown objects become a short string", () => {
    const [row] = run("function twoSum() { return new Map(); }", real("code-two-sum"), false);
    expect(row.got).toBe("<Map>");
  });
});

describe("errors", () => {
  it("syntax error is one row with the line", () => {
    const [row, ...rest] = run("function twoSum(nums, target) {\n  let total = 1;\n  return nums[0] +;\n}\n", real("code-two-sum"), false);
    expect(rest).toEqual([]);
    expect(row.index).toBe(-1);
    expect(row.error).toMatch(/^SyntaxError: .*\(line 3\)$/);
  });

  it("runtime error reports the candidate line for every test", () => {
    const rows = run("function twoSum(nums, target) {\n  let total = 0;\n  return null.x;\n}", real("code-two-sum"), false);
    expect(rows).toHaveLength(real("code-two-sum").tests.length);
    expect(new Set(rows.map((r) => r.error))).toEqual(new Set(["TypeError: Cannot read properties of null (reading 'x') (line 3)"]));
  });

  it("runtime error in a helper reports the deepest candidate line", () => {
    const code = "function helper(x) {\n  throw new RangeError('bad ' + x);\n}\n\nfunction twoSum() {\n  return helper(1);\n}";
    expect(run(code, real("code-two-sum"), false)[0].error).toBe("RangeError: bad 1 (line 2)");
  });

  it("a huge message is cut short", () => {
    const error = run("function twoSum() {\n  throw new Error('x'.repeat(10000));\n}", real("code-two-sum"), false)[0].error ?? "";
    expect(error.length).toBeLessThan(340);
    expect(error.startsWith("Error: xxx") && error.includes("…") && error.endsWith("(line 2)")).toBe(true);
  });

  it("a throw while loading is one row with the line", () => {
    const rows = run("const x = 1;\nthrow new Error('boom');\n", real("code-two-sum"), false);
    expect(rows).toEqual([expect.objectContaining({ index: -1, passed: false, error: "Error: boom (line 2)" })]);
  });

  it("missing function", () => {
    const [row, ...rest] = run("function somethingElse() {}", real("code-two-sum"), false);
    expect(rest).toEqual([]);
    expect(row).toMatchObject({ index: -1, passed: false, error: "Couldn't find a function named two_sum (or twoSum)" });
  });

  it("missing class", () => {
    expect(run("class Tree {}", real("code-implement-trie"), false)[0].error).toBe("Couldn't find a class named Trie");
  });

  it("returning an array for a linked list explains why", () => {
    const row = run("function mergeTwoLists() { return [1, 2]; }", real("code-merge-two-sorted-lists"), false)[0];
    expect(row.error).toBe("TypeError: expected a ListNode or null, got Array");
    expect(row.got).toEqual([1, 2]);
  });
});

describe("lookup", () => {
  it("candidate may declare its own node class", () =>
    allPass(
      "class ListNode { constructor(val, next) { this.val = val; this.next = next ?? null; } }\nconst reverseList = (h, p = null) => (h ? reverseList(h.next, new ListNode(h.val, p)) : p);",
      real("code-reverse-linked-list"),
    ));

  it("class Solution style", () => {
    const code = TWO_SUM.replace("function twoSum", "class Solution {\n twoSum").concat("\n}");
    allPass(code, real("code-two-sum"));
  });
});

describe("console capture", () => {
  it("is per test and capped at 2,000 chars", () => {
    const code = "function isValid(s) {\n  console.log('checking', s, [1, 2]);\n  console.log('y'.repeat(5000));\n  return true;\n}";
    const rows = run(code, real("code-valid-parentheses"), false);
    expect(rows[0].stdout.startsWith("checking ([]{}) [1,2]\n")).toBe(true);
    expect(rows.every((r) => r.stdout.length === 2000)).toBe(true);
  });

  it("load output shows on a load error", () => {
    const [row] = run("console.log('hi');\nthrow new Error('x');", real("code-two-sum"), false);
    expect(row.stdout).toBe("hi\n");
  });
});

describe("judging", () => {
  it("validator sees the original args even if the candidate mutates them", () => {
    const code = `function twoSum(nums, target) {
      nums.sort((a, b) => a - b);
      let i = 0, j = nums.length - 1;
      while (nums[i] + nums[j] !== target) nums[i] + nums[j] < target ? i++ : j--;
      return [i, j];
    }`;
    expect(run(code, real("code-two-sum"), false)[0].passed).toBe(false);
  });

  it("in place mode judges the argument, not the return", () => {
    const p = real("code-rotate-image");
    const row = run("function rotate(m) { return m.map((r) => [...r].reverse()); }", p, false)[0];
    expect(row.passed).toBe(false);
    expect(row.got).toEqual((p.tests[0].args as unknown[])[0]);
  });

  const LCA = make({
    functionName: "lowest_common_ancestor",
    signature: "def lowest_common_ancestor(root: TreeNode, p: TreeNode, q: TreeNode) -> TreeNode:",
    adapters: { root: "tree", p: "tree_node", q: "tree_node", return: "node_value" },
    tests: [{ args: [[6, 2, 8], 2, 8], expected: 6 }],
  });

  it("tree_node args are nodes inside the tree, the returned node becomes its value", () => {
    const row = run("function lowestCommonAncestor(root, p, q) { if (p !== root.left || q !== root.right) throw new Error('not same'); return root; }", LCA, false)[0];
    expect(row).toMatchObject({ passed: true, got: 6 });
  });

  it("returning a value instead of a node explains why", () => {
    const row = run("function lowestCommonAncestor(root) { return root.val; }", LCA, false)[0];
    expect(row).toMatchObject({ passed: false, got: 6, error: "TypeError: expected a TreeNode or null, got number" });
  });

  it("a tree_node value missing from the tree is reported", () => {
    const p = make({ ...LCA, tests: [{ args: [[6, 2, 8], 2, 5], expected: 6 }] });
    expect(run("function lowestCommonAncestor(root) { return root; }", p, false)[0].error).toContain("no node with value 5");
  });

  it.each([
    "function cloneGraph(node) { return node; }",
    "function cloneGraph(node) { return node ? new Node(node.val, node.neighbors) : null; }",
  ])("graph_copy rejects a graph sharing nodes with the input: %s", (code) => {
    const row = run(code, real("code-clone-graph"), false)[0];
    expect(row.passed).toBe(false);
    expect(row.error).toContain("reuses nodes from the input");
  });

  it("design mode names the failing call and keeps earlier results", () => {
    const code = "class Trie {\n  insert() {}\n  search() {\n    throw new Error('nope');\n  }\n  startsWith() { return true; }\n}";
    const row = run(code, real("code-implement-trie"), false)[0];
    expect(row.got).toEqual([null, null]);
    expect(row.error).toBe("Error in call 3 (search): Error: nope (line 4)");
  });

  it("design mode with a missing method says so", () => {
    const row = run("class Trie {}", real("code-implement-trie"), false)[0];
    expect(row.error).toBe("Error in call 2 (insert): TypeError: Trie has no method insert");
  });

  it("roundtrip requires a string", () => {
    const row = run("class Codec { serialize() { return [1]; } deserialize() { return null; } }", real("code-serialize-deserialize-binary-tree"), false)[0];
    expect(row).toMatchObject({ passed: false, error: "TypeError: serialize must return a string, got Array" });
  });

  it("roundtrip uses separate instances so state cannot leak", () => {
    const code = "class Codec {\n  serialize(root) { this.root = root; return ''; }\n  deserialize() {\n    return this.root.val;\n  }\n}";
    const rows = run(code, real("code-serialize-deserialize-binary-tree"), false);
    expect(rows.some((r) => r.passed)).toBe(false);
    expect(rows[0].error).toBe("Error in deserialize: TypeError: Cannot read properties of undefined (reading 'val') (line 4)");
  });
});

describe("matches", () => {
  it("compare modes", () => {
    expect(matches("exact", [1, 2], [1, 2])).toBe(true);
    expect(matches("exact", [1, 2], [2, 1])).toBe(false);
    expect(matches("exact", { a: [1] }, { a: [1] })).toBe(true);
    expect(matches("unordered", [1, 2, 3], [3, 1, 2])).toBe(true);
    expect(matches("unordered", [1, 2, 3], null)).toBe(false);
    expect(matches("unordered_nested", [[1, 2], ["a", "b"]], [["b", "a"], [2, 1]])).toBe(true);
    expect(matches("unordered_nested", [[1, 2]], [[1, 3]])).toBe(false);
    expect(matches("float", 1 / 3, 0.333334)).toBe(true);
    expect(matches("float", 1 / 3, 0.3334)).toBe(false);
    expect(matches("float", [1.5, null, 2.0], [1.5000001, null, 2])).toBe(true);
    expect(matches("float", [1.5, null], [1.5, 0.0])).toBe(false);
    expect(matches("float", [1.5, 2.0], [1.5])).toBe(false);
    expect(matches("float", null, 0.0)).toBe(false);
    expect(matches("custom", [0, 1], [1, 0], [[2, 7, 11], 9], "two_sum_pair")).toBe(true);
    expect(matches("custom", [0, 1], [0, 0], [[2, 7, 11], 4], "two_sum_pair")).toBe(false);
    expect(matches("custom", [0, 1], [0.5, 1], [[2, 7, 11], 9], "two_sum_pair")).toBe(false);
  });

  it("alien order validator", () => {
    const words = [["wrt", "wrf", "er", "ett", "rftt"]];
    const ok = (expected: string, got: unknown, args: unknown[] = words) => matches("custom", expected, got, args, "alien_order");
    expect(ok("wertf", "wertf")).toBe(true);
    expect(ok("wertf", "wetrf")).toBe(false);
    expect(ok("wertf", "wertff")).toBe(false);
    expect(ok("wertf", "wert")).toBe(false);
    expect(ok("wertf", "")).toBe(false);
    expect(ok("wertf", null)).toBe(false);
    expect(ok("xz", "xz", [["x", "z"]])).toBe(true);
    expect(ok("xz", "zx", [["x", "z"]])).toBe(false);
    expect(ok("ab", "ba", [["ab", "ab"]])).toBe(true);
    expect(ok("", "", [["abc", "ab"]])).toBe(true);
    expect(ok("", "abc", [["abc", "ab"]])).toBe(false);
    expect(ok("", "xz", [["x", "z", "x"]])).toBe(false);
  });
});

describe("adapters", () => {
  it("round trip", () => {
    const [toList, fromList] = ADAPTERS.linked_list;
    expect(fromList(toList([1, 2, 3]))).toEqual([1, 2, 3]);
    expect(toList([])).toBeNull();
    expect(fromList(null)).toEqual([]);
    const [toTree, fromTree] = ADAPTERS.tree;
    for (const order of [[3, 9, 20, null, null, 15, 7], [1, null, 2, 3], [1, 2], []]) expect(fromTree(toTree(order))).toEqual(order);
    expect((toTree([1, null, 2]) as TreeNode).right?.val).toBe(2);
    const [toGraph, fromGraph] = ADAPTERS.graph;
    const square = [[2, 4], [1, 3], [2, 4], [1, 3]];
    expect(fromGraph(toGraph(square))).toEqual(square);
    expect(toGraph([])).toBeNull();
    expect(fromGraph(null)).toEqual([]);
  });

  it("list of linked lists", () => {
    const [to, from] = ADAPTERS.linked_list_list;
    expect(from(to([[1, 4], [], [2]]))).toEqual([[1, 4], [], [2]]);
    expect(to([])).toEqual([]);
  });

  it("cycle list links the tail back to pos, and converting a cycle throws", () => {
    const [toCycle, fromCycle] = ADAPTERS.linked_list_cycle;
    const single = toCycle({ values: [7], pos: 0 }) as { next: unknown };
    expect(single.next).toBe(single);
    expect(toCycle({ values: [], pos: -1 })).toBeNull();
    expect(() => fromCycle(toCycle({ values: [1, 2, 3], pos: 0 }))).toThrow(/cycle/);
    const [toTree, fromTree] = ADAPTERS.tree;
    const root = toTree([1, 2, 3]) as TreeNode;
    if (root.left) root.left.left = root;
    expect(() => fromTree(root)).toThrow(/same node twice/);
  });
});

describe("js.worker", () => {
  it("answers load with ready and run with result", async () => {
    const posted: unknown[] = [];
    vi.spyOn(self, "postMessage").mockImplementation((m: unknown) => void posted.push(m));
    await import("./js.worker");
    const send = (data: unknown) => self.onmessage?.(new MessageEvent("message", { data }));
    send({ type: "load" });
    send({ type: "run", id: 7, code: TWO_SUM, problem: real("code-two-sum"), onlyVisible: true });
    expect(posted[0]).toEqual({ type: "ready" });
    expect(posted[1]).toMatchObject({ type: "result", id: 7, results: [{ passed: true }, { passed: true }, { passed: true }] });
  });
});

describe("JavaScript starters", () => {
  it.each((problems as unknown as PublicProblem[]).map((p) => [p.id, p] as const))(
    "%s: the judge loads the starter and finds its function or class",
    (_id, problem) => {
      const rows = run(problem.starterCodeJs, problem, true);
      expect(rows.length).toBeGreaterThan(0);
      expect(rows[0].index).toBe(0);
    },
  );
});
