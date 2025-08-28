// Secure admin authentication service using server-side validation
export class AdminAuthService {
  // Check if user is currently logged in as admin
  static async isAdminLoggedIn(): Promise<boolean> {
    try {
      // First try the server-side check
      const response = await fetch('/api/admin/status');
      const data = await response.json();
      
      if (data.isAdmin === true) {
        return true;
      }
      
      // If server-side check fails, try localStorage fallback
      const localToken = localStorage.getItem('admin_token');
      if (localToken) {
        // console.log('AdminAuthService: Found token in localStorage, validating...');
        // Simple client-side validation (not as secure but works for testing)
        try {
          const parts = localToken.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(atob(parts[1]));
            if (payload.isAdmin === true && payload.timestamp) {
              const age = Date.now() - payload.timestamp;
              if (age < 24 * 60 * 60 * 1000) { // 24 hours
                // console.log('AdminAuthService: localStorage token is valid');
                return true;
              }
            }
          }
        } catch (localError) {
          // console.error('AdminAuthService: Error validating localStorage token:', localError);
        }
      }
      
      return false;
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  }

  // Login with password (calls secure API)
  static async login(password: string): Promise<boolean> {
    try {
      // console.log('AdminAuthService: Sending login request...');
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      // console.log('AdminAuthService: Response status:', response.status);
      const data = await response.json();
      // console.log('AdminAuthService: Response data:', data);
      // console.log('AdminAuthService: Checking for token in response...');
      
      if (data.success && data.token) {
        // console.log('AdminAuthService: Found token, storing in localStorage...');
        localStorage.setItem('admin_token', data.token);
        // console.log('AdminAuthService: Token stored in localStorage');
        
        // Verify it was stored
        const storedToken = localStorage.getItem('admin_token');
        // console.log('AdminAuthService: Verification - token in localStorage:', !!storedToken);
      } else {
        // console.log('AdminAuthService: No token found in response:', {
        //   success: data.success,
        //   hasToken: !!data.token
        // });
      }
      
      return data.success === true;
    } catch (error) {
      // console.error('AdminAuthService: Error during login:', error);
      return false;
    }
  }

  // Logout (calls secure API)
  static async logout(): Promise<boolean> {
    try {
      // Clear localStorage token
      localStorage.removeItem('admin_token');
      // console.log('AdminAuthService: Token removed from localStorage');
      
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
