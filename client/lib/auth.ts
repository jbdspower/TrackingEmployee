import { jwtDecode } from "jwt-decode";

export interface User {
  _id: string;
  name: string;
  email: string;
  role?: string;
  target?: number;
  designation?: string;
  department?: string;
  companyName?: Array<{
    companyName: string;
    _id: string;
  }>;
  report?: {
    _id: string;
    name: string;
  };
  mobileNumber?: string;
  exp?: number;
  iat?: number;
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  try {
    const token = localStorage.getItem("idToken");
    const user = localStorage.getItem("user");

    if (!token || !user) {
      return false;
    }

    // Verify token is not expired
    const decoded = jwtDecode(token);
    const now = Date.now() / 1000;

    if (decoded.exp && decoded.exp <= now) {
      // Token expired, clear auth data
      console.log("🔒 Token expired, clearing authentication");
      clearAuthData();
      return false;
    }

    return true;
  } catch (error) {
    console.error("❌ Error checking authentication:", error);
    clearAuthData();
    return false;
  }
}

/**
 * Get current authenticated user
 */
export function getCurrentUser(): User | null {
  try {
    if (!isAuthenticated()) {
      return null;
    }
    
    const userStr = localStorage.getItem("user");
    if (!userStr) {
      return null;
    }
    
    return JSON.parse(userStr) as User;
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
}

/**
 * Get authentication token
 */
export function getAuthToken(): string | null {
  if (!isAuthenticated()) {
    return null;
  }
  
  return localStorage.getItem("idToken");
}

/**
 * Clear authentication data
 */
export function clearAuthData(): void {
  localStorage.removeItem("idToken");
  localStorage.removeItem("user");
  console.log("🔒 Authentication data cleared");
}

/**
 * Login user with token
 */
export function loginWithToken(token: string): User | null {
  try {
    const decoded = jwtDecode(token) as User;
    
    // Check if token is expired
    const now = Date.now() / 1000;
    if (decoded.exp && decoded.exp <= now) {
      console.error("Token is expired");
      return null;
    }
    
    localStorage.setItem("idToken", token);
    localStorage.setItem("user", JSON.stringify(decoded));
    
    console.log("✅ User logged in successfully:", decoded);
    return decoded;
  } catch (error) {
    console.error("❌ Failed to login with token:", error);
    return null;
  }
}

/**
 * Check if user has specific role
 */
export function hasRole(role: string): boolean {
  const user = getCurrentUser();
  return user?.role === role;
}

/**
 * Check if user is super admin
 */
export function isSuperAdmin(): boolean {
  return hasRole("super_admin");
}

/**
 * Redirect to login if not authenticated
 * Returns true if user is authenticated, false if redirected
 */
export function requireAuth(): boolean {
  if (!isAuthenticated()) {
    console.log("⚠️ Authentication required, redirecting...");
    // In a real app, you would redirect to login page
    // For now, we'll just clear the auth data and reload
    clearAuthData();
    window.location.href = "/";
    return false;
  }
  return true;
}
