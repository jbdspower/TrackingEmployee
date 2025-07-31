import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface DatabaseConfig {
  MONGODB_URI: string;
  DB_NAME: string;
}

// Default configuration - replace these with your local MongoDB URLs
export const dbConfig: DatabaseConfig = {
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/employee-tracking',
  DB_NAME: process.env.DB_NAME || 'employee-tracking'
};

class Database {
  private static instance: Database;
  private isConnected = false;
  private connectionAttempts = 0;
  private maxRetries = 5;
  private retryDelay = 5000; // 5 seconds
  private healthCheckInterval?: NodeJS.Timeout;

  private constructor() {}

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  public async connect(): Promise<void> {
    if (this.isConnected && mongoose.connection.readyState === 1) {
      console.log('📦 Database: Already connected to MongoDB');
      return;
    }

    try {
      console.log('🔄 Database: Connecting to MongoDB...');
      console.log('📦 Database: URI:', dbConfig.MONGODB_URI.replace(/:[^@]*@/, ':***@'));
      
      // Configure mongoose for better error handling
      mongoose.set('bufferCommands', false); // Disable buffering to get immediate errors

      await mongoose.connect(dbConfig.MONGODB_URI, {
        dbName: dbConfig.DB_NAME,
        serverSelectionTimeoutMS: 30000, // Increased to 30s
        socketTimeoutMS: 60000, // Increased to 60s
        connectTimeoutMS: 30000, // 30s connection timeout
        maxPoolSize: 15, // Increased pool size
        minPoolSize: 2, // Maintain minimum connections
        maxIdleTimeMS: 30000, // Close connections after 30s idle
        retryWrites: true,
        retryReads: true,
        heartbeatFrequencyMS: 10000, // Check connection every 10s
        compressors: 'zlib', // Enable compression
      });

      this.isConnected = true;
      this.connectionAttempts = 0;
      console.log('✅ Database: Successfully connected to MongoDB');
      
      // Start health monitoring
      this.startHealthMonitoring();
      
      // Handle connection events
      mongoose.connection.on('error', (error) => {
        console.error('❌ Database: MongoDB connection error:', error);
        this.isConnected = false;
        this.handleConnectionError(error);
      });

      mongoose.connection.on('disconnected', () => {
        console.log('📦 Database: MongoDB disconnected');
        this.isConnected = false;
        this.attemptReconnection();
      });

      mongoose.connection.on('reconnected', () => {
        console.log('📦 Database: MongoDB reconnected');
        this.isConnected = true;
        this.connectionAttempts = 0;
      });

      mongoose.connection.on('close', () => {
        console.log('📦 Database: MongoDB connection closed');
        this.isConnected = false;
      });

    } catch (error) {
      console.error('❌ Database: Failed to connect to MongoDB:', error);
      this.isConnected = false;
      this.connectionAttempts++;
      
      if (this.connectionAttempts < this.maxRetries) {
        console.log(`🔄 Database: Retrying connection in ${this.retryDelay}ms (attempt ${this.connectionAttempts}/${this.maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        return this.connect();
      } else {
        console.error('❌ Database: Max connection attempts reached. Operating in degraded mode.');
        throw error;
      }
    }
  }

  private startHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, 30000); // Check every 30 seconds
  }

  private async performHealthCheck(): Promise<void> {
    try {
      if (mongoose.connection.readyState !== 1) {
        console.log('⚠️ Database: Connection not ready, attempting reconnection...');
        this.isConnected = false;
        await this.attemptReconnection();
        return;
      }

      // Perform a simple ping to check connection
      await mongoose.connection.db.admin().ping();
      
      if (!this.isConnected) {
        console.log('✅ Database: Health check passed, connection restored');
        this.isConnected = true;
        this.connectionAttempts = 0;
      }
    } catch (error) {
      console.error('❌ Database: Health check failed:', error);
      this.isConnected = false;
      await this.attemptReconnection();
    }
  }

  private async attemptReconnection(): Promise<void> {
    if (this.connectionAttempts >= this.maxRetries) {
      console.error('❌ Database: Max reconnection attempts reached');
      return;
    }

    this.connectionAttempts++;
    console.log(`🔄 Database: Attempting reconnection ${this.connectionAttempts}/${this.maxRetries}`);
    
    try {
      await mongoose.disconnect();
      await new Promise(resolve => setTimeout(resolve, this.retryDelay));
      await this.connect();
    } catch (error) {
      console.error('❌ Database: Reconnection failed:', error);
    }
  }

  private handleConnectionError(error: any): void {
    // Handle specific MongoDB error types
    if (error.name === 'MongoServerSelectionError') {
      console.error('❌ Database: Server selection failed - MongoDB may be down');
    } else if (error.name === 'MongoNetworkError') {
      console.error('❌ Database: Network error - Check network connectivity');
    } else if (error.name === 'MongoTimeoutError') {
      console.error('❌ Database: Operation timeout - MongoDB may be overloaded');
    }
  }

  public async disconnect(): Promise<void> {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }

    if (!this.isConnected) {
      return;
    }

    try {
      await mongoose.disconnect();
      this.isConnected = false;
      console.log('📦 Database: Disconnected from MongoDB');
    } catch (error) {
      console.error('❌ Database: Error disconnecting from MongoDB:', error);
    }
  }

  public isConnectionActive(): boolean {
    return this.isConnected && mongoose.connection.readyState === 1;
  }

  public getConnection() {
    return mongoose.connection;
  }

  public async waitForConnection(timeout: number = 30000): Promise<boolean> {
    const start = Date.now();
    
    while (Date.now() - start < timeout) {
      if (this.isConnectionActive()) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return false;
  }

  // Execute database operation with circuit breaker pattern
  public async executeWithFallback<T>(
    operation: () => Promise<T>,
    fallback: () => T,
    operationName: string = 'database operation'
  ): Promise<T> {
    if (!this.isConnectionActive()) {
      console.warn(`⚠️ Database: ${operationName} - No active connection, using fallback`);
      return fallback();
    }

    try {
      const result = await Promise.race([
        operation(),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Operation timeout')), 10000)
        )
      ]);
      return result;
    } catch (error) {
      console.error(`❌ Database: ${operationName} failed:`, error);
      
      // Check if it's a connection error
      if (error instanceof Error && (
        error.message.includes('buffering timed out') ||
        error.message.includes('Operation timeout') ||
        error.name === 'MongoNetworkError' ||
        error.name === 'MongoTimeoutError'
      )) {
        this.isConnected = false;
        console.warn(`⚠️ Database: ${operationName} - Connection issue detected, using fallback`);
        return fallback();
      }
      
      throw error;
    }
  }
}

export default Database;
