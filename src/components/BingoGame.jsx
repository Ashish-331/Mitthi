import { useState, useEffect, useRef, useCallback } from "react";
import {
  Trophy, Sparkles, RotateCcw, Shuffle, Eye, EyeOff,
  Volume2, VolumeX, Gamepad2, Flame, Crown, Swords,
  BookOpen, LogOut, Cloud, Flower2, Ribbon, Star,
  X, Info, Check, UserCheck, ShieldCheck
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import mascotLogo from "../../study_bloom_bunny_mascot_logo.png";
import { BINGO_LETTERS, generateBoard, evaluateBoard, playSound } from "../lib/bingoUtils";

function useCountUp(target, duration = 450) {
  const [display, setDisplay] = useState(target);
  const prevRef = useRef(target);
  const frameRef = useRef(null);

  useEffect(() => {
    const start = prevRef.current;
    const diff = target - start;
    if (diff === 0) { setDisplay(target); return; }
    const startTime = performance.now();
    cancelAnimationFrame(frameRef.current);

    function tick(now) {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(start + diff * eased));
      if (t < 1) frameRef.current = requestAnimationFrame(tick);
      else prevRef.current = target;
    }

    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, duration]);

  return display;
}

export default function BingoGame({ currentUser = "mithi", onNavigateToTracker, onLogout }) {
  // Scoreboard stats (persisted to Supabase and localStorage)
  const [stats, setStats] = useState(() => {
    try {
      const saved = localStorage.getItem("study_bloom_bingo_stats");
      if (saved) return JSON.parse(saved);
    } catch {}
    return { total_games: 0, mithi_wins: 0, ashish_wins: 0, draws: 0 };
  });

  const [syncStatus, setSyncStatus] = useState("syncing"); // "synced", "local", "syncing"

  // Match Boards & State
  const [mithiBoard, setMithiBoard] = useState(() => generateBoard());
  const [ashishBoard, setAshishBoard] = useState(() => generateBoard());
  const [calledNumbers, setCalledNumbers] = useState([]);
  const [currentTurn, setCurrentTurn] = useState("mithi"); // "mithi" or "ashish"
  const [starter, setStarter] = useState("mithi");
  const [gameStatus, setGameStatus] = useState("playing"); // "playing", "gameover"
  const [winner, setWinner] = useState(null);
  const [winningNumber, setWinningNumber] = useState(null);

  // Active viewer (Mithi only sees Mithi's board; Ashish only sees Ashish's board)
  const loggedPlayer = currentUser === "ashish" ? "ashish" : "mithi";
  const [activeViewer, setActiveViewer] = useState(loggedPlayer);

  // Sync viewer when logged-in user changes
  useEffect(() => {
    setActiveViewer(currentUser === "ashish" ? "ashish" : "mithi");
  }, [currentUser]);

  // UI Settings & Toggles
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showRules, setShowRules] = useState(false);
  const [showVictoryModal, setShowVictoryModal] = useState(false);
  const [lastMoveMessage, setLastMoveMessage] = useState("Game ready! Mithi calls first.");

  const calledSet = new Set(calledNumbers);
  const mithiEval = evaluateBoard(mithiBoard, calledSet);
  const ashishEval = evaluateBoard(ashishBoard, calledSet);

  // 1. Synchronize lifetime stats with Supabase on mount
  useEffect(() => {
    let cancelled = false;
    async function loadStats() {
      try {
        const { data, error } = await supabase
          .from("bingo_stats")
          .select("total_games, mithi_wins, ashish_wins, draws")
          .eq("id", "main")
          .maybeSingle();

        if (cancelled) return;

        if (error) {
          console.warn("Supabase bingo_stats load note:", error.message);
          setSyncStatus("local");
        } else if (data) {
          setStats(data);
          localStorage.setItem("study_bloom_bingo_stats", JSON.stringify(data));
          setSyncStatus("synced");
        } else {
          const initial = { id: "main", total_games: 0, mithi_wins: 0, ashish_wins: 0, draws: 0 };
          const { error: insErr } = await supabase.from("bingo_stats").upsert(initial);
          if (!insErr) setSyncStatus("synced");
          else setSyncStatus("local");
        }
      } catch (e) {
        if (!cancelled) setSyncStatus("local");
      }
    }

    loadStats();
    return () => { cancelled = true; };
  }, []);

  // 2. Synchronize active live match between Bhargavi & Ashish accounts
  useEffect(() => {
    let cancelled = false;

    async function fetchLiveMatch() {
      try {
        const { data, error } = await supabase
          .from("bingo_active_match")
          .select("*")
          .eq("id", "current")
          .maybeSingle();

        if (cancelled || error || !data) return;

        if (Array.isArray(data.mithi_board) && data.mithi_board.length === 25) {
          setMithiBoard(prev => JSON.stringify(prev) !== JSON.stringify(data.mithi_board) ? data.mithi_board : prev);
        }
        if (Array.isArray(data.ashish_board) && data.ashish_board.length === 25) {
          setAshishBoard(prev => JSON.stringify(prev) !== JSON.stringify(data.ashish_board) ? data.ashish_board : prev);
        }
        if (Array.isArray(data.called_numbers)) {
          setCalledNumbers(prev => {
            if (prev.length !== data.called_numbers.length) {
              const prevSet = new Set(prev);
              const newNum = data.called_numbers.find(n => !prevSet.has(n));
              if (newNum && soundEnabled) playSound("pop");
              return data.called_numbers;
            }
            return prev;
          });
        }
        if (data.current_turn) setCurrentTurn(data.current_turn);
        if (data.starter) setStarter(data.starter);
        if (data.status) setGameStatus(data.status);
        if (data.winner) setWinner(data.winner);
        if (data.winning_number) setWinningNumber(data.winning_number);
        if (data.status === "gameover" && data.winner) {
          setShowVictoryModal(true);
        }
      } catch {
        // Table may not exist yet, fallback to local state
      }
    }

    fetchLiveMatch();

    // Poll every 2.5s for seamless device-to-device play
    const interval = setInterval(fetchLiveMatch, 2500);

    // Supabase Realtime channel
    let channel = null;
    try {
      channel = supabase
        .channel("active_bingo_match")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "bingo_active_match", filter: "id=eq.current" },
          (payload) => {
            if (!cancelled && payload.new) {
              const d = payload.new;
              if (Array.isArray(d.called_numbers)) setCalledNumbers(d.called_numbers);
              if (d.current_turn) setCurrentTurn(d.current_turn);
              if (d.status) setGameStatus(d.status);
              if (d.winner) {
                setWinner(d.winner);
                setShowVictoryModal(true);
              }
            }
          }
        )
        .subscribe();
    } catch {}

    return () => {
      cancelled = true;
      clearInterval(interval);
      if (channel) supabase.removeChannel(channel);
    };
  }, [soundEnabled]);

  // Save game record to Supabase + localStorage
  const saveGameResult = useCallback(async (gameWinner, winningNum, mLines, aLines, turnsCount) => {
    setStats(prev => {
      const next = {
        total_games: prev.total_games + 1,
        mithi_wins: gameWinner === "mithi" ? prev.mithi_wins + 1 : prev.mithi_wins,
        ashish_wins: gameWinner === "ashish" ? prev.ashish_wins + 1 : prev.ashish_wins,
        draws: gameWinner === "draw" ? prev.draws + 1 : prev.draws
      };
      localStorage.setItem("study_bloom_bingo_stats", JSON.stringify(next));

      supabase.from("bingo_stats").upsert({
        id: "main",
        ...next,
        updated_at: new Date().toISOString()
      }).then(({ error }) => {
        if (!error) setSyncStatus("synced");
      });

      const winnerLabel = gameWinner === "mithi" ? "Mithi" : gameWinner === "ashish" ? "Ashish" : "Draw";
      supabase.from("bingo_games").insert({
        winner: winnerLabel,
        mithi_lines: mLines,
        ashish_lines: aLines,
        total_turns: turnsCount,
        winning_number: winningNum
      }).catch(() => {});

      return next;
    });
  }, []);

  // Calling a number
  const handleCallNumber = async (num, callingPlayer) => {
    if (gameStatus !== "playing") return;
    if (currentTurn !== callingPlayer) return;
    if (calledSet.has(num)) return;

    const nextCalled = [...calledNumbers, num];
    const nextSet = new Set(nextCalled);

    const prevMithiLines = mithiEval.lineCount;
    const prevAshishLines = ashishEval.lineCount;

    const newMithiEval = evaluateBoard(mithiBoard, nextSet);
    const newAshishEval = evaluateBoard(ashishBoard, nextSet);

    setCalledNumbers(nextCalled);
    const callerName = callingPlayer === "mithi" ? "Mithi" : "Ashish";
    setLastMoveMessage(`${callerName} called number #${num}!`);

    // Check for win
    const mithiWon = newMithiEval.hasBingo;
    const ashishWon = newAshishEval.hasBingo;

    let nextStatus = "playing";
    let finalWinner = null;
    let nextTurn = currentTurn === "mithi" ? "ashish" : "mithi";

    if (mithiWon || ashishWon) {
      nextStatus = "gameover";
      if (soundEnabled) playSound("bingo");
      setGameStatus("gameover");
      setWinningNumber(num);

      if (mithiWon && !ashishWon) finalWinner = "mithi";
      else if (ashishWon && !mithiWon) finalWinner = "ashish";
      else finalWinner = callingPlayer; // Caller advantage

      setWinner(finalWinner);
      setShowVictoryModal(true);
      saveGameResult(finalWinner, num, newMithiEval.lineCount, newAshishEval.lineCount, nextCalled.length);
    } else {
      const linesAdded = (newMithiEval.lineCount > prevMithiLines) || (newAshishEval.lineCount > prevAshishLines);
      if (soundEnabled) {
        if (linesAdded) playSound("line");
        else playSound("pop");
      }
      setCurrentTurn(nextTurn);
    }

    // Push live match update to Supabase
    try {
      await supabase.from("bingo_active_match").upsert({
        id: "current",
        mithi_board: mithiBoard,
        ashish_board: ashishBoard,
        called_numbers: nextCalled,
        current_turn: nextTurn,
        starter: starter,
        status: nextStatus,
        winner: finalWinner,
        winning_number: num,
        updated_at: new Date().toISOString()
      });
    } catch {}
  };

  // Start new match
  const handleNewMatch = async (forceStarter = null) => {
    const nextStarter = forceStarter || (starter === "mithi" ? "ashish" : "mithi");
    const newM = generateBoard();
    const newA = generateBoard();

    setStarter(nextStarter);
    setCurrentTurn(nextStarter);
    setMithiBoard(newM);
    setAshishBoard(newA);
    setCalledNumbers([]);
    setGameStatus("playing");
    setWinner(null);
    setWinningNumber(null);
    setShowVictoryModal(false);
    setLastMoveMessage(`New match started! ${nextStarter === "mithi" ? "Mithi" : "Ashish"} calls first.`);
    if (soundEnabled) playSound("pop");

    try {
      await supabase.from("bingo_active_match").upsert({
        id: "current",
        mithi_board: newM,
        ashish_board: newA,
        called_numbers: [],
        current_turn: nextStarter,
        starter: nextStarter,
        status: "playing",
        winner: null,
        winning_number: null,
        updated_at: new Date().toISOString()
      });
    } catch {}
  };

  // Re-shuffle a player's board before game begins
  const handleShuffleBoard = async (player) => {
    if (calledNumbers.length > 0) return;
    let newM = mithiBoard;
    let newA = ashishBoard;
    if (player === "mithi") {
      newM = generateBoard();
      setMithiBoard(newM);
    }
    if (player === "ashish") {
      newA = generateBoard();
      setAshishBoard(newA);
    }
    if (soundEnabled) playSound("pop");

    try {
      await supabase.from("bingo_active_match").upsert({
        id: "current",
        mithi_board: newM,
        ashish_board: newA,
        called_numbers: [],
        current_turn: currentTurn,
        starter: starter,
        status: "playing",
        updated_at: new Date().toISOString()
      });
    } catch {}
  };

  // Animated counters
  const displayTotal = useCountUp(stats.total_games, 400);
  const displayMithi = useCountUp(stats.mithi_wins, 400);
  const displayAshish = useCountUp(stats.ashish_wins, 400);
  const displayDraws = useCountUp(stats.draws, 400);

  // Render player board with privacy gate:
  // Mithi board is ONLY visible to Bhargavi account (activeViewer === "mithi")
  // Ashish board is ONLY visible to Ashish account (activeViewer === "ashish")
  const renderBoard = (playerId, playerName, board, evaluation) => {
    const isCurrentTurn = currentTurn === playerId && gameStatus === "playing";
    const isMithi = playerId === "mithi";
    const isMyBoard = activeViewer === playerId;
    const accentColor = isMithi ? "#C92F6D" : "#674ead";
    const lightBg = isMithi ? "#fff0f5" : "#f4efff";

    return (
      <div
        className={`bingo-player-card ${isCurrentTurn ? "is-active-turn" : ""} ${playerId} ${!isMyBoard ? "is-concealed" : ""}`}
        style={{
          border: isCurrentTurn ? `2px solid ${accentColor}` : "1.5px solid rgba(240, 195, 213, 0.6)",
          boxShadow: isCurrentTurn
            ? `0 12px 32px ${isMithi ? "rgba(255, 143, 171, 0.32)" : "rgba(169, 140, 231, 0.3)"}`
            : "0 6px 20px rgba(137, 22, 71, 0.05)"
        }}
      >
        {/* Player Header */}
        <div className="player-card-header">
          <div className="player-identity">
            <div className="player-avatar-ring" style={{ background: isMithi ? "linear-gradient(135deg, #ff8fab, #ff4d6d)" : "linear-gradient(135deg, #b8a2ec, #674ead)" }}>
              {isMithi ? <img src={mascotLogo} alt="Mithi mascot" /> : <Crown size={18} color="#fff" />}
            </div>
            <div>
              <div className="player-tagline">
                {isMithi ? (
                  <span style={{ color: "#9b3f5a" }}><Flower2 size={11} /> Aspirant • Bhargavi</span>
                ) : (
                  <span style={{ color: "#583a99" }}><Flame size={11} /> Study Partner</span>
                )}
              </div>
              <h3 className="player-name-title" style={{ color: accentColor }}>
                {playerName}
              </h3>
            </div>
          </div>

          <div className="player-turn-status">
            {isCurrentTurn ? (
              <span className="turn-indicator-pill active" style={{ background: lightBg, color: accentColor, border: `1px solid ${accentColor}` }}>
                <span className="pulsing-turn-dot" style={{ background: accentColor }} />
                <span>Calling Now</span>
              </span>
            ) : gameStatus === "playing" ? (
              <span className="turn-indicator-pill waiting">Waiting...</span>
            ) : null}
          </div>
        </div>

        {/* B - I - N - G - O Letter Track (Always visible so both see each other's strike progress) */}
        <div className="bingo-strip-container">
          <div className="bingo-letter-track">
            {BINGO_LETTERS.map((letter, idx) => {
              const isStruck = evaluation.lineCount > idx;
              return (
                <div
                  key={letter}
                  className={`bingo-letter-cell ${isStruck ? "is-struck" : ""}`}
                  style={isStruck ? { background: isMithi ? "linear-gradient(135deg, #ff4d6d, #9b3f5a)" : "linear-gradient(135deg, #7b52c9, #4a2889)" } : undefined}
                >
                  <span className="letter-char">{letter}</span>
                  {isStruck && <div className="strike-slash" />}
                </div>
              );
            })}
          </div>

          <div className="lines-count-pill" style={{ color: accentColor, background: lightBg }}>
            <strong>{Math.min(5, evaluation.lineCount)}/5</strong> lines struck
          </div>
        </div>

        {/* 5x5 Grid Area: VISIBLE IF LOGGED IN AS THIS PLAYER; CONCEALED IF OPPONENT */}
        <div className="grid-wrapper">
          {isMyBoard ? (
            <div className="bingo-board-grid">
              {board.map((num, idx) => {
                const isCalled = calledSet.has(num);
                const isInCompletedLine = evaluation.winningIndices.has(idx);
                const isLastCalled = calledNumbers.length > 0 && calledNumbers[calledNumbers.length - 1] === num;
                const canClick = isCurrentTurn && !isCalled && gameStatus === "playing";

                return (
                  <button
                    type="button"
                    key={idx}
                    onClick={() => canClick && handleCallNumber(num, playerId)}
                    disabled={!canClick && !isCalled}
                    className={`bingo-cell ${isCalled ? "is-called" : ""} ${isInCompletedLine ? "in-line" : ""} ${isLastCalled ? "is-last" : ""} ${canClick ? "can-click" : ""}`}
                    style={{
                      color: isCalled ? (isMithi ? "#9b3f5a" : "#54378f") : "#3d2f36",
                      borderColor: isInCompletedLine ? accentColor : undefined
                    }}
                    title={isCalled ? `Number ${num} (Already called)` : canClick ? `Click to call ${num}!` : `Number ${num}`}
                  >
                    <span className="cell-num">{num}</span>
                    {isCalled && <span className="cell-strike-mark" style={{ background: isMithi ? "#ff4d6d" : "#7b52c9" }} />}
                    {isLastCalled && (
                      <span className="last-called-spark" style={{ background: isMithi ? "#ff4d6d" : "#7b52c9" }}>
                        <Sparkles size={8} color="#fff" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            /* CONCEALED OPPONENT GRID */
            <div className="secret-board-wrapper">
              <div className="secret-card-inner">
                <div className="secret-badge" style={{ color: accentColor, background: lightBg }}>
                  <EyeOff size={14} />
                  <span>OPPONENT GRID CONCEALED</span>
                </div>
                <div className="secret-avatar-ring" style={{ background: isMithi ? "linear-gradient(135deg, #ff8fab, #ff4d6d)" : "linear-gradient(135deg, #b8a2ec, #674ead)" }}>
                  {isMithi ? <img src={mascotLogo} alt="Mithi mascot" /> : <Crown size={22} color="#fff" />}
                </div>
                <h4>{isMithi ? "Bhargavi's Secret Grid" : "Ashish's Secret Grid"}</h4>
                <p>
                  {isMithi
                    ? "Only visible on Bhargavi's account. Number placements remain confidential while B-I-N-G-O strike lines update live above."
                    : "Only visible on Ashish's account. Number placements remain confidential while B-I-N-G-O strike lines update live above."}
                </p>
                <div className="secret-stats-pill">
                  <span><strong>{calledNumbers.length}</strong> numbers called</span>
                  <span>•</span>
                  <span><strong>{evaluation.lineCount}/5</strong> lines struck</span>
                </div>

                {/* Local pass-and-play button if sharing a single phone */}
                <button
                  type="button"
                  className="pass-device-btn"
                  onClick={() => setActiveViewer(playerId)}
                  title="If playing on a single device, tap to pass the phone"
                >
                  <Eye size={12} /> Pass phone to {isMithi ? "Bhargavi" : "Ashish"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Board Bottom Controls */}
        <div className="board-bottom-bar">
          {isMyBoard && calledNumbers.length === 0 ? (
            <button
              type="button"
              className="shuffle-mini-btn"
              onClick={() => handleShuffleBoard(playerId)}
              title="Shuffle your numbers before starting"
            >
              <Shuffle size={12} /> Re-shuffle my board
            </button>
          ) : (
            <span className="board-stat-note">
              {evaluation.lineCount >= 5 ? "🎉 BINGO ACHIEVED!" : `${5 - Math.min(5, evaluation.lineCount)} more line${5 - evaluation.lineCount === 1 ? "" : "s"} to win`}
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="tracker-shell" style={{ fontFamily: "'DM Sans', -apple-system, sans-serif", minHeight: "100vh", padding: "32px 20px", color: "#55102e" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600;700&family=Playfair+Display:ital,wght@0,600;0,700;1,600&family=Quicksand:wght@500;600;700;800&display=swap');
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        html { -webkit-text-size-adjust: 100%; scroll-behavior: smooth; }

        .tracker-shell {
          position: relative;
          overflow: hidden;
          isolation: isolate;
          background-color: #fff7f9;
          background-image: radial-gradient(#ffd4df 1px, transparent 1px), radial-gradient(#eadff9 1px, #fff7f9 1px);
          background-size: 40px 40px;
          background-position: 0 0, 20px 20px;
        }

        .tracker-shell::before, .tracker-shell::after {
          content: '';
          position: absolute;
          z-index: -1;
          border-radius: 999px;
          pointer-events: none;
          filter: blur(2px);
        }
        .tracker-shell::before {
          width: 370px;
          height: 370px;
          left: -210px;
          bottom: -100px;
          background: rgba(209,48,111,.12);
        }
        .tracker-shell::after {
          width: 520px;
          height: 520px;
          right: -290px;
          top: -210px;
          background: rgba(255,255,255,.8);
        }

        .tracker-content {
          animation: page-in .7s cubic-bezier(.22, 1, .36, 1) both;
          max-width: 1120px;
          margin: 0 auto;
        }

        /* Main Header */
        .main-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          margin-bottom: 20px;
        }
        .brand-lockup {
          display: flex;
          align-items: center;
          gap: 14px;
          min-width: 0;
        }
        .brand-mascot {
          width: 59px;
          height: 59px;
          flex: 0 0 auto;
          overflow: hidden;
          padding: 3px;
          border-radius: 19px;
          background: linear-gradient(135deg, #ff8fab, #ff4d6d);
          box-shadow: 0 7px 17px rgba(255,143,171,.28);
          transition: transform .2s ease;
        }
        .brand-mascot:hover { transform: rotate(-4deg) scale(1.05); }
        .brand-mascot img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 15px;
          background: #fff;
        }

        .brand-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 4px 9px;
          border: 1px solid #ffe5ec;
          border-radius: 999px;
          color: #ff4d6d;
          background: #fff0f3;
          font: 700 10px/1 'Quicksand', sans-serif;
          letter-spacing: .07em;
        }
        .brand-title {
          margin: 5px 0 0;
          color: #3d2f36;
          font: 700 clamp(22px, 4vw, 30px)/1.05 'Quicksand', sans-serif;
          letter-spacing: -.04em;
        }
        .brand-subtitle {
          margin: 5px 0 0;
          color: #5a4a52;
          font-size: 13px;
          font-weight: 700;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 9px;
          flex-wrap: wrap;
        }

        /* App Navigation Switcher */
        .app-nav-tabs {
          display: inline-flex;
          background: rgba(247, 206, 222, .68);
          border-radius: 14px;
          padding: 4px;
          border: 1px solid rgba(255,255,255,.75);
          box-shadow: 0 2px 8px rgba(155, 63, 90, 0.05);
        }
        .nav-tab-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 14px;
          border-radius: 10px;
          border: none;
          background: transparent;
          color: #9F607A;
          font: 700 12.5px 'Quicksand', sans-serif;
          cursor: pointer;
          transition: all 0.2s ease;
          text-decoration: none;
        }
        .nav-tab-btn.active {
          background: #fff;
          color: #C92F6D;
          box-shadow: 0 2px 6px rgba(201, 47, 109, 0.12);
        }
        .nav-tab-btn:hover:not(.active) {
          color: #65102F;
          background: rgba(255,255,255,0.4);
        }

        .sync-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 11px;
          border: 1px solid #ffe5ec;
          border-radius: 999px;
          background: rgba(255,255,255,.82);
          box-shadow: 0 3px 8px rgba(255,143,171,.08);
          color: #5a4a52;
          font: 700 11px 'Quicksand', sans-serif;
        }
        .sync-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #6fcf8d;
          box-shadow: 0 0 0 0 rgba(111,207,141,.4);
          animation: sync-pulse 1.8s infinite;
        }
        .logout-button {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          border: 1px solid #ffe5ec;
          border-radius: 999px;
          color: #5a4a52;
          background: #fff;
          box-shadow: 0 3px 8px rgba(255,143,171,.08);
          cursor: pointer;
          font: 700 11px 'Quicksand', sans-serif;
        }
        .logout-button:hover { color: #ff4d6d; background: #fff0f3; }

        /* Scoreboard Banner */
        .scoreboard-banner {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
          margin-bottom: 20px;
        }
        .score-card {
          padding: 14px 16px;
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.88);
          border: 2px solid #ffe5ec;
          box-shadow: 0 6px 18px rgba(255, 143, 171, 0.12);
          text-align: center;
          position: relative;
          overflow: hidden;
          transition: transform 0.2s ease;
        }
        .score-card:hover { transform: translateY(-2px); }
        .score-card-label {
          font: 700 10.5px 'Quicksand', sans-serif;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          margin-bottom: 3px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
        }
        .score-card-value {
          font: 700 24px 'Playfair Display', serif;
          line-height: 1.1;
        }
        .score-card.mithi-card { border-color: #ffd4df; }
        .score-card.ashish-card { border-color: #eadff9; }

        /* Control Toolbar */
        .game-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 18px;
          flex-wrap: wrap;
          padding: 12px 16px;
          border-radius: 20px;
          background: rgba(255,255,255,0.78);
          border: 1.5px solid #ffe5ec;
        }
        .toolbar-group {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .tool-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 12px;
          border-radius: 999px;
          border: 1px solid #f0c3d5;
          background: #fff;
          color: #7A3150;
          font: 700 11.5px 'Quicksand', sans-serif;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .tool-btn:hover {
          background: #fff0f5;
          border-color: #C92F6D;
          color: #C92F6D;
        }
        .tool-btn.primary-btn {
          background: linear-gradient(135deg, #ff8fab, #ff4d6d);
          color: #fff;
          border: none;
          box-shadow: 0 4px 12px rgba(255, 77, 109, 0.28);
        }
        .tool-btn.primary-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(255, 77, 109, 0.38);
        }

        /* Identity Bar */
        .user-view-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 9px 15px;
          border-radius: 14px;
          margin-bottom: 14px;
          background: #fff;
          border: 1.5px solid #ffe5ec;
          font: 700 12px 'Quicksand', sans-serif;
          flex-wrap: wrap;
          gap: 8px;
        }
        .active-user-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 11px;
        }

        /* Banner Notice */
        .match-announcer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 18px;
          border-radius: 18px;
          margin-bottom: 20px;
          gap: 12px;
          background: linear-gradient(90deg, #fff0f5, #fff, #f4efff);
          border: 1.5px solid #ffe5ec;
        }
        .announcer-text {
          font: 700 13px 'Quicksand', sans-serif;
          color: #3d2f36;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .numbers-called-pill {
          font: 600 11px 'IBM Plex Mono', monospace;
          color: #8D1749;
          background: rgba(255,255,255,0.8);
          padding: 5px 10px;
          border-radius: 999px;
          border: 1px solid #f6c8d9;
          white-space: nowrap;
        }

        /* Boards Container */
        .boards-arena {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 24px;
        }

        /* Player Card */
        .bingo-player-card {
          padding: 18px;
          border-radius: 24px;
          background: #fffdfE;
          backdrop-filter: blur(14px);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .bingo-player-card.is-active-turn {
          transform: translateY(-2px);
        }

        .player-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 14px;
        }
        .player-identity {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .player-avatar-ring {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          padding: 2px;
          display: grid;
          place-items: center;
          box-shadow: 0 4px 10px rgba(0,0,0,0.08);
        }
        .player-avatar-ring img {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          object-fit: cover;
          background: #fff;
        }
        .player-tagline {
          font: 700 10px 'Quicksand', sans-serif;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }
        .player-tagline span {
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        .player-name-title {
          margin: 2px 0 0;
          font: 700 17px 'Quicksand', sans-serif;
          line-height: 1.1;
        }

        .turn-indicator-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 10px;
          border-radius: 999px;
          font: 700 10.5px 'Quicksand', sans-serif;
        }
        .turn-indicator-pill.waiting {
          color: #9F607A;
          background: #fdf5f8;
        }
        .pulsing-turn-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          animation: pulse-dot 1.5s infinite;
        }

        /* BINGO Letters Strip */
        .bingo-strip-container {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 14px;
          padding: 8px 10px;
          background: rgba(255, 245, 248, 0.7);
          border-radius: 16px;
          border: 1px solid #ffe5ec;
        }
        .bingo-letter-track {
          display: flex;
          gap: 6px;
        }
        .bingo-letter-cell {
          width: 32px;
          height: 32px;
          border-radius: 9px;
          border: 1.5px solid #f0c3d5;
          background: #fff;
          color: #9F607A;
          display: grid;
          place-items: center;
          position: relative;
          overflow: hidden;
          font: 800 14px 'Quicksand', sans-serif;
          transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .bingo-letter-cell.is-struck {
          color: #fff;
          border-color: transparent;
          box-shadow: 0 4px 10px rgba(201, 47, 109, 0.25);
          animation: bounce-letter 0.35s ease;
        }
        .strike-slash {
          position: absolute;
          width: 140%;
          height: 2.5px;
          background: #fff;
          transform: rotate(-45deg);
        }
        .lines-count-pill {
          font: 700 11px 'Quicksand', sans-serif;
          padding: 4px 9px;
          border-radius: 999px;
          background: #fff;
        }

        /* Grid Layout */
        .grid-wrapper {
          position: relative;
          min-height: 260px;
        }
        .bingo-board-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 6px;
        }
        .bingo-cell {
          aspect-ratio: 1;
          border-radius: 12px;
          border: 1.5px solid #f0c3d5;
          background: #fff;
          position: relative;
          display: grid;
          place-items: center;
          cursor: pointer;
          font: 700 16px 'IBM Plex Mono', monospace;
          transition: all 0.16s ease;
          user-select: none;
          padding: 0;
        }
        .bingo-cell.can-click:hover {
          transform: translateY(-2px) scale(1.04);
          border-color: #ff4d6d;
          box-shadow: 0 5px 12px rgba(255, 143, 171, 0.35);
          background: #fff5f8;
        }
        .bingo-cell:disabled:not(.is-called) {
          cursor: default;
          opacity: 0.9;
        }
        .bingo-cell.is-called {
          background: #fdf0f4;
          cursor: default;
        }
        .bingo-cell.in-line {
          background: #ffe3ee !important;
          box-shadow: inset 0 0 0 1.5px rgba(201, 47, 109, 0.45);
        }
        .cell-strike-mark {
          position: absolute;
          width: 80%;
          height: 3px;
          border-radius: 2px;
          opacity: 0.78;
          transform: rotate(-40deg);
        }
        .last-called-spark {
          position: absolute;
          top: 2px;
          right: 2px;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          display: grid;
          place-items: center;
        }

        /* CONCEALED OPPONENT GRID CARD */
        .secret-board-wrapper {
          min-height: 260px;
          display: grid;
          place-items: center;
          padding: 24px 16px;
          border-radius: 20px;
          background: linear-gradient(135deg, rgba(255, 245, 248, 0.8), rgba(249, 239, 255, 0.8));
          border: 1.5px dashed #f0c3d5;
          text-align: center;
        }
        .secret-card-inner {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          max-width: 280px;
        }
        .secret-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 4px 10px;
          border-radius: 999px;
          font: 700 9.5px 'Quicksand', sans-serif;
          letter-spacing: 0.05em;
        }
        .secret-avatar-ring {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          padding: 3px;
          display: grid;
          place-items: center;
          box-shadow: 0 4px 12px rgba(0,0,0,0.06);
        }
        .secret-avatar-ring img {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          object-fit: cover;
          background: #fff;
        }
        .secret-card-inner h4 {
          margin: 0;
          font: 700 16px 'Quicksand', sans-serif;
          color: #3d2f36;
        }
        .secret-card-inner p {
          margin: 0;
          font-size: 11.5px;
          line-height: 1.45;
          color: #6d5260;
        }
        .secret-stats-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 5px 12px;
          border-radius: 999px;
          background: #fff;
          border: 1px solid #ffe5ec;
          font: 600 11px 'IBM Plex Mono', monospace;
          color: #8D1749;
        }
        .pass-device-btn {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          margin-top: 4px;
          padding: 6px 12px;
          border-radius: 999px;
          border: 1px solid #f0c3d5;
          background: #fff;
          color: #8D1749;
          font: 700 11px 'Quicksand', sans-serif;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .pass-device-btn:hover {
          background: #fff0f5;
          border-color: #C92F6D;
          color: #C92F6D;
          transform: translateY(-1px);
        }

        .board-bottom-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 10px;
          padding: 0 2px;
        }
        .shuffle-mini-btn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          border: none;
          background: transparent;
          color: #a2647d;
          font: 700 10.5px 'Quicksand', sans-serif;
          cursor: pointer;
          padding: 4px 6px;
          border-radius: 6px;
        }
        .shuffle-mini-btn:hover { color: #C92F6D; background: #fff0f5; }
        .board-stat-note {
          font: 700 11px 'Quicksand', sans-serif;
          color: #a2647d;
        }

        /* Called Numbers History Strip */
        .called-history-card {
          padding: 16px 20px;
          border-radius: 20px;
          background: rgba(255,255,255,0.85);
          border: 1.5px solid #ffe5ec;
          margin-bottom: 24px;
        }
        .history-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 10px;
        }
        .history-title {
          font: 700 12.5px 'Quicksand', sans-serif;
          color: #65102F;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .called-chips-stream {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .called-chip {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 9px;
          border-radius: 999px;
          font: 700 11px 'IBM Plex Mono', monospace;
          background: #fff;
          border: 1px solid #f6c8d9;
          color: #65102F;
        }
        .called-chip.recent {
          background: #C92F6D;
          color: #fff;
          border-color: #C92F6D;
          box-shadow: 0 2px 8px rgba(201, 47, 109, 0.3);
        }

        /* Modal Overlays */
        .modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 100;
          background: rgba(45, 15, 27, 0.45);
          backdrop-filter: blur(4px);
          display: grid;
          place-items: center;
          padding: 16px;
          animation: fade-in 0.2s ease;
        }
        .modal-card {
          width: min(100%, 480px);
          background: #fff;
          border-radius: 28px;
          border: 2px solid #ffe5ec;
          box-shadow: 0 20px 48px rgba(155, 63, 90, 0.25);
          padding: 28px;
          position: relative;
          text-align: center;
          animation: pop-up 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .modal-close-btn {
          position: absolute;
          top: 14px;
          right: 14px;
          border: none;
          background: #fff0f5;
          color: #a2647d;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          cursor: pointer;
          display: grid;
          place-items: center;
        }
        .victory-mascot-ring {
          width: 88px;
          height: 88px;
          margin: 0 auto 14px;
          border-radius: 50%;
          padding: 4px;
          background: linear-gradient(135deg, #ff8fab, #ff4d6d);
          box-shadow: 0 8px 24px rgba(255, 143, 171, 0.4);
        }
        .victory-mascot-ring img {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          object-fit: cover;
          background: #fff;
        }
        .victory-title {
          font: 700 28px 'Playfair Display', serif;
          margin: 0 0 6px;
        }
        .victory-sub {
          font: 600 13px 'Quicksand', sans-serif;
          color: #6d5260;
          margin-bottom: 20px;
        }
        .match-recap-box {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          padding: 14px;
          border-radius: 16px;
          background: #fff7f9;
          margin-bottom: 22px;
          text-align: left;
        }
        .recap-item {
          font: 700 11px 'Quicksand', sans-serif;
          color: #8D1749;
        }
        .recap-val {
          font: 700 15px 'IBM Plex Mono', monospace;
          color: #3d2f36;
          margin-top: 2px;
        }
        .modal-actions {
          display: flex;
          gap: 10px;
          justify-content: center;
        }

        /* Floating background shapes */
        .page-flower, .page-star, .page-sparkle {
          position: absolute;
          z-index: -1;
          color: #c92f6d;
          opacity: .48;
          pointer-events: none;
          animation: gentle-float 5s ease-in-out infinite;
        }
        .page-star { color: #e45b91; opacity: .65; animation-delay: -1.8s; }
        .page-sparkle { color: #951744; opacity: .48; animation-delay: -3.2s; }

        @keyframes page-in { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes gentle-float { 0%, 100% { transform: translateY(0) rotate(0); } 50% { transform: translateY(-10px) rotate(9deg); } }
        @keyframes pulse-dot { 0%,100% { box-shadow: 0 0 0 0 rgba(201,47,109,.4); } 50% { box-shadow: 0 0 0 6px rgba(201,47,109,0); } }
        @keyframes sync-pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(111,207,141,.35); } 50% { box-shadow: 0 0 0 5px rgba(111,207,141,0); } }
        @keyframes bounce-letter { 0% { transform: scale(0.7); } 60% { transform: scale(1.18); } 100% { transform: scale(1); } }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes pop-up { from { opacity: 0; transform: scale(0.85); } to { opacity: 1; transform: scale(1); } }

        /* Responsive styling */
        @media (max-width: 768px) {
          .scoreboard-banner {
            grid-template-columns: repeat(2, 1fr);
          }
          .boards-arena {
            grid-template-columns: 1fr !important;
          }
          .header-actions {
            width: 100%;
            justify-content: space-between;
          }
          .main-header {
            flex-direction: column;
            align-items: flex-start;
          }
          .app-nav-tabs {
            width: 100%;
            margin-bottom: 8px;
          }
          .nav-tab-btn {
            flex: 1;
            justify-content: center;
          }
        }
      `}</style>

      {/* Background ambient accents */}
      <Flower2 className="page-flower" size={64} strokeWidth={1} style={{ top: 110, left: "3%" }} />
      <Star className="page-star" size={24} fill="currentColor" strokeWidth={0} style={{ top: 160, right: "6%" }} />
      <Sparkles className="page-sparkle" size={36} strokeWidth={1.3} style={{ bottom: 80, right: "4%" }} />

      <div className="tracker-content">
        {/* Main Header */}
        <header className="main-header">
          <div className="brand-lockup">
            <div className="brand-mascot">
              <img src={mascotLogo} alt="Study Bloom mascot" />
            </div>
            <div>
              <div className="brand-badge">
                <Gamepad2 size={13} strokeWidth={2} />
                <Ribbon size={13} strokeWidth={2} />
                STUDY BLOOM • FLASH BINGO
              </div>
              <h1 className="brand-title">Mithi &amp; Ashish Bingo Arena</h1>
              <p className="brand-subtitle">5x5 Student Classic · Strikes, Lines &amp; B-I-N-G-O</p>
            </div>
          </div>

          <div className="header-actions">
            <nav className="app-nav-tabs" aria-label="Page navigation">
              <button
                type="button"
                className="nav-tab-btn"
                onClick={onNavigateToTracker}
              >
                <BookOpen size={14} />
                <span>Study Tracker</span>
              </button>
              <button
                type="button"
                className="nav-tab-btn active"
              >
                <Sparkles size={14} />
                <span>Flash Bingo</span>
              </button>
            </nav>

            <div className="sync-pill">
              <span className="sync-dot" />
              <span>{syncStatus === "synced" ? "Synced with Supabase" : "Saved locally"}</span>
              <Cloud size={14} strokeWidth={2} />
            </div>

            <button type="button" className="logout-button" onClick={onLogout}>
              <LogOut size={14} /> Log out
            </button>
          </div>
        </header>

        {/* Identity & Perspective Bar */}
        <div className="user-view-bar">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: "#a2647d" }}>Signed in as:</span>
            <span
              className="active-user-badge"
              style={{
                background: loggedPlayer === "mithi" ? "#fff0f5" : "#f4efff",
                color: loggedPlayer === "mithi" ? "#C92F6D" : "#674ead",
                border: `1px solid ${loggedPlayer === "mithi" ? "#ffd4df" : "#eadff9"}`
              }}
            >
              {loggedPlayer === "mithi" ? <Flower2 size={12} /> : <Crown size={12} />}
              <strong>{loggedPlayer === "mithi" ? "Bhargavi (Mithi)" : "Ashish"}</strong>
            </span>

            <span style={{ color: "#8d7b85", fontSize: 11 }}>
              • Showing your board only ({activeViewer === "mithi" ? "Mithi" : "Ashish"})
            </span>
          </div>

          {/* Quick viewer toggle for playing pass-and-play on a shared device */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: "#a2647d", fontSize: 11 }}>Playing on one phone?</span>
            <button
              type="button"
              className="tool-btn"
              style={{ padding: "4px 10px", fontSize: 11 }}
              onClick={() => setActiveViewer(v => v === "mithi" ? "ashish" : "mithi")}
            >
              Switch view to {activeViewer === "mithi" ? "Ashish" : "Bhargavi"}
            </button>
          </div>
        </div>

        {/* Scoreboard Banner */}
        <section className="scoreboard-banner" aria-label="Bingo scoreboard">
          <div className="score-card">
            <div className="score-card-label" style={{ color: "#8D1749" }}>
              <Trophy size={13} /> Total Games
            </div>
            <div className="score-card-value" style={{ color: "#65102F" }}>
              {displayTotal}
            </div>
          </div>

          <div className="score-card mithi-card">
            <div className="score-card-label" style={{ color: "#C92F6D" }}>
              <Flower2 size={13} /> Mithi Wins
            </div>
            <div className="score-card-value" style={{ color: "#C92F6D" }}>
              {displayMithi}
            </div>
          </div>

          <div className="score-card ashish-card">
            <div className="score-card-label" style={{ color: "#674ead" }}>
              <Crown size={13} /> Ashish Wins
            </div>
            <div className="score-card-value" style={{ color: "#674ead" }}>
              {displayAshish}
            </div>
          </div>

          <div className="score-card">
            <div className="score-card-label" style={{ color: "#8D7B85" }}>
              <Swords size={13} /> Ties / Draws
            </div>
            <div className="score-card-value" style={{ color: "#5a4a52" }}>
              {displayDraws}
            </div>
          </div>
        </section>

        {/* Game Toolbar */}
        <section className="game-toolbar">
          <div className="toolbar-group">
            <button
              type="button"
              className="tool-btn primary-btn"
              onClick={() => handleNewMatch()}
            >
              <RotateCcw size={13} /> New Match / Rematch
            </button>

            <button
              type="button"
              className="tool-btn"
              onClick={() => setSoundEnabled(s => !s)}
            >
              {soundEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
              <span>{soundEnabled ? "Sound On" : "Muted"}</span>
            </button>
          </div>

          <div className="toolbar-group">
            <button
              type="button"
              className="tool-btn"
              onClick={() => setShowRules(true)}
            >
              <Info size={13} /> Flash Rules
            </button>
          </div>
        </section>

        {/* Match Announcer */}
        <div className="match-announcer">
          <div className="announcer-text">
            <Sparkles size={16} color="#C92F6D" />
            <span>
              {gameStatus === "gameover" ? (
                <strong>Game Over! {winner === "mithi" ? "🌸 Mithi is the Bingo Champion!" : winner === "ashish" ? "⚡ Ashish is the Bingo Champion!" : "🤝 It's a thrilling Draw!"}</strong>
              ) : (
                <>
                  Turn: <strong style={{ color: currentTurn === "mithi" ? "#C92F6D" : "#674ead" }}>
                    {currentTurn === "mithi" ? "Mithi (Bhargavi)" : "Ashish"}
                  </strong> — {currentTurn === activeViewer ? "Tap any uncalled number on your board to call it!" : "Waiting for opponent to call a number..."}
                </>
              )}
            </span>
          </div>

          <div className="numbers-called-pill">
            {calledNumbers.length}/25 called
          </div>
        </div>

        {/* Boards Arena */}
        <div className="boards-arena">
          {renderBoard("mithi", "Mithi (Bhargavi)", mithiBoard, mithiEval)}
          {renderBoard("ashish", "Ashish", ashishBoard, ashishEval)}
        </div>

        {/* Called Numbers Stream */}
        {calledNumbers.length > 0 && (
          <section className="called-history-card">
            <div className="history-card-header">
              <div className="history-title">
                <Flame size={14} color="#C92F6D" />
                <span>Called Numbers Stream (Chronological)</span>
              </div>
              <small style={{ color: "#a2647d", fontSize: 11 }}>
                Latest: <strong>#{calledNumbers[calledNumbers.length - 1]}</strong>
              </small>
            </div>

            <div className="called-chips-stream">
              {calledNumbers.map((num, i) => {
                const isRecent = i === calledNumbers.length - 1;
                return (
                  <span key={num} className={`called-chip ${isRecent ? "recent" : ""}`}>
                    #{num}
                  </span>
                );
              })}
            </div>
          </section>
        )}
      </div>

      {/* Victory Celebration Modal */}
      {showVictoryModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <button
              type="button"
              className="modal-close-btn"
              onClick={() => setShowVictoryModal(false)}
            >
              <X size={16} />
            </button>

            <div className="victory-mascot-ring">
              <img src={mascotLogo} alt="Study Bloom celebration" />
            </div>

            <div className="brand-badge" style={{ margin: "0 auto 8px" }}>
              <Trophy size={12} /> BINGO FLASH VICTORY
            </div>

            <h2 className="victory-title" style={{ color: winner === "mithi" ? "#C92F6D" : "#674ead" }}>
              {winner === "mithi" ? "🌸 Mithi Wins!" : winner === "ashish" ? "⚡ Ashish Wins!" : "🤝 It's a Tie!"}
            </h2>

            <p className="victory-sub">
              {winner === "mithi"
                ? "Brilliant play, Bhargavi! You unlocked all 5 letters of B-I-N-G-O first!"
                : winner === "ashish"
                ? "Sharp moves, Ashish! You conquered all 5 strike lines!"
                : "Both players struck 5 lines simultaneously! What a match!"}
            </p>

            <div className="match-recap-box">
              <div className="recap-item">
                Winning Number
                <div className="recap-val">#{winningNumber}</div>
              </div>
              <div className="recap-item">
                Total Calls
                <div className="recap-val">{calledNumbers.length} turns</div>
              </div>
              <div className="recap-item">
                Mithi Completed
                <div className="recap-val">{mithiEval.lineCount} lines</div>
              </div>
              <div className="recap-item">
                Ashish Completed
                <div className="recap-val">{ashishEval.lineCount} lines</div>
              </div>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="tool-btn primary-btn"
                style={{ padding: "10px 22px", fontSize: 13 }}
                onClick={() => handleNewMatch()}
              >
                <RotateCcw size={14} /> Play Next Round
              </button>
              <button
                type="button"
                className="tool-btn"
                style={{ padding: "10px 18px", fontSize: 13 }}
                onClick={() => setShowVictoryModal(false)}
              >
                Inspect Boards
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rules Modal */}
      {showRules && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ textAlign: "left" }}>
            <button
              type="button"
              className="modal-close-btn"
              onClick={() => setShowRules(false)}
            >
              <X size={16} />
            </button>

            <h3 style={{ font: "700 20px 'Quicksand', sans-serif", color: "#65102F", margin: "0 0 12px" }}>
              Flash Bingo Rules
            </h3>

            <div style={{ fontSize: 13, lineHeight: 1.6, color: "#544245", display: "grid", gap: 10 }}>
              <p>
                <strong>1. Secret 5×5 Grids:</strong> Both Mithi and Ashish have their own secret 5×5 grid of numbers 1 to 25. You only see your own numbers to keep placements secret!
              </p>
              <p>
                <strong>2. Calling Numbers:</strong> When it is your turn, tap any uncalled number on your grid. That number is crossed off on <em>both</em> players&apos; boards!
              </p>
              <p>
                <strong>3. Strikes &amp; Lines:</strong> Any completely crossed row (5 rows), column (5 columns), or diagonal (2 diagonals) completes a strike line.
              </p>
              <p>
                <strong>4. B - I - N - G - O:</strong> Each completed line unlocks a letter:
                <br />
                Line 1 = <strong>B</strong> • Line 2 = <strong>I</strong> • Line 3 = <strong>N</strong> • Line 4 = <strong>G</strong> • Line 5 = <strong>O</strong>.
              </p>
              <p>
                <strong>5. Winning:</strong> The first player to reach 5 completed lines achieves <strong>BINGO</strong> and wins! Total games and wins are saved directly to the database.
              </p>
            </div>

            <div style={{ marginTop: 20, textAlign: "center" }}>
              <button
                type="button"
                className="tool-btn primary-btn"
                onClick={() => setShowRules(false)}
              >
                Got it, Let&apos;s Play!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
