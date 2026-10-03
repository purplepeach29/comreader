import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ChapterType, StorySummary } from '../api/types';

export type RootStackParamList = {
  Feed: undefined;
  Chapters: { story: StorySummary };
  Reader: {
    chapterId: string;
    chapterNum: number;
    type: ChapterType;
    storyTitle: string;
  };
};

export type ScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;
