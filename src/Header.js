import React, { useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";

export default function Header() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const navigationItems = [
    { path: "/dashboard", name: "Dashboard" },
    { path: "/sales-order", name: "Sales Order" },
    { path: "/all-order-details", name: "All Orders" },
  ];

  const initials = useMemo(() => {
    if (!user?.username) return "";
    const parts = String(user.username).trim().split(/\s+/).slice(0, 2);
    return parts.map(p => p[0]?.toUpperCase() || "").join("");
  }, [user]);

  const handleLogout = () => {
    logout();
    setIsProfileOpen(false);
  };

  return (
    <header className="hdr" role="banner">
      <div className="hdr__inner">
        {/* Brand */}
        <div className="brand">
          <Link to="/dashboard" className="brand__link" aria-label="Go to Dashboard">
            <span className="brand__logo">JOB ORDER/SALE ORDER</span>
          </Link>
        </div>

        {/* Desktop nav */}
        <nav className="nav" role="navigation" aria-label="Primary">
          {navigationItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`nav__link ${active ? "is-active" : ""}`}
              >
                <span>{item.name}</span>
                <i aria-hidden="true" />
              </Link>
            );
          })}
        </nav>

        {/* User + Mobile toggle */}
        <div className="user">
          {user ? (
            <div className="profile">
              <div className="profile__wrap">
                <button
                  className="profile__btn"
                  onClick={() => setIsProfileOpen((v) => !v)}
                  aria-expanded={isProfileOpen}
                  aria-haspopup="menu"
                >
                  <span className="avatar" aria-hidden="true">{initials || "U"}</span>
                  <span className="id">
                    <span className="id__name">{user.username}</span>
                    <span className="id__role">{user.role}</span>
                  </span>
                  <span className={`chev ${isProfileOpen ? "open" : ""}`} aria-hidden="true" />
                </button>

                {isProfileOpen && (
                  <div className="menu" role="menu">
                    <div className="menu__head">
                      <div className="avatar avatar--lg" aria-hidden="true">{initials || "U"}</div>
                      <div>
                        <div className="menu__name">{user.username}</div>
                        <div className="menu__role">{user.role}</div>
                      </div>
                    </div>
                    <div className="menu__sep" role="separator" />
                    <button className="menu__item" role="menuitem" onClick={() => alert("Open settings")}>
                      Settings
                    </button>
                    <button className="menu__item" role="menuitem" onClick={handleLogout}>
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <Link to="/login" className="signin">Sign In</Link>
          )}

          {/* Mobile hamburger (pure CSS) */}
          <button
            className={`ham ${isMenuOpen ? "is-open" : ""}`}
            onClick={() => setIsMenuOpen((v) => !v)}
            aria-label="Toggle menu"
            aria-expanded={isMenuOpen}
            aria-controls="mnav"
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>

      {/* Mobile drop-down (UNDER the header, not a side panel) */}
      {isMenuOpen && (
        <div id="mnav" className="mnav" role="navigation" aria-label="Mobile">
          {navigationItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`mnav__link ${active ? "is-active" : ""}`}
                onClick={() => setIsMenuOpen(false)}
              >
                {item.name}
              </Link>
            );
          })}
          {!user && (
            <Link to="/login" className="mnav__link" onClick={() => setIsMenuOpen(false)}>
              Sign In
            </Link>
          )}
        </div>
      )}

      <style>{`
        /* ======= GLOBAL RESET to remove top white padding/space ======= */
        html, body, #root {
          height: 100%;
        }
        html, body {
          margin: 0;
          padding: 0;
          background: #0b1220; /* your dark app background */
          color: #e5e7eb;
          font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial;
        }

        :root{
          --bg: rgba(15,23,42,.55); /* header glass on dark */
          --fg: #e5e7eb;
          --muted:#94a3b8;
          --accent:#6366f1;
          --accent-2:#a855f7;
          --ring: rgba(99,102,241,.25);
          --line: rgba(255,255,255,.12);
          --white:#ffffff;
          --radius: 14px;
          --shadow: 0 12px 32px rgba(0,0,0,.35);
        }
        @media (prefers-color-scheme: light){
          :root{
            --bg: rgba(255,255,255,.7);
            --fg: #0f172a;
            --muted:#475569;
            --line: rgba(15,23,42,.08);
            --shadow: 0 10px 24px rgba(15,23,42,.10);
          }
          body{ background:#f8fafc; color:#0f172a; }
        }

        /* ======= HEADER ======= */
        .hdr{
          position: sticky; top:0; z-index:1000;
          backdrop-filter: blur(10px);
          background: linear-gradient(180deg, var(--bg), color-mix(in oklab, var(--bg) 70%, transparent));
          border-bottom:1px solid var(--line);
        }
        .hdr__inner{
          height:70px; display:flex; align-items:center; gap:16px;
          max-width:1200px; margin:0 auto; padding:0 20px;
        }

        .brand__link{ color: var(--fg); text-decoration:none; }
        .brand__logo{
          font-weight:800; letter-spacing:.5px; font-size:18px;
          background: linear-gradient(90deg, var(--accent), var(--accent-2));
          -webkit-background-clip:text; background-clip:text; color:transparent;
        }

        .nav{display:flex; align-items:center; gap:6px; margin-left:12px}
        .nav__link{
          --padX:14px; --padY:10px;
          position:relative; display:inline-flex; align-items:center;
          padding: var(--padY) var(--padX); border-radius:10px;
          color:var(--fg); text-decoration:none; font-weight:600; font-size:14px;
          transition: background .2s ease, color .2s ease;
        }
        .nav__link:hover{background: color-mix(in oklab, var(--bg) 65%, transparent);}
        .nav__link i{
          position:absolute; left: var(--padX); right: var(--padX); bottom:8px; height:2px;
          background: linear-gradient(90deg, var(--accent), var(--accent-2));
          border-radius:2px; transform: scaleX(0); transform-origin: center;
          transition: transform .22s ease;
        }
        .nav__link:hover i{transform: scaleX(1)}
        .nav__link.is-active{background: color-mix(in oklab, var(--bg) 80%, transparent)}
        .nav__link.is-active i{transform: scaleX(1)}

        .user{margin-left:auto; display:flex; align-items:center; gap:10px}
        .signin{
          padding:8px 12px; border-radius:10px; text-decoration:none; color:var(--fg); font-weight:700;
          border:1px solid var(--line); background: color-mix(in oklab, var(--bg) 92%, transparent);
        }

        .profile{display:flex; align-items:center}
        .profile__wrap{position:relative}
        .profile__btn{
          display:flex; align-items:center; gap:10px; cursor:pointer;
          border:1px solid var(--line); background: color-mix(in oklab, var(--bg) 92%, transparent);
          padding:6px 10px; border-radius:12px; color:var(--fg); font: inherit;
          transition: box-shadow .2s, border-color .2s, transform .04s;
        }
        .profile__btn:hover{box-shadow: 0 0 0 6px var(--ring)}
        .profile__btn:active{transform: translateY(1px)}
        .avatar{
          width:28px; height:28px; border-radius:50%; display:grid; place-items:center;
          font-size:12px; font-weight:800; color:white;
          background: linear-gradient(135deg, var(--accent), var(--accent-2));
        }
        .avatar--lg{width:40px; height:40px; font-size:14px}
        .id{display:flex; flex-direction:column; align-items:flex-start; line-height:1.1}
        .id__name{font-weight:700; font-size:13px}
        .id__role{font-size:11px; color:var(--muted); text-transform:capitalize}
        .chev{
          width:10px; height:10px; border-right:2px solid var(--muted); border-bottom:2px solid var(--muted);
          transform: rotate(45deg) translateY(-2px); transition: transform .2s;
        }
        .chev.open{transform: rotate(-135deg) translateY(2px)}

        .menu{
          position:absolute; right:0; top:calc(100% + 8px);
          width:260px; background: #0b1220; color:#e5e7eb;
          border-radius:12px; box-shadow: var(--shadow); border:1px solid var(--line); overflow:hidden;
        }
        @media (prefers-color-scheme: light){
          .menu{ background: var(--white); color:#0f172a}
        }
        .menu__head{display:flex; align-items:center; gap:12px; padding:14px 14px; background: color-mix(in oklab, var(--bg) 75%, transparent);}
        .menu__name{font-weight:700; font-size:14px}
        .menu__role{font-size:12px; color:var(--muted); text-transform:capitalize}
        .menu__sep{height:1px; background: var(--line)}
        .menu__item{
          width:100%; text-align:left; padding:12px 14px; background:transparent; border:0; cursor:pointer;
          font-weight:600; color:inherit; transition: background .15s, transform .04s;
        }
        .menu__item:hover{background: color-mix(in oklab, var(--bg) 80%, transparent)}
        .menu__item:active{transform: translateY(1px)}

        /* Hamburger (no icon) */
        .ham{
          --bar: 2px;
          width:38px; height:34px; border:1px solid var(--line); border-radius:10px;
          background: color-mix(in oklab, var(--bg) 92%, transparent);
          display:none; align-items:center; justify-content:center; gap:5px;
          cursor:pointer; margin-left:6px; transition: box-shadow .2s, transform .04s;
        }
        .ham:hover{box-shadow: 0 0 0 6px var(--ring)}
        .ham:active{transform: translateY(1px)}
        .ham span{
          position:relative; display:block; width:18px; height:var(--bar); background:var(--fg);
          border-radius:2px; transition: transform .2s, opacity .2s;
        }
        .ham span:nth-child(1){transform-origin: left center}
        .ham span:nth-child(3){transform-origin: left center}
        .ham.is-open span:nth-child(1){transform: translateY(6px) rotate(45deg)}
        .ham.is-open span:nth-child(2){opacity:0}
        .ham.is-open span:nth-child(3){transform: translateY(-6px) rotate(-45deg)}

        /* Mobile drop-down under header */
        .mnav{
          display:none;
          border-bottom:1px solid var(--line);
          background: color-mix(in oklab, var(--bg) 96%, transparent);
          backdrop-filter: blur(8px);
        }
        .mnav__link{
          display:block; padding:12px 20px; text-decoration:none; color:var(--fg); font-weight:700;
        }
        .mnav__link:hover{background: color-mix(in oklab, var(--bg) 85%, transparent)}
        .mnav__link.is-active{background: color-mix(in oklab, var(--bg) 80%, transparent); color: var(--accent)}

        /* Responsive */
        @media (max-width: 900px){
          .nav{display:none}
          .ham{display:flex}
          .id{display:none}
          .mnav{display:block}
        }
      `}</style>
    </header>
  );
}
