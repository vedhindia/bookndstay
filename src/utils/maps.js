export const parseLatLng = (value) => {
  const lat = typeof value?.lat === 'number' ? value.lat : Number(value?.lat);
  const lng = typeof value?.lng === 'number' ? value.lng : Number(value?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90) return null;
  if (lng < -180 || lng > 180) return null;
  if (lat === 0 && lng === 0) return null;
  return { lat, lng };
};

export const parseLatLngFromUrlOrText = (input) => {
  if (!input) return null;
  const raw = String(input).trim();
  if (!raw) return null;

  const tryFromString = (s) => {
    const m1 = s.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
    if (m1) {
      const lat = Number(m1[1]);
      const lng = Number(m1[2]);
      return parseLatLng({ lat, lng });
    }
    const m2 = s.match(/(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)/);
    if (m2) {
      const lat = Number(m2[1]);
      const lng = Number(m2[2]);
      return parseLatLng({ lat, lng });
    }
    return null;
  };

  const direct = tryFromString(raw);
  if (direct) return direct;

  const normalizeUrl = (s) => {
    if (/^https?:\/\//i.test(s)) return s;
    if (s.startsWith('www.')) return `https://${s}`;
    if (s.startsWith('maps.google.') || s.startsWith('google.com/maps')) return `https://${s}`;
    return s;
  };

  try {
    const u = new URL(normalizeUrl(raw));
    const fromPath = tryFromString(u.pathname);
    if (fromPath) return fromPath;

    const q = u.searchParams.get('q') || u.searchParams.get('query') || u.searchParams.get('destination');
    const fromQ = q ? tryFromString(q) : null;
    if (fromQ) return fromQ;

    const all = `${u.pathname} ${u.search} ${u.hash}`;
    return tryFromString(all);
  } catch {
    return null;
  }
};

export const buildHotelMap = (hotel) => {
  const latLng =
    parseLatLng({ lat: hotel?.latitude, lng: hotel?.longitude }) ||
    parseLatLngFromUrlOrText(hotel?.map_url);

  const address = [
    hotel?.address,
    hotel?.location,
    hotel?.city,
    hotel?.state,
    hotel?.pincode,
    hotel?.country
  ]
    .filter(Boolean)
    .map((v) => String(v).trim())
    .filter(Boolean)
    .join(' ')
    .trim();
  const name = String(hotel?.name || '').trim();
  const fallbackQuery = encodeURIComponent(`${address} ${name}`.trim() || name || address || 'Hotel');

  const embedQuery = latLng ? `${latLng.lat},${latLng.lng}` : fallbackQuery;
  const embedSrc = `https://maps.google.com/maps?q=${embedQuery}&z=15&output=embed`;

  const openUrl = latLng
    ? `https://www.google.com/maps?q=${latLng.lat},${latLng.lng}`
    : (hotel?.map_url ? String(hotel.map_url) : `https://www.google.com/maps/search/?api=1&query=${fallbackQuery}`);

  return { latLng, embedSrc, openUrl };
};
