// services/cache.service.js
import NodeCache from 'node-cache';

class CacheService {
  constructor() {
    this.cache = new NodeCache({ 
      stdTTL: 300, // 5 minutes default TTL
      checkperiod: 60 
    });
    this.externalApiUrl = "https://jbdspower.in/LeafNetServer/api/user";
  }

  get(key) {
    return this.cache.get(key);
  }

  set(key, value, ttl = 300) {
    return this.cache.set(key, value, ttl);
  }

  del(keys) {
    return this.cache.del(keys);
  }

  flush() {
    return this.cache.flushAll();
  }

  // External API fetch function
  async fetchExternalUsers() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(this.externalApiUrl, {
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const users = await response.json();
      console.log(`External API: ${users.length} users fetched`);
      return users;
    } catch (error) {
      console.error("Error fetching external users:", error);
      return [];
    }
  }

  // Cache external users for 10 minutes
  async getExternalUsers() {
    const cacheKey = 'external_users';
    let users = this.get(cacheKey);
    
    if (!users) {
      console.log('Cache miss: fetching external users');
      users = await this.fetchExternalUsers();
      this.set(cacheKey, users, 600); // 10 minutes
    } else {
      console.log('Cache hit: using cached external users');
    }
    
    return users;
  }
}

export const cacheService = new CacheService();