import { useState } from "react";
import { BookOpen, Check, Eye, EyeOff, Flame, KeyRound, Sparkles } from "lucide-react";
import mascotLogo from "../../study_bloom_bunny_mascot_logo.png";

const VALID_USERNAME = "Bhargavi";
const VALID_PASSWORD = "Ashish";

export default function Login({ onSuccess }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");

  const signIn = () => {
    setError("");
    localStorage.setItem("neet_tracker_authed", "true");
    onSuccess();
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (username === VALID_USERNAME && password === VALID_PASSWORD) signIn();
    else setError("That name or study passkey is not correct.");
  };

  const quickEnter = () => {
    setUsername(VALID_USERNAME);
    setPassword(VALID_PASSWORD);
    signIn();
  };

  return (
    <div className="bloom-login">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@500;600;700;800&family=Quicksand:wght@500;600;700&display=swap');
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        .bloom-login { min-height: 100dvh; display: grid; place-items: center; padding: 24px 16px; overflow: hidden; position: relative; color: #24181f; font-family: 'Nunito Sans', sans-serif; background-color: #fff8f8; background-image: radial-gradient(#ffd4df 1px, transparent 1px), radial-gradient(#eadff9 1px, #fff8f8 1px); background-size: 40px 40px; background-position: 0 0, 20px 20px; }
        .bloom-login::before, .bloom-login::after { content: ''; position: absolute; border-radius: 50%; pointer-events: none; filter: blur(1px); }
        .bloom-login::before { width: 330px; height: 330px; top: -150px; right: -100px; background: rgba(255, 143, 171, .18); }
        .bloom-login::after { width: 270px; height: 270px; bottom: -115px; left: -100px; background: rgba(177, 151, 252, .14); }
        .login-spark { position: fixed; pointer-events: none; color: #ff8fab; opacity: .42; animation: bloom-float 4.5s ease-in-out infinite; }
        .login-spark.lavender { color: #a98ce7; animation-delay: -2s; }
        .bloom-card { width: min(100%, 500px); z-index: 1; padding: 38px 38px 28px; border: 1px solid rgba(255,255,255,.96); border-radius: 30px; background: rgba(255,255,255,.94); box-shadow: 0 18px 42px -8px rgba(255,143,171,.28); animation: bloom-enter .65s cubic-bezier(.22,1,.36,1) both; }
        .login-hero { display: flex; flex-direction: column; align-items: center; text-align: center; }
        .welcome-bubble { position: relative; margin-bottom: 8px; padding: 9px 15px; border-radius: 999px; background: #fff0f5; color: #9b3f5a; box-shadow: 0 3px 8px rgba(155,63,90,.08); font: 700 12px/1.3 'Quicksand', sans-serif; animation: bloom-float 3.6s ease-in-out infinite; }
        .welcome-bubble::after { content: ''; position: absolute; width: 11px; height: 11px; bottom: -5px; left: 50%; background: #fff0f5; transform: translateX(-50%) rotate(45deg); }
        .mascot-ring { width: 126px; height: 126px; padding: 6px; margin: 7px 0 15px; border-radius: 50%; position: relative; background: #fff; box-shadow: 0 8px 22px rgba(255,143,171,.20); }
        .mascot-ring::before { content: ''; position: absolute; inset: -8px; z-index: -1; border-radius: inherit; background: linear-gradient(135deg, #ff8fab, #e8ddff, #ffd9e0); filter: blur(10px); opacity: .65; transition: opacity .25s ease; }
        .mascot-ring:hover::before { opacity: 1; }
        .mascot-ring img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; transition: transform .3s ease; }
        .mascot-ring:hover img { transform: scale(1.045); }
        .logo-spark { position: absolute; bottom: -4px; right: 2px; display: grid; place-items: center; width: 31px; height: 31px; border-radius: 50%; background: #9b3f5a; color: white; box-shadow: 0 4px 10px rgba(155,63,90,.25); }
        .portal-pill { display: inline-flex; align-items: center; gap: 7px; padding: 5px 12px; border-radius: 999px; color: #9b3f5a; background: #f9e2ec; font: 700 10px/1 'Quicksand', sans-serif; letter-spacing: .08em; }
        .bloom-card h1 { margin: 10px 0 4px; font: 700 30px/1.1 'Quicksand', sans-serif; letter-spacing: -.03em; }
        .bloom-card h1 span { color: #9b3f5a; }
        .login-subtitle { max-width: 285px; margin: 0 0 24px; color: #544245; font-size: 12px; font-weight: 600; }
        .login-form { display: grid; gap: 15px; text-align: left; }
        .field-row { display: grid; gap: 5px; }
        .field-label, .login-options { color: #544245; font: 700 12px/1.3 'Quicksand', sans-serif; }
        .field-label { margin-left: 11px; }
        .field-control { position: relative; display: flex; align-items: center; }
        .field-control svg:first-child { position: absolute; left: 15px; color: rgba(155,63,90,.72); pointer-events: none; }
        .field-control input { width: 100%; height: 48px; padding: 0 45px; border: 1px solid transparent; border-radius: 999px; outline: none; background: #fff0f5; color: #24181f; font: 600 14px 'Nunito Sans', sans-serif; transition: box-shadow .2s ease, background .2s ease, transform .2s ease; }
        .field-control input::placeholder { color: #a88c96; }
        .field-control input:focus { background: #fff; box-shadow: 0 0 0 3px rgba(255,143,171,.36); transform: translateY(-1px); }
        .visibility-button { position: absolute; right: 9px; display: grid; place-items: center; width: 31px; height: 31px; border: 0; border-radius: 50%; color: #9b3f5a; background: transparent; cursor: pointer; }
        .visibility-button:hover { background: #f9e2ec; }
        .login-options { display: flex; justify-content: space-between; align-items: center; padding: 1px 8px 0; font-family: 'Nunito Sans', sans-serif; font-size: 11px; }
        .remember-control { display: inline-flex; align-items: center; gap: 7px; cursor: pointer; user-select: none; }
        .remember-control input { position: absolute; opacity: 0; }
        .remember-box { display: grid; place-items: center; width: 19px; height: 19px; border-radius: 6px; color: white; background: #f3dce6; box-shadow: inset 0 1px 2px rgba(155,63,90,.13); transition: background .2s ease, transform .2s ease; }
        .remember-control input:checked + .remember-box { background: #9b3f5a; }
        .streak { display: inline-flex; align-items: center; gap: 4px; color: #674ead; }
        .login-error { margin: -3px 8px 0; color: #ba1a1a; font-size: 12px; font-weight: 700; }
        .login-actions { display: grid; gap: 8px; padding-top: 2px; }
        .primary-login, .quick-login { display: inline-flex; min-height: 48px; align-items: center; justify-content: center; gap: 8px; border: 0; border-radius: 999px; cursor: pointer; font: 700 14px 'Quicksand', sans-serif; transition: transform .18s ease, box-shadow .18s ease, filter .18s ease; }
        .primary-login { color: white; background: linear-gradient(90deg, #ff8fab, #9b3f5a); box-shadow: 0 8px 20px -4px rgba(255,143,171,.55); }
        .primary-login:hover { transform: translateY(-2px); filter: saturate(1.08); box-shadow: 0 12px 24px -3px rgba(255,143,171,.64); }
        .quick-login { min-height: 40px; color: #452a89; background: #e8ddff; font-size: 12px; }
        .quick-login:hover { transform: translateY(-1px); background: #dbcaff; }
        .primary-login:active, .quick-login:active { transform: scale(.97); }
        .mission-card { display: grid; gap: 9px; margin-top: 22px; padding: 15px; border-radius: 16px; background: #fff0f5; box-shadow: 0 2px 8px rgba(155,63,90,.05); }
        .mission-top, .mission-plan, .mission-progress { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
        .mission-label { display: inline-flex; align-items: center; gap: 6px; color: #9b3f5a; font: 700 10px 'Quicksand', sans-serif; letter-spacing: .08em; text-transform: uppercase; }
        .mission-label i { width: 7px; height: 7px; border-radius: 50%; background: #9b3f5a; animation: pulse-dot 1.6s ease-in-out infinite; }
        .target-pill { padding: 4px 8px; border-radius: 999px; color: #573f1b; background: #ffddb3; font: 700 10px 'Quicksand', sans-serif; }
        .mission-plan { justify-content: flex-start; color: #544245; font-size: 12px; font-weight: 600; }
        .mission-plan strong { color: #9b3f5a; }
        .progress-track { height: 7px; overflow: hidden; border-radius: 999px; background: #f3dce6; }
        .progress-track span { display: block; width: 60%; height: 100%; border-radius: inherit; background: linear-gradient(90deg, #9b3f5a, #674ead); animation: goal-grow .9s cubic-bezier(.22,1,.36,1) both; }
        .mission-progress { color: #877275; font: 700 10px 'Quicksand', sans-serif; }
        .login-footer { display: flex; justify-content: center; gap: 7px; margin-top: 16px; color: #877275; font-size: 11px; font-weight: 600; }
        .login-footer strong { color: #9b3f5a; }
        @keyframes bloom-enter { from { opacity: 0; transform: translateY(18px) scale(.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes bloom-float { 0%,100% { transform: translateY(0) rotate(0); } 50% { transform: translateY(-6px) rotate(4deg); } }
        @keyframes pulse-dot { 0%,100% { box-shadow: 0 0 0 0 rgba(155,63,90,.25); } 50% { box-shadow: 0 0 0 6px rgba(155,63,90,0); } }
        @keyframes goal-grow { from { width: 0; } to { width: 60%; } }
        @media (max-width: 520px) { .bloom-login { align-items: start; padding: max(16px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right)) max(24px, env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left)); overflow-y: auto; } .login-spark { display: none; } .bloom-card { margin: 0 auto; padding: 26px 18px 20px; border-radius: 24px; } .welcome-bubble { max-width: 265px; font-size: 11px; } .mascot-ring { width: 104px; height: 104px; } .bloom-card h1 { font-size: 28px; } .login-subtitle { margin-bottom: 20px; } .field-control input { height: 52px; font-size: 16px; } .visibility-button { width: 40px; height: 40px; right: 6px; } .login-options { align-items: flex-start; flex-direction: column; gap: 10px; padding: 2px 7px; font-size: 12px; } .primary-login { min-height: 52px; font-size: 15px; } .quick-login { min-height: 44px; padding: 0 12px; line-height: 1.2; text-align: center; } .mission-card { margin-top: 19px; padding: 13px; } .mission-plan { align-items: flex-start; line-height: 1.4; } }
        @media (prefers-reduced-motion: reduce) { .bloom-card, .welcome-bubble, .login-spark, .mission-label i, .progress-track span { animation: none; } }
      `}</style>
      <Sparkles className="login-spark" size={31} strokeWidth={1.5} style={{ top: "10%", left: "13%" }} />
      <Sparkles className="login-spark lavender" size={38} strokeWidth={1.3} style={{ bottom: "13%", right: "12%" }} />

      <main className="bloom-card">
        <div className="login-hero">
          <div className="welcome-bubble">Welcome back, Bhargavi! Ready to bloom today?</div>
          <div className="mascot-ring">
            <img src={mascotLogo} alt="Study Bloom bunny mascot" />
            <span className="logo-spark"><Sparkles size={15} strokeWidth={2.3} /></span>
          </div>
          <div className="portal-pill">DAILY ASPIRANT PORTAL <span>•</span> NEET 2026</div>
          <h1>Study <span>Bloom</span></h1>
          <p className="login-subtitle">Preparation companion · Physics &amp; Chemistry focus</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <label className="field-row">
            <span className="field-label">Aspirant ID or name</span>
            <span className="field-control">
              <BookOpen size={19} strokeWidth={2} />
              <input value={username} onChange={event => setUsername(event.target.value)} placeholder="e.g. Bhargavi" autoFocus />
            </span>
          </label>
          <label className="field-row">
            <span className="field-label">Study passkey</span>
            <span className="field-control">
              <KeyRound size={19} strokeWidth={2} />
              <input type={showPassword ? "text" : "password"} value={password} onChange={event => setPassword(event.target.value)} placeholder="Enter passkey" />
              <button className="visibility-button" type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? "Hide passkey" : "Show passkey"}>
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </span>
          </label>
          <div className="login-options">
            <label className="remember-control">
              <input type="checkbox" checked={remember} onChange={event => setRemember(event.target.checked)} />
              <span className="remember-box"><Check size={13} strokeWidth={3} /></span>
              Remember my study session
            </label>
            <span className="streak"><Flame size={14} fill="currentColor" /> Day 42 streak</span>
          </div>
          {error && <p className="login-error">{error}</p>}
          <div className="login-actions">
            <button className="primary-login" type="submit">Let&apos;s study <Sparkles size={17} /></button>
            <button className="quick-login" type="button" onClick={quickEnter}><Sparkles size={16} /> Quick enter Bhargavi&apos;s tracker</button>
          </div>
        </form>

        <section className="mission-card">
          <div className="mission-top"><span className="mission-label"><i /> Mission target</span><span className="target-pill">Target: 690+</span></div>
          <p className="mission-plan"><Sparkles size={15} color="#9b3f5a" /> Today&apos;s plan: <strong>Kinematics PYQs</strong> &amp; Organic reaction mechanisms</p>
          <div className="progress-track"><span /></div>
          <div className="mission-progress"><span>60% daily prep completed</span><span>4/6 modules</span></div>
        </section>
        <footer className="login-footer"><span>Made for NEET toppers</span><span>•</span><strong>Stay curious</strong></footer>
      </main>
    </div>
  );
}
