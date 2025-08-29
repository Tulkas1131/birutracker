
import { initializeApp, getApps, getApp, type App } from 'firebase-admin/app';

const adminConfig = {
  // Las credenciales se obtienen automáticamente de las variables de entorno
  // en el entorno de Firebase App Hosting. No es necesario configurarlas manualmente.
};

let adminApp: App;

if (!getApps().length) {
  adminApp = initializeApp(adminConfig);
} else {
  adminApp = getApp();
}

export { adminApp };
