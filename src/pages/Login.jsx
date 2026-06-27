import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [activeTab, setActiveTab] = useState('field-worker');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [workerName, setWorkerName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { loginAsFieldWorker, loginWithGoogle, currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser) {
      if (currentUser.isAnonymous) navigate('/app/field');
      else navigate('/dashboard/supervisor');
    }
  }, [currentUser, navigate]);

  const handleFieldWorkerLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await loginAsFieldWorker(workerName.trim(), phoneNumber.trim());
      navigate('/app/field');
    } catch (err) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setIsLoading(true);
    try {
      await loginWithGoogle();
      navigate('/dashboard/supervisor');
    } catch (err) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen w-full bg-surface text-text-primary font-body-base antialiased flex overflow-hidden">
      {/* Left Side Image */}
      <div className="hidden lg:block w-1/2 relative h-full bg-neutral-900">
        <img alt="ASHA Worker in the field" className="absolute inset-0 w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBj1FYf-fw3O_VikyiZk46FoJACs0ogLKG2GqZwGz4_Qx2J4HepaczQaTQRC37aWt6MaqFB2FR9H2ABkyi6nNZfqmt9X9qaSRHEMGUeW75bdTeQXiezSr5WzoymRGePldojGqXXl4mDqAWcfTk4kyxielk2lRdFfR2aJ2QEsY5MQT4GOdD-bVSRqA-BcZFiO1AwPves9zxtsaZz7f0rft0m2V8HlCZMFI18e9hrUjon3gvO7wWNn7K9xNeG-_eSKNDaEuoOzDtC_Us" />
      </div>

      {/* Right Side Content */}
      <div className="w-full lg:w-1/2 flex flex-col h-full relative overflow-y-auto bg-surface">
        
        {/* Header */}
        <div className="w-full px-8 py-8 flex items-center shrink-0">
          <img src="/logo-ia.png" alt="IntelliASHA Logo" className="h-10 w-auto object-contain" />
        </div>

        {/* Main Container */}
        <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
          <div className="w-full max-w-[480px]">
            {/* Logo Area */}
            <div className="text-center mb-8">
              <p className="font-body-base text-body-base text-secondary">Secure access for authorized personnel</p>
            </div>

            {error && <div className="mb-4 text-error bg-error-container p-3 rounded font-label-md">{error}</div>}

            {/* Login Card */}
            <div className="bg-surface-container-lowest rounded-lg border border-border-default shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
              
              {/* Tabs Navigation */}
              <div className="flex border-b border-border-default">
                <button 
                  className={`flex-1 py-4 font-title-sm text-title-sm transition-colors text-center border-b-2 ${activeTab === 'field-worker' ? 'border-primary text-text-primary' : 'text-secondary hover:text-text-primary border-transparent'}`}
                  onClick={() => setActiveTab('field-worker')}
                >
                  Field Worker
                </button>
                <button 
                  className={`flex-1 py-4 font-title-sm text-title-sm transition-colors text-center border-b-2 ${activeTab === 'supervisor' ? 'border-primary text-text-primary' : 'text-secondary hover:text-text-primary border-transparent'}`}
                  onClick={() => setActiveTab('supervisor')}
                >
                  Supervisor / Officer
                </button>
              </div>

              <div className="p-card-padding">
                
                {/* Field Worker Tab Content */}
                {activeTab === 'field-worker' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="font-title-lg text-title-lg mb-1">Welcome back</h2>
                      <p className="font-body-base text-body-base text-secondary">Sign in to start logging visits.</p>
                    </div>

                    <form className="space-y-4" onSubmit={handleFieldWorkerLogin}>
                      <div>
                        <label className="block font-label-md text-label-md text-on-surface-variant mb-1" htmlFor="workerName">Full Name</label>
                        <input 
                          className="block w-full px-3 py-3 font-body-base text-body-base bg-surface border-[1.5px] border-border-strong rounded focus:ring-0 focus:border-primary-container outline-none transition-colors" 
                          id="workerName" name="workerName" placeholder="e.g. Sunita Devi" required type="text"
                          value={workerName} onChange={(e) => setWorkerName(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block font-label-md text-label-md text-on-surface-variant mb-1" htmlFor="phone">Phone Number</label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3 font-body-base text-body-base text-secondary">+91</span>
                          <input 
                            className="block w-full pl-12 pr-3 py-3 font-body-base text-body-base bg-surface border-[1.5px] border-border-strong rounded focus:ring-0 focus:border-primary-container outline-none transition-colors" 
                            id="phone" name="phone" pattern="[0-9]{10}" placeholder="Enter 10-digit number" required type="tel"
                            value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)}
                          />
                        </div>
                      </div>
                      <button 
                        className="w-full bg-primary-container hover:bg-surface-tint text-on-primary font-title-sm text-title-sm py-3 rounded-lg transition-colors duration-150 disabled:opacity-50" 
                        type="submit"
                        disabled={isLoading}
                      >
                        {isLoading ? 'Signing in...' : 'Sign In'}
                      </button>
                    </form>
                  </div>
                )}

                {/* Supervisor Tab Content */}
                {activeTab === 'supervisor' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="font-title-lg text-title-lg mb-1">Officer Portal</h2>
                      <p className="font-body-base text-body-base text-secondary">Access dashboards and district reports.</p>
                    </div>
                    <div className="pt-4">
                      <button onClick={handleGoogleSignIn} className="w-full flex items-center justify-center gap-3 bg-surface-container-lowest border-[1.5px] border-border-strong hover:bg-surface-container-low text-text-primary font-title-sm text-title-sm py-3 rounded-lg transition-colors duration-150" type="button">
                        <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path>
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"></path>
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path>
                        </svg>
                        Sign in with Google
                      </button>
                    </div>
                    <div className="mt-8 pt-6 border-t border-border-default text-center">
                      <p className="font-label-sm text-label-sm text-secondary">Requires valid @gov.in or authorized institutional account.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="w-full py-8 px-gutter flex flex-col md:flex-row justify-between items-center max-w-max-width mx-auto border-t border-border-default bg-surface shrink-0 mt-auto">
          <div className="flex items-center gap-2 mb-4 md:mb-0">
            <img src="/logo-ia.png" alt="IntelliASHA Logo" className="h-6 w-auto object-contain" />
            <span className="font-label-sm text-label-sm text-on-surface-variant">© 2026 IntelliASHA. AI House × Google for Developers.</span>
          </div>
          <div className="flex gap-4">
            <a className="font-label-sm text-label-sm text-on-secondary-container hover:text-primary transition-opacity duration-200" href="#">GitHub</a>
            <a className="font-label-sm text-label-sm text-on-secondary-container hover:text-primary transition-opacity duration-200" href="#">Contact</a>
            <a className="font-label-sm text-label-sm text-on-secondary-container hover:text-primary transition-opacity duration-200" href="#">Privacy</a>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Login;
