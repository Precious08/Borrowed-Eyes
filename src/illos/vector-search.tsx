// Vector search from Illos.dev, used under the Illos free license.
// Adapted palette, static fallback, continuous loop with accessible pause/play.
import { useEffect, useRef, type CSSProperties } from "react";
import { mountShader } from "./shader-runtime";

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 460" fill="none">
<style>
.be-clock{animation:be-clock 4.2s linear infinite;animation-play-state:var(--illos-play,running)}
@keyframes be-clock{from{opacity:0}to{opacity:0}}
.illos-live .be-still{visibility:hidden}
@media(prefers-reduced-motion:reduce){.be-clock{animation:none}}
</style>
<g class="be-still" stroke="#0f4c46" stroke-dasharray="5 4">
<path d="M150 270V340M165 245V350M180 230V355M195 220V340M210 225V325M225 240V310M240 265V300" stroke-width="5"/>
<path d="M265 180V250M280 155V275M295 140V290M310 130V300M325 145V290M340 160V275M355 180V255M370 210V240" stroke-width="5"/>
<path d="M530 110V160M545 90V175M560 110V155M570 310V350M585 285V365M600 310V350" stroke="#b34f3d" stroke-width="4"/>
</g><path d="M60 318L212 222M244 148H392V296H244Z" stroke="#b34f3d" stroke-width="1.5"/>
<rect class="sh-clock be-clock" width="0" height="0"/>
<metadata class="illos-field" data-cycle="4.2"><![CDATA[float field(vec2 p, float t) {
  float v = 0.0;
  vec4 C[4];
  C[0] = vec4(540.0, 118.0, 52.0, 0.62); C[1] = vec4(585.0, 330.0, 64.0, 0.85);
  C[2] = vec4(350.0, 398.0, 40.0, 0.5); C[3] = vec4(664.0, 214.0, 32.0, 0.42);
  for (int i = 0; i < 4; i++) {
    float ph = TAU * t / T + float(i) * 1.7;
    v += blob(p, C[i].xy + vec2(7.0 * cos(ph), 6.0 * sin(ph)), C[i].z * (1.0 + 0.08 * sin(2.0 * ph)), C[i].w);
  }
  float heat = max(1.0 - sm(0.0, 0.6, t), sm(2.8, 3.3, t));
  v += blob(p, vec2(318.0, 222.0), 60.0 * (1.0 + 0.06 * heat), 0.8 + 0.45 * heat);
  vec2 S = vec2(62.0, 318.0); vec2 D = vec2(212.0, 222.0);
  float u = clamp((t - 0.8) / 1.8, 0.0, 1.0);
  vec2 q = t < 0.6 ? D : mix(S, D, ease(u));
  float k = t < 0.6 ? 1.05 * (1.0 - sm(0.0, 0.6, t)) : 1.05 * sm(0.6, 0.9, t);
  float speed = (u > 0.0 && u < 1.0) ? sin(3.14159 * u) : 0.0;
  vec2 dir = normalize(D - S);
  v += blob(p, q, 24.0, k);
  for (int s = 1; s <= 4; s++) v += blob(p, q - dir * 16.0 * float(s), 24.0 - 4.0 * float(s), k * speed * (0.55 - 0.12 * float(s)));
  if (t > 2.6 && t < 3.95) {
    float R = 30.0 + 320.0 * sm(2.6, 3.9, t);
    v += 0.42 * (1.0 - sm(2.6, 3.95, t)) * exp(-pow(length(p - D) - R, 2.0) / 260.0) * (v > 0.05 ? 1.6 : 1.0);
  }
  if (hash(floor(p / vec2(7.0, 9.4)) * vec2(7.0, 3.0)) > 0.992) v = max(v, 0.3);
  return v;
}]]></metadata></svg>`;

export function IllosVectorSearch() {
  const host = useRef<HTMLDivElement>(null);
  const animationRef = useRef(false);
  const mediaRef = useRef<MediaQueryList | null>(null);

  useEffect(() => {
    const element = host.current;
    if (!element) return;

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    mediaRef.current = media;
    let stopShader = () => {};
    let alive = true;

    const initialise = () => {
      if (media.matches) {
        element.style.setProperty("--illos-play", "paused");
        return;
      }
      const animations = element.getAnimations({ subtree: true });
      if (!animations.length) return;

      try { stopShader = mountShader(element); } catch { /* Keep the SVG fallback. */ }

      let inView = false;
      let tabVisible = document.visibilityState === "visible";

      const sync = () => {
        const playing = inView && tabVisible;
        animations.forEach(animation => playing ? animation.play() : animation.pause());
        element.style.setProperty("--illos-play", playing ? "running" : "paused");
      };

      const observer = new IntersectionObserver(entries => {
        inView = entries.some(entry => entry.isIntersecting);
        sync();
      }, { threshold: 0.1, rootMargin: "50px" });
      observer.observe(element);

      const onVisibility = () => {
        tabVisible = document.visibilityState === "visible";
        sync();
      };
      document.addEventListener("visibilitychange", onVisibility);

      sync();
      animationRef.current = true;

      return () => {
        observer.disconnect();
        document.removeEventListener("visibilitychange", onVisibility);
        animations.forEach(animation => animation.pause());
        stopShader();
      };
    };

    let cleanup: (() => void) | null = initialise() ?? null;

    const onMediaChange = (e: MediaQueryListEvent) => {
      if (cleanup) { cleanup(); cleanup = null; }
      if (!alive) return;
      cleanup = initialise() ?? null;
    };
    media.addEventListener("change", onMediaChange);

    return () => {
      alive = false;
      if (cleanup) cleanup();
      media.removeEventListener("change", onMediaChange);
    };
  }, []);

  return (
    <div
      className="illos-art"
      ref={host}
      aria-hidden="true"
      style={{
        position: "relative",
        "--illos-ramp-1": "#0f4c46",
        "--illos-ramp-2": "#b34f3d",
        "--illos-ramp-3": "#d89a86",
        "--illos-ramp-4": "#c5bba9"
      } as CSSProperties}
      dangerouslySetInnerHTML={{ __html: SVG }}
    />
  );
}