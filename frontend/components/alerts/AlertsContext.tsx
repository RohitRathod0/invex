'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { getUserId } from '@/lib/auth';

const POLL_INTERVAL_MS = 30_000; // 30 seconds

export interface TriggeredAlert {
    id: string;
    symbol: string;
    condition: string;
    target_price: number;
    current_price: number;
}

interface AlertsContextValue {
    unreadCount: number;
    triggered: TriggeredAlert[];
    clearTriggered: () => void;
    requestPermission: () => Promise<void>;
    notifPermission: NotificationPermission | 'unsupported';
}

const AlertsContext = createContext<AlertsContextValue>({
    unreadCount: 0,
    triggered: [],
    clearTriggered: () => {},
    requestPermission: async () => {},
    notifPermission: 'default',
});

export function useAlerts() {
    return useContext(AlertsContext);
}

function fireBrowserNotification(alert: TriggeredAlert) {
    if (typeof window === 'undefined') return;
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    const isAboveOrUp = alert.condition === 'above' || alert.condition === 'percent_up';
    const isPercent = alert.condition.includes('percent');
    const emoji = isAboveOrUp ? '🚀' : '🔻';
    const direction = alert.condition === 'percent_up' ? 'jumped >' : alert.condition === 'percent_down' ? 'dropped >' : isAboveOrUp ? 'crossed above' : 'dropped below';
    const targetStr = isPercent ? `${alert.target_price}%` : `₹${alert.target_price.toLocaleString('en-IN')}`;

    new Notification(`${emoji} ${alert.symbol} Alert Triggered — Invex AI`, {
        body: `${alert.symbol} has ${direction} your target of ${targetStr}. Current price: ₹${alert.current_price.toLocaleString('en-IN')}`,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: alert.id, // prevent duplicate notifications
    });
}

export function AlertsProvider({ children }: { children: React.ReactNode }) {
    const [triggered, setTriggered] = useState<TriggeredAlert[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [notifPermission, setNotifPermission] = useState<NotificationPermission | 'unsupported'>('default');

    // Track which alert IDs we've already notified so we don't re-fire
    const notifiedIds = useRef<Set<string>>(new Set());

    // Sync permission state
    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (!('Notification' in window)) {
            setNotifPermission('unsupported');
            return;
        }
        setNotifPermission(Notification.permission);
    }, []);

    const requestPermission = useCallback(async () => {
        if (typeof window === 'undefined') return;
        if (!('Notification' in window)) return;
        const result = await Notification.requestPermission();
        setNotifPermission(result);
    }, []);

    const checkAlerts = useCallback(async () => {
        try {
            const userId = getUserId();
            if (!userId) return;
            const res = await fetch(`/api/v1/alerts/check/${userId}`, { method: 'POST' });
            if (!res.ok) return;
            const data = await res.json();
            const newlyTriggered: TriggeredAlert[] = (data.triggered ?? []).filter(
                (t: TriggeredAlert) => !notifiedIds.current.has(t.id)
            );

            if (newlyTriggered.length === 0) return;

            // Mark as notified
            newlyTriggered.forEach(t => notifiedIds.current.add(t.id));

            // Fire browser push notifications
            newlyTriggered.forEach(fireBrowserNotification);

            // Accumulate in state for toast display
            setTriggered(prev => [...newlyTriggered, ...prev]);
            setUnreadCount(prev => prev + newlyTriggered.length);
        } catch {
            // Silently ignore — network may be unavailable
        }
    }, []);

    // Poll on mount and every 30s
    useEffect(() => {
        checkAlerts();
        const interval = setInterval(checkAlerts, POLL_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [checkAlerts]);

    const clearTriggered = useCallback(() => {
        setTriggered([]);
        setUnreadCount(0);
    }, []);

    return (
        <AlertsContext.Provider value={{ unreadCount, triggered, clearTriggered, requestPermission, notifPermission }}>
            {children}
        </AlertsContext.Provider>
    );
}
