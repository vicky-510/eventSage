export async function exportPlanPdf(event) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  const margin = 15;
  let y = 20;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(event.title, margin, y);
  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const meta = [
    event.occasionType,
    event.date ? new Date(event.date).toLocaleDateString() : null,
    event.location,
  ]
    .filter(Boolean)
    .join(' · ');
  if (meta) {
    doc.text(meta, margin, y);
    y += 10;
  }

  function sectionHeading(title) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(title, margin, y);
    y += 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
  }

  function ensureSpace(lines = 1) {
    if (y + lines * 6 > 280) {
      doc.addPage();
      y = 20;
    }
  }

  if (event.plan?.budget?.length) {
    sectionHeading('Budget');
    for (const b of event.plan.budget) {
      ensureSpace();
      doc.text(`${b.category}: Rs. ${Number(b.amount).toLocaleString()}`, margin, y);
      y += 6;
    }
    y += 4;
  }

  if (event.plan?.timeline?.length) {
    ensureSpace(2);
    sectionHeading('Timeline');
    for (const t of event.plan.timeline) {
      ensureSpace();
      doc.text(`${t.time ? t.time + ' - ' : ''}${t.label}${t.notes ? ' (' + t.notes + ')' : ''}`, margin, y);
      y += 6;
    }
    y += 4;
  }

  if (event.plan?.checklist?.length) {
    ensureSpace(2);
    sectionHeading('Vendor checklist');
    for (const c of event.plan.checklist) {
      ensureSpace();
      const due = c.dueDate ? ` (due ${new Date(c.dueDate).toLocaleDateString()})` : '';
      doc.text(`[${c.status}] ${c.task}${due}`, margin, y);
      y += 6;
    }
    y += 4;
  }

  if (event.plan?.ideas?.length) {
    ensureSpace(2);
    sectionHeading('Ideas');
    for (const idea of event.plan.ideas) {
      ensureSpace();
      const wrapped = doc.splitTextToSize(`- ${idea}`, 180);
      doc.text(wrapped, margin, y);
      y += wrapped.length * 6;
    }
  }

  doc.save(`${event.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-plan.pdf`);
}
