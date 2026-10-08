import React from 'react';

export interface PasswordAnalysis {
  score: number; // 0 to 4
  label: 'Too weak' | 'Weak' | 'Fair' | 'Good' | 'Strong';
  color: string;
  hasMinLength: boolean;
  hasUpper: boolean;
  hasLower: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
}

export function evaluatePassword(password: string): PasswordAnalysis {
  const hasMinLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  let passedRules = 0;
  if (hasMinLength) passedRules++;
  if (hasUpper) passedRules++;
  if (hasLower) passedRules++;
  if (hasNumber) passedRules++;
  if (hasSpecial) passedRules++;

  let score = 0;
  let label: PasswordAnalysis['label'] = 'Too weak';
  let color = 'bg-red-500 text-red-400';

  if (!password) {
    score = 0;
    label = 'Too weak';
    color = 'bg-slate-600 text-slate-400';
  } else if (passedRules <= 2 || password.length < 6) {
    score = 1;
    label = 'Weak';
    color = 'bg-red-500 text-red-400';
  } else if (passedRules === 3) {
    score = 2;
    label = 'Fair';
    color = 'bg-amber-500 text-amber-400';
  } else if (passedRules === 4) {
    score = 3;
    label = 'Good';
    color = 'bg-cyan-500 text-cyan-400';
  } else {
    score = 4;
    label = 'Strong';
    color = 'bg-emerald-500 text-emerald-400';
  }

  return {
    score,
    label,
    color,
    hasMinLength,
    hasUpper,
    hasLower,
    hasNumber,
    hasSpecial,
  };
}

export default function PasswordStrengthMeter({ password }: { password: string }) {
  if (!password) return null;

  const analysis = evaluatePassword(password);

  const criteria = [
    { label: '8+ characters', met: analysis.hasMinLength },
    { label: 'Uppercase (A-Z)', met: analysis.hasUpper },
    { label: 'Lowercase (a-z)', met: analysis.hasLower },
    { label: 'Number (0-9)', met: analysis.hasNumber },
    { label: 'Symbol (!@#$)', met: analysis.hasSpecial },
  ];

  return (
    <div className="mt-2.5 space-y-2">
      {/* Strength Bar */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-400 font-medium">Password strength</span>
        <span className={`font-semibold ${analysis.color.split(' ')[1]}`}>
          {analysis.label}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-1.5 h-1.5">
        {[1, 2, 3, 4].map((step) => {
          const isActive = analysis.score >= step;
          let barBg = 'bg-slate-700/60';
          if (isActive) {
            if (analysis.score === 1) barBg = 'bg-red-500';
            else if (analysis.score === 2) barBg = 'bg-amber-500';
            else if (analysis.score === 3) barBg = 'bg-cyan-500';
            else barBg = 'bg-emerald-400';
          }
          return (
            <div
              key={step}
              className={`rounded-full transition-all duration-300 ${barBg}`}
            />
          );
        })}
      </div>

      {/* Rules Checklist */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1 text-[11px]">
        {criteria.map((item) => (
          <div
            key={item.label}
            className={`flex items-center gap-1 transition-colors ${
              item.met ? 'text-emerald-400 font-medium' : 'text-slate-500'
            }`}
          >
            <span className="text-xs">
              {item.met ? '✓' : '○'}
            </span>
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
