import React, { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { MessageSquare, Send, Smile, Paperclip, CheckCheck, Loader2 } from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../utils/api';

const ChatWorkspace = () => {
  const { user, token } = useSelector((state) => state.auth);
  const [searchParams] = useSearchParams();
  
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [typingStatus, setTypingStatus] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [onlineStatus, setOnlineStatus] = useState({});

  const socketRef = useRef(null);
  const messageEndRef = useRef(null);

  // Initialize Socket.IO connection
  useEffect(() => {
    socketRef.current = io(API_URL);

    // Register session
    socketRef.current.emit('register', user?._id);

    // Socket events
    socketRef.current.on('new_message', (message) => {
      if (activeChat && message.chat.toString() === activeChat._id.toString()) {
        setMessages((prev) => [...prev, message]);
      }
      // Refresh chat summaries
      fetchChats();
    });

    socketRef.current.on('typing', ({ chatId, userId }) => {
      if (activeChat && chatId === activeChat._id && userId !== user._id) {
        setOtherUserTyping(true);
      }
    });

    socketRef.current.on('stop_typing', ({ chatId, userId }) => {
      if (activeChat && chatId === activeChat._id && userId !== user._id) {
        setOtherUserTyping(false);
      }
    });

    socketRef.current.on('user_status', ({ userId, status }) => {
      setOnlineStatus((prev) => ({
        ...prev,
        [userId]: status === 'online'
      }));
    });

    socketRef.current.on('chat_notification', () => {
      fetchChats();
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, [activeChat, user]);

  const fetchChats = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/chats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setChats(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (token) {
      fetchChats();
    }
  }, [token]);

  const openedFromNotifRef = useRef(false);

  useEffect(() => {
    const openChatFromNotification = async () => {
      if (openedFromNotifRef.current || !token) return;
      const partnerId = searchParams.get('partnerId');
      const chatId = searchParams.get('chatId');
      if (!partnerId && !chatId) return;

      openedFromNotifRef.current = true;

      if (chatId) {
        try {
          const listRes = await axios.get(`${API_URL}/api/chats`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const existing = listRes.data.find((c) => c._id === chatId);
          if (existing) {
            setChats(listRes.data);
            setActiveChat(existing);
            return;
          }
        } catch (err) {
          console.error(err);
        }
      }

      if (partnerId) {
        try {
          const res = await axios.post(
            `${API_URL}/api/chats`,
            { recipientId: partnerId },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          setActiveChat(res.data);
          await fetchChats();
        } catch (err) {
          console.error('Failed to open chat from notification', err);
        }
      }
    };

    openChatFromNotification();
  }, [searchParams, token]);

  // Fetch messages when chat room switches
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/chats/${activeChat._id}/messages`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMessages(res.data);
        
        // Let sockets know we joined this room
        socketRef.current.emit('join_chat', activeChat._id);
        setOtherUserTyping(false);
      } catch (err) {
        console.error(err);
      }
    };

    if (activeChat) {
      fetchMessages();
    }
  }, [activeChat, token]);

  // Auto scroll
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    try {
      const res = await axios.post(
        `${API_URL}/api/chats/${activeChat._id}/messages`,
        { text: inputText },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Instantly push to UI
      setMessages((prev) => [...prev, res.data]);
      setInputText('');

      // Stop typing
      socketRef.current.emit('stop_typing', { chatId: activeChat._id, userId: user._id });
      setTypingStatus(false);

      // Relay via Socket IO to recipients
      socketRef.current.emit('send_message', res.data);
      fetchChats();
    } catch (err) {
      console.error(err);
    }
  };

  const handleTyping = (e) => {
    setInputText(e.target.value);
    
    if (!typingStatus && activeChat) {
      setTypingStatus(true);
      socketRef.current.emit('typing', { chatId: activeChat._id, userId: user._id });
    }

    // Reset typing status after delay of inactivity
    const timeout = setTimeout(() => {
      if (typingStatus && activeChat) {
        socketRef.current.emit('stop_typing', { chatId: activeChat._id, userId: user._id });
        setTypingStatus(false);
      }
    }, 3000);

    return () => clearTimeout(timeout);
  };

  const addReaction = async (messageId, emoji) => {
    try {
      const res = await axios.post(
        `${API_URL}/api/chats/message/${messageId}/reaction`,
        { emoji },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Update specific message in state
      setMessages((prev) => prev.map((m) => m._id === messageId ? res.data : m));
    } catch (err) {
      console.error(err);
    }
  };

  const getRecipientUser = (chat) => {
    return chat.participants.find(p => p._id !== user._id);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 h-[80vh] flex gap-6">
      
      {/* Sidebar chats list */}
      <div className="w-80 bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-lg flex flex-col overflow-hidden">
        <div className="p-4 border-b">
          <h3 className="font-bold text-sm text-slate-500 uppercase tracking-widest">Conversations</h3>
        </div>

        <div className="flex-grow overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
          {chats.length > 0 ? (
            chats.map((chat) => {
              const recipient = getRecipientUser(chat);
              const isActive = activeChat?._id === chat._id;
              const isOnline = onlineStatus[recipient?._id] || false;

              return (
                <div
                  key={chat._id}
                  onClick={() => setActiveChat(chat)}
                  className={`p-4 cursor-pointer transition-all flex gap-3 items-center ${
                    isActive 
                      ? 'bg-primary-50/50 dark:bg-primary-950/20 border-l-4 border-primary-500' 
                      : 'hover:bg-slate-50 dark:hover:bg-dark-800/40'
                  }`}
                >
                  <div className="relative">
                    {recipient?.profileImage ? (
                      <img src={recipient.profileImage} alt={recipient.fullName} className="w-10 h-10 rounded-full" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300">
                        {recipient?.fullName.charAt(0)}
                      </div>
                    )}
                    <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-dark-900 ${
                      isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                    }`} />
                  </div>

                  <div className="flex-grow min-w-0">
                    <p className="font-bold text-xs truncate">{recipient?.fullName}</p>
                    <p className="text-[10px] text-slate-400 truncate">{chat.lastMessage?.text || 'Start conversation...'}</p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-12 text-slate-400 text-xs">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p>No active conversations.</p>
            </div>
          )}
        </div>
      </div>

      {/* Main chat window container */}
      <div className="flex-grow bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-lg flex flex-col overflow-hidden">
        {activeChat ? (
          <>
            {/* Header info */}
            <div className="p-4 border-b flex justify-between items-center bg-slate-50 dark:bg-dark-800/40">
              <div>
                <p className="font-bold text-sm">{getRecipientUser(activeChat)?.fullName}</p>
                <p className="text-[10px] text-emerald-500 font-semibold">{otherUserTyping ? 'typing...' : 'active now'}</p>
              </div>
            </div>

            {/* Chat message list */}
            <div className="flex-grow overflow-y-auto p-6 space-y-4 bg-slate-50/50 dark:bg-dark-950/20">
              {messages.map((msg) => {
                const isMine = msg.sender?._id === user._id || msg.sender === user._id;

                return (
                  <div key={msg._id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                    <div className="space-y-1 max-w-sm">
                      <div className={`p-3 rounded-2xl relative group ${
                        isMine 
                          ? 'bg-primary-600 text-white rounded-tr-none' 
                          : 'bg-white dark:bg-dark-800 border dark:border-dark-700 rounded-tl-none'
                      }`}>
                        <p className="text-xs">{msg.text}</p>
                        
                        {/* Read Receipts */}
                        {isMine && (
                          <div className="flex justify-end mt-1 text-[8px] text-primary-200">
                            <CheckCheck className="w-3 h-3" />
                          </div>
                        )}

                        {/* Reaction bar popover */}
                        <div className="absolute hidden group-hover:flex -top-8 right-0 bg-white dark:bg-dark-800 shadow-md border rounded-full px-2 py-0.5 gap-1.5 z-10">
                          {['❤️', '👍', '🙏'].map(e => (
                            <span 
                              key={e} 
                              onClick={() => addReaction(msg._id, e)} 
                              className="cursor-pointer hover:scale-125 transition-transform text-xs"
                            >
                              {e}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Displayed message reactions */}
                      {msg.reactions?.length > 0 && (
                        <div className="flex gap-1">
                          {msg.reactions.map((r, i) => (
                            <span key={i} className="px-1.5 py-0.5 bg-slate-100 dark:bg-dark-800 border rounded-full text-[9px]">
                              {r.emoji}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messageEndRef} />
            </div>

            {/* Typing input selector */}
            <form onSubmit={handleSendMessage} className="p-4 border-t flex gap-3 items-center">
              <input
                type="text"
                value={inputText}
                onChange={handleTyping}
                placeholder="Type your message..."
                className="flex-grow p-2.5 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-1 focus:ring-primary-500"
              />
              <button 
                type="submit" 
                className="p-2.5 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl shadow-md transition-all"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-grow flex flex-col items-center justify-center text-slate-400 gap-2">
            <MessageSquare className="w-16 h-16 text-slate-300 animate-pulse" />
            <p className="text-sm font-semibold">Select a conversation to begin real-time coordinates.</p>
          </div>
        )}
      </div>

    </div>
  );
};

export default ChatWorkspace;
