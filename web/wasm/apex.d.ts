/* tslint:disable */
/* eslint-disable */
export function build_version(): string;
export function track_data_hash(): string;
export class Simulation {
  free(): void;
  [Symbol.dispose](): void;
  state_json(): string;
  constructor(track_index: number, era: number, team: number, wet: boolean, assists: boolean);
  step(throttle: number, brake: number, steer: number, dt: number): void;
  reset(): void;
  recover(): void;
  spec_json(): string;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly __wbg_simulation_free: (a: number, b: number) => void;
  readonly build_version: () => [number, number];
  readonly simulation_new: (a: number, b: number, c: number, d: number, e: number) => number;
  readonly simulation_recover: (a: number) => void;
  readonly simulation_reset: (a: number) => void;
  readonly simulation_spec_json: (a: number) => [number, number];
  readonly simulation_state_json: (a: number) => [number, number];
  readonly simulation_step: (a: number, b: number, c: number, d: number, e: number) => void;
  readonly track_data_hash: () => [number, number];
  readonly __wbindgen_externrefs: WebAssembly.Table;
  readonly __wbindgen_free: (a: number, b: number, c: number) => void;
  readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;
/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
*
* @returns {InitOutput}
*/
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
*
* @returns {Promise<InitOutput>}
*/
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
