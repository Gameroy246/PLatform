const fs = require('fs');

// Fix API
let codeApi = fs.readFileSync('src/app/api/auth/login/route.ts', 'utf8');
codeApi = codeApi.replace(
  /return NextResponse\.json\(\{ success: true, role: user\.role \}\);/,
  "return NextResponse.json({ success: true, user: { id: user.id, email: user.email, role: user.role, mfa_enabled: user.mfa_enabled === 1 } });"
);
fs.writeFileSync('src/app/api/auth/login/route.ts', codeApi);

// Fix LoginScreen
let codeUi = fs.readFileSync('src/components/LoginScreen.tsx', 'utf8');
codeUi = codeUi.replace(
  /onLoginSuccess: \(role: string\) => void/,
  "onLoginSuccess: (user: any) => void"
);
codeUi = codeUi.replace(
  /onLoginSuccess\(data\.role\);/,
  "onLoginSuccess(data.user);"
);
fs.writeFileSync('src/components/LoginScreen.tsx', codeUi);
