// Preserve the original cascade: shared appearance/auth/shell rules first,
// workflow overrides last. Keep this import order stable across route chunks.
import appearanceStyles from "../appearance/appearance.module.css";
import authStyles from "../../features/auth/auth.module.css";
import workspaceStyles from "../../features/workspace/workspace.module.css";
import workflowStyles from "./workflows.module.css";

export { appearanceStyles, authStyles, workspaceStyles, workflowStyles };
