# 🚀 Admin System Setup - Via Transilvanica Trail Map

## 🔐 **Admin Authentication**

The trail map now includes a dedicated admin dashboard at `/admin` with secure username/password authentication for managing waypoints.

### **Default Credentials**
- **Admin**: `admin` / `via-transilvanica-2024`
- **Moderator**: `moderator` / `moderator-2024`
- **Location**: `src/config/admin.ts`

### **How to Change the Password**

1. **Edit the config file**:
   ```typescript
   // src/config/admin.ts
   export const ADMIN_CONFIG = {
     PASSWORD: 'your-new-password-here', // ← Change this
     // ... other settings
   };
   ```

2. **Restart the development server** after changing the password

### **Security Features**

- ✅ **Password Protection**: Admin access requires correct password
- ✅ **Session Management**: 24-hour admin sessions
- ✅ **Auto-logout**: Sessions expire automatically
- ✅ **Secure Storage**: Admin state stored in localStorage
- ✅ **Logout Function**: Manual logout available

## 🎯 **Admin Functions**

### **Waypoint Management**
- **Add Waypoints**: Click "+" button or click on map
- **Edit Waypoints**: Modify existing waypoint details
- **Delete Waypoints**: Remove unwanted waypoints
- **View All**: Admin panel shows all waypoints

### **Access Control**
- **Admin Button**: Shows "Admin" button when not logged in
- **Admin Controls**: Shows admin tools when authenticated
- **Logout**: Red logout button to end admin session

## 🛠 **Configuration Options**

### **Session Settings**
```typescript
export const ADMIN_CONFIG = {
  PASSWORD: 'your-password',
  SESSION_DURATION_HOURS: 24,        // How long admin stays logged in
  SESSION_WARNING_HOURS: 1,          // Warning before session expires
  MAX_LOGIN_ATTEMPTS: 5,             // Login attempts before lockout
  LOCKOUT_DURATION_MINUTES: 15       // Lockout duration
};
```

### **Multiple Admin Users**
```typescript
export const ADMIN_USERS = [
  {
    username: 'admin',
    password: 'admin-password',
    role: 'super_admin'
  },
  {
    username: 'moderator',
    password: 'moderator-password',
    role: 'moderator'
  }
];
```

## 📱 **How to Use**

### **1. Access Admin Dashboard**
- Navigate to `/admin` in your browser
- Or click the "Admin Dashboard" button on the main map
- Enter username and password
- Click "Accesează" (Access)

### **2. Add Waypoints**
- **Method 1**: Click the "+" button and fill the form
- **Method 2**: Click directly on the map to set coordinates
- Fill in: Nume, Tip, Detalii
- Click "Adaugă" (Add)

### **3. Manage Waypoints**
- Click the settings gear icon
- View all waypoints in the admin panel
- Edit or delete existing waypoints

### **4. Logout**
- Click the red logout button
- Admin session ends immediately

## 🔒 **Security Best Practices**

### **Production Deployment**
1. **Change Default Password**: Always change from `via-transilvanica-2024`
2. **Strong Password**: Use a complex, unique password
3. **Regular Updates**: Change password periodically
4. **Access Control**: Limit who knows the admin password

### **Password Requirements**
- **Minimum Length**: 8 characters
- **Complexity**: Mix of letters, numbers, symbols
- **Uniqueness**: Don't reuse passwords from other services

## 🚨 **Troubleshooting**

### **Common Issues**
- **"Permission denied"**: Check Firebase rules are deployed
- **Admin button not showing**: Check component imports
- **Password not working**: Verify config file changes
- **Session expires quickly**: Check SESSION_DURATION_HOURS

### **Reset Admin Session**
- Clear browser localStorage
- Or use the logout button
- Restart development server

## 📁 **File Structure**

```
src/
├── app/
│   └── admin/
│       └── page.tsx              # Admin dashboard page
├── components/via-transilvanica/
│   ├── WaypointForm.tsx          # Add/edit waypoints
│   ├── WaypointDisplay.tsx       # View waypoint details
│   ├── WaypointMarker.tsx        # Map markers
│   ├── Navigation.tsx             # Navigation between map and admin
│   └── TrailMap.tsx              # Main map component
├── lib/
│   ├── adminAuthService.ts       # Authentication logic
│   └── waypointService.ts        # Firebase operations
├── config/
│   └── admin.ts                  # Admin configuration
└── types/
    └── waypoint.ts               # Type definitions
```

## 🎉 **Ready to Use!**

The admin system is now fully functional with password protection. Remember to:

1. **Change the default password** before going live
2. **Test all admin functions** thoroughly
3. **Keep the password secure** and share only with trusted users
4. **Monitor admin usage** for security

Happy trail mapping! 🗺️✨
