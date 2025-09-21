class WebSocketManager {
  constructor(userId, callbacks = {}) {
    this.userId = userId;
    this.ws = null;
    this.isConnected = false;
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectInterval = 1000; // Start with 1 second
    this.maxReconnectInterval = 30000; // Max 30 seconds
    this.pingInterval = null;
    this.pongTimeout = null;
    this.pingIntervalTime = 15000; // Reduced to 15s for faster detection
    this.pongTimeoutTime = 3000; // Reduced to 3s for quicker timeout
    this.messageQueue = []; // Queue messages when disconnected
    this.lastPingTime = null;
    this.connectionQuality = 'unknown'; // unknown, good, poor, bad
    
    // Enhanced callbacks with more events
    this.callbacks = {
      onConnect: () => console.log('🔌 WebSocket connected'),
      onDisconnect: () => console.log('🔌 WebSocket disconnected'),
      onError: (error) => console.error('❌ WebSocket error:', error),
      onMessage: (data) => console.log('📨 WebSocket message:', data),
      onNotification: null,
      onFriendUpdate: null,
      onLeaderboardUpdate: null,
      onUserUpdate: null,
      onAchievement: null,
      onChallengeUpdate: null,
      onConnectionQualityChange: null,
      onMaxReconnect: null,
      onReconnecting: null,
      onMessageQueued: null,
      onQueueProcessed: null,
      ...callbacks
    };

    // Auto-connect if userId provided
    if (userId) {
      this.connect();
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

  connect() {
    if (this.isConnecting || this.isConnected) {
      console.log('🔄 WebSocket already connecting or connected');
      return;
    }

    this.isConnecting = true;
    
    // Notify reconnecting callback
    if (this.reconnectAttempts > 0 && this.callbacks.onReconnecting) {
      this.callbacks.onReconnecting(this.reconnectAttempts);
    }

    try {
      const wsUrl = this.getWebSocketUrl();
      console.log(`🔌 Connecting to WebSocket: ${wsUrl}`);
      
      this.ws = new WebSocket(`${wsUrl}?userId=${encodeURIComponent(this.userId)}`);
      
      // Set up event handlers
      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
      this.ws.onerror = this.handleError.bind(this);
      
    } catch (error) {
      console.error('❌ WebSocket connection failed:', error);
      this.isConnecting = false;
      this.updateConnectionQuality('bad');
      this.scheduleReconnect();
    }
  }

  handleOpen() {
    console.log('✅ WebSocket connected successfully');
    this.isConnecting = false;
    this.isConnected = true;
    this.reconnectAttempts = 0;
    this.updateConnectionQuality('good');
    
    // Start ping/pong heartbeat
    this.startPing();
    
    // Process queued messages
    this.processMessageQueue();
    
    // Authenticate with server
    this.authenticate();
    
    // Notify callbacks
    if (this.callbacks.onConnect) {
      this.callbacks.onConnect();
    }
  }

  handleMessage(event) {
    try {
      const data = JSON.parse(event.data);
      
      // Update connection quality based on message response time
      if (data.type === 'pong') {
        this.handlePong();
        return;
      }
      
      console.log('📨 WebSocket message received:', data);
      
      // Call general message callback
      if (this.callbacks.onMessage) {
        this.callbacks.onMessage(data);
      }

      // Handle specific message types
      switch (data.type) {
        case 'auth_success':
          console.log('✅ WebSocket authentication successful');
          break;

        case 'auth_error':
          console.error('❌ WebSocket authentication failed:', data.message);
          break;

        case 'achievement':
          console.log('🏆 Achievement received:', data.data);
          if (this.callbacks.onAchievement) {
            this.callbacks.onAchievement(data.data);
          }
          break;

        case 'leaderboard_update':
          console.log('🏆 Leaderboard update:', data.data);
          if (this.callbacks.onLeaderboardUpdate) {
            this.callbacks.onLeaderboardUpdate(data.data);
          }
          break;

        case 'notification':
          console.log('🔔 Notification received:', data.data);
          if (this.callbacks.onNotification) {
            this.callbacks.onNotification(data.data);
          }
          break;

        case 'friend_update':
          console.log('👥 Friend update:', data.data);
          if (this.callbacks.onFriendUpdate) {
            this.callbacks.onFriendUpdate(data.data);
          }
          break;

        case 'challenge_update':
          console.log('🎯 Challenge update:', data.data);
          if (this.callbacks.onChallengeUpdate) {
            this.callbacks.onChallengeUpdate(data.data);
          }
          break;

        case 'user_update':
          console.log('👤 User update:', data.data);
          if (this.callbacks.onUserUpdate) {
            this.callbacks.onUserUpdate(data.data);
          }
          break;

        case 'challenge_invite':
          console.log('🎯 Challenge invite:', data.data);
          if (this.callbacks.onNotification) {
            this.callbacks.onNotification({
              type: 'challenge',
              title: 'New Challenge!',
              message: `${data.data.challenger?.name || 'Someone'} challenged you to a ${data.data.type} challenge`,
              data: data.data
            });
          }
          break;

        case 'achievement_unlocked':
          console.log('🏆 Achievement unlocked:', data.data);
          if (this.callbacks.onNotification) {
            this.callbacks.onNotification({
              type: 'achievement',
              title: 'Achievement Unlocked!',
              message: data.data.title,
              data: { achievement: data.data }
            });
          }
          break;

        case 'friend_request':
          console.log('👥 Friend request:', data.data);
          if (this.callbacks.onNotification) {
            this.callbacks.onNotification({
              type: 'friend_request',
              title: 'New Friend Request',
              message: `${data.data.requester?.name || 'Someone'} wants to be your friend`,
              data: data.data
            });
          }
          break;

        case 'error':
          console.error('❌ Server error:', data.message);
          break;

        default:
          console.log('📨 Unhandled WebSocket message type:', data.type);
      }
    } catch (error) {
      console.error('❌ Failed to parse WebSocket message:', error);
    }
  }

  handleClose(event) {
    console.log(`🔌 WebSocket disconnected: ${event.code} - ${event.reason || 'No reason provided'}`);
    this.isConnected = false;
    this.isConnecting = false;
    
    this.stopPing();
    this.updateConnectionQuality('bad');
    
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
    this.updateConnectionQuality('bad');
    
    if (this.callbacks.onError) {
      this.callbacks.onError(error);
    }
  }

  handlePong() {
    if (this.pongTimeout) {
      clearTimeout(this.pongTimeout);
      this.pongTimeout = null;
    }
    
    // Calculate response time for connection quality
    if (this.lastPingTime) {
      const responseTime = Date.now() - this.lastPingTime;
      this.updateConnectionQualityFromPing(responseTime);
    }
    
    console.log('🏓 Received pong, connection alive');
  }

  updateConnectionQuality(quality) {
    if (this.connectionQuality !== quality) {
      const oldQuality = this.connectionQuality;
      this.connectionQuality = quality;
      
      console.log(`📶 Connection quality changed: ${oldQuality} → ${quality}`);
      
      if (this.callbacks.onConnectionQualityChange) {
        this.callbacks.onConnectionQualityChange(quality, oldQuality);
      }
    }
  }

  updateConnectionQualityFromPing(responseTime) {
    let quality;
    if (responseTime < 100) {
      quality = 'excellent';
    } else if (responseTime < 300) {
      quality = 'good';
    } else if (responseTime < 1000) {
      quality = 'poor';
    } else {
      quality = 'bad';
    }
    
    this.updateConnectionQuality(quality);
  }

  startPing() {
    this.stopPing(); // Clear any existing ping
    
    this.pingInterval = setInterval(() => {
      if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
        this.lastPingTime = Date.now();
        console.log('🏓 Sending ping');
        
        this.send({ type: 'ping', timestamp: this.lastPingTime });
        
        // Set timeout for pong response
        this.pongTimeout = setTimeout(() => {
          console.warn('⚠️ Pong timeout - attempting reconnect');
          this.updateConnectionQuality('bad');
          this.ws?.close(4001, 'Pong timeout');
        }, this.pongTimeoutTime);
      } else if (this.isConnected && this.ws?.readyState !== WebSocket.OPEN) {
        console.log('🔌 Connection lost during ping, attempting reconnect');
        this.isConnected = false;
        this.scheduleReconnect();
      }
    }, this.pingIntervalTime);
  }

  stopPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    
    if (this.pongTimeout) {
      clearTimeout(this.pongTimeout);
      this.pongTimeout = null;
    }
  }

  scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('❌ Max reconnection attempts reached');
      if (this.callbacks.onMaxReconnect) {
        this.callbacks.onMaxReconnect();
      }
      return;
    }

    this.reconnectAttempts++;
    
    // Exponential backoff with jitter
    const baseDelay = Math.min(
      this.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1),
      this.maxReconnectInterval
    );
    const jitter = Math.random() * 1000;
    const delay = baseDelay + jitter;
    
    console.log(`🔄 Scheduling reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${Math.round(delay)}ms`);
    
    setTimeout(() => {
      if (!this.isConnected && !this.isConnecting) {
        this.connect();
      }
    }, delay);
  }

  authenticate() {
    if (!this.userId) {
      console.warn('⚠️ No userId provided for WebSocket authentication');
      return;
    }

    this.send({
      type: 'auth',
      data: {
        userId: this.userId,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      }
    });
  }

  send(data) {
    if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(data));
        return true;
      } catch (error) {
        console.error('❌ Failed to send WebSocket message:', error);
        this.queueMessage(data);
        return false;
      }
    } else {
      console.warn('⚠️ WebSocket not connected, queueing message:', data);
      this.queueMessage(data);
      return false;
    }
  }

  queueMessage(data) {
    // Don't queue ping messages or auth messages
    if (data.type === 'ping' || data.type === 'auth') {
      return;
    }
    
    this.messageQueue.push({
      data,
      timestamp: Date.now(),
      retries: 0
    });
    
    // Limit queue size
    if (this.messageQueue.length > 50) {
      this.messageQueue.shift(); // Remove oldest message
    }
    
    if (this.callbacks.onMessageQueued) {
      this.callbacks.onMessageQueued(data, this.messageQueue.length);
    }
  }

  processMessageQueue() {
    if (this.messageQueue.length === 0) {
      return;
    }
    
    console.log(`📤 Processing ${this.messageQueue.length} queued messages`);
    
    const toProcess = [...this.messageQueue];
    this.messageQueue = [];
    
    toProcess.forEach(queuedMessage => {
      const age = Date.now() - queuedMessage.timestamp;
      
      // Skip messages older than 5 minutes
      if (age > 300000) {
        console.warn('⚠️ Dropping old queued message:', queuedMessage.data);
        return;
      }
      
      if (!this.send(queuedMessage.data)) {
        // If send fails, requeue with retry count
        queuedMessage.retries++;
        if (queuedMessage.retries < 3) {
          this.messageQueue.push(queuedMessage);
        }
      }
    });
    
    if (this.callbacks.onQueueProcessed) {
      this.callbacks.onQueueProcessed(toProcess.length - this.messageQueue.length);
    }
  }

  // Enhanced activity sending with metadata
  sendActivity(activity) {
    return this.send({
      type: 'activity',
      data: {
        userId: this.userId,
        activity,
        timestamp: Date.now(),
        sessionId: this.getSessionId(),
        url: window.location.href
      }
    });
  }

  // Send achievement with validation
  sendAchievement(achievement) {
    if (!achievement || !achievement.id) {
      console.error('❌ Invalid achievement data');
      return false;
    }
    
    return this.send({
      type: 'achievement_earned',
      data: {
        userId: this.userId,
        achievement,
        timestamp: Date.now(),
        sessionId: this.getSessionId()
      }
    });
  }

  // Send score update with delta
  sendScoreUpdate(score, previousScore = null) {
    return this.send({
      type: 'score_update',
      data: {
        userId: this.userId,
        score,
        previousScore,
        delta: previousScore ? score - previousScore : null,
        timestamp: Date.now(),
        sessionId: this.getSessionId()
      }
    });
  }

  // Enhanced friend request with metadata
  sendFriendRequest(friendId, message = null) {
    return this.send({
      type: 'friend_request',
      data: {
        from: this.userId,
        to: friendId,
        message,
        timestamp: Date.now()
      }
    });
  }

  // Enhanced challenge invite
  sendChallengeInvite(challengeData) {
    return this.send({
      type: 'challenge_invite',
      data: {
        ...challengeData,
        from: this.userId,
        timestamp: Date.now(),
        expiresAt: Date.now() + (challengeData.duration || 7) * 24 * 60 * 60 * 1000
      }
    });
  }

  // Room management
  joinRoom(roomId, roomType = 'general') {
    return this.send({
      type: 'join_room',
      data: {
        userId: this.userId,
        roomId,
        roomType,
        timestamp: Date.now()
      }
    });
  }

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

  // Status management
  updateStatus(status, metadata = {}) {
    return this.send({
      type: 'status_update',
      data: {
        userId: this.userId,
        status,
        metadata,
        timestamp: Date.now()
      }
    });
  }

  // Typing indicators
  sendTyping(roomId, isTyping = true) {
    return this.send({
      type: 'typing',
      data: {
        userId: this.userId,
        roomId,
        isTyping,
        timestamp: Date.now()
      }
    });
  }

  // Get comprehensive status
  getStatus() {
    return {
      isConnected: this.isConnected,
      isConnecting: this.isConnecting,
      reconnectAttempts: this.reconnectAttempts,
      connectionQuality: this.connectionQuality,
      queuedMessages: this.messageQueue.length,
      readyState: this.ws?.readyState || WebSocket.CLOSED,
      readyStateName: this.getReadyStateName(),
      lastPingTime: this.lastPingTime,
      url: this.getWebSocketUrl()
    };
  }

  getReadyStateName() {
    if (!this.ws) return 'NOT_CREATED';
    
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING: return 'CONNECTING';
      case WebSocket.OPEN: return 'OPEN';
      case WebSocket.CLOSING: return 'CLOSING';
      case WebSocket.CLOSED: return 'CLOSED';
      default: return 'UNKNOWN';
    }
  }

  getSessionId() {
    if (!this._sessionId) {
      this._sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    return this._sessionId;
  }

  // Manual reconnect with queue processing
  reconnect() {
    console.log('🔄 Manual WebSocket reconnect requested');
    
    if (this.ws) {
      this.ws.close();
    }
    
    this.isConnected = false;
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    
    setTimeout(() => this.connect(), 100);
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
    this.messageQueue = [];
  }

  // Update callbacks and user ID
  updateCallbacks(newCallbacks) {
    this.callbacks = { ...this.callbacks, ...newCallbacks };
  }

  updateUserId(newUserId) {
    const oldUserId = this.userId;
    this.userId = newUserId;
    
    if (this.isConnected && oldUserId !== newUserId) {
      this.authenticate();
    }
  }

  // Clear message queue
  clearQueue() {
    this.messageQueue = [];
  }

  // Get queue info
  getQueueInfo() {
    return {
      size: this.messageQueue.length,
      oldestMessage: this.messageQueue[0]?.timestamp || null,
      newestMessage: this.messageQueue[this.messageQueue.length - 1]?.timestamp || null
    };
  }

  // Static methods
  static isSupported() {
    return typeof WebSocket !== 'undefined';
  }

  static create(userId, callbacks = {}) {
    if (!WebSocketManager.isSupported()) {
      console.warn('⚠️ WebSocket not supported, using fallback');
      return new WebSocketFallback(userId, callbacks);
    }
    
    return new WebSocketManager(userId, callbacks);
  }
}

// Enhanced fallback class
class WebSocketFallback {
  constructor(userId, callbacks = {}) {
    this.userId = userId;
    this.callbacks = callbacks;
    this.isConnected = false;
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    this.connectionQuality = 'fallback';
    this.messageQueue = [];
    
    console.log('📡 Using WebSocket fallback mode - real-time features disabled');
    
    // Simulate connection after a delay
    setTimeout(() => {
      if (this.callbacks.onConnect) {
        this.callbacks.onConnect();
      }
    }, 1000);
  }

  send(data) {
    console.log('📤 Fallback send (simulated):', data);
    return true;
  }

  // Stub all methods
  sendActivity(activity) { return this.send({ type: 'activity', data: activity }); }
  sendAchievement(achievement) { return this.send({ type: 'achievement_earned', data: achievement }); }
  sendScoreUpdate(score) { return this.send({ type: 'score_update', data: score }); }
  sendFriendRequest(friendId, message) { return this.send({ type: 'friend_request', data: { to: friendId, message } }); }
  sendChallengeInvite(challengeData) { return this.send({ type: 'challenge_invite', data: challengeData }); }
  joinRoom(roomId) { return this.send({ type: 'join_room', data: { roomId } }); }
  leaveRoom(roomId) { return this.send({ type: 'leave_room', data: { roomId } }); }
  updateStatus(status) { return this.send({ type: 'status_update', data: { status } }); }
  sendTyping(roomId, isTyping) { return this.send({ type: 'typing', data: { roomId, isTyping } }); }

  getStatus() {
    return {
      isConnected: false,
      isConnecting: false,
      reconnectAttempts: 0,
      connectionQuality: 'fallback',
      queuedMessages: 0,
      readyState: 3, // CLOSED
      readyStateName: 'FALLBACK',
      fallback: true
    };
  }

  reconnect() { console.log('🔄 Fallback reconnect (no-op)'); }
  disconnect() { 
    console.log('🔌 Fallback disconnect');
    this.isConnected = false;
    if (this.callbacks.onDisconnect) {
      this.callbacks.onDisconnect({ code: 1000, reason: 'Fallback disconnect' });
    }
  }
  updateCallbacks(newCallbacks) { this.callbacks = { ...this.callbacks, ...newCallbacks }; }
  updateUserId(userId) { this.userId = userId; }
  clearQueue() {}
  getQueueInfo() { return { size: 0, oldestMessage: null, newestMessage: null }; }
}

export default WebSocketManager;