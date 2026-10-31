const STATUS_LABEL = {
  not_sent: 'Not sent',
  invited: 'Awaiting response',
  accepted: 'Attending',
  declined: "Can't attend",
};

export default function GuestSection({
  section,
  guests,
  totalCount,
  query,
  selectable,
  selectedIds,
  copiedId,
  onToggleSelected,
  onToggleSelectAll,
  onCopyLink,
  onWhatsApp,
  onDelete,
}) {
  const headingId = `guest-section-${section.key}`;
  const allSelected = selectable && guests.length > 0 && guests.every((g) => selectedIds.has(g._id));

  return (
    <section aria-labelledby={headingId}>
      <h2 id={headingId} className="section-title">
        {section.title} ({guests.length}
        {query ? ` of ${totalCount}` : ''})
      </h2>
      {guests.length === 0 ? (
        <p className="hint-text">{query ? 'No matches.' : section.emptyText}</p>
      ) : (
        <div className="guest-table-wrap">
          <table className="guest-table">
            <caption className="visually-hidden">{section.title}</caption>
            <thead>
              <tr>
                {selectable && (
                  <th scope="col" className="guest-table-check">
                    <label className="guest-select-all">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={() => onToggleSelectAll(guests)}
                        aria-label="Select all not sent yet"
                      />
                      Select all
                    </label>
                  </th>
                )}
                <th scope="col">Guest</th>
                <th scope="col" className="guest-table-actions-head">
                  <span className="visually-hidden">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {guests.map((g) => (
                <tr key={g._id} className={`guest-${g.status}`}>
                  {selectable && (
                    <td className="guest-table-check">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(g._id)}
                        onChange={() => onToggleSelected(g._id)}
                        aria-label={`Select ${g.name}`}
                      />
                    </td>
                  )}
                  <td>
                    <div className="guest-row-name">
                      <strong>{g.name}</strong>
                      {g.phone && <span className="guest-phone"> ({g.phone})</span>}
                    </div>
                    {g.email && <div className="guest-email">{g.email}</div>}
                    {g.dietaryNotes && <div className="guest-notes">Dietary notes: {g.dietaryNotes}</div>}
                    {g.respondedAt && (
                      <div className="guest-notes">Responded {new Date(g.respondedAt).toLocaleString()}</div>
                    )}
                  </td>
                  <td>
                    <div className="guest-row-actions">
                      {g.inviteToken && (g.status === 'not_sent' || g.status === 'invited') && (
                        <>
                          <button
                            className="btn secondary guest-share-btn"
                            type="button"
                            onClick={() => onCopyLink(g)}
                            aria-label={`Copy invite link for ${g.name}`}
                          >
                            {copiedId === g._id ? 'Copied!' : 'Copy link'}
                          </button>
                          <button
                            className="btn secondary guest-share-btn"
                            type="button"
                            onClick={() => onWhatsApp(g._id)}
                            aria-label={`Send invite to ${g.name} via WhatsApp`}
                          >
                            WhatsApp
                          </button>
                        </>
                      )}
                      <button
                        className="btn danger guest-share-btn"
                        type="button"
                        onClick={() => onDelete(g)}
                        aria-label={`Remove ${g.name}`}
                      >
                        Remove
                      </button>
                      {g.status !== 'invited' && (
                        <span className={`badge guest-status-badge guest-status-${g.status}`}>
                          {STATUS_LABEL[g.status]}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
