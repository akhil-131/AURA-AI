import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons'; 
import Toast from 'react-native-toast-message';

export default function ResetPasswordScreen({ route, navigation }) {
  // 🌟 Grabs the token right out of the email URL!
  const token = route.params?.token; 
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleUpdatePassword = async () => {
    if (!token) {
      return Toast.show({ type: 'error', text1: 'Invalid Link', text2: 'No reset token found in URL.' });
    }
    if (newPassword.length < 6) {
      return Toast.show({ type: 'error', text1: 'Weak Password', text2: 'Password must be at least 6 characters.' });
    }
    if (newPassword !== confirmPassword) {
      return Toast.show({ type: 'error', text1: 'Mismatch', text2: 'Passwords do not match.' });
    }

    try {
      const res = await fetch('http://127.0.0.1:5000/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword })
      });

      const data = await res.json();

      if (res.ok) {
        Toast.show({ type: 'success', text1: 'Password Updated!', text2: 'You can now log in with your new password.' });
        setTimeout(() => navigation.navigate('Login'), 2000);
      } else {
        Toast.show({ type: 'error', text1: 'Error', text2: data.message });
      }
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Network Error', text2: 'Could not connect to the server.' });
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.content}>
        <View style={styles.header}>
          <MaterialIcons name="vpn-key" size={48} color="#9ba8ff" style={styles.headerIcon} />
          <Text style={styles.title}>Create New Password</Text>
          <Text style={styles.subtitle}>Your new password must be different from previous used passwords.</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputWrapper}>
            <MaterialIcons name="lock-outline" size={22} color="#ababab" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="New Password"
              placeholderTextColor="#ababab"
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
            />
          </View>

          <View style={styles.inputWrapper}>
            <MaterialIcons name="lock" size={22} color="#ababab" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Confirm Password"
              placeholderTextColor="#ababab"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
          </View>

          <TouchableOpacity style={styles.button} onPress={handleUpdatePassword}>
            <Text style={styles.buttonText}>Reset Password</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000', justifyContent: 'center' },
  content: { paddingHorizontal: 24, width: '100%', maxWidth: 400, alignSelf: 'center' },
  header: { alignItems: 'center', marginBottom: 48 },
  headerIcon: { marginBottom: 12 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#9ba8ff', marginBottom: 12, textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#ababab', textAlign: 'center' },
  form: { width: '100%' },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(31, 31, 31, 0.6)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(72, 72, 72, 0.2)', marginBottom: 16, height: 56 },
  inputIcon: { paddingLeft: 16, paddingRight: 12 },
  input: { flex: 1, color: '#ffffff', fontSize: 16, height: '100%', outlineStyle: 'none' },
  button: { backgroundColor: '#9ba8ff', borderRadius: 50, height: 56, justifyContent: 'center', alignItems: 'center', marginTop: 16 },
  buttonText: { color: '#000000', fontSize: 18, fontWeight: 'bold' },
});