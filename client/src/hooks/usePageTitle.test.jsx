import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePageTitle } from './usePageTitle.js';

describe('usePageTitle', () => {
  it('suffixes the page title with the app name', () => {
    renderHook(() => usePageTitle('Log in'));
    expect(document.title).toBe('Log in · EventSage');
  });

  it('falls back to the full app title when no page title is given', () => {
    renderHook(() => usePageTitle());
    expect(document.title).toBe('EventSage — Celebration & Event Planner');
  });

  it('updates when the title changes', () => {
    const { rerender } = renderHook(({ title }) => usePageTitle(title), { initialProps: { title: 'Event' } });
    rerender({ title: 'Birthday Bash' });
    expect(document.title).toBe('Birthday Bash · EventSage');
  });
});
