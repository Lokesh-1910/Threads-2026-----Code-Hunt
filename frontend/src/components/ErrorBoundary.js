// ErrorBoundary.js
import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        // Ignore ResizeObserver errors
        if (error?.message?.includes?.('ResizeObserver')) {
            return;
        }
        console.error('Error caught by boundary:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return this.props.fallback || (
                <div style={{
                    padding: '20px',
                    textAlign: 'center',
                    background: '#1e293b',
                    color: '#94a3b8',
                    borderRadius: '8px'
                }}>
                    Something went wrong. Please refresh the page.
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;