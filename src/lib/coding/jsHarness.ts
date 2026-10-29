/**
 * Judges a candidate's JavaScript against a coding problem's tests: a port of
 * backend/data/coding/harness.py with the same contract. `run` never throws; every failure
 * becomes a result row. Time limits are the worker's job, not this file's.
 */
import type { PublicProblem, TestResult } from "./types";

const STDOUT_CAP = 2000;
const MESSAGE_CAP = 300; // an error message can be any size; the results panel and the turn payload can't

export class ListNode {
  constructor(
    public val: unknown = 0,
    public next: ListNode | null = null,
  ) {}
}

export class TreeNode {
  constructor(
    public val: unknown = 0,
    public left: TreeNode | null = null,
    public right: TreeNode | null = null,
  ) {}
}

export class Node {
  neighbors: Node[];
  constructor(
    public val: unknown = 0,
    neighbors: Node[] | null = null,
  ) {
    this.neighbors = neighbors ?? [];
  }
}

type Fn = (...args: unknown[]) => unknown;
type Ctor = new (...args: unknown[]) => Record<string, unknown>;
type Test = PublicProblem["tests"][number];

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T; // test data is JSON

function typeName(value: unknown): string {
  if (value === null || typeof value !== "object") return value === null ? "null" : typeof value;
  return (value as { constructor?: { name?: string } }).constructor?.name || "Object";
}

function checkNode(node: unknown, attr: string, kind: string) {
  if (node != null && !(typeof node === "object" && attr in node)) {
    throw new TypeError(`expected a ${kind} or null, got ${typeName(node)}`);
  }
}

function toLinkedList(values: unknown[]): ListNode | null {
  let head: ListNode | null = null;
  for (let i = values.length - 1; i >= 0; i--) head = new ListNode(values[i], head);
  return head;
}

/** {values, pos}: the tail links back to node pos; pos -1 means no cycle. */
function toCycleList(spec: { values: unknown[]; pos: number }): ListNode | null {
  const head = toLinkedList(spec.values);
  if (head && spec.pos >= 0) {
    const nodes = [head];
    while (nodes[nodes.length - 1].next) nodes.push(nodes[nodes.length - 1].next as ListNode);
    nodes[nodes.length - 1].next = nodes[spec.pos];
  }
  return head;
}

function fromLinkedList(node: unknown): unknown[] {
  const out: unknown[] = [];
  const seen = new Set<unknown>();
  while (node != null) {
    checkNode(node, "next", "ListNode");
    if (seen.has(node)) throw new Error("the returned list loops back on itself (cycle)");
    seen.add(node);
    out.push((node as ListNode).val);
    node = (node as ListNode).next;
  }
  return out;
}

/** Level order, null for a missing child; missing nodes have no child slots. */
function toTree(values: unknown[]): TreeNode | null {
  if (!values.length || values[0] == null) return null;
  const root = new TreeNode(values[0]);
  const queue = [root];
  let i = 1;
  for (let q = 0; q < queue.length && i < values.length; q++) {
    for (const side of ["left", "right"] as const) {
      if (i < values.length && values[i] != null) queue.push((queue[q][side] = new TreeNode(values[i])));
      i++;
    }
  }
  return root;
}

function fromTree(root: unknown): unknown[] {
  const out: unknown[] = [];
  const queue = [root];
  const seen = new Set<unknown>();
  for (let q = 0; q < queue.length; q++) {
    const node = queue[q];
    if (node == null) {
      out.push(null);
      continue;
    }
    checkNode(node, "left", "TreeNode");
    if (seen.has(node)) throw new Error("the returned tree reaches the same node twice (a cycle or a shared child)");
    seen.add(node);
    out.push((node as TreeNode).val);
    queue.push((node as TreeNode).left, (node as TreeNode).right);
  }
  while (out.length && out[out.length - 1] === null) out.pop();
  return out;
}

/** Adjacency list where node i has val i + 1; returns node 1. */
function toGraph(adjacency: number[][]): Node | null {
  const nodes = adjacency.map((_, i) => new Node(i + 1));
  nodes.forEach((node, i) => (node.neighbors = adjacency[i].map((j) => nodes[j - 1])));
  return nodes[0] ?? null;
}

/** Every node reachable from start, breadth first. */
function graphNodes(start: unknown): Node[] {
  if (start == null) return [];
  checkNode(start, "neighbors", "Node");
  const found = [start as Node];
  const seen = new Set<unknown>(found);
  for (let i = 0; i < found.length; i++) {
    for (const neighbor of found[i].neighbors) {
      if (!seen.has(neighbor)) {
        seen.add(neighbor);
        found.push(neighbor);
      }
    }
  }
  return found;
}

const fromGraph = (start: unknown) =>
  graphNodes(start)
    .sort((a, b) => (a.val as number) - (b.val as number))
    .map((node) => node.neighbors.map((n) => n.val));

function nodeValue(node: unknown): unknown {
  checkNode(node, "left", "TreeNode");
  return node == null ? null : (node as TreeNode).val;
}

/** The node holding `value` inside the tree `root`; null stays null. */
function treeNode(root: unknown, value: unknown): TreeNode | null {
  if (value == null) return null;
  const stack = [root as TreeNode | null];
  while (stack.length) {
    const node = stack.pop();
    if (node) {
      if (node.val === value) return node;
      stack.push(node.left, node.right);
    }
  }
  throw new Error(`test data has no node with value ${String(value)} in the tree`);
}

type Adapter = [toNodes: (value: unknown) => unknown, fromNodes: (nodes: unknown) => unknown];

// structure -> [JSON value -> nodes, nodes -> JSON value]. Param "tree_node" is a node inside
// the call's "tree" argument, written as its value (resolved in judgeFunction); "graph_copy"
// and "node_value" are only for "return".
export const ADAPTERS: Record<string, Adapter> = {
  linked_list: [(v) => toLinkedList(v as unknown[]), fromLinkedList],
  linked_list_list: [(v) => (v as unknown[][]).map(toLinkedList), (v) => (v as unknown[]).map(fromLinkedList)],
  linked_list_cycle: [(v) => toCycleList(v as { values: unknown[]; pos: number }), fromLinkedList],
  tree: [(v) => toTree(v as unknown[]), fromTree],
  graph: [(v) => toGraph(v as number[][]), fromGraph],
  graph_copy: [(v) => toGraph(v as number[][]), fromGraph], // return: also fails if any node is shared with the input
  node_value: [(v) => v, nodeValue], // return: a TreeNode, judged by its value
};

function twoSumPair(args: unknown[], _expected: unknown, got: unknown): boolean {
  const [nums, target] = args as [number[], number];
  return (
    Array.isArray(got) &&
    got.length === 2 &&
    got.every((i): i is number => Number.isInteger(i) && i >= 0 && i < nums.length) &&
    got[0] !== got[1] &&
    nums[got[0]] + nums[got[1]] === target
  );
}

/** Each letter once, in an order the word list agrees with; "" only when the test expects it. */
function alienOrder(args: unknown[], expected: unknown, got: unknown): boolean {
  const words = args[0] as string[];
  if (typeof got !== "string") return false;
  if (got === "") return expected === "";
  if ([...got].sort().join("") !== [...new Set(words.join(""))].sort().join("")) return false;
  const rank = new Map([...got].map((c, i) => [c, i]));
  for (let w = 0; w + 1 < words.length; w++) {
    const [a, b] = [words[w], words[w + 1]];
    const i = [...a].findIndex((c, k) => k < b.length && c !== b[k]);
    if (i >= 0) {
      if ((rank.get(a[i]) ?? 0) > (rank.get(b[i]) ?? 0)) return false;
    } else if (a.length > b.length) {
      return false; // a word before its own prefix: no order works
    }
  }
  return true;
}

// compare "custom": validator(original args, expected, got). args are the test's untouched
// JSON args, so a candidate that mutates its input can't fool the check.
const VALIDATORS: Record<string, (args: unknown[], expected: unknown, got: unknown) => boolean> = {
  two_sum_pair: twoSumPair,
  alien_order: alienOrder,
};

/** JSON-safe copy: undefined becomes null, unknown objects become a short string. */
function plain(value: unknown): unknown {
  if (value == null) return null;
  if (typeof value === "boolean" || typeof value === "number" || typeof value === "string") return value;
  if (Array.isArray(value)) return Array.from(value, plain);
  if (typeof value === "object" && [Object.prototype, null].includes(Object.getPrototypeOf(value))) {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, plain(v)]));
  }
  return `<${typeName(value)}>`;
}

const key = (value: unknown) =>
  JSON.stringify(value, (_k, v: unknown) =>
    v && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => (a < b ? -1 : 1))) : v,
  );
const byKey = (values: unknown[]) => [...values].sort((a, b) => (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0));

function equal(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) || Array.isArray(b)) {
    return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((x, i) => equal(x, b[i]));
  }
  if (a && b && typeof a === "object" && typeof b === "object") {
    const [ka, kb] = [Object.keys(a), Object.keys(b)];
    return ka.length === kb.length && ka.every((k) => equal((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
  }
  return a === b;
}

/** Numbers within 1e-5, element-wise through arrays; null only matches null. */
function close(expected: unknown, got: unknown): boolean {
  if (expected == null || got == null) return expected == null && got == null;
  if (Array.isArray(expected)) {
    return Array.isArray(got) && got.length === expected.length && expected.every((e, i) => close(e, got[i]));
  }
  return typeof got === "number" && Math.abs(got - (expected as number)) <= 1e-5;
}

export function matches(mode: string, expected: unknown, got: unknown, args: unknown[] = [], validator = ""): boolean {
  if (mode === "custom") {
    const check = VALIDATORS[validator];
    if (!check) throw new Error(`unknown validator ${validator}`);
    return Boolean(check(args, expected, got));
  }
  if (mode === "float") return close(expected, got);
  if (mode === "unordered" || mode === "unordered_nested") {
    if (!Array.isArray(got)) return false;
    let [g, e] = [got as unknown[], expected as unknown[]];
    if (mode === "unordered_nested") {
      if (!g.every(Array.isArray)) return false;
      [g, e] = [g.map((x) => byKey(x as unknown[])), e.map((x) => byKey(x as unknown[]))];
    }
    return equal(byKey(g), byKey(e));
  }
  return equal(got, expected);
}

/** Wraps an error from one call of a design / roundtrip test so the row says which call. */
class StepError extends Error {
  constructor(
    public label: string,
    public error: unknown,
  ) {
    super(label);
  }
}

function step<T>(label: string, call: () => T): T {
  try {
    return call();
  } catch (error) {
    throw new StepError(label, error);
  }
}

// Candidate code runs in a function of its own inside the loader, so it may declare its own
// ListNode / TreeNode / Node classes over the ones passed in (a top-level `class` can't redeclare a parameter).
const compile = (body: string) =>
  new Function("ListNode", "TreeNode", "Node", "console", `return (function () {\n${body}\n})();`) as Fn;

// "(line N)" in an engine's stack: V8/Safari "<anonymous>:N:C", Firefox "> Function:N:C".
const STACK_LINE = /(?:<anonymous>|> Function):(\d+):\d+/;
const LINE_OFFSET = (() => {
  try {
    compile("throw new Error()")();
  } catch (error) {
    const match = STACK_LINE.exec((error as Error).stack ?? "");
    if (match) return Number(match[1]) - 1;
  }
  return null;
})();

/** The innermost line of candidate code on the error's stack, if any. */
function stackLine(error: unknown): number | null {
  const match = error instanceof Error && LINE_OFFSET !== null ? STACK_LINE.exec(error.stack ?? "") : null;
  return match ? Number(match[1]) - (LINE_OFFSET ?? 0) : null;
}

// ponytail: engines don't put a syntax error's line on the error, so parse growing prefixes
// until one fails for a reason other than "the code stops here". An engine that words that
// reason differently just loses the line number.
const INCOMPLETE = /end of (input|script)|unterminated template|missing \} after function body/i;
function syntaxLine(code: string): number | null {
  const lines = code.split("\n");
  for (let n = 1; n <= lines.length; n++) {
    try {
      // `throw 0` first: when a prefix does parse, nothing in it runs.
      globalThis.eval(`throw 0; (function () {\n${lines.slice(0, n).join("\n")}`);
    } catch (error) {
      if (error instanceof SyntaxError && !INCOMPLETE.test(error.message)) return n;
    }
  }
  return null;
}

/** '<Name>: <message> (line N)' with N in the candidate's code, when it has a frame there. */
function describe(error: unknown, line = stackLine(error)): string {
  if (error instanceof StepError) return `${error.label}: ${describe(error.error)}`;
  const name = error instanceof Error ? error.name : "Error";
  let message = error instanceof Error ? error.message : String(error);
  if (message.length > MESSAGE_CAP) message = message.slice(0, MESSAGE_CAP) + "…";
  const text = message ? `${name}: ${message}` : name;
  return line ? `${text} (line ${line})` : text;
}

const blank = (index: number, error: string | null = null, stdout = ""): TestResult => ({
  index,
  passed: false,
  got: null,
  expected: null,
  error,
  stdout,
  ms: 0,
});

const camel = (name: string) => name.replace(/_(\w)/g, (_, c: string) => c.toUpperCase());

/** name, then its camelCase form (two_sum -> twoSum): at top level first, then on a
 * LeetCode-style class Solution, which gets a fresh instance per test. */
function find(namespace: Record<string, unknown>, name: string): Fn | null {
  const names = [...new Set([name, camel(name)])];
  for (const n of names) if (typeof namespace[n] === "function") return namespace[n] as Fn;
  const Solution = namespace.Solution as Ctor | undefined;
  for (const n of names) {
    if (typeof Solution === "function" && typeof Solution.prototype?.[n] === "function") {
      return (...args) => (new Solution()[n] as Fn)(...args);
    }
  }
  return null;
}

/** Parameter names from the Python signature: "def f(a: List[List[int]], b: int)" -> ["a", "b"]. */
function paramNames(signature: string): string[] {
  const match = /^def\s+\w+\s*\(([^)]*)\)/.exec(signature.trim());
  if (!match) return [];
  let params = match[1];
  while (params !== (params = params.replace(/\[[^[\]]*\]/g, ""))); // drop type brackets, innermost first
  return params
    .split(",")
    .map((p) => p.split(/[:=]/)[0].trim())
    .filter(Boolean);
}

type Body = (fn: Fn, test: Test, problem: PublicProblem, kinds: (string | undefined)[], row: TestResult) => boolean;

const adaptersOf = (problem: PublicProblem) => (problem.adapters ?? {}) as Record<string, string>;
const adapter = (kind: string | undefined) => (kind && Object.hasOwn(ADAPTERS, kind) ? ADAPTERS[kind] : null);

const judgeFunction: Body = (fn, test, problem, allKinds, row) => {
  const args = clone(test.args) as unknown[];
  const kinds = allKinds.slice(0, args.length);
  kinds.forEach((kind, i) => {
    const to = adapter(kind)?.[0];
    if (to) args[i] = to(args[i]);
  });
  const root = kinds.includes("tree") ? args[kinds.indexOf("tree")] : null;
  kinds.forEach((kind, i) => {
    if (kind === "tree_node") args[i] = treeNode(root, args[i]);
  });
  let outKind: string | undefined = adaptersOf(problem).return;
  // before the call, in case the candidate rewires the input
  const originals = new Set(outKind === "graph_copy" ? args.filter((_, i) => kinds[i] === "graph").flatMap(graphNodes) : []);
  let raw = fn(...args);
  const check = problem.checkArg;
  if (check != null) {
    // in-place: judge the argument after the call, ignore the return value
    [raw, outKind] = [args[check], kinds[check]];
  }
  row.got = plain(raw); // shown as-is if the conversion below rejects it
  const from = adapter(outKind)?.[1];
  if (from) row.got = plain(from(raw));
  if (originals.size && graphNodes(raw).some((n) => originals.has(n))) {
    throw new Error("the returned graph reuses nodes from the input; a clone needs new Node objects");
  }
  return matches(problem.compare ?? "exact", test.expected, row.got, clone(test.args) as unknown[], (problem.validator as string) ?? "");
};

const judgeDesign: Body = (cls, test, problem, _kinds, row) => {
  const calls = clone(test.args) as { ops: string[]; args: unknown[][] };
  const got: unknown[] = (row.got = []); // filled as calls succeed, so a failing row shows what came before
  let instance: Record<string, unknown> = {};
  const count = Math.min(calls.ops.length, calls.args.length);
  for (let n = 1; n <= count; n++) {
    const [op, args] = [calls.ops[n - 1], calls.args[n - 1]];
    const label = `Error in call ${n} (${op})`;
    if (n === 1) {
      instance = step(label, () => new (cls as unknown as Ctor)(...args));
      got.push(null);
    } else {
      got.push(
        plain(
          step(label, () => {
            const method = instance[op];
            if (typeof method !== "function") throw new TypeError(`${cls.name} has no method ${op}`);
            return (method as Fn).apply(instance, args);
          }),
        ),
      );
    }
  }
  const expected = test.expected as unknown[];
  const compare = problem.compare ?? "exact";
  return got.length === expected.length && expected.every((e, i) => matches(compare, e, got[i]));
};

const CODEC_PAIRS = [
  ["serialize", "deserialize"],
  ["encode", "decode"],
] as const;

const judgeRoundtrip: Body = (cls, test, problem, _kinds, row) => {
  const signature = problem.signature ?? "";
  const [forward, backward] = CODEC_PAIRS.find(([f]) => signature.includes(`def ${f}(`)) ?? CODEC_PAIRS[0];
  const convert = adapter(adaptersOf(problem).input);
  let value = clone((test.args as unknown[])[0]);
  if (convert) value = convert[0](value);
  const Codec = cls as unknown as Ctor;
  // A fresh instance per direction, like the classic judge: the string must carry everything.
  const call = (method: string, arg: unknown) => {
    const codec = new Codec();
    return (codec[method] as Fn).call(codec, arg);
  };
  const text = step(`Error in ${forward}`, () => call(forward, value));
  if (typeof text !== "string") {
    row.got = plain(text);
    throw new TypeError(`${forward} must return a string, got ${typeName(text)}`);
  }
  const result = step(`Error in ${backward}`, () => call(backward, text));
  row.got = plain(convert ? convert[1](result) : result);
  return matches(problem.compare ?? "exact", test.expected, row.got);
};

const BODIES: Record<string, Body> = { function: judgeFunction, design: judgeDesign, roundtrip: judgeRoundtrip };

/** Run `code` against `problem` and return one row per test. Code that can't load (syntax
 * error, throw at load, missing function or class) returns a single row with index -1.
 *
 * kind "function" calls functionName(...args) (checkArg: judge that argument after the call);
 * "design" replays {ops, args} on the class functionName; "roundtrip" checks that
 * deserialize(serialize(x)) (or decode(encode(x))) gives x back. */
export function run(code: string, problem: PublicProblem, onlyVisible: boolean): TestResult[] {
  const name = problem.functionName;
  const tests = onlyVisible ? problem.tests.slice(0, problem.visibleTestCount ?? problem.tests.length) : problem.tests;
  const names = [...new Set([name, camel(name), "Solution"])];
  const exports = names.map((n) => `${JSON.stringify(n)}: typeof ${n} === "undefined" ? undefined : ${n}`).join(", ");

  let stdout = "";
  const write = (...args: unknown[]) => {
    if (stdout.length >= STDOUT_CAP) return;
    stdout += args.map((a) => (typeof a === "string" ? a : show(a))).join(" ") + "\n";
  };
  const console = { log: write, info: write, warn: write, error: write, debug: write };

  let loader: Fn;
  try {
    loader = compile(`${code}\n;return { ${exports} };`);
  } catch (error) {
    return [blank(-1, describe(error, error instanceof SyntaxError ? syntaxLine(code) : stackLine(error)))];
  }
  let namespace: Record<string, unknown>;
  try {
    namespace = Object(loader(ListNode, TreeNode, Node, console)) as Record<string, unknown>;
  } catch (error) {
    return [blank(-1, describe(error), stdout.slice(0, STDOUT_CAP))];
  }
  const kind = problem.kind ?? "function";
  const fn = find(namespace, name);
  if (!fn) {
    const also = camel(name) !== name ? ` (or ${camel(name)})` : "";
    return [blank(-1, `Couldn't find a ${kind === "function" ? "function" : "class"} named ${name}${also}`)];
  }
  const kinds = paramNames(problem.signature ?? "").map((p) => adaptersOf(problem)[p]);
  const body = BODIES[kind] ?? judgeFunction;
  return tests.map((test, index) => {
    const row = blank(index);
    row.expected = test.expected;
    stdout = "";
    const start = performance.now();
    try {
      row.passed = Boolean(body(fn, test, problem, kinds, row));
    } catch (error) {
      row.error = describe(error);
    }
    row.ms = Math.round((performance.now() - start) * 1000) / 1000;
    row.stdout = stdout.slice(0, STDOUT_CAP);
    return row;
  });
}

function show(value: unknown): string {
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value); // cycles, BigInt
  }
}
