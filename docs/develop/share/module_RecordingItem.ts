import { RecordingData } from "./module_RecordingApis";

/**
 * Context (list) where the record item is used
 */
export type RecordItemContext = "public" | "mine";

/**
 * Record Item component for displaying individual recordings
 *
 * Supports different contexts with varying functionality:
 * - public: Public record listings (view-only)
 * - mine: User's own records (with edit/delete)
 */
export declare function RecordingItem(
  props: {
    record: RecordingData;
    context?: RecordItemContext;
  },
  emits: {
    removed: () => void;
  }
);
