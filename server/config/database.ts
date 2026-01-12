// config/database.ts
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { createIndexes } from './database-indexes';

// Load environment variables
dotenv.config();

interface DatabaseConfig {
  MONGODB_URI: string;
  DB_NAME: string;
}

// Default configuration
export const dbConfig: DatabaseConfig = {
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb+srv://powerjbds:powerjbds@jbds.hk6xeqm.mongodb.net/',
  DB_NAME: process.env.DB_NAME || 'employee-tracking'
};

class Database {
  private static instance: Database;
  private isConnected = false;

  private constructor() {}

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  public async connect(): Promise<void> {
    if (this.isConnected) {
      console.log('📦 Database: Already connected to MongoDB');
      return;
    }

    try {
      console.log('🔄 Database: Connecting to MongoDB...');
      
      await mongoose.connect(dbConfig.MONGODB_URI, {
  dbName: dbConfig.DB_NAME,
  maxPoolSize: 50,
  serverSelectionTimeoutMS: 30000, // 30s → cluster select
  socketTimeoutMS: 120000,         // 2 min → slow queries
  connectTimeoutMS: 30000,         // 30s initial connect
  retryWrites: true,
  retryReads: true,
});


      this.isConnected = true;
      console.log('✅ Database: Successfully connected to MongoDB');
      
      // 🔥 Create indexes after successful connection
      await createIndexes();
      
      // Handle connection events
      mongoose.connection.on('error', (error) => {
        console.error('❌ Database: MongoDB connection error:', error);
        this.isConnected = false;
      });

      mongoose.connection.on('disconnected', () => {
        console.log('📦 Database: MongoDB disconnected');
        this.isConnected = false;
      });

      mongoose.connection.on('reconnected', () => {
        console.log('📦 Database: MongoDB reconnected');
        this.isConnected = true;
      });

    } catch (error) {
      console.error('❌ Database: Failed to connect to MongoDB:', error);
      this.isConnected = false;
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
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
}

export default Database;