import React, { useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform 
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons'; 
import Toast from 'react-native-toast-message';

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');

const handleReset = async () => {
    if (!email) {
      Toast.show({
        type: 'error',
        text1: 'Email Required',
        text2: 'Please enter your email to reset your password.',
      });
      return;
    }

    try {
      const res = await fetch('https://aura-ai-backend-2oy5.onrender.com/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase() })
      });

      const data = await res.json();

      if (res.ok) {
        Toast.show({
          type: 'success',
          text1: 'Reset Link Sent',
          text2: 'Check your inbox for further instructions.',
        });
        setTimeout(() => {
          navigation.navigate('Login');
        }, 2000);
      } else {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: data.message || 'Failed to send reset link.',
        });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Network Error',
        text2: 'Could not connect to the server.',
      });
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.content}>
        
        {/* Back Button & Header */}
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#9ba8ff" />
        </TouchableOpacity>

        <View style={styles.header}>
          <MaterialIcons name="lock-reset" size={48} color="#9ba8ff" style={styles.headerIcon} />
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>Enter your email to receive a recovery link.</Text>
        </View>

        {/* Input Form */}
        <View style={styles.form}>
          <View style={styles.inputWrapper}>
            <MaterialIcons name="mail-outline" size={22} color="#ababab" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email Address"
              placeholderTextColor="#ababab"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <TouchableOpacity style={styles.button} onPress={handleReset}>
            <Text style={styles.buttonText}>Send Reset Link</Text>
            <MaterialIcons name="send" size={20} color="#000000" />
          </TouchableOpacity>
        </View>

      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000', justifyContent: 'center' },
  content: { paddingHorizontal: 24, width: '100%', maxWidth: 400, alignSelf: 'center', zIndex: 10 },
  backButton: { position: 'absolute', top: -60, left: 24, padding: 8, zIndex: 20 },
  header: { alignItems: 'center', marginBottom: 48 },
  headerIcon: { marginBottom: 12 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#9ba8ff', marginBottom: 12 },
  subtitle: { fontSize: 16, color: '#ababab', textAlign: 'center' },
  form: { width: '100%' },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(31, 31, 31, 0.6)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(72, 72, 72, 0.2)', marginBottom: 24, height: 56 },
  inputIcon: { paddingLeft: 16, paddingRight: 12 },
  input: { flex: 1, color: '#ffffff', fontSize: 16, height: '100%' },
  button: { backgroundColor: '#9ba8ff', borderRadius: 50, flexDirection: 'row', height: 56, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#000000', fontSize: 18, fontWeight: 'bold', marginRight: 8 },
});