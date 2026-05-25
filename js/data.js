// js/data.js
// Merges seed (shortcuts.js) + overlay into effective categories+links.

function clone(o) {
  return JSON.parse(JSON.stringify(o));
}

export function merge(seed, overlay) {
  // 1. Start with seed (cloned so we don't mutate it)
  let categories = clone(seed);

  // 2. Drop deleted categories
  const deletedCats = new Set(overlay.deleted?.categories || []);
  categories = categories.filter((c) => !deletedCats.has(c.id));

  // 3. Apply category edits (shallow merge)
  const catEdits = overlay.edited?.categories || {};
  categories.forEach((c) => {
    if (catEdits[c.id]) Object.assign(c, catEdits[c.id]);
  });

  // 4 + 5. Drop deleted links + apply link edits (including categoryId moves)
  const deletedLinks = new Set(overlay.deleted?.links || []);
  const linkEdits = overlay.edited?.links || {};

  // Collect moved links to re-place
  const movedLinks = [];
  categories.forEach((c) => {
    c.items = c.items.filter((l) => !deletedLinks.has(l.id));
    c.items.forEach((l) => {
      if (linkEdits[l.id]) Object.assign(l, linkEdits[l.id]);
    });
    // Pull out any links whose edited categoryId differs from current
    c.items = c.items.filter((l) => {
      if (linkEdits[l.id]?.categoryId && linkEdits[l.id].categoryId !== c.id) {
        movedLinks.push(l);
        return false;
      }
      return true;
    });
  });

  // Re-place moved links into their new home category
  movedLinks.forEach((l) => {
    const target = categories.find((c) => c.id === linkEdits[l.id].categoryId);
    if (target) target.items.push(l);
  });

  // 6a. Append added categories
  (overlay.added?.categories || []).forEach((c) => {
    if (deletedCats.has(c.id)) return; // delete wins over add (re-add after delete is rare)
    categories.push(clone(c));
  });

  // 6b. Append added links into their categories
  const addedLinks = overlay.added?.links || {};
  Object.entries(addedLinks).forEach(([catId, links]) => {
    const target = categories.find((c) => c.id === catId);
    if (!target) return;
    links.forEach((l) => {
      if (!deletedLinks.has(l.id)) target.items.push(clone(l));
    });
  });

  // 7. Reorder categories
  const catOrder = overlay.order?.categories || [];
  if (catOrder.length) {
    const byId = new Map(categories.map((c) => [c.id, c]));
    const ordered = [];
    catOrder.forEach((id) => {
      if (byId.has(id)) {
        ordered.push(byId.get(id));
        byId.delete(id);
      }
    });
    // unknown ids (newly added in seed) appended at end
    byId.forEach((c) => ordered.push(c));
    categories = ordered;
  }

  // 7b. Reorder links within each category
  const linkOrder = overlay.order?.links || {};
  categories.forEach((c) => {
    const order = linkOrder[c.id];
    if (!order || !order.length) return;
    const byId = new Map(c.items.map((l) => [l.id, l]));
    const ordered = [];
    order.forEach((id) => {
      if (byId.has(id)) {
        ordered.push(byId.get(id));
        byId.delete(id);
      }
    });
    byId.forEach((l) => ordered.push(l));
    c.items = ordered;
  });

  return categories;
}

export function findLink(categories, linkId) {
  for (const c of categories) {
    for (const l of c.items) {
      if (l.id === linkId) return { category: c, link: l };
    }
  }
  return null;
}
