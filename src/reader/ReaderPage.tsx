import { memo } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useRecyclingState } from '@shopify/flash-list';
import type { Page } from '../api/types';
import { RetryButton } from '../components/StateViews';
import { colors } from '../theme';

// The payload gives every page's resolution, so the slot is sized before any
// bytes arrive and nothing shifts when the image lands.
export const ReaderPage = memo(function ({
  page,
  width,
}: {
  page: Page;
  width: number;
}) {
  // FlashList reuses this component for other pages; plain state would carry
  // one page's failure over to the next page drawn in the same cell.
  const [failed, setFailed] = useRecyclingState(false, [page.pageUrl]);
  const [attempt, setAttempt] = useRecyclingState(0, [page.pageUrl]);
  const [pageWidth, pageHeight] = page.resolution;
  const height = Math.round((width * pageHeight) / pageWidth);

  if (failed) {
    return (
      <View style={[styles.page, styles.failed, { width, height }]}>
        <Text style={styles.failedText}>
          Page {page.pageNum} could not be loaded.
        </Text>
        <RetryButton
          onPress={() => {
            setFailed(false);
            setAttempt(n => n + 1);
          }}
        />
      </View>
    );
  }

  return (
    <Image
      // Remount to force a fresh request on retry.
      key={attempt}
      source={{ uri: page.pageUrl }}
      accessibilityLabel={page.altText}
      onError={() => setFailed(true)}
      style={[styles.page, { width, height }]}
    />
  );
});

const styles = StyleSheet.create({
  page: {
    backgroundColor: colors.surface,
  },
  failed: {
    alignItems: 'center',
    // Tall pages would centre the message off-screen.
    justifyContent: 'flex-start',
    paddingTop: 48,
  },
  failedText: {
    color: colors.textMuted,
    fontSize: 14,
  },
});
