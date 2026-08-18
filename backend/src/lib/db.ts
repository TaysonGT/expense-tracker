import { AppDataSource } from "../data-source"; // Your DataSource with pooled URI

// A localized promise to prevent concurrent initializations in the same container
let initializationPromise: Promise<any> | null = null;

export async function getDatabase() {
    // 1. If already initialized, return immediately (Zero latency)
    if (AppDataSource.isInitialized) {
        return AppDataSource;
    }

    // 2. If an initialization is already in progress, wait for it
    if (initializationPromise) {
        await initializationPromise;
        return AppDataSource;
    }

    // 3. First time hitting this specific Vercel instance? Trigger initialization.
    initializationPromise = AppDataSource.initialize();
    
    try {
        await initializationPromise;
        console.log("🚀 Database connected & metadata initialized successfully");
        return AppDataSource;
    } catch (error) {
        initializationPromise = null; // Reset on failure so next request can retry
        console.error("❌ Database initialization failed", error);
        throw error;
    }
}

