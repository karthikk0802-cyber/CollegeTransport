import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';

const Login = () => {
  const { login, register, user, loading } = useAuth();
  
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('student');
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
      
      const payload = { name, email, password, role, phone };
      if (role === 'student' && rollNumber) {
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

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md glass-panel p-8 md:p-10 border-zinc-800">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-white text-black mb-4 font-bold text-xl">
            CT
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">COLLEGE TRANSPORT</h1>
          <p className="text-sm text-zinc-500 mt-2">
            {isRegister ? 'Create a tracking account' : 'Track your campus transit in real time'}
          </p>
        </div>

        {error && (
          <div className="bg-zinc-900 border border-zinc-800 text-sm text-white px-4 py-3 rounded-xl mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {isRegister && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
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
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
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
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
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
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                  Role *
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="glass-input cursor-pointer"
                >
                  <option value="student" className="bg-black text-white">Student</option>
                  <option value="driver" className="bg-black text-white">Driver / Conductor</option>
                  <option value="admin" className="bg-black text-white">Transport Administrator</option>
                </select>
              </div>

              {role === 'student' && (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
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
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
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
            className="text-white font-semibold hover:underline"
          >
            {isRegister ? 'Sign In instead' : 'Create user login'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
