'use client';

import { useState, useCallback, useRef } from 'react';
import styles from './Toast.module.css';

/**
 * Toast Notification System
 * Displays temporary notifications to users
 */

let toastId = 0;
const toastCallbacks = new Set();

/**
 * Show a toast notification
 */
export function showToast(message, type = 'info', duration = 4000) {
    const id = ++toastId;
    const notification = {
        id,
        message,
        type, // 'success', 'error', 'warning', 'info'
        duration,
        timestamp: Date.now(),
    };

    toastCallbacks.forEach(callback => callback(notification));

    if (duration > 0) {
        setTimeout(() => {
            removeToast(id);
        }, duration);
    }

    return id;
}

/**
 * Remove a toast notification
 */
export function removeToast(id) {
    toastCallbacks.forEach(callback => callback({ remove: true, id }));
}

/**
 * Toast Container Component
 * Must be rendered once at app root
 */
export function ToastContainer() {
    const [toasts, setToasts] = useState([]);
    const containerRef = useRef(null);

    const addToast = useCallback((notification) => {
        if (notification.remove) {
            setToasts(prev => prev.filter(t => t.id !== notification.id));
        } else {
            setToasts(prev => [...prev, notification]);
        }
    }, []);

    // Register callback
    if (typeof window !== 'undefined' && !window._toastCallbackRegistered) {
        toastCallbacks.add(addToast);
        window._toastCallbackRegistered = true;
    }

    return (
        <div className={styles.toastContainer} ref={containerRef}>
            {toasts.map(toast => (
                <Toast
                    key={toast.id}
                    {...toast}
                    onClose={() => removeToast(toast.id)}
                />
            ))}
        </div>
    );
}

/**
 * Individual Toast Component
 */
function Toast({ id, message, type, onClose }) {
    const [isClosing, setIsClosing] = useState(false);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            onClose();
        }, 300);
    };

    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️',
    };

    return (
        <div
            className={`${styles.toast} ${styles[type]} ${isClosing ? styles.closing : ''}`}
            role="alert"
        >
            <span className={styles.icon}>{icons[type]}</span>
            <span className={styles.message}>{message}</span>
            <button
                className={styles.closeBtn}
                onClick={handleClose}
                aria-label="Close notification"
            >
                ×
            </button>
        </div>
    );
}

/**
 * Convenience functions
 */
export const toast = {
    success: (message, duration) => showToast(message, 'success', duration),
    error: (message, duration) => showToast(message, 'error', duration || 5000),
    warning: (message, duration) => showToast(message, 'warning', duration),
    info: (message, duration) => showToast(message, 'info', duration),
};

export default ToastContainer;
