
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
                            if (newWorker.state === 'installed') {
                                if (navigator.serviceWorker.controller) {
                                    // A new SW is installed and waiting
                                    console.log('New content is available and will be used when all tabs for this page are closed.');
                                    setWaitingWorker(newWorker);
                                    setUpdateAvailable(true);
                                }
                            }
                        };
                    }
                };

                registration.onupdatefound = onUpdateFound;

                // Also check if there's a waiting worker already
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
