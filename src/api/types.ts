export type Paginated<T> = {
  page: T[];
  hasMore: boolean;
  continueCursor: string | null;
};

export type StorySummary = {
  storyId: string;
  thumbnailUrl: string;
  title: string;
  views: string;
  creators: string[];
  tags: string[];
  lastUpdated: string;
  chapterCount: number;
};

export type StoryDetail = StorySummary & {
  description: string;
  status: 'ONGOING' | 'HIATUS' | 'COMPLETED';
};

// A: every page in the chapter has the same resolution.
// B: constant width, varying heights.
export type ChapterType = 'A' | 'B';

export type ChapterSummary = {
  chapterId: string;
  chapterNum: number;
  thumbnailUrl: string;
  description: string;
  views: string;
  type: ChapterType;
  pageCount: number;
};

export type Page = {
  pageNum: number;
  pageUrl: string;
  altText: string;
  resolution: [width: number, height: number];
};

export type CreatorNote = {
  note: string;
  creator: string;
};

export type ChapterDetail = {
  chapterNum: number;
  chapterPages: Page[];
  creatorsNotes: CreatorNote[];
  views: string;
};
