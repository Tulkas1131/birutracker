
import { auth, db } from "./firebase";
import { collection, addDoc, Timestamp } from "firebase/firestore";

interface LogData {
    level: 'ERROR' | 'INFO' | 'WARNING';
    message: string;
    component: string;
    stack?: string;
}

export const logAppEvent = async (data: LogData) => {
    try {
        const firestore = db();

        const user = auth().currentUser;

        await addDoc(collection(firestore, "app_logs"), {
            timestamp: Timestamp.now(),
            level: data.level,
            message: data.message,
            component: data.component,
            stack: data.stack || null,
            userEmail: user?.email || 'anonymous',
        });
    } catch (error) {
        console.error("Failed to write to app_logs collection:", error);
    }
};
