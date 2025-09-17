// src/components/ErrorBoundary.jsx - Catches and displays React errors gracefully
import React from 'react';
import { motion } from 'framer-motion';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      retryCount: 0 
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error details
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // You could also log to an error reporting service here
    if (window.gtag) {
      window.gtag('event', 'exception', {
        description: error.toString(),
        fatal: false
      });
    }
  }

  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1
    }));
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md w-full"
          >
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 text-center">
              {/* Error Icon */}
              <div className="text-6xl mb-4">😅</div>
              
              {/* Error Title */}
              <h2 className="text-2xl font-bold text-white mb-4">
                Oops! Something went wrong
              </h2>
              
              {/* Error Description */}
              <p className="text-blue-200 mb-6 text-sm">
                Don't worry! This happens sometimes. The error has been logged 
                and we're working to fix these issues.
              </p>

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  onClick={this.handleRetry}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 py-3 px-6 rounded-xl text-white font-semibold transition-all duration-300 transform hover:scale-105"
                >
                  🔄 Try Again
                </button>
                
                <button
                  onClick={this.handleReload}
                  className="w-full bg-white/10 hover:bg-white/20 border border-white/20 py-3 px-6 rounded-xl text-white font-medium transition-all duration-300"
                >
                  🔃 Reload Page
                </button>
              </div>

              {/* Retry Count */}
              {this.state.retryCount > 0 && (
                <div className="mt-4 text-xs text-white/60">
                  Retry attempts: {this.state.retryCount}
                </div>
              )}

              {/* Error Details (Development only) */}
              {import.meta.env.DEV && this.state.error && (
                <details className="mt-6 text-left">
                  <summary className="text-yellow-300 cursor-pointer text-sm mb-2">
                    🔍 Technical Details (Dev Mode)
                  </summary>
                  <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3 text-xs text-red-200 overflow-auto max-h-40">
                    <div className="mb-2">
                      <strong>Error:</strong> {this.state.error.toString()}
                    </div>
                    <div>
                      <strong>Stack:</strong>
                      <pre className="whitespace-pre-wrap text-xs mt-1">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  </div>
                </details>
              )}

              {/* Help Text */}
              <div className="mt-6 pt-4 border-t border-white/10">
                <p className="text-xs text-white/50">
                  If this problem persists, try refreshing the page or 
                  clearing your browser cache.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;