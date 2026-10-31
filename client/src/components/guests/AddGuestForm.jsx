import { useState } from 'react';
import { api } from '../../api/client.js';
import { parseBulkGuests } from '../../utils/guests.js';
import Spinner from '../Spinner.jsx';

export default function AddGuestForm({ eventId, onAdded, onError }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [bulkEntries, setBulkEntries] = useState('');
  const [creating, setCreating] = useState(false);
  const [addedCount, setAddedCount] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    onError('');
    setAddedCount(null);

    // Bulk textarea takes priority if filled in; otherwise fall back to the
    // single name/phone fields.
    const bulk = parseBulkGuests(bulkEntries);
    if (bulk.length === 0 && !name.trim()) return;

    setCreating(true);
    try {
      if (bulk.length > 0) {
        await api.createGuestLinksBulk(eventId, bulk);
        setAddedCount(bulk.length);
        setBulkEntries('');
      } else {
        await api.createGuestLink(eventId, name.trim(), phone.trim());
        setAddedCount(1);
        setName('');
        setPhone('');
      }
      await onAdded();
    } catch (err) {
      onError(err.message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="card" style={{ marginTop: '1.5rem' }}>
      <form onSubmit={handleSubmit} className="field">
        <label htmlFor="link-guest-name">Add a guest</label>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <input
            id="link-guest-name"
            maxLength={100}
            placeholder="Guest name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ flex: 1, minWidth: 160 }}
          />
          <label htmlFor="link-guest-phone" className="visually-hidden">
            Guest phone (optional)
          </label>
          <input
            id="link-guest-phone"
            maxLength={25}
            type="tel"
            placeholder="Phone (for WhatsApp, optional)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            style={{ flex: 1, minWidth: 180 }}
          />
        </div>

        <label htmlFor="bulk-entries" style={{ marginTop: '0.9rem' }}>
          Or add several at once — one guest per line, as "Name, phone"
        </label>
        <textarea
          id="bulk-entries"
          rows={3}
          placeholder={'Priya Sharma, +91 98765 43210\nRahul Verma, +91 91234 56789'}
          value={bulkEntries}
          onChange={(e) => setBulkEntries(e.target.value)}
        />

        <div style={{ marginTop: '0.6rem' }}>
          <button className="btn" type="submit" disabled={creating}>
            {creating && <Spinner inline size={14} />}
            {creating ? 'Creating…' : 'Create link(s)'}
          </button>
        </div>
      </form>
      {addedCount && (
        <p className="hint-text" role="status" style={{ marginTop: '0.4rem' }}>
          Added {addedCount} guest{addedCount === 1 ? '' : 's'} under "Not sent yet" below. Select them and use
          "Send via WhatsApp", or copy their link, to actually invite them.
        </p>
      )}
      <p className="hint-text" style={{ marginTop: '0.4rem' }}>
        Each guest gets their own personal RSVP link with their name already filled in. A guest only moves to
        "Awaiting response" once you've actually sent them their link.
      </p>
    </div>
  );
}
