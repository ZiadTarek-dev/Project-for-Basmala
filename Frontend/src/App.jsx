import { useState, useEffect, useRef } from "react";
import AnimatedFlowers from "./components/AnimatedFlowers";
import "./App.css";
import SparkleBurst from "./components/SparkleBurst"; // add this
import heroImage from "./assets/Hero.jpeg";
/* ------------------------------------------------------------------ */
/*  Signature motif: a single-line botanical sprig, reused as the      */
/*  cover flourish, section dividers, and RSVP card mark.              */
/* ------------------------------------------------------------------ */
function Sprig({ className = "", width = 90, style }) {
  return (
    <svg
      className={className}
      width={width}
      style={style}
      viewBox="0 0 140 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M2 14 C 30 14, 30 14, 70 14 S 110 14, 138 14"
        stroke="currentColor"
        strokeWidth="0.75"
      />
      <path
        d="M70 14 C 66 8, 60 6, 54 8"
        stroke="currentColor"
        strokeWidth="0.75"
      />
      <path
        d="M70 14 C 66 20, 60 22, 54 20"
        stroke="currentColor"
        strokeWidth="0.75"
      />
      <path
        d="M40 14 C 37 9, 32 8, 28 10"
        stroke="currentColor"
        strokeWidth="0.75"
      />
      <path
        d="M40 14 C 37 19, 32 20, 28 18"
        stroke="currentColor"
        strokeWidth="0.75"
      />
      <path
        d="M100 14 C 97 9, 92 8, 88 10"
        stroke="currentColor"
        strokeWidth="0.75"
      />
      <path
        d="M100 14 C 97 19, 92 20, 88 18"
        stroke="currentColor"
        strokeWidth="0.75"
      />
      <circle cx="70" cy="14" r="1.6" fill="currentColor" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Scroll-reveal wrapper                                              */
/* ------------------------------------------------------------------ */
function useReveal() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.18 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return [ref, visible];
}

function Reveal({ children, className = "", delay = 0, as = "div" }) {
  const [ref, visible] = useReveal();
  const Tag = as;
  return (
    <Tag
      ref={ref}
      className={`reveal ${visible ? "reveal-visible" : ""} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </Tag>
  );
}

/* ------------------------------------------------------------------ */
/*  Countdown                                                          */
/* ------------------------------------------------------------------ */
const EVENT_DATE = "2026-09-03T18:00:00";

function calcTimeLeft() {
  const diff = +new Date(EVENT_DATE) - +new Date();
  const clamped = Math.max(diff, 0);
  return {
    days: Math.floor(clamped / (1000 * 60 * 60 * 24)),
    hours: Math.floor((clamped / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((clamped / (1000 * 60)) % 60),
    seconds: Math.floor((clamped / 1000) % 60),
    isPast: diff <= 0,
  };
}

function useCountdown() {
  const [t, setT] = useState(calcTimeLeft);
  useEffect(() => {
    const id = setInterval(() => setT(calcTimeLeft()), 1000);
    return () => clearInterval(id);
  }, []);
  return t;
}

function pad(n) {
  return String(n).padStart(2, "0");
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */
export default function App() {
  const [opened, setOpened] = useState(false);
  const countdown = useCountdown();

  const [name, setName] = useState("");
  const [attending, setAttending] = useState(null);
  const [guests, setGuests] = useState("1");
  const [note, setNote] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState(false);
  const [showSparkles, setShowSparkles] = useState(false);

  function handleOpen() {
    setOpened(true);
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (!prefersReducedMotion) {
      setShowSparkles(true);
      setTimeout(() => setShowSparkles(false), 1000);
    }
  }

  useEffect(() => {
    document.body.style.overflow = opened ? "auto" : "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [opened]);

  function handleRSVP() {
    setTouched(true);
    if (!name.trim() || attending === null) return;

    fetch("http://localhost:5000/api/rsvp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        attending,
        guests: attending === "yes" ? guests : null,
        note: note.trim(),
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Request failed");
        setSubmitted(true);
      })
      .catch(() => {
        // optional: show an error state to the user here
        alert("Something went wrong sending your RSVP. Please try again.");
      });
  }

  const canSubmit = name.trim().length > 0 && attending !== null;

  return (
    <div className="invite-root">
      {/* -------- Cover -------- */}
      <div
        className={`cover ${opened ? "cover-opened" : ""}`}
        aria-hidden={opened}
      >
        <div className="cover-inner">
          <Sprig
            className="cover-sprig cover-fade"
            width={100}
            style={{ animationDelay: "0.05s" }}
          />
          <p className="eyebrow cover-fade" style={{ animationDelay: "0.15s" }}>
            You're Invited
          </p>
          <h1
            className="cover-names cover-fade"
            style={{ animationDelay: "0.3s" }}
          >
            Ahmed <span className="amp">&amp;</span> Basmala
          </h1>
          <p
            className="cover-date cover-fade"
            style={{ animationDelay: "0.45s" }}
          >
            Thursday, September 3, 2026
          </p>
          <p
            className="cover-cordially cover-fade"
            style={{ animationDelay: "0.55s" }}
          >
            Cordially Invites You to Celebrate Our Engagement
          </p>
          <div className="open-btn-wrap">
            <button
              type="button"
              className="open-btn cover-fade"
              style={{ animationDelay: "0.7s" }}
              onClick={handleOpen}
            >
              Open
            </button>
            {showSparkles && <SparkleBurst />}
          </div>
          <Sprig
            className="cover-sprig cover-fade"
            width={100}
            style={{ animationDelay: "0.7s" }}
          />
        </div>
      </div>

      {/* -------- Full invitation -------- */}
      <main className="page">
        {/* Countdown */}
        <section className="section">
          <Reveal>
            <p className="eyebrow">The Countdown</p>
            <h2 className="section-heading">Until We Celebrate</h2>
          </Reveal>
          <Reveal delay={100}>
            {countdown.isPast ? (
              <p className="countdown-sub">Today is the day.</p>
            ) : (
              <>
                <div className="countdown-row">
                  <div className="countdown-item">
                    <span className="countdown-num">{countdown.days}</span>
                    <span className="countdown-label">Days</span>
                  </div>
                  <div className="countdown-item">
                    <span className="countdown-num">
                      {pad(countdown.hours)}
                    </span>
                    <span className="countdown-label">Hours</span>
                  </div>
                  <div className="countdown-item">
                    <span className="countdown-num">
                      {pad(countdown.minutes)}
                    </span>
                    <span className="countdown-label">Minutes</span>
                  </div>
                  <div className="countdown-item">
                    <span className="countdown-num">
                      {pad(countdown.seconds)}
                    </span>
                    <span className="countdown-label">Seconds</span>
                  </div>
                </div>
                <p className="countdown-sub">Talkha, Egypt</p>
              </>
            )}
          </Reveal>
        </section>

        <Reveal as="div" className="divider-row">
          <Sprig width={90} />
        </Reveal>

        {/* Photo */}
        <section className="section">
          <Reveal>
            <div className="photo-frame" style={{ position: "relative" }}>
              <img
                className="photo-img"
                src={heroImage}
                alt="Placeholder — replace with a photo of the couple"
              />
              <AnimatedFlowers></AnimatedFlowers>
            </div>
          </Reveal>
        </section>

        <Reveal as="div" className="divider-row">
          <Sprig width={90} />
        </Reveal>

        {/* Details */}
        <section className="section">
          <Reveal>
            <p className="eyebrow">The Details</p>
            <h2 className="section-heading">When &amp; Where</h2>
          </Reveal>
          <Reveal delay={100}>
            <div className="details-grid">
              <div className="detail-card">
                <span className="eyebrow">Engagement Party</span>
                <p className="detail-name">Marasim Plaza</p>
                <p className="detail-line">8:00 PM</p>
                <p className="detail-line">Nawady Street</p>
              </div>
            </div>
          </Reveal>
        </section>

        <Reveal as="div" className="divider-row">
          <Sprig width={90} />
        </Reveal>

        {/* RSVP */}
        <section className="section">
          <Reveal>
            <p className="eyebrow">RSVP</p>
            <h2 className="section-heading">Will You Join Us?</h2>
          </Reveal>

          <Reveal delay={100}>
            <div className="rsvp-card">
              {submitted ? (
                <div className="rsvp-success">
                  <p>
                    {attending === "yes"
                      ? "Thank you — we can't wait to celebrate with you."
                      : "Thank you for letting us know. You'll be missed."}
                  </p>
                  <p>
                    A confirmation isn't sent anywhere — this is just for you to
                    see.
                  </p>
                </div>
              ) : (
                <>
                  <div className="field">
                    <label className="field-label" htmlFor="rsvp-name">
                      Full name
                    </label>
                    <input
                      id="rsvp-name"
                      className="text-input"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                    />
                    {touched && !name.trim() && (
                      <p className="field-error">Please enter your name.</p>
                    )}
                  </div>

                  <div className="field">
                    <span className="field-label">Will you attend?</span>
                    <div className="pill-row">
                      <button
                        type="button"
                        className={`pill-btn ${attending === "yes" ? "pill-selected" : ""}`}
                        onClick={() => setAttending("yes")}
                      >
                        Joyfully accepts
                      </button>
                      <button
                        type="button"
                        className={`pill-btn ${attending === "no" ? "pill-selected" : ""}`}
                        onClick={() => setAttending("no")}
                      >
                        Regretfully declines
                      </button>
                    </div>
                    {touched && attending === null && (
                      <p className="field-error">Please choose one.</p>
                    )}
                  </div>

                  {attending === "yes" && (
                    <div className="field">
                      <label className="field-label" htmlFor="rsvp-guests">
                        Number of guests
                      </label>
                      <select
                        id="rsvp-guests"
                        className="select-input"
                        value={guests}
                        onChange={(e) => setGuests(e.target.value)}
                      >
                        <option value="1">Just me</option>
                        <option value="2">2 guests</option>
                        <option value="3">3 guests</option>
                        <option value="4">4 guests</option>
                      </select>
                    </div>
                  )}

                  <div className="field">
                    <label className="field-label" htmlFor="rsvp-note">
                      Message (optional)
                    </label>
                    <textarea
                      id="rsvp-note"
                      className="textarea-input"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Anything we should know?"
                    />
                  </div>

                  <button
                    type="button"
                    className="submit-btn"
                    onClick={handleRSVP}
                  >
                    Send RSVP
                  </button>
                </>
              )}
            </div>
          </Reveal>
          {!submitted && (
            <p className="rsvp-note">Kindly respond by September 1, 2026</p>
          )}
        </section>

        <footer className="footer">
          <Sprig width={90} style={{ color: "var(--gold-dim)" }} />
          <p className="footer-mono">Ahmed &amp; Basmala</p>
        </footer>
      </main>
    </div>
  );
}
