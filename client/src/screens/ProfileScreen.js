import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, TextInput, Image, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import Toast from 'react-native-toast-message';

export default function ProfileScreen({ navigation }) {
  const [userData, setUserData] = useState({ id: null, username: '', email: '', profile_picture: null });
  const [isEditing, setIsEditing] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const storedUser = await AsyncStorage.getItem('user_data');
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          setUserData(parsed);
          setNewUsername(parsed.username);
        }
      } catch (error) {
        console.error("Error fetching user", error);
      }
    };
    fetchUser();
  }, []);

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('user_data');
      navigation.replace('Login');
    } catch (error) {
      console.error("Error logging out", error);
    }
  };

  // 1. Pick an Image from Device
  const pickImage = async () => {
    if (!isEditing) return; // Only allow picking when in edit mode

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.3, // Compress it so it fits nicely in the database
      base64: true, // Crucial: This turns the image into a text string
    });

    if (!result.canceled) {
      const base64Img = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setUserData({ ...userData, profile_picture: base64Img });
    }
  };

  // 2. Save Changes to Backend
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('https://aura-ai-backend-2oy5.onrender.com/api/auth/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userData.id,
          username: newUsername,
          profilePicture: userData.profile_picture
        })
      });

      if (response.ok) {
        const data = await response.json();
        // Update the digital backpack so the whole app knows!
        await AsyncStorage.setItem('user_data', JSON.stringify(data.user));
        setUserData(data.user);
        setIsEditing(false);
        Toast.show({ type: 'success', text1: 'Profile Updated!' });
      }
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Update failed' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={28} color="#9ba8ff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        
        {/* Edit / Save Button */}
        <TouchableOpacity onPress={() => isEditing ? handleSave() : setIsEditing(true)}>
          {isSaving ? (
            <ActivityIndicator size="small" color="#9ba8ff" />
          ) : (
            <MaterialIcons name={isEditing ? "check" : "edit"} size={24} color={isEditing ? "#00e676" : "#9ba8ff"} />
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.profileSection}>
        {/* Profile Picture */}
        <TouchableOpacity onPress={pickImage} disabled={!isEditing}>
          <View style={[styles.imageContainer, isEditing && styles.editingBorder]}>
            {userData.profile_picture ? (
              <Image source={{ uri: userData.profile_picture }} style={styles.profileImage} />
            ) : (
              <MaterialIcons name="person" size={60} color="#9ba8ff" />
            )}
            
            {/* Show a tiny camera icon if editing */}
            {isEditing && (
              <View style={styles.cameraIconBadge}>
                <MaterialIcons name="camera-alt" size={16} color="#000" />
              </View>
            )}
          </View>
        </TouchableOpacity>
        
        {/* Username Editing */}
        {isEditing ? (
          <TextInput
            style={styles.nameInput}
            value={newUsername}
            onChangeText={setNewUsername}
            autoFocus
          />
        ) : (
          <Text style={styles.userName}>{userData.username}</Text>
        )}
        
        <Text style={styles.userEmail}>{userData.email}</Text>
      </View>

      <View style={styles.menuList}>
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.openDrawer()}>
          <MaterialIcons name="history" size={24} color="#ababab" />
          <Text style={styles.menuItemText}>Chat History</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('ForgotPassword')}>
          <MaterialIcons name="lock-reset" size={24} color="#ababab" />
          <Text style={styles.menuItemText}>Change Password</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0 }]} onPress={handleLogout}>
          <MaterialIcons name="logout" size={24} color="#ff6e84" />
          <Text style={[styles.menuItemText, { color: '#ff6e84' }]}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, alignItems: 'center' },
  headerTitle: { color: '#ffffff', fontSize: 20, fontWeight: 'bold' },
  profileSection: { alignItems: 'center', marginVertical: 30 },
  
  imageContainer: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#1f1f1f', justifyContent: 'center', alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: '#9ba8ff' },
  profileImage: { width: 100, height: 100, borderRadius: 50 },
  editingBorder: { borderStyle: 'dashed', borderWidth: 2, borderColor: '#00e676' },
  cameraIconBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#00e676', width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#000' },
  
  userName: { color: '#ffffff', fontSize: 24, fontWeight: 'bold' },
  nameInput: { color: '#ffffff', fontSize: 24, fontWeight: 'bold', borderBottomWidth: 1, borderBottomColor: '#00e676', textAlign: 'center', minWidth: 150 },
  userEmail: { color: '#ababab', fontSize: 14, marginTop: 4 },
  
  menuList: { backgroundColor: '#0e0e0e', marginHorizontal: 20, borderRadius: 20, padding: 8 },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#1f1f1f' },
  menuItemText: { color: '#ffffff', fontSize: 16, marginLeft: 16 }
});