// Custom hook for managing app state
import { useState, useEffect } from 'react';
import stateManager from '../utils/stateManager';

export const useAppState = () => {
  const [state, setState] = useState(stateManager.getState());

  useEffect(() => {
    const unsubscribe = stateManager.subscribe(setState);
    return unsubscribe;
  }, []);

  return {
    ...state,
    updateUser: stateManager.updateUser.bind(stateManager),
    updateUserStats: stateManager.updateUserStats.bind(stateManager),
    addNotification: stateManager.addNotification.bind(stateManager),
    markNotificationsAsRead: stateManager.markNotificationsAsRead.bind(stateManager),
    resetExperience: stateManager.resetExperience.bind(stateManager),
    setLoading: stateManager.setLoading.bind(stateManager),
    setAuthentication: stateManager.setAuthentication.bind(stateManager),
    setState: stateManager.setState.bind(stateManager)
  };
};

export default useAppState;
