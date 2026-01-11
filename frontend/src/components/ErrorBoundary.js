'use client';

import { Component } from 'react';
import styles from './ErrorBoundary.module.css';

/**
 * Error Boundary Component
 * Catches and displays errors from child components
 */
export default class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
            isVisible: false,
        };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.error('Error caught by boundary:', error, errorInfo);
        this.setState({
            error,
            errorInfo,
            isVisible: true,
        });
    }

    resetError = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
            isVisible: false,
        });
    };

    closeError = () => {
        this.setState({ isVisible: false });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className={styles.errorContainer}>
                    <div className={styles.errorContent}>
                        <div className={styles.errorHeader}>
                            <h2>❌ Something Went Wrong</h2>
                            <button
                                className={styles.closeButton}
                                onClick={this.closeError}
                                aria-label="Close error"
                            >
                                ×
                            </button>
                        </div>

                        <p className={styles.errorMessage}>
                            {this.state.error?.toString()}
                        </p>

                        {process.env.NODE_ENV === 'development' && (
                            <details className={styles.errorDetails}>
                                <summary>Error Details (Development Only)</summary>
                                <pre className={styles.errorStack}>
                                    {this.state.errorInfo?.componentStack}
                                </pre>
                            </details>
                        )}

                        <div className={styles.errorActions}>
                            <button
                                className={styles.primaryButton}
                                onClick={this.resetError}
                            >
                                Try Again
                            </button>
                            <button
                                className={styles.secondaryButton}
                                onClick={() => window.location.reload()}
                            >
                                Reload Page
                            </button>
                        </div>

                        <p className={styles.errorHint}>
                            If the problem persists, please check the console for more details.
                        </p>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
