
"use client";

import { useState, useEffect } from "react";

export function useUpdateNotification() {
    const [updateAvailable, setUpdateAvailable] = useState(false);
    const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

    useEffect(() => {
        if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistration().then(registration => {
                if (!registration) return;

                const onUpdateFound = () => {
                    const newWorker = registration.installing;
                    if (newWorker) {
                        newWorker.onstatechange = () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                console.log('New content is available. Triggering update...');
                                setWaitingWorker(newWorker);
                                setUpdateAvailable(true);
                                // Automatically trigger the update process
                                newWorker.postMessage({ type: 'SKIP_WAITING' });
                            }
                        };
                    }
                };
                
                registration.onupdatefound = onUpdateFound;

                if (registration.waiting) {
                    console.log('A waiting service worker was found. Triggering update...');
                    setWaitingWorker(registration.waiting);
                    setUpdateAvailable(true);
                    // Automatically trigger the update process
                    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
                }

                // Listen for the controller change and reload the page.
                // This is the key part to ensure the new SW takes over.
                let refreshing = false;
                navigator.serviceWorker.addEventListener('controllerchange', () => {
                    if (!refreshing) {
                        window.location.reload();
                        refreshing = true;
                    }
                });

            }).catch(error => {
                console.error('Service Worker registration failed:', error);
            });
        }
    }, []);

    // This function is kept for potential manual triggers, but the process is now automatic.
    const refreshCacheAndReload = () => {
        if (waitingWorker) {
            waitingWorker.postMessage({ type: 'SKIP_WAITING' });
        }
    };

    return { updateAvailable, refreshCacheAndReload };
}
