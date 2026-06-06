import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '../../api/client';

export default function LoginScreen({ onLoginSuccess }: { onLoginSuccess: (user: any) => void }) {
  const [uniqueId, setUniqueId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleLogin = async () => {
    setLoading(true);
    setGeneralError('');
    setErrors({});

    // Client-side validations
    const validationErrors: Record<string, string> = {};
    if (!uniqueId.trim()) {
      validationErrors.uniqueId = 'ID is required';
    }
    
    if (!password.trim()) {
      validationErrors.password = 'Password (DOB) is required';
    } else {
      // Validate DD-MM-YYYY format
      const dobPattern = /^\d{2}-\d{2}-\d{4}$/;
      if (!dobPattern.test(password)) {
        validationErrors.password = 'DOB must be in DD-MM-YYYY format';
      }
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setLoading(false);
      return;
    }

    try {
      const response = await apiClient.post('/auth/login', {
        uniqueId: uniqueId.trim(),
        password: password.trim(),
      });

      const { success, data } = response.data;
      if (success && data) {
        const { token, user } = data;

        // Verify role is correct (Student or Faculty)
        if (user.role !== 'student' && user.role !== 'faculty') {
          setGeneralError('Access Denied: Invalid role for this portal.');
          setLoading(false);
          return;
        }

        await AsyncStorage.setItem('token', token);
        await AsyncStorage.setItem('user', JSON.stringify(user));
        
        onLoginSuccess(user);
      }
    } catch (err: any) {
      if (err.response?.data) {
        const { message, errors: fieldErrors } = err.response.data;
        setGeneralError(message || 'Authentication failed');
        if (fieldErrors && Array.isArray(fieldErrors)) {
          const mappedErrors: Record<string, string> = {};
          fieldErrors.forEach((fe: any) => {
            if (fe.field) mappedErrors[fe.field] = fe.message;
          });
          setErrors(mappedErrors);
        }
      } else {
        setGeneralError('Unable to connect to the server. Please check your connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.backgroundGlow} />
        
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>LMS Portal</Text>
            <Text style={styles.subtitle}>Student & Faculty Sign In</Text>
          </View>

          {generalError ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{generalError}</Text>
            </View>
          ) : null}

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Unique ID</Text>
              <TextInput
                style={[styles.input, errors.uniqueId ? styles.inputError : null]}
                placeholder="e.g. CS2024001 or TCS001"
                placeholderTextColor="#6b7280"
                value={uniqueId}
                onChangeText={setUniqueId}
                autoCapitalize="characters"
                editable={!loading}
              />
              {errors.uniqueId ? <Text style={styles.errorText}>{errors.uniqueId}</Text> : null}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password (Date of Birth)</Text>
              <TextInput
                style={[styles.input, errors.password ? styles.inputError : null]}
                placeholder="DD-MM-YYYY"
                placeholderTextColor="#6b7280"
                value={password}
                onChangeText={setPassword}
                editable={!loading}
              />
              {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
            </View>

            <TouchableOpacity
              style={styles.button}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.buttonText}>Sign In</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090b',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  backgroundGlow: {
    position: 'absolute',
    top: 50,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 6,
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  errorBannerText: {
    color: '#f87171',
    fontSize: 13,
    textAlign: 'center',
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#e5e7eb',
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#ffffff',
    fontSize: 15,
  },
  inputError: {
    borderColor: '#f87171',
  },
  errorText: {
    color: '#f87171',
    fontSize: 12,
    marginTop: 2,
  },
  button: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
