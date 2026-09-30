import { useCallback, useEffect } from "react";
import { useNavigate, type To } from "react-router-dom";

type ClickModifiers = {
  ctrl: boolean;
  meta: boolean;
  shift: boolean;
  alt: boolean;
  button: number;
};

let lastClickModifiers: ClickModifiers | null = null;
let listenerInstalled = false;

function installClickListener() {
  if (listenerInstalled || typeof window === "undefined") return;
  listenerInstalled = true;
  window.addEventListener(
    "click",
    (e: MouseEvent) => {
      lastClickModifiers = {
        ctrl: e.ctrlKey,
        meta: e.metaKey,
        shift: e.shiftKey,
        alt: e.altKey,
        button: e.button,
      };
    },
    true
  );
}

function checkOpenInNewTab(): boolean {
  const mods = lastClickModifiers;
  lastClickModifiers = null;
  return !!mods && (mods.ctrl || mods.meta || mods.shift || mods.alt || mods.button === 1);
}

export function useSmartNavigate() {
  const navigate = useNavigate();
  useEffect(() => {
    installClickListener();
  }, []);

  return useCallback(
    (to: To | number, options?: { replace?: boolean; state?: any }) => {
      if (typeof to === "string" && checkOpenInNewTab()) {
        window.open(to, "_blank", "noopener,noreferrer");
        return;
      }
      navigate(to as To, options as any);
    },
    [navigate]
  );
}