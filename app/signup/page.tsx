'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Eye, EyeOff, Check, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const PASSWORD_MIN_LENGTH = 8;

export default function SignUpPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { signup, login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [acknowledgeAI, setAcknowledgeAI] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    mobile: ''
  });

  // Password validation states
  const [passwordFocused, setPasswordFocused] = useState(false);
  const passwordValidation = {
    minLength: formData.password.length >= PASSWORD_MIN_LENGTH,
    hasNumber: /\d/.test(formData.password),
    hasUppercase: /[A-Z]/.test(formData.password),
    hasLowercase: /[a-z]/.test(formData.password),
    hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(formData.password),
  };

  const isPasswordValid = Object.values(passwordValidation).every(Boolean);
  const passwordsMatch = formData.password === formData.confirmPassword;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Sign up the user
      const signupResponse = await signup({
        name: formData.name.trim(),
        email: formData.email.toLowerCase().trim(),
        password: formData.password,
        mobile: formData.mobile.trim(),
        agreeToTerms: agreeToTerms,
        acknowledgeAI: acknowledgeAI
      });
      
      toast({
        title: 'Success',
        description: 'Account created successfully! Welcome to Flintime.',
        variant: 'default',
      });
      
      // Redirect to home page since user is already logged in via signup
      router.push('/');
    } catch (error) {
      console.error('Signup error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create account',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const ValidationItem = ({ isValid, text }: { isValid: boolean; text: string }) => (
    <div className="flex items-center space-x-2 text-sm">
      {isValid ? (
        <Check className="h-4 w-4 text-green-500" />
      ) : (
        <X className="h-4 w-4 text-gray-300" />
      )}
      <span className={isValid ? 'text-green-500' : 'text-gray-500'}>{text}</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 to-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-[400px] space-y-6">
        {/* Logo and Branding */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-block">
            <Image
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IconOnly_Transparent_NoBuffer%20(1)-qipSsiq4ftcvpww0P3lSnzRPc4YOtH.png"
              alt="Flintime"
              width={60}
              height={60}
              className="mx-auto"
            />
          </Link>
          <h1 className="text-2xl font-bold text-violet-600">Create your account</h1>
          <p className="text-gray-500">Join Flintime and start managing your time better</p>
        </div>

        <Card className="border-0 shadow-lg">
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4 pt-6">
              {isSuccess ? (
                <div className="text-center py-8 space-y-4">
                  <div className="flex justify-center">
                    <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                      <Check className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-gray-900">Account created successfully!</h3>
                    <p className="text-sm text-gray-500">Redirecting you to sign in...</p>
                  </div>
                  <div className="animate-spin h-5 w-5 border-2 border-violet-600 border-t-transparent rounded-full mx-auto"></div>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium">
                      Full name
                    </Label>
                    <Input
                      id="name"
                      name="name"
                      type="text"
                      placeholder="John Doe"
                      required
                      disabled={isLoading}
                      className="h-11"
                      value={formData.name}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium">
                      Email address
                    </Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="name@example.com"
                      required
                      disabled={isLoading}
                      className="h-11"
                      value={formData.email}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mobile" className="text-sm font-medium">
                      Mobile Number
                    </Label>
                    <Input
                      id="mobile"
                      name="mobile"
                      type="tel"
                      placeholder="+1234567890"
                      required
                      disabled={isLoading}
                      className="h-11"
                      value={formData.mobile}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium">
                      Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        required
                        disabled={isLoading}
                        className="h-11 pr-10"
                        value={formData.password}
                        onChange={handleInputChange}
                        onFocus={() => setPasswordFocused(true)}
                        onBlur={() => setPasswordFocused(false)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-violet-600"
                      >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                    {/* Password requirements */}
                    {(passwordFocused || formData.password) && (
                      <div className="mt-2 space-y-2 text-xs">
                        <ValidationItem 
                          isValid={passwordValidation.minLength} 
                          text={`At least ${PASSWORD_MIN_LENGTH} characters`} 
                        />
                        <ValidationItem 
                          isValid={passwordValidation.hasUppercase} 
                          text="One uppercase letter" 
                        />
                        <ValidationItem 
                          isValid={passwordValidation.hasLowercase} 
                          text="One lowercase letter" 
                        />
                        <ValidationItem 
                          isValid={passwordValidation.hasNumber} 
                          text="One number" 
                        />
                        <ValidationItem 
                          isValid={passwordValidation.hasSpecialChar} 
                          text="One special character" 
                        />
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-sm font-medium">
                      Confirm password
                    </Label>
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      required
                      disabled={isLoading}
                      className={`h-11 ${
                        formData.confirmPassword && !passwordsMatch ? 'border-red-500 focus:ring-red-500' : ''
                      }`}
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                    />
                    {formData.confirmPassword && !passwordsMatch && (
                      <p className="text-sm text-red-500 mt-1">Passwords do not match</p>
                    )}
                  </div>
                  
                  {/* Terms Agreement */}
                  <div className="space-y-2">
                    <div className="flex items-start space-x-2">
                      <input
                        type="checkbox"
                        id="terms"
                        checked={agreeToTerms}
                        onChange={(e) => setAgreeToTerms(e.target.checked)}
                        className="rounded border-gray-300 text-violet-600 mt-1"
                      />
                      <Label htmlFor="terms" className="text-sm font-normal">
                        I agree to the{' '}
                        <Link href="/terms" className="text-violet-600 hover:underline font-medium">
                          Terms of Service
                        </Link>{' '}
                        and{' '}
                        <Link href="/privacy" className="text-violet-600 hover:underline font-medium">
                          Privacy Policy
                        </Link>
                        {' '}and{' '}
                        <Link href="/refund-policy" className="text-violet-600 hover:underline font-medium">
                          Cancellation & Refund Policy
                        </Link>
                        {' '}and{' '}
                        <Link href="/third-party-links" className="text-violet-600 hover:underline font-medium">Third-Party Links</Link>
                        {' '}and{' '}
                        <Link href="/cookie-policy" className="text-violet-600 hover:underline font-medium">
                          Cookie Policy
                        </Link>
                        {' '}and our{' '}
                        <Link href="/intellectual-property" className="text-violet-600 hover:underline font-medium">
                          Intellectual Property
                        </Link>
                        {' '}and{' '}
                        <Link href="/third-party-links" className="text-violet-600 hover:underline font-medium">Third-Party Links</Link>
                        {' '}and acknowledge Flintime's{' '}
                        <Link href="/disclaimer" className="text-violet-600 hover:underline font-medium">
                          Disclaimer and Limitation of Liability
                        </Link>
                      </Label>
                    </div>
                  </div>
                  
                  {/* AI Acknowledgment */}
                  <div className="space-y-2">
                    <div className="flex items-start space-x-2">
                      <input
                        type="checkbox"
                        id="aiAcknowledgment"
                        required
                        checked={acknowledgeAI}
                        onChange={(e) => setAcknowledgeAI(e.target.checked)}
                        className="rounded border-gray-300 text-violet-600 mt-1"
                      />
                      <Label htmlFor="aiAcknowledgment" className="text-sm font-normal">
                        I understand Flintime uses AI technology for interactions.{" "}
                        <Link href="/ai-transparency" className="text-violet-600 hover:underline font-medium" target="_blank">
                          Learn more.
                        </Link>
                      </Label>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading || !isPasswordValid || !passwordsMatch || !acknowledgeAI || !agreeToTerms}
                    className="w-full h-11 bg-violet-600 hover:bg-violet-700"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      'Create account'
                    )}
                  </Button>
                </>
              )}
            </CardContent>
          </form>
        </Card>

        <div className="text-center space-y-4">
          <div className="text-sm text-gray-500">
            Already have an account?{' '}
            <Link href="/signin" className="text-violet-600 hover:text-violet-700 hover:underline font-medium">
              Sign in
            </Link>
          </div>
          <div className="text-xs text-gray-400">
            By creating an account, you agree to our{' '}
            <Link href="/terms" className="hover:text-violet-600 underline">Terms of Service</Link>
            {' '}and{' '}
            <Link href="/privacy" className="hover:text-violet-600 underline">Privacy Policy</Link>
            {' '}and{' '}
            <Link href="/refund-policy" className="hover:text-violet-600 underline">Cancellation & Refund Policy</Link>
            {' '}and{' '}
            <Link href="/third-party-links" className="hover:text-violet-600 underline">Third-Party Links</Link>
            {' '}and our{' '}
            <Link href="/accessibility" className="hover:text-violet-600 underline">Accessibility</Link> commitment.
          </div>
        </div>
      </div>
    </div>
  );
} 