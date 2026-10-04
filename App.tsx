import { StatusBar, StyleSheet } from 'react-native';
import {
  DarkTheme,
  NavigationContainer,
  type Theme,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { queryClient } from './src/api/queries';
import type { RootStackParamList } from './src/navigation/types';
import { ChapterListScreen } from './src/screens/ChapterListScreen';
import { FeedScreen } from './src/screens/FeedScreen';
import { ReaderScreen } from './src/screens/ReaderScreen';
import { colors } from './src/theme';

const Stack = createNativeStackNavigator<RootStackParamList>();

const theme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.background,
    text: colors.text,
    border: colors.border,
    primary: colors.accent,
  },
};

function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <StatusBar barStyle="light-content" />
          <NavigationContainer theme={theme}>
            <Stack.Navigator
              screenOptions={{ headerBackButtonDisplayMode: 'minimal' }}
            >
              <Stack.Screen
                name="Feed"
                component={FeedScreen}
                options={{ title: 'Comics' }}
              />
              <Stack.Screen
                name="Chapters"
                component={ChapterListScreen}
                options={({ route }) => ({ title: route.params.story.title })}
              />
              <Stack.Screen
                name="Reader"
                component={ReaderScreen}
                options={({ route }) => ({
                  title: `Chapter ${route.params.chapterNum}`,
                })}
              />
            </Stack.Navigator>
          </NavigationContainer>
        </SafeAreaProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

export default App;
