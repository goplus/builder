import { RecordingData } from "./module_RecordingApis";

/**
 * Context (list) where the record item is used
 */
export type RecordingItemContext = "public" | "mine";

/**
 * Record Item component for displaying individual recordings
 *
 * Supports different contexts with varying functionality:
 * - public: Public recording listings (view-only)
 * - mine: User's own recordings (with edit/delete)
 */
export declare function RecordingItem(
  props: {
    recording: RecordingData;
    context?: RecordingItemContext;
  },
  emits: {
    removed: () => void;
  }
);
