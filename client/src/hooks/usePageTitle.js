import { useEffect } from 'react';

export const APP_NAME = 'EventSage';

/** Sets document.title to "<title> · EventSage" so each route is announced distinctly. */
export function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · ${APP_NAME}` : `${APP_NAME} — Celebration & Event Planner`;
  }, [title]);
}
