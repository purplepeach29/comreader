import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ApiError } from '../api/client';
import { colors } from '../theme';

function describe(error: unknown) {
  if (error instanceof ApiError) {
    if (error.code === 'NETWORK') {
      return 'Could not reach the server. Check your connection.';
    }
    if (error.code === 'NOT_FOUND') {
      return 'This is no longer available.';
    }
  }
  return 'Something went wrong.';
}

export function LoadingView() {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.accent} size="large" />
    </View>
  );
}

export function ErrorView({
  error,
  onRetry,
}: {
  error: unknown;
  onRetry: () => void;
}) {
  return (
    <View style={styles.center}>
      <Text style={styles.message}>{describe(error)}</Text>
      <RetryButton onPress={onRetry} />
    </View>
  );
}

export function EmptyView({ message }: { message: string }) {
  return (
    <View style={styles.center}>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

export function RetryButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Text style={styles.buttonLabel}>Try again</Text>
    </Pressable>
  );
}

export function ListFooter({
  loading,
  error,
  onRetry,
}: {
  loading: boolean;
  error: unknown;
  onRetry: () => void;
}) {
  if (loading) {
    return (
      <View style={styles.footer}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }
  if (error) {
    return (
      <View style={styles.footer}>
        <Text style={styles.message}>Could not load more.</Text>
        <RetryButton onPress={onRetry} />
      </View>
    );
  }
  return <View style={styles.footerSpacer} />;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: colors.background,
  },
  message: {
    color: colors.textMuted,
    fontSize: 15,
    textAlign: 'center',
  },
  button: {
    marginTop: 14,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.surfaceRaised,
  },
  pressed: {
    opacity: 0.6,
  },
  buttonLabel: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  footerSpacer: {
    height: 24,
  },
});
