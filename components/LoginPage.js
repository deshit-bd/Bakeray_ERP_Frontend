"use client";

import { useEffect, useState } from "react";
import { loginWithCredentials } from "../utils/auth";
import { readSystemSettings, subscribeSystemSettings } from "../utils/systemSettings";

function BrandIcon() {
  return (
    <span className="mx-auto grid h-[70px] w-[70px] place-items-center rounded-[16px] bg-[#523cf0] text-white shadow-[0_16px_34px_rgba(82,60,240,0.22)]">
      <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M9 3h6" />
        <path d="M10 3v5.2l-4.6 8A3.1 3.1 0 0 0 8.1 21h7.8a3.1 3.1 0 0 0 2.7-4.8l-4.6-8V3" />
        <path d="M8 15h8" />
      </svg>
    </span>
  );
}

function EyeIcon({ visible }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
      {!visible ? <path d="M4 4l16 16" /> : null}
    </svg>
  );
}

function SignInIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <path d="m10 17 5-5-5-5" />
      <path d="M15 12H3" />
    </svg>
  );
}

export default function LoginPage({ onLogin }) {
  const [settings, setSettings] = useState(() => readSystemSettings());
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => subscribeSystemSettings(setSettings), []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const user = await loginWithCredentials(username, password, remember);
      onLogin(user);
    } catch (loginError) {
      setError(loginError.message || "Invalid username or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#f4f7ff_0%,#ffffff_50%,#fbf7ff_100%)] px-4 py-6 text-[#0f172a]">
      <div className="mx-auto flex min-h-[calc(100vh-48px)] w-full max-w-[1040px] flex-col items-center justify-center">
        <header className="text-center">
          <BrandIcon />
          <h1 className="mt-6 text-[34px] font-extrabold leading-none tracking-normal text-[#06112d]">
            {settings.company.name || "Bakery ERP"}
          </h1>
          <p className="mt-3 text-[17px] text-[#273a59]">Sign in to manage your bakery operations</p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="mt-10 w-full max-w-[504px] rounded-[15px] border border-[#dbe3ef] bg-white px-7 py-7 shadow-[0_20px_50px_rgba(15,23,42,0.12)]"
        >
          <h2 className="text-[19px] font-bold text-[#020617]">Welcome Back</h2>
          <p className="mt-1 text-[16px] text-[#667085]">Enter your credentials to access your account</p>

          <div className="mt-7 space-y-5">
            <label className="block">
              <span className="mb-2 block text-[14px] font-bold text-[#111827]">Username</span>
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="Enter your username"
                autoComplete="username"
                className="h-[41px] w-full rounded-[8px] border-0 bg-[#f0f0f3] px-4 text-[14px] text-[#0f172a] outline-none placeholder:text-[#667085] focus:ring-2 focus:ring-[#523cf0]/25"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-[14px] font-bold text-[#111827]">Password</span>
              <span className="relative block">
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  className="h-[41px] w-full rounded-[8px] border-0 bg-[#f0f0f3] px-4 pr-11 text-[14px] text-[#0f172a] outline-none placeholder:text-[#667085] focus:ring-2 focus:ring-[#523cf0]/25"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute inset-y-0 right-3 grid w-7 place-items-center text-[#8aa0c5]"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  <EyeIcon visible={showPassword} />
                </button>
              </span>
            </label>
          </div>

          <div className="mt-5 flex items-center justify-between gap-4">
            <label className="inline-flex items-center gap-3 text-[16px] font-semibold text-[#344054]">
              <input
                type="checkbox"
                checked={remember}
                onChange={(event) => setRemember(event.target.checked)}
                className="h-[14px] w-[14px] accent-[#111827]"
              />
              Remember me
            </label>
            <button type="button" className="text-[14px] font-medium text-[#2347ff]">
              Forgot password?
            </button>
          </div>

          {error ? (
            <p className="mt-4 rounded-[8px] bg-[#fee2e2] px-3 py-2 text-[13px] font-semibold text-[#b91c1c]">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="mt-5 inline-flex h-[40px] w-full items-center justify-center gap-4 rounded-[8px] bg-[#523cf0] text-[15px] font-bold text-white shadow-[0_10px_22px_rgba(82,60,240,0.2)] transition hover:bg-[#4632df] disabled:cursor-not-allowed disabled:opacity-70"
          >
            <SignInIcon />
            {loading ? "Signing In..." : "Sign In"}
          </button>

          <div className="mt-7 border-t border-[#dbe3ef] pt-7">
            <div className="rounded-[10px] bg-[#f8fafc] px-5 py-5 text-[14px] leading-6 text-[#17345b]">
              <p className="font-bold">Demo Credentials:</p>
              <p className="mt-2"><span className="font-bold">Admin:</span> admin / admin123</p>
              <p><span className="font-bold">Manager:</span> manager / manager123</p>
              <p><span className="font-bold">Staff:</span> staff / staff123</p>
            </div>
          </div>
        </form>

        <p className="mt-8 text-[13px] text-[#557099]">{"\u00A9"} 2026 Bakery ERP. All rights reserved.</p>
      </div>
    </main>
  );
}
