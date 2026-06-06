import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { ErrorBoundary } from './src/components/ErrorBoundary';

export default function App() {
  return (
    <ErrorBoundary fallbackTitle="App crashed — please restart">
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" backgroundColor="#09090b" />
        <AppNavigator />
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
