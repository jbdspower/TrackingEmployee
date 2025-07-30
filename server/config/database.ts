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
      console.log('���� Database: Connecting to MongoDB...');
      console.log('📦 Database: URI:', dbConfig.MONGODB_URI);
      
      await mongoose.connect(dbConfig.MONGODB_URI, {
        dbName: dbConfig.DB_NAME,
      });

      this.isConnected = true;
      console.log('✅ Database: Successfully connected to MongoDB');
      
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
