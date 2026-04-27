import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView, Image, DeviceEventEmitter 
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import ChatBubble from '../components/ChatBubble';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';

export default function HomeScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  
  const activeChatId = route.params?.activeChatId || null;

  const [userData, setUserData] = useState(null);
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState([]);
  const [showAttachMenu, setShowAttachMenu] = useState(false);

  const scrollViewRef = useRef();
  const isStreaming = useRef(false);

  useFocusEffect(
    useCallback(() => {
      const fetchUser = async () => {
        try {
          const storedUser = await AsyncStorage.getItem('user_data');
          if (storedUser) {
            setUserData(JSON.parse(storedUser));
          } else {
            setUserData(null);
          }
        } catch (error) {
          console.error("Error loading user data", error);
        }
      };
      fetchUser();
    }, [])
  );

  useEffect(() => {
    if (activeChatId && !isStreaming.current) {
      const fetchHistory = async () => {
        try {
          const res = await fetch(`http://127.0.0.1:5000/api/chat/history/${activeChatId}`);
          if (res.ok) {
            const data = await res.json();
            const formattedMessages = data.map(msg => ({
              id: msg.id.toString(),
              // 🌟 FIXED: Forces a blank string instead of null
              text: msg.content || "*(Message failed to load)*", 
              isAi: msg.role === 'assistant'
            }));
            setMessages(formattedMessages);
          }
        } catch (error) {
          console.error("Error loading history", error);
        }
      };
      fetchHistory();
    } else if (!activeChatId) {
      setMessages([]); 
    }
  }, [activeChatId]);

  const handleNewChat = async () => {
    if (!userData) {
      Toast.show({ type: 'error', text1: 'Please log in to create a chat.' });
      return navigation.navigate('Signup');
    }
    
    try {
      const chatsRes = await fetch(`http://127.0.0.1:5000/api/chat/user/${userData.id}`);
      const chats = await chatsRes.json();
      const chatTitle = `Chat ${chats.length + 1}`;

      const res = await fetch('http://127.0.0.1:5000/api/chat/new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userData.id, title: chatTitle })
      });
      const newChatDb = await res.json();
      
      navigation.setParams({ activeChatId: newChatDb.id.toString() });
      setMessages([]);
      setShowAttachMenu(false);
      
      DeviceEventEmitter.emit('chat_updated');
      Toast.show({ type: 'success', text1: `Created ${newChatDb.title}!` });
    } catch (error) {
      console.error("Failed to create chat from header", error);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim()) return; 

    const userText = inputText.trim(); 
    let currentChatId = activeChatId;
    
    isStreaming.current = true;

    // --- 1. AUTO-CREATE CHAT IF NONE EXISTS ---
    if (!currentChatId) {
      if (!userData) {
        Toast.show({ type: 'error', text1: 'Please Log In to use AURA AI.' });
        isStreaming.current = false; 
        return navigation.navigate('Signup');
      }
      try {
        const chatsRes = await fetch(`http://127.0.0.1:5000/api/chat/user/${userData.id}`);
        const chats = await chatsRes.json();
        const chatTitle = `Chat ${chats.length + 1}`;

        const res = await fetch('http://127.0.0.1:5000/api/chat/new', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: userData.id, title: chatTitle })
        });
        const newChatDb = await res.json();
        currentChatId = newChatDb.id.toString();
        
        navigation.setParams({ activeChatId: currentChatId });
        DeviceEventEmitter.emit('chat_updated');
      } catch (e) {
        console.error("Failed to auto-create chat", e);
        isStreaming.current = false; 
        return;
      }
    }

    // --- 2. PREPARE MESSAGES ---
    const historyToSend = messages.map(msg => ({ text: msg.text, isAi: msg.isAi }));
    const newUserMsg = { id: Date.now().toString(), text: userText, isAi: false };
    
    setInputText('');
    setShowAttachMenu(false); 
    
    const aiMessageId = (Date.now() + 1).toString();
    const tempAiMsg = { id: aiMessageId, text: "", isAi: true }; // This triggers the "Thinking..." UI

    setMessages(prevMessages => [...prevMessages, newUserMsg, tempAiMsg]);

    // 🌟 NEW: THE 15-SECOND STOPWATCH
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15,000 milliseconds = 15 seconds

    // --- 3. FETCH STREAM ---
    try {
      const response = await fetch('http://127.0.0.1:5000/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userText, chatId: currentChatId, history: historyToSend }),
        signal: controller.signal // 🌟 Tell the fetch to listen to our stopwatch
      });

      // Clear the stopwatch if the server responds successfully before 15 seconds!
      clearTimeout(timeoutId);

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let done = false;

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        
        if (value) {
          const chunkText = decoder.decode(value, { stream: true });
          
          setMessages(prevMessages => {
            const updatedMessages = [...prevMessages];
            const lastMsgIndex = updatedMessages.length - 1;

            if (lastMsgIndex < 0 || !updatedMessages[lastMsgIndex]) return prevMessages;

            updatedMessages[lastMsgIndex] = {
              ...updatedMessages[lastMsgIndex],
              text: updatedMessages[lastMsgIndex].text + chunkText
            };
            return updatedMessages;
          });
        }
      }
    } catch (error) {
      // Clear the stopwatch just in case it was a different error
      clearTimeout(timeoutId);
      console.error("Streaming error:", error);
      
      // Determine if it failed because of our 15-second timeout or a generic network error
      const isTimeout = error.name === 'AbortError';

      Toast.show({ 
        type: 'error', 
        text1: 'Network at Capacity 🚦',
        text2: isTimeout ? 'Server Timeout (15s limit reached)' : 'AURA is experiencing high traffic.' 
      });

      // Update the "Thinking..." bubble with the error message so it stops spinning
      setMessages(prevMessages => {
        const updatedMessages = [...prevMessages];
        const lastMsgIndex = updatedMessages.length - 1;
        
        if (lastMsgIndex >= 0 && updatedMessages[lastMsgIndex]) {
           // 🌟 YOUR CUSTOM MESSAGE:
           updatedMessages[lastMsgIndex].text = "The server is busy or getting high traffic. Many users are sending messages, please try again after some time.";
        }
        return updatedMessages;
      });
    } finally {
      isStreaming.current = false;
    }
  };

  
  const handleKeyPress = (e) => {
    if (Platform.OS === 'web' && e.nativeEvent.key === 'Enter' && !e.nativeEvent.shiftKey) {
      e.preventDefault(); 
      handleSend();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.iconButton}>
          <MaterialIcons name="menu" size={28} color="#9ba8ff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AURA AI</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={handleNewChat} style={styles.iconButton}>
            <MaterialIcons name="add-comment" size={24} color="#9ba8ff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.profilePic} onPress={() => userData ? navigation.navigate('Profile') : navigation.navigate('Signup')}>
            {userData?.profile_picture ? (
              <Image source={{ uri: userData.profile_picture }} style={styles.profileImage} />
            ) : (
              <MaterialIcons name="person" size={20} color="#ababab" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.canvasArea}>
        {messages.length === 0 ? (
          <View style={styles.voidArea}>
            <MaterialIcons name="blur-on" size={80} color="rgba(155, 168, 255, 0.1)" style={styles.bgGlow} />
            {userData ? (
              <>
                <Text style={styles.voidTitle}>The Void Awaits.</Text>
                <Text style={styles.voidSubtitle}>Type a message below to instantly start a new conversation.</Text>
              </>
            ) : (
              <>
                <Text style={styles.voidTitle}>Welcome to AURA AI.</Text>
                <Text style={styles.voidSubtitle}>You must be logged in to access the network.</Text>
                <TouchableOpacity style={styles.loginPromptBtn} onPress={() => navigation.navigate('Signup')}>
                  <Text style={styles.loginPromptText}>Log In / Sign Up</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        ) : (
          <ScrollView 
            style={styles.chatArea}
            ref={scrollViewRef}
            onContentSizeChange={() => scrollViewRef.current.scrollToEnd({ animated: true })}
          >
            {messages.map((msg) => (
              <ChatBubble key={msg.id} text={msg.text} isAi={msg.isAi} />
            ))}
          </ScrollView>
        )}
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.inputWrapper}>
          
          {showAttachMenu && (
            <View style={styles.attachMenu}>
              {/* 🌟 NEW: Cleaned up UI with Blue/Purple Theme and Coming Soon Alerts */}
              <TouchableOpacity 
                style={styles.menuItem} 
                onPress={() => { setShowAttachMenu(false); Toast.show({ type: 'info', text1: 'Adding files coming soon!' }); }}
              >
                <MaterialIcons name="attach-file" size={20} color="#9ba8ff" />
                <Text style={styles.menuText}>Add photos & files</Text>
              </TouchableOpacity>
              
              <View style={styles.menuDivider} />
              
              <TouchableOpacity 
                style={styles.menuItem} 
                onPress={() => { setShowAttachMenu(false); Toast.show({ type: 'info', text1: 'Image Generation coming soon!' }); }}
              >
                <MaterialIcons name="image" size={20} color="#9ba8ff" />
                <Text style={styles.menuText}>Create image</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.inputContainer}>
            <TouchableOpacity style={styles.attachButton} onPress={() => setShowAttachMenu(!showAttachMenu)}>
              <MaterialIcons name={showAttachMenu ? "close" : "add"} size={26} color={showAttachMenu ? "#ff6e84" : "#ababab"} />
            </TouchableOpacity>
            
            <TextInput
              style={styles.textInput}
              placeholder="Message Aura..."
              placeholderTextColor="#757575"
              value={inputText}
              onChangeText={setInputText}
              multiline
              onKeyPress={handleKeyPress}
            />
            
            <TouchableOpacity 
              style={[styles.sendButton, { backgroundColor: inputText.trim() ? '#9ba8ff' : '#262626' }]} 
              onPress={handleSend}
              disabled={!inputText.trim()}
            >
              <MaterialIcons name="arrow-upward" size={20} color={inputText.trim() ? '#000' : '#757575'} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, height: 64, borderBottomWidth: 1, borderBottomColor: 'rgba(72, 72, 72, 0.2)' },
  iconButton: { padding: 8 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerTitle: { color: '#ffffff', fontSize: 16, fontWeight: 'bold', letterSpacing: 2 },
  profilePic: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(72, 72, 72, 0.5)', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  profileImage: { width: '100%', height: '100%' },
  canvasArea: { flex: 1 },
  voidArea: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  bgGlow: { position: 'absolute' },
  voidTitle: { fontSize: 36, fontWeight: 'bold', color: '#9ba8ff', textAlign: 'center', marginBottom: 16 },
  voidSubtitle: { fontSize: 16, color: '#ababab', textAlign: 'center', lineHeight: 24, marginBottom: 24 },
  loginPromptBtn: { backgroundColor: '#1f1f1f', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 30, borderWidth: 1, borderColor: '#9ba8ff' },
  loginPromptText: { color: '#9ba8ff', fontSize: 16, fontWeight: 'bold' },
  chatArea: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  inputWrapper: { paddingBottom: Platform.OS === 'ios' ? 0 : 16 },
  
  // 🌟 NEW: Deep Purple/Blue themed attachment menu
  attachMenu: { 
    position: 'absolute', bottom: 70, left: 20, 
    backgroundColor: '#13131c', // Deep dark blue/purple
    borderRadius: 16, padding: 8, 
    zIndex: 10, width: 220,
    borderWidth: 1, borderColor: 'rgba(155, 168, 255, 0.25)',
    shadowColor: '#9ba8ff', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 8 },
  menuText: { color: '#e0e0ff', marginLeft: 16, fontSize: 15, fontWeight: '600' },
  menuDivider: { height: 1, backgroundColor: 'rgba(155, 168, 255, 0.15)', marginVertical: 4, marginHorizontal: 12 },
  
  inputContainer: { flexDirection: 'row', alignItems: 'flex-end', backgroundColor: 'transparent', marginHorizontal: 16, borderRadius: 24, paddingHorizontal: 8, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(155, 168, 255, 0.4)' },
  attachButton: { padding: 8, marginBottom: 2 },
  textInput: { flex: 1, color: '#ffffff', fontSize: 16, maxHeight: 120, paddingHorizontal: 8, paddingTop: 12, paddingBottom: 12, outlineStyle: 'none' },
  sendButton: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: 4, marginLeft: 8 },
});