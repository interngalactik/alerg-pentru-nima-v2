// Secure admin authentication service using server-side validation
export class AdminAuthService {
  // Check if user is currently logged in as admin
  static async isAdminLoggedIn(): Promise<boolean> {
    try {
      const response = await fetch('/api/admin/status');
      const data = await response.json();
      return data.isAdmin === true;
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  }

  // Login with password (calls secure API)
  static async login(password: string): Promise<boolean> {
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();
      return data.success === true;
    } catch (error) {
      console.error('Error during login:', error);
      return false;
    }
  }

  // Logout (calls secure API)
  static async logout(): Promise<boolean> {
    try {
      const response = await fetch('/api/admin/logout', {
        method: 'POST',
      });

      const data = await response.json();
      return data.success === true;
    } catch (error) {
      console.error('Error during logout:', error);
      return false;
    }
  }
}
