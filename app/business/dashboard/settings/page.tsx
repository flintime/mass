'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Eye,
  EyeOff,
  Lock,
  Bell,
  Mail,
  Trash2,
  AlertTriangle,
  Loader2,
  Settings as SettingsIcon,
  UserCog,
  CreditCard,
  CheckCircle2,
  BadgeX,
  BadgeAlert
} from 'lucide-react';
import { businessAuth } from '@/lib/businessAuth';
import useMobileDetect from '@/hooks/useMobileDetect';
import './mobile.css';

interface IPreferences {
  autoConfirm: boolean;
  displayInSearch: boolean;
  emailNotifications: boolean;
  appointmentReminders: boolean;
  marketingEmails: boolean;
}

interface SubscriptionInfo {
  status: 'active' | 'cancelled' | 'trial' | 'unpaid' | 'past_due' | 'none';
  currentPeriodEnd?: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
}

// Add password strength checker function
const checkPasswordStrength = (password: string): {
  score: number;
  feedback: string;
  color: string;
} => {
  let score = 0;
  let feedback = [];

  if (password.length >= 8) {
    score += 1;
    feedback.push("Length");
  }
  if (/[A-Z]/.test(password)) {
    score += 1;
    feedback.push("Uppercase");
  }
  if (/[a-z]/.test(password)) {
    score += 1;
    feedback.push("Lowercase");
  }
  if (/[0-9]/.test(password)) {
    score += 1;
    feedback.push("Number");
  }
  if (/[^A-Za-z0-9]/.test(password)) {
    score += 1;
    feedback.push("Special");
  }

  const colors = {
    0: "bg-red-500",
    1: "bg-red-400",
    2: "bg-yellow-500",
    3: "bg-yellow-400",
    4: "bg-green-500",
    5: "bg-green-400"
  };

  return {
    score,
    feedback: feedback.join(" • "),
    color: colors[score as keyof typeof colors]
  };
};

export default function Settings() {
  const router = useRouter();
  const { isMobile } = useMobileDetect();
  const [isLoading, setIsLoading] = useState(false);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo>({
    status: 'none'
  });
  const [preferences, setPreferences] = useState<IPreferences>({
    autoConfirm: true,
    displayInSearch: true,
    emailNotifications: true,
    appointmentReminders: true,
    marketingEmails: false,
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    feedback: "",
    color: "bg-gray-200"
  });

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingPreferenceChange, setPendingPreferenceChange] = useState<{
    key: keyof IPreferences;
    value: boolean;
  } | null>(null);

  // Add debug logging for authentication state
  useEffect(() => {
    // Log authentication status
    const isAuthenticated = businessAuth.isAuthenticated();
    console.log('⭐ Business Authentication Status:', { 
      isAuthenticated,
      hasToken: !!businessAuth.getToken(),
      tokenValue: businessAuth.getToken()?.substring(0, 10) + '...' || 'none'
    });
    
    // Check cookies directly
    const allCookies = document.cookie.split(';').map(cookie => cookie.trim());
    console.log('⭐ All cookies:', allCookies);
    const authCookie = allCookies.find(c => c.startsWith('businessAuthToken='));
    console.log('⭐ Business Auth Cookie:', authCookie || 'none');
  }, []);

  useEffect(() => {
    // Fetch user preferences
    const fetchPreferences = async () => {
      try {
        setIsLoading(true);
        // Get user preferences from the backend using businessAuth
        const settings = await businessAuth.getSettings();
        setPreferences(settings.preferences);
      } catch (error) {
        console.error('Error fetching preferences:', error);
        toast.error('Failed to load preferences');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPreferences();
    
    // Fetch subscription info
    const fetchSubscriptionInfo = async () => {
      setSubscriptionLoading(true);
      try {
        // Get auth token
        const token = businessAuth.getToken();
        console.log('🔄 Fetching subscription with token:', !!token);
        
        const response = await fetch('/api/business/subscription/status', {
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Cache-Control': 'no-cache'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('Subscription data:', data);
          if (data.subscription) {
            setSubscriptionInfo({
              status: data.subscription.status,
              currentPeriodEnd: data.subscription.currentPeriodEnd,
              stripeCustomerId: data.subscription.stripeCustomerId,
              stripeSubscriptionId: data.subscription.stripeSubscriptionId
            });
          }
        } else {
          console.error('Failed to fetch subscription info:', await response.text());
        }
      } catch (error) {
        console.error('Error fetching subscription info:', error);
      } finally {
        setSubscriptionLoading(false);
      }
    };
    
    fetchSubscriptionInfo();
  }, []);

  // Update password strength when new password changes
  useEffect(() => {
    if (passwordData.newPassword) {
      setPasswordStrength(checkPasswordStrength(passwordData.newPassword));
    } else {
      setPasswordStrength({
        score: 0,
        feedback: "",
        color: "bg-gray-200"
      });
    }
  }, [passwordData.newPassword]);

  const handlePreferenceChange = async (key: keyof IPreferences) => {
    try {
      setIsLoading(true);
      
      // Update local state immediately for responsive UI
      setPreferences(prev => ({
        ...prev,
        [key]: !prev[key],
      }));
      
      // Create updated preferences object
      const updatedPreferences = {
        ...preferences,
        [key]: !preferences[key],
      };
      
      // Update settings via businessAuth
      await businessAuth.updateSettings({
        preferences: updatedPreferences
      });
      
      toast.success('Preference updated successfully');
    } catch (error) {
      console.error('Error updating preference:', error);
      toast.error('Failed to update preference');
      
      // Revert state on error
      setPreferences(prev => ({
        ...prev,
        [key]: !prev[key],
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    // Add password strength validation
    if (passwordStrength.score < 3) {
      toast.error('Password is too weak. Please include uppercase, lowercase, numbers, and special characters.');
      return;
    }
    
    try {
      setIsLoading(true);
      
      await businessAuth.updateSettings({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      
      toast.success('Password updated successfully');
    } catch (error: any) {
      console.error('Error updating password:', error);
      toast.error(error.message || 'Failed to update password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    // Validate confirmation text
    if (deleteConfirmation.toLowerCase() !== 'delete') {
      toast.error('Please type "delete" to confirm');
      return;
    }

    try {
      setIsLoading(true);
      
      // Call the businessAuth deleteAccount method
      await businessAuth.deleteAccount();
      
      // The deleteAccount method already calls signout(), which redirects to signin page
      // No need to manually call signout() or router.push() here
    } catch (error: any) {
      console.error('Error deleting account:', error);
      toast.error(error.message || 'Failed to delete account');
      setShowDeleteDialog(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Reset delete confirmation when dialog closes
  useEffect(() => {
    if (!showDeleteDialog) {
      setDeleteConfirmation('');
    }
  }, [showDeleteDialog]);

  const handlePreferenceChangeRequest = (key: keyof IPreferences) => {
    // If it's a critical setting, show confirmation dialog
    if (key === 'emailNotifications' || key === 'appointmentReminders') {
      setPendingPreferenceChange({
        key,
        value: !preferences[key]
      });
      setShowConfirmDialog(true);
    } else {
      // For non-critical settings, update directly
      handlePreferenceChange(key);
    }
  };

  const confirmPreferenceChange = async () => {
    if (pendingPreferenceChange) {
      await handlePreferenceChange(pendingPreferenceChange.key);
      setPendingPreferenceChange(null);
      setShowConfirmDialog(false);
    }
  };

  const handleManageSubscription = async () => {
    setSubscriptionLoading(true);
    try {
      // Get auth token
      const token = businessAuth.getToken();
      console.log('🔄 Managing subscription with token:', !!token);
      
      const response = await fetch('/api/business/subscription/manage', {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Cache-Control': 'no-cache'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.url) {
          window.location.href = data.url;
        } else {
          toast.error('No portal URL returned');
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        
        // Handle detailed error messages
        if (errorData.steps) {
          console.error('Stripe portal configuration error:', errorData);
          
          // Show error with steps
          toast.error(
            <div>
              <p>{errorData.error}</p>
              <ul className="mt-2 ml-4 list-disc">
                {errorData.steps.map((step: string, i: number) => (
                  <li key={i} className="text-sm">{step}</li>
                ))}
              </ul>
            </div>,
            { duration: 10000 }
          );
        } else {
          toast.error(errorData.error || 'Failed to manage subscription');
        }
      }
    } catch (error) {
      console.error('Error managing subscription:', error);
      toast.error('Failed to access subscription management');
    } finally {
      setSubscriptionLoading(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getSubscriptionStatusLabel = () => {
    switch (subscriptionInfo.status) {
      case 'active':
        return (
          <div className="flex items-center gap-1.5 text-green-600 font-medium">
            <CheckCircle2 className="h-4 w-4" />
            <span>Active</span>
          </div>
        );
      case 'cancelled':
        return (
          <div className="flex items-center gap-1.5 text-amber-600 font-medium">
            <BadgeX className="h-4 w-4" />
            <span>Cancelled</span>
          </div>
        );
      case 'trial':
        return (
          <div className="flex items-center gap-1.5 text-blue-600 font-medium">
            <BadgeAlert className="h-4 w-4" />
            <span>Trial</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-1.5 text-red-600 font-medium">
            <BadgeX className="h-4 w-4" />
            <span>Inactive</span>
          </div>
        );
    }
  };

  return (
    <div className={`space-y-6 py-6 px-4 md:px-6 lg:px-8 ${isMobile ? 'mobile-container' : ''}`}>
      <div className={`flex items-center justify-between ${isMobile ? 'mobile-header' : ''}`}>
        <h1 className="text-2xl font-bold tracking-tight">Account Settings</h1>
      </div>

      {/* Subscription Management Card */}
      <Card className={`mb-6 ${isMobile ? 'mobile-card' : ''}`}>
        <CardHeader className={isMobile ? 'mobile-card-header' : ''}>
          <CardTitle className={`flex items-center gap-2 ${isMobile ? 'mobile-card-title' : ''}`}>
            <CreditCard className="h-5 w-5 text-violet-500" />
            Subscription
          </CardTitle>
          <CardDescription className={isMobile ? 'mobile-card-description' : ''}>
            Manage your subscription and billing information
          </CardDescription>
        </CardHeader>
        <CardContent className={isMobile ? 'mobile-card-content' : ''}>
          {subscriptionLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-violet-600" />
              <span className="ml-2 text-sm text-gray-600">Loading subscription details...</span>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg bg-gray-50 p-4 border border-gray-100">
                <div className={`flex items-center justify-between ${isMobile ? 'mobile-subscription-info' : ''}`}>
                  <div>
                    <h3 className="font-medium">Current Plan</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm">
                        {subscriptionInfo.status === 'active' || 
                         subscriptionInfo.status === 'cancelled' ? 'Premium' : 
                         subscriptionInfo.status === 'trial' ? 'Trial' : 'Free Plan'}
                      </span>
                      {getSubscriptionStatusLabel()}
                    </div>
                    {subscriptionInfo.currentPeriodEnd && (
                      <span className="text-sm text-gray-500 mt-1">
                        {subscriptionInfo.status === 'cancelled' ? 'Access until' : 'Next billing date'}: {formatDate(subscriptionInfo.currentPeriodEnd)}
                      </span>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleManageSubscription}
                    disabled={subscriptionLoading || subscriptionInfo.status === 'none' || !subscriptionInfo.stripeCustomerId}
                    className={`bg-white ${isMobile ? 'mobile-subscription-button' : ''}`}
                  >
                    {subscriptionLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        {subscriptionInfo.status === 'none' ? 'Subscribe' : 'Manage Subscription'}
                      </>
                    )}
                  </Button>
                </div>
              </div>
              
              {subscriptionInfo.status === 'none' && (
                <div className="rounded-lg bg-indigo-50 p-4 border border-indigo-100">
                  <p className="text-sm text-indigo-700">
                    You don't have an active subscription. Subscribe to unlock premium features.
                  </p>
                  <Button 
                    size="sm" 
                    className={`mt-2 ${isMobile ? 'mobile-form-button' : ''}`}
                    onClick={() => router.push('/business/subscription')}
                  >
                    View Plans
                  </Button>
                </div>
              )}
              
              {subscriptionInfo.status === 'cancelled' && (
                <div className="rounded-lg bg-amber-50 p-4 border border-amber-100">
                  <p className="text-sm text-amber-700">
                    Your subscription has been cancelled and will end on {formatDate(subscriptionInfo.currentPeriodEnd)}.
                  </p>
                  <Button 
                    size="sm" 
                    className={`mt-2 ${isMobile ? 'mobile-form-button' : ''}`}
                    onClick={() => router.push('/business/subscription')}
                  >
                    Resubscribe
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preferences Card */}
      <Card className={`mb-6 ${isMobile ? 'mobile-card' : ''}`}>
        <CardHeader className={isMobile ? 'mobile-card-header' : ''}>
          <CardTitle className={`flex items-center gap-2 ${isMobile ? 'mobile-card-title' : ''}`}>
            <UserCog className="h-5 w-5 text-violet-500" />
            Preferences
          </CardTitle>
          <CardDescription className={isMobile ? 'mobile-card-description' : ''}>
            Customize your experience with these settings
          </CardDescription>
        </CardHeader>
        <CardContent className={isMobile ? 'mobile-card-content' : ''}>
          <div className="flex flex-col items-center justify-center py-4 px-2 bg-gray-50 rounded-md border border-gray-200">
            <BadgeAlert className="h-5 w-5 text-amber-500 mb-2" />
            <p className="text-center text-gray-600 font-medium">Preferences are temporarily unavailable.</p>
            <p className="text-center text-gray-500 text-sm mt-1">We're working on improving this feature and will bring it back soon.</p>
          </div>
        </CardContent>
      </Card>

      {/* Security Section */}
      <Card className={`mb-6 ${isMobile ? 'mobile-card' : ''}`}>
        <CardHeader className={isMobile ? 'mobile-card-header' : ''}>
          <CardTitle className={`flex items-center gap-2 ${isMobile ? 'mobile-card-title' : ''}`}>
            <Lock className="h-5 w-5 text-violet-500" />
            Security
          </CardTitle>
          <CardDescription className={isMobile ? 'mobile-card-description' : ''}>
            Update your password and security settings
          </CardDescription>
        </CardHeader>
        <CardContent className={isMobile ? 'mobile-card-content' : ''}>
          <form onSubmit={handlePasswordUpdate} className={`space-y-4 ${isMobile ? 'mobile-password-form' : ''}`}>
            <div className={`space-y-2 ${isMobile ? 'input-group' : ''}`}>
              <Label htmlFor="currentPassword" className={isMobile ? 'mobile-form-label' : ''}>Current Password</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showPasswords.current ? "text" : "password"}
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  required
                  className={isMobile ? 'mobile-form-input' : ''}
                />
                <button
                  type="button"
                  className={`absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 ${isMobile ? 'mobile-password-toggle' : ''}`}
                  onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                >
                  {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className={`space-y-2 ${isMobile ? 'input-group' : ''}`}>
              <Label htmlFor="newPassword" className={isMobile ? 'mobile-form-label' : ''}>New Password</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showPasswords.new ? "text" : "password"}
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  required
                  className={isMobile ? 'mobile-form-input' : ''}
                />
                <button
                  type="button"
                  className={`absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 ${isMobile ? 'mobile-password-toggle' : ''}`}
                  onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                >
                  {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {/* Password strength indicator */}
              {passwordData.newPassword && (
                <div className={`mt-2 ${isMobile ? 'mobile-password-strength' : ''}`}>
                  <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                    <div className={`h-full ${passwordStrength.color}`} style={{ width: `${passwordStrength.score * 20}%` }}></div>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-gray-500">{passwordStrength.feedback}</span>
                    <span className="text-xs text-gray-500">{passwordStrength.score}/5</span>
                  </div>
                </div>
              )}
            </div>
            <div className={`space-y-2 ${isMobile ? 'input-group' : ''}`}>
              <Label htmlFor="confirmPassword" className={isMobile ? 'mobile-form-label' : ''}>Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showPasswords.confirm ? "text" : "password"}
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  required
                  className={isMobile ? 'mobile-form-input' : ''}
                />
                <button
                  type="button"
                  className={`absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 ${isMobile ? 'mobile-password-toggle' : ''}`}
                  onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                >
                  {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button 
              type="submit" 
              disabled={isLoading} 
              className={`w-full ${isMobile ? 'mobile-form-button button' : ''}`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Password"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Account Deletion Section */}
      <Card className={`mb-6 border-red-200 ${isMobile ? 'mobile-card' : ''}`}>
        <CardHeader className={isMobile ? 'mobile-card-header' : ''}>
          <CardTitle className={`flex items-center gap-2 text-red-600 ${isMobile ? 'mobile-card-title' : ''}`}>
            <Trash2 className="h-5 w-5" />
            Delete Account
          </CardTitle>
          <CardDescription className={isMobile ? 'mobile-card-description' : ''}>
            Permanently delete your account and all associated data
          </CardDescription>
        </CardHeader>
        <CardContent className={isMobile ? 'mobile-card-content' : ''}>
          <p className="text-sm text-gray-600 mb-4">
            This will permanently delete your account, all of your data, and cancel any active subscriptions. This action cannot be undone.
          </p>
          <Button 
            variant="destructive" 
            onClick={() => setShowDeleteDialog(true)}
            className={`w-full sm:w-auto ${isMobile ? 'mobile-delete-button' : ''}`}
          >
            Delete Account
          </Button>
        </CardContent>
      </Card>

      {/* Delete Account Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className={isMobile ? 'mobile-dialog' : ''}>
          <DialogHeader className={isMobile ? 'mobile-dialog-header' : ''}>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" /> 
              Delete Account
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. All your data will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="deleteConfirmation" className={isMobile ? 'mobile-form-label' : ''}>Type "delete" to confirm</Label>
              <Input
                id="deleteConfirmation"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                placeholder="delete"
                className={isMobile ? 'mobile-form-input' : ''}
              />
            </div>
          </div>
          <DialogFooter className={isMobile ? 'mobile-dialog-footer' : ''}>
            <Button 
              variant="outline" 
              onClick={() => setShowDeleteDialog(false)}
              className={isMobile ? 'mobile-form-button' : ''}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteAccount}
              disabled={isLoading || deleteConfirmation.toLowerCase() !== 'delete'}
              className={isMobile ? 'mobile-form-button' : ''}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Account"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preference Change Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className={isMobile ? 'mobile-dialog' : ''}>
          <DialogHeader className={isMobile ? 'mobile-dialog-header' : ''}>
            <DialogTitle>
              {pendingPreferenceChange?.key === 'emailNotifications' ? 'Email Notifications' : 'Appointment Reminders'}
            </DialogTitle>
            <DialogDescription>
              {pendingPreferenceChange?.key === 'emailNotifications' && (
                <>
                  {pendingPreferenceChange.value
                    ? "You're about to enable email notifications. You'll receive important updates about your business."
                    : "You're about to disable email notifications. You won't receive important updates about your business."}
                </>
              )}
              {pendingPreferenceChange?.key === 'appointmentReminders' && (
                <>
                  {pendingPreferenceChange.value
                    ? "You're about to enable appointment reminders. You and your customers will receive reminders about upcoming appointments."
                    : "You're about to disable appointment reminders. You and your customers won't receive reminders about upcoming appointments."}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className={isMobile ? 'mobile-dialog-footer' : ''}>
            <Button
              variant="outline"
              onClick={() => {
                setPendingPreferenceChange(null);
                setShowConfirmDialog(false);
              }}
              className={isMobile ? 'mobile-form-button' : ''}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmPreferenceChange}
              className={isMobile ? 'mobile-form-button' : ''}
            >
              {pendingPreferenceChange?.value ? 'Enable' : 'Disable'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 