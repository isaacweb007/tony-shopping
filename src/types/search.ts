import type { Product, StoreId, TonyReport } from './product';

export type SearchAttachmentType = 'image' | 'link';

export interface SearchAttachment {
  id: string;
  type: SearchAttachmentType;
  /** dataURL for image, full URL for link. */
  value: string;
  /** Human-readable label (filename or URL). */
  label: string;
}

export interface SearchQuery {
  /** Free-text query. */
  q: string;
  /** Attachments (images/links). Phase 4 will send these to extractor APIs. */
  attachments: SearchAttachment[];
}

export type SortKey = 'tony' | 'price' | 'ship' | 'review' | 'authentic';

export type StoreFilter = StoreId | 'all';

export interface SearchResult {
  id: string;
  query: SearchQuery;
  products: Product[];
  report: TonyReport;
  /** ms since epoch when this search ran (Phase 3 history). */
  createdAt: number;
}
