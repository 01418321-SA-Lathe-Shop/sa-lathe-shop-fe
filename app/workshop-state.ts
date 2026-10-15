import type { WorkshopState } from "./worker-domain";

export type WorkshopUpdate = { transform: (data: WorkshopState) => WorkshopState; message?: string; scope?: string; reset?: boolean };
export type WorkshopViewState = { data: WorkshopState; message: string; error: string; scope?: string; generation: number };

export function reduceWorkshop(state: WorkshopViewState, action: WorkshopUpdate): WorkshopViewState {
  try {
    const data = action.transform(state.data);
    if (data === state.data && !action.message && !action.reset) return state;
    // Silent lifecycle updates must not retain a previous action's success/error.
    return { data, message: action.message ?? "", error: "", scope: action.scope, generation: state.generation + (action.reset ? 1 : 0) };
  } catch (error) {
    return { ...state, message: "", error: error instanceof Error ? error.message : "The demo action could not be completed.", scope: action.scope };
  }
}
