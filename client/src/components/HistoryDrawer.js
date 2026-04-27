import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, TextInput, Image, DeviceEventEmitter, TouchableWithoutFeedback } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';

export default function HistoryDrawer(props) {
  const [userData, setUserData] = useState({ username: 'Aura Explorer', id: null });
  const [chatHistory, setChatHistory] = useState([]);
  const [loadingChats, setLoadingChats] = useState(true);

  const [editingChatId, setEditingChatId] = useState(null);
  const [newTitle, setNewTitle] = useState('');
  const [activeMenuId, setActiveMenuId] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const storedUserStr = await AsyncStorage.getItem('user_data');
        if (storedUserStr) {
          const localUser = JSON.parse(storedUserStr);
          let activeUser = localUser;

          const userRes = await fetch(`https://aura-ai-backend-2oy5.onrender.com/api/auth/me/${localUser.id}`);
          if (userRes.ok) {
            const freshUser = await userRes.json();
            activeUser = freshUser; 
            setUserData(freshUser);
            await AsyncStorage.setItem('user_data', JSON.stringify(freshUser));
          } else {
            setUserData(localUser);
          }

          const chatRes = await fetch(`https://aura-ai-backend-2oy5.onrender.com/api/chat/user/${activeUser.id}`);
          if (chatRes.ok) {
            const dbChats = await chatRes.json();
            const formattedChats = dbChats.map((chat, index) => ({
              id: chat.id.toString(),
              title: chat.title || `Chat ${dbChats.length - index}`,
              subtitle: 'Select to view conversation',
              isActive: false,
              isPinned: chat.is_pinned || false 
            }));
            setChatHistory(formattedChats);
          }
        }
      } catch (error) {
        console.error("History sync error", error);
      } finally {
        setLoadingChats(false);
      }
    };

    loadData();

    const syncListener = DeviceEventEmitter.addListener('chat_updated', () => {
      loadData();
    });

    const drawerListener = props.navigation.addListener('drawerOpen', () => {
      loadData();
      setActiveMenuId(null);
    });

    return () => {
      syncListener.remove();
      if (drawerListener) drawerListener();
    };
  }, [props.navigation]);

  const handleNewChat = async () => {
    try {
      const res = await fetch('https://aura-ai-backend-2oy5.onrender.com/api/chat/new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userData.id, title: `Chat ${chatHistory.length + 1}` })
      });
      
      const newChatDb = await res.json();
      const newChat = { id: newChatDb.id.toString(), title: newChatDb.title, subtitle: 'New conversation...', isActive: true, isPinned: false };

      const deactivatedOldChats = chatHistory.map(chat => ({ ...chat, isActive: false }));
      setChatHistory([newChat, ...deactivatedOldChats]);
      
      Toast.show({ type: 'success', text1: `Created ${newChatDb.title}!` });
      props.navigation.navigate('Chat', { activeChatId: newChatDb.id.toString() });
      setActiveMenuId(null);
    } catch (error) {
      console.error("Failed to create chat", error);
    }
  };

  const handleSelectChat = (selectedId) => {
    const updatedChats = chatHistory.map(chat => ({ ...chat, isActive: chat.id === selectedId }));
    setChatHistory(updatedChats);
    props.navigation.navigate('Chat', { activeChatId: selectedId });
    setActiveMenuId(null);
  };

  const handleDelete = async (chatId) => {
    setChatHistory(prev => prev.filter(c => c.id !== chatId));
    setActiveMenuId(null);
    try {
      await fetch(`https://aura-ai-backend-2oy5.onrender.com/api/chat/${chatId}`, { method: 'DELETE' });
      props.navigation.setParams({ activeChatId: null });
    } catch (err) { console.error("Failed to delete", err); }
  };

  const startRename = (chat) => {
    setEditingChatId(chat.id);
    setNewTitle(chat.title);
    setActiveMenuId(null);
  };

  const saveRename = async (chatId) => {
    if (!newTitle.trim()) { setEditingChatId(null); return; }
    
    setChatHistory(prev => prev.map(c => c.id === chatId ? { ...c, title: newTitle } : c));
    setEditingChatId(null);

    try {
      await fetch(`https://aura-ai-backend-2oy5.onrender.com/api/chat/${chatId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle })
      });
    } catch (err) { console.error("Failed to rename", err); }
  };

  const togglePin = async (chatId) => {
    const chatToPin = chatHistory.find(c => c.id === chatId);
    const newPinStatus = !chatToPin.isPinned;

    setChatHistory(prev => prev.map(c => c.id === chatId ? { ...c, isPinned: newPinStatus } : c));
    setActiveMenuId(null);

    try {
      await fetch(`https://aura-ai-backend-2oy5.onrender.com/api/chat/${chatId}/pin`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPinned: newPinStatus })
      });
    } catch (err) { console.error("Failed to pin", err); }
  };

  const sortedChats = [...chatHistory].sort((a, b) => {
    if (a.isPinned === b.isPinned) return 0;
    return a.isPinned ? -1 : 1;
  });

  return (
    <TouchableWithoutFeedback onPress={() => setActiveMenuId(null)}>
      <View style={styles.drawerContainer}>
        
        <View style={styles.header}>
          <TouchableOpacity style={styles.profileSection} onPress={() => props.navigation.navigate('Profile')}>
            <View style={styles.profileCircle}>
              {userData.profile_picture ? (
                <Image source={{ uri: userData.profile_picture }} style={{ width: 48, height: 48, borderRadius: 24 }} />
              ) : (
                <MaterialIcons name="person" size={24} color="#9ba8ff" />
              )}
            </View>
            <View>
              <Text style={styles.username}>{userData.username}</Text>
            </View>
          </TouchableOpacity>
        </View>

        <ScrollView 
          style={styles.timeline} 
          showsVerticalScrollIndicator={true}
          contentContainerStyle={{ paddingBottom: 100 }} // Prevents bottom items from getting cut off
        >
          <View style={styles.section}>
            
            {loadingChats ? (
              <ActivityIndicator size="small" color="#9ba8ff" style={{ marginTop: 20 }} />
            ) : chatHistory.length === 0 ? (
              <Text style={{ color: '#757575', textAlign: 'center', marginTop: 20 }}>No chat history yet.</Text>
            ) : (
              // 🌟 FIXED: We pass the 'index' into the map function
            sortedChats.map((chat, index) => (
                <View 
                  key={chat.id} 
                  style={{ 
                    position: 'relative', 
                    // 🌟 FIXED: Forces items higher in the list to stay on top!
                    zIndex: activeMenuId === chat.id ? 9999 : (sortedChats.length - index), 
                    elevation: activeMenuId === chat.id ? 9999 : 1 
                  }}
                >
                  
                  <View style={chat.isActive ? styles.historyCardActive : styles.historyCard}>
                    <TouchableOpacity style={styles.cardMain} onPress={() => handleSelectChat(chat.id)}>
                      <View style={chat.isActive ? styles.thumbnailBoxActive : styles.thumbnailBox}>
                         <MaterialIcons name={chat.isPinned ? "push-pin" : (chat.isActive ? "chat-bubble" : "chat-bubble-outline")} size={16} color={chat.isActive || chat.isPinned ? "#9ba8ff" : "#ababab"} />
                      </View>
                      <View style={{ flex: 1 }}>
                        {editingChatId === chat.id ? (
                          <TextInput 
                            style={styles.renameInput} 
                            value={newTitle} 
                            onChangeText={setNewTitle} 
                            onSubmitEditing={() => saveRename(chat.id)}
                            onBlur={() => saveRename(chat.id)}
                            autoFocus
                          />
                        ) : (
                          <Text style={chat.isActive ? styles.cardTitleActive : styles.cardTitle} numberOfLines={1}>
                            {chat.title}
                          </Text>
                        )}
                        <Text style={styles.cardSubtitle} numberOfLines={1}>{chat.subtitle}</Text>
                      </View>
                    </TouchableOpacity>

                    {!editingChatId && (
                      <TouchableOpacity 
                        style={styles.moreButton} 
                        onPress={() => setActiveMenuId(activeMenuId === chat.id ? null : chat.id)}
                      >
                        <MaterialIcons name="more-vert" size={20} color="#ababab" />
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* 🌟 POPOVER MENU */}
                  {activeMenuId === chat.id && (
                    <View style={styles.popoverMenu}>
                      <TouchableOpacity style={styles.popoverItem} onPress={() => togglePin(chat.id)}>
                        <MaterialIcons name="push-pin" size={16} color={chat.isPinned ? "#9ba8ff" : "#ababab"} />
                        <Text style={[styles.popoverText, { color: chat.isPinned ? '#9ba8ff' : '#ffffff' }]}>
                          {chat.isPinned ? "Unpin Chat" : "Pin Chat"}
                        </Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity style={styles.popoverItem} onPress={() => startRename(chat)}>
                        <MaterialIcons name="edit" size={16} color="#ababab" />
                        <Text style={styles.popoverText}>Rename</Text>
                      </TouchableOpacity>

                      <View style={styles.popoverDivider} />
                      
                      <TouchableOpacity style={styles.popoverItem} onPress={() => handleDelete(chat.id)}>
                        <MaterialIcons name="delete-outline" size={16} color="#ff6e84" />
                        <Text style={[styles.popoverText, { color: '#ff6e84' }]}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                </View>
              ))
            )}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.newChatBtn} onPress={handleNewChat}>
            <MaterialIcons name="add" size={24} color="#9ba8ff" />
            <Text style={styles.newChatText}>New Chat</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  drawerContainer: { flex: 1, backgroundColor: '#0e0e0e', paddingTop: 48 },
  header: { paddingHorizontal: 20, marginBottom: 24 },
  profileSection: { flexDirection: 'row', alignItems: 'center' },
  profileCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#1f1f1f', justifyContent: 'center', alignItems: 'center', marginRight: 16, borderWidth: 1, borderColor: 'rgba(155, 168, 255, 0.2)' },
  username: { color: '#9ba8ff', fontSize: 18, fontWeight: 'bold' },
  timeline: { flex: 1, paddingHorizontal: 16 },
  section: { marginBottom: 24 },
  
  historyCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#131313', borderRadius: 16, marginBottom: 8, paddingRight: 4, overflow: 'visible' },
  historyCardActive: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(155, 168, 255, 0.08)', borderRadius: 16, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(155, 168, 255, 0.2)', paddingRight: 4, overflow: 'visible' },
  
  cardMain: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 12 },
  thumbnailBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#1f1f1f', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  thumbnailBoxActive: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(155, 168, 255, 0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  
  cardTitle: { color: '#ababab', fontSize: 14, fontWeight: '600' },
  cardTitleActive: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
  cardSubtitle: { color: '#555555', fontSize: 12, marginTop: 2 },
  
  renameInput: { color: '#ffffff', fontSize: 14, fontWeight: '600', backgroundColor: '#1f1f1f', padding: 2, borderRadius: 4, borderBottomWidth: 1, borderBottomColor: '#9ba8ff' },
  
  moreButton: { padding: 8, justifyContent: 'center', alignItems: 'center' },
  
  popoverMenu: { position: 'absolute', right: 24, top: 40, backgroundColor: '#1a1a2e', borderRadius: 12, padding: 4, width: 140, zIndex: 10000, elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 8, borderWidth: 1, borderColor: 'rgba(155, 168, 255, 0.3)' },
  popoverItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8 },
  popoverText: { color: '#ffffff', fontSize: 14, marginLeft: 10, fontWeight: '500' },
  popoverDivider: { height: 1, backgroundColor: 'rgba(155, 168, 255, 0.15)', marginVertical: 2, marginHorizontal: 8 },

  footer: { padding: 20, borderTopWidth: 1, borderTopColor: 'rgba(72, 72, 72, 0.2)' },
  newChatBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#1f1f1f', paddingVertical: 14, borderRadius: 30, borderWidth: 1, borderColor: 'rgba(72, 72, 72, 0.3)' },
  newChatText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
});