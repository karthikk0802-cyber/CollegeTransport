import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';

const Login = () => {
  const { login, register, user, loading } = useAuth();
  
  const [selectedRole, setSelectedRole] = useState(null); // 'student', 'driver', 'admin', or null
  const [isRegister, setIsRegister] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // If already logged in, redirect to correct dashboard
  if (!loading && user) {
    return <Navigate to={`/${user.role}`} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    if (isRegister) {
      if (!name || !email || !password) {
        setError('Please fill in all required fields');
        setSubmitting(false);
        return;
      }
      
      const payload = { name, email, password, role: selectedRole, phone };
      if (selectedRole === 'student' && rollNumber) {
        payload.rollNumber = rollNumber;
      }

      const res = await register(payload);
      if (!res.success) {
        setError(res.message);
      }
    } else {
      if (!email || !password) {
        setError('Please fill in all fields');
        setSubmitting(false);
        return;
      }
      
      const res = await login(email, password);
      if (!res.success) {
        setError(res.message);
      }
    }
    
    setSubmitting(false);
  };

  const getRoleHeader = () => {
    switch (selectedRole) {
      case 'student':
        return 'STUDENT PORTAL';
      case 'driver':
        return 'DRIVER TERMINAL';
      case 'admin':
        return 'ADMIN CONTROL';
      default:
        return 'PORTAL LOGIN';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      {selectedRole === null ? (
        /* ======================================================== */
        /* ROLE SELECTOR SCREEN (ON OPENING WEBSITE) */
        /* ======================================================== */
        <div className="w-full max-w-lg glass-panel p-8 md:p-10 border-zinc-200 text-center space-y-8 animate-fade-in">
          <div>
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-black text-white mb-4 font-bold text-xl">
              CT
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-black">COLLEGE TRANSPORT</h1>
            <p className="text-sm text-zinc-500 mt-2">
              Select your transit gateway to continue
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <button
              onClick={() => {
                setSelectedRole('student');
                setError('');
                setIsRegister(false);
              }}
              className="w-full py-5 px-6 glass-panel-light hover:bg-black hover:text-white border-zinc-300 hover:border-black transition-all flex flex-col items-center justify-center gap-1 active:scale-98 duration-200"
            >
              <span className="text-2xl">🎓</span>
              <span className="text-sm font-bold uppercase tracking-wider">Student Portal</span>
              <span className="text-[10px] text-zinc-400 hover:text-zinc-300 font-medium">Track your assigned campus bus</span>
            </button>

            <button
              onClick={() => {
                setSelectedRole('driver');
                setError('');
                setIsRegister(false);
              }}
              className="w-full py-5 px-6 glass-panel-light hover:bg-black hover:text-white border-zinc-300 hover:border-black transition-all flex flex-col items-center justify-center gap-1 active:scale-98 duration-200"
            >
              <span className="text-2xl">🚐</span>
              <span className="text-sm font-bold uppercase tracking-wider">Driver Terminal</span>
              <span className="text-[10px] text-zinc-400 hover:text-zinc-300 font-medium">Broadcast journey and GPS updates</span>
            </button>

            <button
              onClick={() => {
                setSelectedRole('admin');
                setError('');
                setIsRegister(false);
              }}
              className="w-full py-5 px-6 glass-panel-light hover:bg-black hover:text-white border-zinc-300 hover:border-black transition-all flex flex-col items-center justify-center gap-1 active:scale-98 duration-200"
            >
              <span className="text-2xl">🔑</span>
              <span className="text-sm font-bold uppercase tracking-wider">Transport Admin</span>
              <span className="text-[10px] text-zinc-400 hover:text-zinc-300 font-medium">Manage vehicles, routes, and history</span>
            </button>
          </div>
        </div>
      ) : (
        /* ======================================================== */
        /* SPECIFIC LOGIN FORM SCREEN */
        /* ======================================================== */
        <div className="w-full max-w-md glass-panel p-8 md:p-10 border-zinc-200 animate-fade-in">
          {/* Back button */}
          <button
            onClick={() => {
              setSelectedRole(null);
              setError('');
            }}
            className="text-xs font-semibold text-zinc-500 hover:text-black transition-colors mb-6 flex items-center gap-1"
          >
            ← Back to Gateways
          </button>

          <div className="text-center mb-8">
            <span className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase">
              {getRoleHeader()}
            </span>
            <h2 className="text-2xl font-extrabold text-black mt-1">
              {isRegister ? 'Register Account' : 'Sign In'}
            </h2>
          </div>

          {error && (
            <div className="bg-zinc-100 border border-zinc-350 text-sm text-black px-4 py-3 rounded-xl mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {isRegister && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-650 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="glass-input"
                  placeholder="John Doe"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-655 mb-2">
                Email Address *
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="glass-input"
                placeholder="name@college.edu"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-655 mb-2">
                Password *
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="glass-input"
                placeholder="••••••••"
                required
              />
            </div>

            {isRegister && (
              <>
                {selectedRole === 'student' && (
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-655 mb-2">
                      Roll Number
                    </label>
                    <input
                      type="text"
                      value={rollNumber}
                      onChange={(e) => setRollNumber(e.target.value)}
                      className="glass-input"
                      placeholder="20BCE0123"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-655 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="glass-input"
                    placeholder="+91 98765 43210"
                  />
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full glass-button-primary mt-4"
            >
              {submitting ? 'Please wait...' : isRegister ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          <div className="mt-8 text-center text-sm text-zinc-500">
            <span>{isRegister ? 'Already have an account?' : 'Need to test the app?'} </span>
            <button
              type="button"
              onClick={() => {
                setIsRegister(!isRegister);
                setError('');
              }}
              className="text-black font-semibold hover:underline"
            >
              {isRegister ? 'Sign In instead' : 'Create user login'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
