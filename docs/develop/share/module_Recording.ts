// 它是一个路由页面，使用的话就是用
//  <RouterLink to="/recording/:id">Recording</RouterLink>
// 路由会自动把id作为props传给RecordingPage
export declare function RecordingPage(props: { id: string });

import { RecordingData } from "./module_RecordingApis";

/**
 * Context (list) where the record item is used
 */
export type RecordingItemContext = "public" | "mine";
/**
 * Recording Item component for displaying individual recordings
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
