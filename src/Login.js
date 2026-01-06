import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import { FiUser, FiLock, FiArrowRight, FiEye, FiEyeOff, FiAlertCircle } from "react-icons/fi";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/dashboard";

  const [form, setForm] = useState({ username: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);

    try {
      const res = await login(form.username.trim(), form.password);
      const roleLanding = {
        admin: "/dashboard",
        sales: "/sales-order",
        production: "/all-order-details",
        viewer: "/sales-data",
      }[res.role] || from;

      navigate(roleLanding, { replace: true });
    } catch (error) {
      setErr(error?.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrap">
      <div className="card">
        <header className="head">
          <div className="brand">
            <div className="brand-badge">
              <FiUser size={22} />
            </div>
            <div className="brand-text">
              <h1>Welcome back</h1>
              <p>Sign in to access your workspace</p>
            </div>
          </div>
        </header>

        <form onSubmit={onSubmit} className="form" noValidate>
          <div className="field">
            <label htmlFor="username">Username</label>
            <div className="control">
              <FiUser className="ctrl-icon" aria-hidden="true" />
              <input
                id="username"
                autoFocus
                placeholder="admin / saleslead / production / viewer"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                disabled={loading}
                autoComplete="username"
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <div className="control">
              <FiLock className="ctrl-icon" aria-hidden="true" />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                disabled={loading}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="toggle"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                disabled={loading}
              >
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
          </div>

          {err && (
            <div className="error">
              <FiAlertCircle className="error-ic" />
              <p>{err}</p>
            </div>
          )}

          <button type="submit" disabled={loading} className="btn">
            {loading ? (
              <span className="btn-loading">
                <span className="spin" />
                Signing in…
              </span>
            ) : (
              <>
                Sign In <FiArrowRight className="btn-ic" />
              </>
            )}
          </button>
        </form>
      </div>

      <style>{`
        :root{
          --bg1:#0f172a;         /* slate-900 */
          --bg2:#111827;         /* gray-900 */
          --grad1:#6366f1;       /* indigo-500 */
          --grad2:#a855f7;       /* fuchsia-500 */
          --card:#0b1220cc;      /* glass */
          --ring: rgba(99,102,241,.35);
          --text:#e5e7eb;        /* gray-200 */
          --muted:#94a3b8;       /* slate-400 */
          --border: rgba(255,255,255,.12);
          --shadow: 0 20px 50px rgba(0,0,0,.35);
          --radius:16px;
        }
        @media (prefers-color-scheme: light){
          :root{
            --bg1:#eef2ff; --bg2:#f8fafc; --card:#ffffffcc;
            --text:#0f172a; --muted:#475569; --border: rgba(15,23,42,.08);
            --shadow: 0 20px 60px rgba(15,23,42,.12);
          }
        }

        *{box-sizing:border-box}
        html,body,#root{height:100%}
        body{margin:0;font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI",
             Roboto, "Helvetica Neue", Arial, "Noto Sans", "Apple Color Emoji",
             "Segoe UI Emoji"; color:var(--text);}

        .login-wrap{
          min-height:100%;
          display:grid;
          place-items:center;
          padding:1px;
          background:
            radial-gradient(60rem 60rem at -10% -20%, rgba(99,102,241,.25), transparent 60%),
            radial-gradient(50rem 50rem at 120% 120%, rgba(168,85,247,.22), transparent 50%),
            linear-gradient(120deg, var(--bg1), var(--bg2));
        }

        .card{
          width:100%;
          max-width:440px;
          background: var(--card);
          border:1px solid var(--border);
          border-radius: var(--radius);
          box-shadow: var(--shadow);
          backdrop-filter: blur(10px);
          padding:28px;
          animation: floatIn .35s ease both;
        }

        .head{margin-bottom:18px}
        .brand{display:flex; align-items:center; gap:12px}
        .brand-badge{
          width:44px;height:44px; display:grid; place-items:center;
          color:white;
          background: linear-gradient(135deg, var(--grad1), var(--grad2));
          border-radius:12px; box-shadow: 0 10px 25px rgba(168,85,247,.25);
        }
        .brand-text h1{margin:0;font-size:20px;font-weight:600;letter-spacing:.2px}
        .brand-text p{margin:2px 0 0;color:var(--muted);font-size:13px}

        .form{display:grid; gap:16px}

        .field label{
          display:block; margin:0 0 8px; font-size:13px; font-weight:600; color:var(--text);
        }
        .control{position:relative}
        .ctrl-icon{
          position:absolute; left:14px; top:50%; transform:translateY(-50%);
          color:var(--muted); pointer-events:none;
        }
        input{
          width:100%; padding:14px 44px; padding-left:44px;
          background: rgba(255,255,255,.06);
          border:1px solid var(--border);
          border-radius:12px; color:var(--text); font-size:15px;
          outline:none; transition: box-shadow .2s, border-color .2s, background .2s, transform .05s;
        }
        input::placeholder{color: color-mix(in oklab, var(--muted) 85%, transparent)}
        input:hover{background: rgba(255,255,255,.08)}
        input:focus{
          border-color: var(--grad1);
          box-shadow: 0 0 0 6px var(--ring);
          background: rgba(255,255,255,.1);
        }
        input:disabled{opacity:.6; cursor:not-allowed}

        .toggle{
          position:absolute; right:10px; top:50%; transform:translateY(-50%);
          background:none; border:0; color:var(--muted); cursor:pointer;
          width:36px; height:36px; border-radius:8px;
          display:grid; place-items:center;
          transition: background .2s, color .2s, transform .05s;
        }
        .toggle:hover{background: rgba(255,255,255,.08); color:var(--text)}
        .toggle:active{transform:translateY(-48%) scale(.98)}

        .error{
          display:flex; gap:8px; align-items:flex-start;
          border:1px solid rgba(239,68,68,.35);
          background: rgba(239,68,68,.10);
          color:#fecaca; /* red-200 */
          padding:10px 12px; border-radius:12px; font-size:14px;
        }
        .error-ic{margin-top:2px; flex:0 0 auto}

        .btn{
          appearance:none; border:0; cursor:pointer; width:100%;
          border-radius:12px; padding:12px 14px; font-weight:700; font-size:15px;
          color:white;
          background: linear-gradient(135deg, var(--grad1), var(--grad2));
          box-shadow: 0 12px 30px rgba(99,102,241,.35);
          display:flex; align-items:center; justify-content:center; gap:10px;
          transition: transform .08s ease, box-shadow .2s ease, filter .2s ease;
        }
        .btn:hover{box-shadow: 0 18px 40px rgba(99,102,241,.45); filter:saturate(1.05)}
        .btn:active{transform: translateY(1px)}
        .btn:disabled{opacity:.75; cursor:not-allowed}
        .btn-ic{transform: translateX(0); transition: transform .2s}
        .btn:hover .btn-ic{transform: translateX(2px)}

        .btn-loading{display:inline-flex; align-items:center; gap:10px}
        .spin{
          width:18px; height:18px; border-radius:50%;
          border:3px solid rgba(255,255,255,.35);
          border-top-color: #fff; animation: spin 1s linear infinite;
        }

        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes floatIn{
          from{opacity:0; transform: translateY(8px) scale(.98)}
          to{opacity:1; transform: translateY(0) scale(1)}
        }

        /* Small screens */
        @media (max-width: 420px){
          .card{padding:22px}
          .brand-text h1{font-size:18px}
        }
      `}</style>
    </div>
  );
}
