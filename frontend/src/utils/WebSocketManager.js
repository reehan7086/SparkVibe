// WebSocketManager.js - Real-time connection handler
class WebSocketManager {
    constructor(userId, callbacks = {}) {
      this.userId = userId;
      this.callbacks = callbacks;
      this.ws = null;
      this.reconnectAttempts = 0;
      this.maxReconnectAttempts = 5;
      this.reconnectDelay = 1000; // Start with 1 second
      this.pingInterval = null;
      this.isConnecting = false;
      this.isConnected = false;
      
      // Initialize connection
      this.connect();
    }
  
    connect() {
      if (this.isConnecting || this.isConnected) {
        return;
      }
  
      this.isConnecting = true;
      
      try {
        // Determine WebSocket URL
        const wsUrl = this.getWebSocketUrl();
        console.log('🔌 Connecting to WebSocket:', wsUrl);
        
        this.ws = new WebSocket(`${wsUrl}?userId=${encodeURIComponent(this.userId)}`);
        
        this.ws.onopen = this.handleOpen.bind(this);
        this.ws.onmessage = this.handleMessage.bind(this);
        this.ws.onclose = this.handleClose.bind(this);
        this.ws.onerror = this.handleError.bind(this);
        
      } catch (error) {
        console.error('❌ WebSocket connection failed:', error);
        this.isConnecting = false;
        this.scheduleReconnect();
      }
    }
  
    getWebSocketUrl() {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const hostname = window.location.hostname;
      
      // Production
      if (hostname.includes('sparkvibe.app')) {
        return 'wss://backend-sv-3n4v6.ondigitalocean.app/ws';
      }
      
      // Development environments
      if (hostname.includes('app.github.dev') || hostname.includes('gitpod.io')) {
        const baseUrl = hostname.replace('-5173', '-8080');
        return `wss://${baseUrl}/ws`;
      }
      
      // Local development
      return 'ws://localhost:8080/ws';
    }
  
    handleOpen() {
      console.log('✅ WebSocket connected');
      this.isConnecting = false;
      this.isConnected = true;
      this.reconnectAttempts = 0; // Reset attempts on successful connection
      this.reconnectDelay = 1000;
      
      // Start ping interval to keep connection alive
      this.startPing();
      
      // Notify callbacks
      if (this.callbacks.onConnect) {
        this.callbacks.onConnect();
      }
    }
  
    handleMessage(event) {
      try {
        const data = JSON.parse(event.data);
        console.log('📨 WebSocket message received:', data);
        
        switch (data.type) {
          case 'achievement':
            if (this.callbacks.onAchievement) {
              this.callbacks.onAchievement(data.data);
            }
            break;
          
          case 'leaderboard_update':
            if (this.callbacks.onLeaderboardUpdate) {
              this.callbacks.onLeaderboardUpdate(data.data);
            }
            break;
          
          case 'notification':
            if (this.callbacks.onNotification) {
              this.callbacks.onNotification(data.data);
            }
            break;
          
          case 'friend_update':
            if (this.callbacks.onFriendUpdate) {
              this.callbacks.onFriendUpdate(data.data);
            }
            break;
          
          case 'challenge_update':
            if (this.callbacks.onChallengeUpdate) {
              this.callbacks.onChallengeUpdate(data.data);
            }
            break;
          
          case 'pong':
            console.log('🏓 Received pong, connection alive');
            break;
          
          default:
            console.log('Unknown WebSocket message type:', data.type);
        }
      } catch (error) {
        console.error('❌ Failed to parse WebSocket message:', error);
      }
    }
  
    handleClose(event) {
      console.log('🔌 WebSocket disconnected:', event.code, event.reason || 'No reason provided');
      this.isConnected = false;
      this.isConnecting = false; // NEW: Ensure isConnecting is reset
      this.stopPing();
      
      // Notify callbacks
      if (this.callbacks.onDisconnect) {
        this.callbacks.onDisconnect(event);
      }
      
      // Only attempt reconnect if it wasn't a clean close
      if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.scheduleReconnect();
      } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.warn('❌ Max reconnect attempts reached, switching to fallback mode');
        if (this.callbacks.onMaxReconnect) {
          this.callbacks.onMaxReconnect();
        }
      }
    }
  
    handleError(error) {
      console.error('❌ WebSocket error:', error);
      this.isConnecting = false;
      
      if (this.callbacks.onError) {
        this.callbacks.onError(error);
      }
    }
  
    scheduleReconnect() {
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.log('❌ Max reconnection attempts reached');
        return;
      }
  
      this.reconnectAttempts++;
      const baseDelay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      const jitter = Math.random() * 100; // NEW: Add jitter to prevent synchronized reconnects
      const delay = baseDelay + jitter;
      
      console.log(`🔄 Scheduling reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${Math.round(delay)}ms`);
      
      setTimeout(() => {
        if (!this.isConnected && !this.isConnecting) {
          this.connect();
        }
      }, delay);
    }
  
    startPing() {
        this.pingInterval = setInterval(() => {
          if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
            console.log('🏓 Sending ping');
            this.send({ type: 'ping' });
          }
        }, 60000); // Increased to 60 seconds
      }
  
    stopPing() {
      if (this.pingInterval) {
        clearInterval(this.pingInterval);
        this.pingInterval = null;
      }
    }
  
    send(data) {
      if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
        try {
          this.ws.send(JSON.stringify(data));
          return true;
        } catch (error) {
          console.error('❌ Failed to send WebSocket message:', error);
          return false;
        }
      } else {
        console.warn('⚠️ WebSocket not connected, cannot send message:', data);
        return false;
      }
    }
  
    // Send user activity update
    sendActivity(activity) {
      return this.send({
        type: 'activity',
        data: {
          userId: this.userId,
          activity,
          timestamp: Date.now()
        }
      });
    }
  
    // Send achievement earned
    sendAchievement(achievement) {
      return this.send({
        type: 'achievement_earned',
        data: {
          userId: this.userId,
          achievement,
          timestamp: Date.now()
        }
      });
    }
  
    // Send score update
    sendScoreUpdate(score) {
      return this.send({
        type: 'score_update',
        data: {
          userId: this.userId,
          score,
          timestamp: Date.now()
        }
      });
    }
  
    // Send friend request
    sendFriendRequest(friendId) {
      return this.send({
        type: 'friend_request',
        data: {
          from: this.userId,
          to: friendId,
          timestamp: Date.now()
        }
      });
    }
  
    // Send challenge invitation
    sendChallengeInvite(challengeData) {
      return this.send({
        type: 'challenge_invite',
        data: {
          ...challengeData,
          from: this.userId,
          timestamp: Date.now()
        }
      });
    }
  
    // Join a room (for group activities)
    joinRoom(roomId) {
      return this.send({
        type: 'join_room',
        data: {
          userId: this.userId,
          roomId,
          timestamp: Date.now()
        }
      });
    }
  
    // Leave a room
    leaveRoom(roomId) {
      return this.send({
        type: 'leave_room',
        data: {
          userId: this.userId,
          roomId,
          timestamp: Date.now()
        }
      });
    }
  
    // Get connection status
    getStatus() {
      return {
        isConnected: this.isConnected,
        isConnecting: this.isConnecting,
        reconnectAttempts: this.reconnectAttempts,
        readyState: this.ws?.readyState || WebSocket.CLOSED
      };
    }
  
    // Manual reconnect
    reconnect() {
      if (this.ws) {
        this.ws.close();
      }
      this.isConnected = false;
      this.isConnecting = false;
      this.reconnectAttempts = 0;
      this.connect();
    }
  
    // Clean disconnect
    disconnect() {
      console.log('🔌 Manually disconnecting WebSocket');
      
      this.stopPing();
      
      if (this.ws) {
        this.reconnectAttempts = this.maxReconnectAttempts;
        this.ws.close(1000, 'Manual disconnect');
        this.ws = null;
      }
      
      this.isConnected = false;
      this.isConnecting = false;
    }
  
    // Update callbacks
    updateCallbacks(newCallbacks) {
      this.callbacks = { ...this.callbacks, ...newCallbacks };
    }
  
    // Static method to check WebSocket support
    static isSupported() {
      return typeof WebSocket !== 'undefined';
    }
  
    // Static method to create connection with fallback
    static create(userId, callbacks = {}) {
      if (!WebSocketManager.isSupported()) {
        console.warn('⚠️ WebSocket not supported, using fallback');
        return new WebSocketFallback(userId, callbacks);
      }
      
      return new WebSocketManager(userId, callbacks);
    }
  }
  
  class WebSocketFallback {
    constructor(userId, callbacks = {}) {
      this.userId = userId;
      this.callbacks = callbacks;
      this.isConnected = false;
      this.isConnecting = false;
      
      console.log('📡 Using WebSocket fallback mode');
      
      // Simulate connection after a delay
      setTimeout(() => {
        if (this.callbacks.onConnect) {
          this.callbacks.onConnect();
        }
      }, 1000);
    }
  
    send(data) {
      console.log('📤 Fallback send (not actually sent):', data);
      return true; // Pretend success
    }
  
    sendActivity(activity) { return this.send({ type: 'activity', data: activity }); }
    sendAchievement(achievement) { return this.send({ type: 'achievement_earned', data: achievement }); }
    sendScoreUpdate(score) { return this.send({ type: 'score_update', data: score }); }
    sendFriendRequest(friendId) { return this.send({ type: 'friend_request', data: { to: friendId } }); }
    sendChallengeInvite(challengeData) { return this.send({ type: 'challenge_invite', data: challengeData }); }
    joinRoom(roomId) { return this.send({ type: 'join_room', data: { roomId } }); }
    leaveRoom(roomId) { return this.send({ type: 'leave_room', data: { roomId } }); }
  
    getStatus() {
      return {
        isConnected: false,
        isConnecting: false,
        reconnectAttempts: 0,
        readyState: 3, // CLOSED
        fallback: true
      };
    }
  
    reconnect() {
      console.log('🔄 Fallback reconnect (no-op)');
    }
  
    disconnect() {
      console.log('🔌 Fallback disconnect');
      this.isConnected = false;
      if (this.callbacks.onDisconnect) {
        this.callbacks.onDisconnect({ code: 1000, reason: 'Fallback disconnect' });
      }
    }
  
    updateCallbacks(newCallbacks) {
      this.callbacks = { ...this.callbacks, ...newCallbacks };
    }
  }
  
  export default WebSocketManager;