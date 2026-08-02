import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthContext';

// Mock firebase modules
vi.mock('../../firebase', () => ({
  db: {},
  auth: { currentUser: null },
}));

const mockOnAuthStateChanged = vi.fn();
vi.mock('firebase/auth', () => ({
  onAuthStateChanged: (auth: unknown, callback: (user: null) => void) => {
    mockOnAuthStateChanged(auth, callback);
    // Simulate auth ready immediately with no user
    callback(null);
    return vi.fn(); // unsubscribe
  },
  signInWithPhoneNumber: vi.fn().mockResolvedValue({
    confirm: vi.fn().mockResolvedValue({
      user: { uid: 'anon-123', displayName: null, photoURL: null },
    })
  }),
  RecaptchaVerifier: vi.fn().mockImplementation(() => ({
    render: vi.fn(),
    clear: vi.fn(),
  })),
  signInWithPopup: vi.fn().mockResolvedValue({
    user: { uid: 'google-456', displayName: 'Test Admin' },
  }),
  GoogleAuthProvider: vi.fn().mockImplementation(function (this: { setCustomParameters: ReturnType<typeof vi.fn> }) {
    this.setCustomParameters = vi.fn();
  }),
  signOut: vi.fn().mockResolvedValue(undefined),
  updateProfile: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  setDoc: vi.fn().mockResolvedValue(undefined),
}));

// Test component that consumes the auth context
function AuthConsumer() {
  const { currentUser } = useAuth();
  return (
    <div>
      <span data-testid="user-status">
        {currentUser ? `Logged in as ${currentUser.displayName}` : 'Not logged in'}
      </span>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render children after auth state resolves', () => {
    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );

    expect(screen.getByTestId('user-status')).toBeInTheDocument();
  });

  it('should show "Not logged in" when no user is authenticated', () => {
    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );

    expect(screen.getByText('Not logged in')).toBeInTheDocument();
  });

  it('should throw when useAuth is used outside AuthProvider', () => {
    // Suppress React error output for this test
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => render(<AuthConsumer />)).toThrow(
      'useAuth must be used within an AuthProvider'
    );

    spy.mockRestore();
  });

  it('should provide sendOTP, verifyOTP, loginWithGoogle, and logout functions', () => {
    let contextValue: ReturnType<typeof useAuth> | null = null;

    function ContextCapture() {
      contextValue = useAuth();
      return null;
    }

    render(
      <AuthProvider>
        <ContextCapture />
      </AuthProvider>
    );

    expect(contextValue).not.toBeNull();
    expect(typeof contextValue!.sendOTP).toBe('function');
    expect(typeof contextValue!.verifyOTP).toBe('function');
    expect(typeof contextValue!.loginWithGoogle).toBe('function');
    expect(typeof contextValue!.logout).toBe('function');
  });
});
