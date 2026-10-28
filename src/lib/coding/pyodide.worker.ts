import harnessSource from "../../../backend/data/coding/harness.py?raw";
import type { RunnerRequest, RunnerResponse, TestResult } from "./types";

// Pinned. Version string is the same on npm and the jsDelivr /pyodide/ path; 314.x ships Python 3.14.
const PYODIDE_VERSION = "314.0.7";
const PYODIDE_BASE = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

interface PyProxy {
  toJs(options?: { dict_converter?: (entries: Iterable<[string, unknown]>) => unknown }): unknown;
  destroy(): void;
}
interface Pyodide {
  runPython(code: string): unknown;
  globals: { get(name: string): ((...args: unknown[]) => PyProxy) & PyProxy };
}
interface PyodideModule {
  loadPyodide(options: { indexURL: string }): Promise<Pyodide>;
}

let pyodide: Pyodide | null = null;
let harnessRun: ((...args: unknown[]) => PyProxy) | null = null;
// JSON in, so null arrives as None (toPy would make it JsNull, which `is not None` lets through).
let fromJson: ((text: string) => PyProxy) | null = null;

const post = (message: RunnerResponse) => self.postMessage(message);
const describe = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** Python None comes back from toJs as undefined; the contract (and JSON) wants null. */
function nullify(value: unknown): unknown {
  if (value === undefined) return null;
  if (Array.isArray(value)) return value.map(nullify);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, nullify(v)]));
  }
  return value;
}

async function load() {
  try {
    post({ type: "loading", progress: "Downloading Python" });
    const { loadPyodide } = (await import(/* @vite-ignore */ `${PYODIDE_BASE}pyodide.mjs`)) as PyodideModule;
    const py = await loadPyodide({ indexURL: PYODIDE_BASE });
    post({ type: "loading", progress: "Starting the test runner" });
    py.runPython(harnessSource);
    pyodide = py;
    harnessRun = py.globals.get("run");
    fromJson = py.runPython("import json\njson.loads") as (text: string) => PyProxy;
    post({ type: "ready" });
  } catch (e) {
    post({ type: "fatal", message: describe(e) });
  }
}

function run(request: Extract<RunnerRequest, { type: "run" }>) {
  let results: TestResult[];
  try {
    if (!pyodide || !harnessRun || !fromJson) throw new Error("Python hasn't finished loading");
    const problem = fromJson(JSON.stringify(request.problem));
    const rows = harnessRun(request.code, problem, request.onlyVisible);
    results = nullify(rows.toJs({ dict_converter: Object.fromEntries })) as TestResult[];
    rows.destroy();
    problem.destroy();
  } catch (e) {
    // the harness never raises, so this is a bridge failure; still hand the user a result row
    results = [{ index: -1, passed: false, got: null, expected: null, error: describe(e), stdout: "", ms: 0 }];
  }
  post({ type: "result", id: request.id, results });
}

self.onmessage = (event: MessageEvent<RunnerRequest>) => {
  if (event.data.type === "load") void load();
  else run(event.data);
};
