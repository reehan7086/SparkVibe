// Simple state management utility for SparkVibe
class StateManager {
  constructor() {
    this.state = {
      health: 'Checking...',
      capsuleData: null,
      userChoices: {},
      completionStats: { vibePointsEarned: 0 },
      moodData: null,
      currentStep: 'mood',
      isAuthenticated: false,
      user: null,
      loading: true,
      notifications: [],
      unreadCount: 0,
      friends: [],
      challenges: [],
      achievements: [],
      newAchievements: [],
      showNotifications: false,
      showFriends: false,
      showChallenges: false,
      isEnhancedMode: true,
      onlineUsers: 0
    };
    this.listeners = new Set();
  }

  getState() {
    return { ...this.state };
  }

  setState(newState) {
    this.state = { ...this.state, ...newState };
    this.notifyListeners();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notifyListeners() {
    this.listeners.forEach(listener => listener(this.state));
  }

  // Specific state update methods
  updateUser(userData) {
    this.setState({ user: { ...this.state.user, ...userData } });
  }

  updateUserStats(stats) {
    if (this.state.user) {
      this.setState({
        user: {
          ...this.state.user,
          ...stats,
          stats: { ...this.state.user.stats, ...stats }
        }
      });
    }
  }

  addNotification(notification) {
    this.setState({
      notifications: [notification, ...this.state.notifications],
      unreadCount: this.state.unreadCount + 1
    });
  }

  markNotificationsAsRead() {
    this.setState({
      unreadCount: 0,
      notifications: this.state.notifications.map(n => ({ ...n, read: true }))
    });
  }

  resetExperience() {
    this.setState({
      currentStep: 'mood',
      moodData: null,
      capsuleData: null,
      userChoices: {},
      completionStats: { vibePointsEarned: 0 }
    });
  }

  setLoading(loading) {
    this.setState({ loading });
  }

  setAuthentication(isAuthenticated, user = null) {
    this.setState({ 
      isAuthenticated, 
      user,
      loading: false 
    });
  }
}

// Create singleton instance
const stateManager = new StateManager();

export default stateManager;
