const fs = require('fs');
let code = fs.readFileSync('src/components/LoginScreen.tsx', 'utf8');

// Add states
code = code.replace(/const \[requireOtp, setRequireOtp\] = useState\(false\);/,
`const [requireOtp, setRequireOtp] = useState(false);
  const [requirePasswordChange, setRequirePasswordChange] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [newPassword, setNewPassword] = useState('');`);

// Update logic
code = code.replace(/if \(!res\.ok\) \{/,
`if (res.ok && data.requirePasswordChange) {
        setRequirePasswordChange(true);
        setTempToken(data.tempToken);
        setLoading(false);
        return;
      }
      
      if (!res.ok) {`);

// Update handleLogin to handle password reset
code = code.replace(/const handleLogin = async \(e: React\.FormEvent\) => \{\n\s*e\.preventDefault\(\);\n\s*setError\(''\);\n\s*setLoading\(true\);/,
`const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (requirePasswordChange) {
      try {
        const res = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, token: tempToken, newPassword })
        });
        if (res.ok) {
           // Successfully reset, let's log them in by clearing the requirement and recalling login
           alert("Password changed successfully. Please log in with your new password.");
           setRequirePasswordChange(false);
           setPassword('');
           setTempToken('');
           setCaptchaText('');
           fetchCaptcha();
        } else {
           const data = await res.json();
           setError(data.error || 'Failed to change password');
        }
      } catch (err) {
        setError('Network error');
      }
      setLoading(false);
      return;
    }
`);

// Update UI
code = code.replace(/\{!requireOtp \? \(/,
`{requirePasswordChange ? (
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">New Password Required</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="w-4 h-4 text-text-muted" />
                  </div>
                  <input 
                    type="password" 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="w-full bg-bg border border-border rounded-lg py-2.5 pl-10 pr-4 text-sm text-text focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
                    placeholder="Enter a new strong password"
                  />
                </div>
              </div>
            </>
          ) : !requireOtp ? (`);

code = code.replace(/disabled=\{loading \|\| \(\!requireOtp && \!captchaText\)\}/, 
  `disabled={loading || (!requireOtp && !requirePasswordChange && !captchaText)}`);
  
code = code.replace(/\{requireOtp \? 'Verify OTP' : 'Secure Login'\}/,
  `{requirePasswordChange ? 'Change Password' : requireOtp ? 'Verify OTP' : 'Secure Login'}`);

fs.writeFileSync('src/components/LoginScreen.tsx', code);
