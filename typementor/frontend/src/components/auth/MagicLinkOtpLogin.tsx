import * as React from "react";
import { ArrowRight, Check, KeyRound, LoaderCircle, Mail, ShieldCheck } from "lucide-react";

export type MagicLinkStep = "email" | "code" | "success";
export type MagicLinkStatus = "idle" | "sending" | "verifying" | "error";

export type MagicLinkOtpLoginProps = {
  email?: string;
  defaultEmail?: string;
  onEmailChange?: (email: string) => void;
  step?: MagicLinkStep;
  defaultStep?: MagicLinkStep;
  onStepChange?: (step: MagicLinkStep) => void;
  /** Resolve after your service accepts the request; reject to keep the email form. */
  onSendLink?: (email: string) => unknown;
  /** Only an explicit true advances uncontrolled success. A void result leaves step to the host. */
  onVerifyCode?: (code: string) => unknown;
  status?: MagicLinkStatus;
  error?: string;
  resendSeconds?: number;
  codeLength?: number;
  onResend?: (email: string) => unknown;
  onUsePassword?: () => void;
  /** Optional controlled code, useful for host autofill. Each value is digits only. */
  code?: string;
  defaultCode?: string;
  onCodeChange?: (code: string) => void;
  appName?: string;
  logo?: React.ReactNode;
  successTitle?: string;
  className?: string;
  ref?: React.ComponentProps<"div">["ref"];
  /** Optional additional slot in the email step (e.g., name or password input for registration) */
  extraFields?: React.ReactNode;
  submitButtonText?: string;
  emailSubtitle?: React.ReactNode;
};

const FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card";
const EASE = "cubic-bezier(.22,1,.36,1)";
const digitsOnly = (value: string, length: number) => value.replace(/[^0-9]/g, "").slice(0, length);

function Envelope() {
  return (
    <div data-envelope aria-hidden="true" className="relative mx-auto h-[78px] w-[88px]" style={{ perspective: 400 }}>
      <div className="absolute left-2 top-7 h-12 w-[72px] rounded-lg border border-border bg-muted" />
      <div
        data-envelope-flap
        className="absolute left-2 top-7 h-8 w-[72px] origin-top bg-primary/20"
        style={{ clipPath: "polygon(0 0, 100% 0, 50% 100%)", transform: "rotateX(180deg)" }}
      />
      <div
        data-envelope-paper
        className="absolute left-[19px] top-6 flex h-[50px] w-[50px] flex-col items-center gap-1.5 rounded-md border border-border bg-card pt-2 shadow-sm"
        style={{ transform: "translateY(-10px)" }}
      >
        <span
          data-envelope-check
          className="flex size-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-chart-2 to-chart-3 text-background"
        >
          <Check className="size-3 text-white" strokeWidth={2.5} />
        </span>
        <span className="h-0.5 w-6 rounded bg-primary/25" />
        <span className="h-0.5 w-4 rounded bg-primary/15" />
      </div>
      <svg viewBox="0 0 74 50" className="absolute left-[7px] top-[27px] h-[50px] w-[74px] text-muted" fill="currentColor">
        <path d="M1 2 37 26 73 2v39a8 8 0 0 1-8 8H9a8 8 0 0 1-8-8Z" />
        <path d="m1 2 36 24L73 2M1 40l24-17m48 17L49 23" className="text-border" fill="none" stroke="currentColor" />
      </svg>
    </div>
  );
}

/** Passwordless UI only. The host owns delivery, verification, expiry and attempt limits. */
export function MagicLinkOtpLogin({
  email,
  defaultEmail = "",
  onEmailChange,
  step,
  defaultStep = "email",
  onStepChange,
  onSendLink,
  onVerifyCode,
  status,
  error,
  resendSeconds = 30,
  codeLength = 6,
  onResend,
  onUsePassword,
  code,
  defaultCode = "",
  onCodeChange,
  appName = "TypeMentor AI",
  logo,
  successTitle = "You're in",
  className = "",
  ref,
  extraFields,
  submitButtonText,
  emailSubtitle,
}: MagicLinkOtpLoginProps) {
  const id = React.useId();
  const length = Number.isFinite(codeLength) ? Math.min(8, Math.max(4, Math.floor(codeLength))) : 6;
  const cooldown = Number.isFinite(resendSeconds) ? Math.max(0, Math.ceil(resendSeconds)) : 30;
  const [localEmail, setLocalEmail] = React.useState(defaultEmail);
  const [localStep, setLocalStep] = React.useState(defaultStep);
  const [localCode, setLocalCode] = React.useState(defaultCode);
  const [localStatus, setLocalStatus] = React.useState<MagicLinkStatus>("idle");
  const [localError, setLocalError] = React.useState("");
  const [remaining, setRemaining] = React.useState(cooldown);
  const [resends, setResends] = React.useState(0);
  const [reduced, setReduced] = React.useState(true);
  const root = React.useRef<HTMLDivElement | null>(null);
  const inputs = React.useRef<(HTMLInputElement | null)[]>([]);
  const mounted = React.useRef(false);
  const request = React.useRef(0);
  const pending = React.useRef(false);
  const submitted = React.useRef<string | null>(null);
  const glowedCode = React.useRef<string | null>(null);
  const focusNext = React.useRef(false);
  const value = email ?? localEmail;
  const currentStep = step ?? localStep;
  const currentCode = digitsOnly(code ?? localCode, length);
  const currentStatus = status ?? localStatus;
  const message = error ?? localError;
  const busy =
    currentStatus === "sending" ||
    currentStatus === "verifying" ||
    localStatus === "sending" ||
    localStatus === "verifying";
  const failed = currentStatus === "error" || !!message;

  const attachRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      root.current = node;
      if (typeof ref === "function") {
        ref(node);
      } else if (ref && typeof ref === "object" && "current" in ref) {
        (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
      }
    },
    [ref]
  );

  React.useEffect(() => {
    mounted.current = true;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener("change", update);
    return () => {
      mounted.current = false;
      request.current += 1;
      pending.current = false;
      media.removeEventListener("change", update);
    };
  }, []);

  // A changed identity or host step invalidates a response still in flight.
  React.useEffect(() => {
    request.current += 1;
    pending.current = false;
    submitted.current = null;
    setLocalStatus("idle");
    setLocalError("");
  }, [value, currentStep]);

  React.useEffect(() => {
    if (currentStep !== "code") return;
    const deadline = Date.now() + cooldown * 1000;
    setRemaining(cooldown);
    const timer = window.setInterval(
      () => setRemaining(Math.max(0, Math.ceil((deadline - Date.now()) / 1000))),
      250
    );
    return () => window.clearInterval(timer);
  }, [currentStep, cooldown, resends]);

  React.useLayoutEffect(() => {
    if (!focusNext.current || !root.current) return;
    focusNext.current = false;
    const target =
      currentStep === "code"
        ? inputs.current[0]
        : root.current.querySelector(currentStep === "email" ? "input" : "h2");
    (target as HTMLElement | null)?.focus({ preventScroll: true });
  }, [currentStep]);

  React.useLayoutEffect(() => {
    if (reduced || !root.current) return;
    const animations: Animation[] = [];
    const animate = (selector: string, frames: Keyframe[], duration: number) => {
      const node = root.current?.querySelector(selector);
      if (node && typeof node.animate === "function") {
        animations.push(node.animate(frames, { duration, easing: EASE }));
      }
    };
    if (currentStep !== "email") {
      animate(
        "[data-step-body]",
        [
          { opacity: 0, transform: "translateY(8px)" },
          { opacity: 1, transform: "translateY(0)" },
        ],
        280
      );
    }
    if (currentStep === "code") {
      animate(
        "[data-envelope-flap]",
        [{ transform: "rotateX(0deg)" }, { transform: "rotateX(180deg)" }],
        580
      );
      animate(
        "[data-envelope-paper]",
        [{ transform: "translateY(14px)" }, { transform: "translateY(-10px)" }],
        720
      );
    }
    if (currentStep === "success") {
      animate(
        "[data-success-stamp]",
        [
          { opacity: 0, transform: "scale(1.3) rotate(-16deg)" },
          { opacity: 1, transform: "scale(.94) rotate(3deg)", offset: 0.7 },
          { opacity: 1, transform: "scale(1) rotate(0deg)" },
        ],
        480
      );
    }
    return () => animations.forEach((animation) => animation.cancel());
  }, [currentStep, reduced]);

  React.useLayoutEffect(() => {
    if (reduced || !failed || currentStep !== "code") return;
    const target = root.current?.querySelector("[data-code-fields]");
    if (target && typeof target.animate === "function") {
      const animation = target.animate(
        [
          { transform: "translateX(0)" },
          { transform: "translateX(-6px)" },
          { transform: "translateX(6px)" },
          { transform: "translateX(-4px)" },
          { transform: "translateX(0)" },
        ],
        { duration: 420, easing: "ease-in-out" }
      );
      return () => animation?.cancel();
    }
  }, [failed, message, currentStep, reduced]);

  React.useLayoutEffect(() => {
    if (currentStep !== "code" || currentCode.length !== length) {
      glowedCode.current = null;
      return;
    }
    if (reduced || failed || glowedCode.current === currentCode) return;
    glowedCode.current = currentCode;
    const animations = inputs.current.flatMap((input) => {
      if (!input || typeof input.animate !== "function") return [];
      const resting = getComputedStyle(input).boxShadow;
      const animation = input.animate(
        [
          { boxShadow: resting },
          {
            boxShadow:
              "0 0 0 2px rgba(16, 185, 129, 0.85), 0 0 14px rgba(16, 185, 129, 0.35)",
            offset: 0.45,
          },
          { boxShadow: resting },
        ],
        { duration: 440, easing: "ease-out" }
      );
      animation.id = "magic-code-glow";
      return [animation];
    });
    return () => animations.forEach((animation) => animation.cancel());
  }, [currentCode, currentStep, length, failed, reduced]);

  const changeStep = (next: MagicLinkStep) => {
    focusNext.current = focusNext.current || !!root.current?.contains(document.activeElement);
    if (step === undefined) setLocalStep(next);
    onStepChange?.(next);
  };

  const changeCode = (next: string) => {
    const clean = digitsOnly(next, length);
    if (clean !== currentCode) submitted.current = null;
    if (code === undefined) setLocalCode(clean);
    setLocalError("");
    if (!busy) setLocalStatus("idle");
    onCodeChange?.(clean);
  };

  const deliver = async (resend: boolean) => {
    const callback = resend ? onResend : onSendLink;
    if (!callback || busy || pending.current || (resend && remaining > 0)) return;
    focusNext.current = !!root.current?.contains(document.activeElement);
    pending.current = true;
    const token = ++request.current;
    setLocalStatus("sending");
    setLocalError("");
    try {
      await callback(value.trim());
      if (!mounted.current || token !== request.current) return;
      changeCode("");
      if (resend) setResends((count) => count + 1);
      else changeStep("code");
    } catch (err: unknown) {
      if (!mounted.current || token !== request.current) return;
      const errMsg = err instanceof Error ? err.message : String(err);
      setLocalError(errMsg || (resend ? "Couldn't resend. Please try again." : "Couldn't send a link. Please try again."));
      setLocalStatus("error");
    } finally {
      if (mounted.current && token === request.current) {
        pending.current = false;
        setLocalStatus((current) => (current === "error" ? current : "idle"));
      }
    }
  };

  React.useEffect(() => {
    if (currentCode.length !== length) {
      submitted.current = null;
      return;
    }
    if (
      currentStep !== "code" ||
      busy ||
      pending.current ||
      !onVerifyCode ||
      submitted.current === currentCode
    )
      return;
    let cancelled = false;
    const verify = async () => {
      if (cancelled || pending.current || submitted.current === currentCode) return;
      submitted.current = currentCode;
      pending.current = true;
      focusNext.current = !!root.current?.contains(document.activeElement);
      const token = ++request.current;
      setLocalError("");
      setLocalStatus("verifying");
      try {
        const result = await onVerifyCode(currentCode);
        if (!mounted.current || token !== request.current) return;
        if (result === true) changeStep("success");
        if (result === false) {
          setLocalError("That code didn't work. Try again.");
          setLocalStatus("error");
        }
      } catch (err: unknown) {
        if (!mounted.current || token !== request.current) return;
        const errMsg = err instanceof Error ? err.message : String(err);
        setLocalError(errMsg || "Couldn't verify that code. Please try again.");
        setLocalStatus("error");
      } finally {
        if (mounted.current && token === request.current) {
          pending.current = false;
          setLocalStatus((current) => (current === "error" ? current : "idle"));
        }
      }
    };
    queueMicrotask(() => {
      void verify();
    });
    return () => {
      cancelled = true;
    };
  }, [currentCode, length, currentStep, busy, onVerifyCode]);

  const putDigits = (text: string, index: number) => {
    if (busy) return;
    const clean = digitsOnly(text, length);
    if (!clean) return;
    const start = clean.length === length ? 0 : Math.min(index, currentCode.length);
    const next = (
      currentCode.slice(0, start) +
      clean +
      currentCode.slice(start + clean.length)
    ).slice(0, length);
    changeCode(next);
    inputs.current[Math.min(start + clean.length, length - 1)]?.focus();
  };

  const codeKey = (event: React.KeyboardEvent, index: number) => {
    if (busy) return;
    if (event.key === "Backspace") {
      event.preventDefault();
      const target = currentCode[index] ? index : Math.max(0, index - 1);
      changeCode(currentCode.slice(0, target) + currentCode.slice(target + 1));
      inputs.current[Math.max(0, index - 1)]?.focus();
    } else if (event.key === "Delete") {
      event.preventDefault();
      changeCode(currentCode.slice(0, index) + currentCode.slice(index + 1));
    } else if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      const next =
        event.key === "Home"
          ? 0
          : event.key === "End"
          ? length - 1
          : Math.max(0, Math.min(length - 1, index + (event.key === "ArrowLeft" ? -1 : 1)));
      inputs.current[next]?.focus();
    }
  };

  return (
    <div
      ref={attachRef}
      data-slot="magic-link-otp-login"
      data-step={currentStep}
      data-status={currentStatus}
      data-reduced={reduced}
      className={`w-full max-w-[440px] rounded-[28px] border border-border bg-card text-card-foreground shadow-2xl shadow-blue-500/10 backdrop-blur-xl ${className}`}
    >
      <div className="flex items-center justify-between gap-3 border-b border-border px-6 py-3.5">
        <span className="flex min-w-0 items-center gap-2.5 text-sm font-semibold">
          <span
            aria-hidden="true"
            className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white shadow-md shadow-blue-500/20"
          >
            {logo ?? <KeyRound className="size-4" />}
          </span>
          <span className="truncate tracking-tight font-bold text-white">{appName}</span>
        </span>
        <span className="shrink-0 rounded-full border border-border bg-muted/60 px-2.5 py-1 text-[10px] font-semibold text-blue-400">
          Email Verified
        </span>
      </div>

      <div data-step-body key={currentStep} className="px-6 py-5 sm:px-7">
        {currentStep === "email" ? (
          <form
            aria-labelledby={`${id}-title`}
            aria-busy={busy}
            onSubmit={(event) => {
              event.preventDefault();
              void deliver(false);
            }}
          >
            <div
              aria-hidden="true"
              className="mb-4 flex size-12 items-center justify-center rounded-2xl border border-blue-500/20 bg-blue-500/10 text-blue-400"
            >
              <Mail className="size-6" strokeWidth={1.75} />
            </div>
            <h2 id={`${id}-title`} className="text-[26px] font-extrabold leading-tight tracking-tight text-white">
              Your inbox is the key.
            </h2>
            <p className="mt-2 text-[13px] leading-5 text-muted-foreground">
              {emailSubtitle ?? (
                <>
                  Get a secure one-time verification code sent directly to your inbox.
                  <br />
                  Verified typing telemetry and anti-cheat protected.
                </>
              )}
            </p>

            {extraFields}

            <label htmlFor={`${id}-email`} className="mb-1.5 mt-4 block text-xs font-semibold text-zinc-300">
              Email address
            </label>
            <input
              id={`${id}-email`}
              type="email"
              name="email"
              required
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              value={value}
              disabled={busy}
              onChange={(event) => {
                setLocalEmail(event.target.value);
                onEmailChange?.(event.target.value);
                setLocalError("");
              }}
              placeholder="you@example.com"
              aria-invalid={failed || undefined}
              aria-describedby={failed ? `${id}-error` : undefined}
              className={`h-11 w-full rounded-xl border border-zinc-700 bg-zinc-900/90 px-3.5 text-sm text-white placeholder:text-zinc-400 focus:border-blue-500 disabled:opacity-60 ${FOCUS}`}
            />

            <button
              type="submit"
              disabled={busy || !onSendLink}
              className={`mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-70 ${FOCUS}`}
            >
              {busy ? (
                <>
                  <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
                  Sending code…
                </>
              ) : (
                <>
                  {submitButtonText ?? "Send verification code"} <ArrowRight aria-hidden="true" className="size-4" />
                </>
              )}
            </button>
            {failed && (
              <p id={`${id}-error`} role="alert" className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-xs font-semibold text-red-400">
                {message || "Something went wrong. Please try again."}
              </p>
            )}
          </form>
        ) : currentStep === "code" ? (
          <div aria-busy={busy}>
            <Envelope />
            <h2 id={`${id}-title`} className="mt-2 text-center text-[25px] font-extrabold leading-tight tracking-tight text-white">
              Check your inbox
            </h2>
            <p className="mt-1 text-center text-xs leading-5 text-muted-foreground">
              We sent a 6-digit verification code to
            </p>
            <p data-sent-email className="mt-0.5 break-all text-center text-[13px] font-semibold text-blue-400">
              {value}
            </p>
            <div className="mb-3 mt-4 flex items-center gap-3">
              <span className="h-px flex-1 bg-border" />
              <span id={`${id}-code-label`} className="text-[11px] font-medium text-muted-foreground">
                enter the {length}-digit code
              </span>
              <span className="h-px flex-1 bg-border" />
            </div>

            <div
              data-code-fields
              role="group"
              aria-labelledby={`${id}-code-label`}
              aria-describedby={`${id}-code-hint${failed ? ` ${id}-error` : ""}`}
              className="grid gap-2"
              style={{ gridTemplateColumns: `repeat(${length}, minmax(0, 1fr))` }}
            >
              {Array.from({ length }, (_, index) => (
                <input
                  key={index}
                  ref={(node) => {
                    inputs.current[index] = node;
                  }}
                  data-code-index={index}
                  type="text"
                  inputMode="numeric"
                  autoComplete={index === 0 ? "one-time-code" : "off"}
                  pattern="[0-9]*"
                  name={`code-${index + 1}`}
                  aria-label={`Digit ${index + 1} of ${length}`}
                  aria-invalid={failed || undefined}
                  value={currentCode[index] ?? ""}
                  disabled={busy}
                  onFocus={(event) => event.target.select()}
                  onKeyDown={(event) => codeKey(event, index)}
                  onChange={(event) => {
                    if (!event.target.value) {
                      changeCode(currentCode.slice(0, index) + currentCode.slice(index + 1));
                    } else {
                      putDigits(event.target.value, index);
                    }
                  }}
                  onPaste={(event) => {
                    event.preventDefault();
                    putDigits(event.clipboardData.getData("text"), index);
                  }}
                  className={`h-14 min-w-0 rounded-xl border bg-zinc-900/90 text-center font-mono text-2xl font-bold text-white caret-blue-400 transition-all disabled:opacity-70 ${
                    failed
                      ? "border-red-500/70 ring-1 ring-red-500/50"
                      : currentCode[index]
                      ? "border-emerald-500/80 ring-2 ring-emerald-500/40 text-emerald-400"
                      : "border-zinc-700 hover:border-zinc-500"
                  } ${FOCUS}`}
                />
              ))}
            </div>

            <p id={`${id}-code-hint`} className="sr-only">
              Enter {length} digits. Your code is submitted automatically when complete.
            </p>

            <div className="flex min-h-8 items-center justify-center pt-2 text-center text-[12px] leading-4">
              {failed ? (
                <p id={`${id}-error`} role="alert" className="rounded-md border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-400">
                  {message || "That code didn't work. Try again."}
                </p>
              ) : (
                <p className="flex items-center gap-1.5 text-muted-foreground">
                  {currentStatus === "verifying" ? (
                    <>
                      <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin text-blue-400" />
                      <span className="text-blue-400 font-medium">Verifying your code…</span>
                    </>
                  ) : (
                    <>Code verifies automatically upon entering {length} digits</>
                  )}
                </p>
              )}
            </div>

            <div className="mt-2 flex items-center justify-between gap-3 text-xs">
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  request.current += 1;
                  pending.current = false;
                  changeCode("");
                  changeStep("email");
                }}
                className={`rounded px-1 py-1.5 font-medium text-muted-foreground underline decoration-border underline-offset-4 hover:text-white disabled:opacity-50 cursor-pointer ${FOCUS}`}
              >
                Change email
              </button>
              <button
                data-resend
                type="button"
                disabled={remaining > 0 || busy || !onResend}
                onClick={() => void deliver(true)}
                className={`rounded px-2 py-1.5 font-semibold tabular-nums text-blue-400 hover:text-blue-300 disabled:text-muted-foreground disabled:cursor-not-allowed cursor-pointer ${FOCUS}`}
              >
                {currentStatus === "sending"
                  ? "Sending…"
                  : remaining > 0
                  ? `Resend in ${remaining}s`
                  : "Resend code"}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex min-h-[280px] flex-col items-center justify-center py-6 text-center">
            <div
              data-success-stamp
              aria-hidden="true"
              className="mb-5 flex size-[76px] items-center justify-center rounded-full border border-emerald-500/30 bg-gradient-to-br from-emerald-500 to-teal-400 text-white shadow-xl shadow-emerald-500/20 ring-8 ring-emerald-500/10"
            >
              <Check className="size-9" strokeWidth={2.2} />
            </div>
            <h2 id={`${id}-title`} tabIndex={-1} className="text-[28px] font-extrabold tracking-tight text-white outline-none">
              {successTitle}
            </h2>
            <p className="mt-2 text-[13px] text-muted-foreground">
              Welcome to {appName}. Preparing your workspace…
            </p>
            <span className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-semibold text-emerald-400">
              <ShieldCheck className="size-3.5" aria-hidden="true" />
              Email Ownership Verified
            </span>
          </div>
        )}

        {onUsePassword && currentStep !== "success" && (
          <button
            type="button"
            disabled={busy}
            onClick={onUsePassword}
            className={`mx-auto mt-3 flex items-center gap-1.5 rounded px-2 py-1.5 text-[11px] font-medium text-muted-foreground hover:text-white disabled:opacity-50 cursor-pointer ${FOCUS}`}
          >
            <KeyRound className="size-3" aria-hidden="true" />
            Sign in with password instead
          </button>
        )}
      </div>

      <ol aria-label="Sign-in progress" className="flex items-center justify-center gap-4 border-t border-border px-6 py-3">
        {(["email", "code", "success"] as const).map((item, index) => {
          const active = currentStep === item;
          const done = index < ["email", "code", "success"].indexOf(currentStep);
          return (
            <li
              key={item}
              aria-current={active ? "step" : undefined}
              className={`flex items-center gap-1.5 text-[11px] font-medium ${
                active || done ? "text-white" : "text-muted-foreground"
              }`}
            >
              <span
                className={`flex size-4.5 items-center justify-center rounded-full text-[9px] font-bold ${
                  active
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-500/40"
                    : done
                    ? "bg-emerald-500 text-white"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {done ? <Check className="size-2.5" strokeWidth={3} aria-hidden="true" /> : index + 1}
              </span>
              {["Account", "Verification", "You're In"][index]}
            </li>
          );
        })}
      </ol>
      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {currentStep === "success"
          ? successTitle
          : currentStatus === "sending"
          ? "Sending your verification code"
          : currentStatus === "verifying"
          ? "Verifying your code"
          : currentStep === "code"
          ? `Check your inbox at ${value}. Enter your ${length}-digit code.`
          : "Enter your email to get a verification code."}
      </p>
    </div>
  );
}

export default MagicLinkOtpLogin;
