import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import GuestSection from './GuestSection.jsx';

const section = { key: 'not_sent', title: 'Not sent yet', emptyText: 'Everyone has been invited.' };
const guests = [
  { _id: '1', name: 'Priya', phone: '+91 98765', status: 'not_sent', inviteToken: 'a' },
  { _id: '2', name: 'Rahul', status: 'not_sent', inviteToken: 'b' },
];

function renderSection(props = {}) {
  const handlers = {
    onToggleSelected: vi.fn(),
    onToggleSelectAll: vi.fn(),
    onCopyLink: vi.fn(),
    onWhatsApp: vi.fn(),
    onDelete: vi.fn(),
  };
  render(
    <GuestSection
      section={section}
      guests={guests}
      totalCount={guests.length}
      query=""
      selectable
      selectedIds={new Set()}
      copiedId={null}
      {...handlers}
      {...props}
    />
  );
  return handlers;
}

describe('GuestSection', () => {
  it('renders an accessible table with a caption and labelled columns', () => {
    renderSection();
    const table = screen.getByRole('table', { name: 'Not sent yet' });
    expect(within(table).getByRole('columnheader', { name: 'Actions' })).toBeInTheDocument();
    expect(within(table).getAllByRole('row')).toHaveLength(3);
  });

  it('gives each action button a guest-specific accessible name', () => {
    const handlers = renderSection();
    fireEvent.click(screen.getByRole('button', { name: 'Copy invite link for Priya' }));
    fireEvent.click(screen.getByRole('button', { name: 'Send invite to Rahul via WhatsApp' }));
    fireEvent.click(screen.getByRole('button', { name: 'Remove Rahul' }));

    expect(handlers.onCopyLink).toHaveBeenCalledWith(guests[0]);
    expect(handlers.onWhatsApp).toHaveBeenCalledWith('2');
    expect(handlers.onDelete).toHaveBeenCalledWith(guests[1]);
  });

  it('wires up row and select-all checkboxes', () => {
    const handlers = renderSection();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select Priya' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select all not sent yet' }));

    expect(handlers.onToggleSelected).toHaveBeenCalledWith('1');
    expect(handlers.onToggleSelectAll).toHaveBeenCalledWith(guests);
  });

  it('shows the empty-state text, or "No matches." while searching', () => {
    const { unmount } = render(
      <GuestSection section={section} guests={[]} totalCount={0} query="" selectedIds={new Set()} />
    );
    expect(screen.getByText('Everyone has been invited.')).toBeInTheDocument();
    unmount();

    render(<GuestSection section={section} guests={[]} totalCount={2} query="zz" selectedIds={new Set()} />);
    expect(screen.getByText('No matches.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /not sent yet \(0 of 2\)/i })).toBeInTheDocument();
  });
});
