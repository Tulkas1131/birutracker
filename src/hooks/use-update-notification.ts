
"use client";

import { useState, useEffect } from "react";

export function useUpdateNotification() {
    const [updateAvailable, setUpdateAvailable] = useState(false);
    const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

    useEffect(() => {
        if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistration().then(registration => {
                if (!registration) return;

                // This logic fires when a new service worker is found and installed
                // but is waiting to activate.
                const onUpdateFound = () => {
                    const newWorker = registration.installing;
                    if (newWorker) {
                        newWorker.onstatechange = () => {
                            if (newWorker.state === 'installed') {
                                // A new SW is installed and waiting
                                if (navigator.serviceWorker.controller) {
                                    console.log('New content is available and will be used when all tabs for this page are closed.');
                                    setWaitingWorker(newWorker);
                                    setUpdateAvailable(true);
                                }
                            }
                        };
                    }
                };
                
                registration.onupdatefound = onUpdateFound;

                // This logic catches the case where a new SW is already waiting.
                // This can happen if the user refreshes the page after a new SW was found.
                if (registration.waiting) {
                    setWaitingWorker(registration.waiting);
                    setUpdateAvailable(true);
                }

            }).catch(error => {
                console.error('Service Worker registration failed:', error);
            });
        }
    }, []);

    const refreshCacheAndReload = () => {
        if (waitingWorker) {
            // Send a message to the waiting service worker to skip waiting
            waitingWorker.postMessage({ type: 'SKIP_WAITING' });
            
            // Listen for the controlling service worker to change
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                // The new service worker has taken control, now reload the page
                window.location.reload();
            });
        }
    };

    return { updateAvailable, refreshCacheAndReload };
}
