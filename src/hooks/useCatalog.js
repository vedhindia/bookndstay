import { useMemo, useState } from 'react';
import { roomData } from '../db/data';

export default function useCatalog() {
  const [city, setCity] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [adults, setAdults] = useState(1);
  const [kids, setKids] = useState(0);
  const [sortBy, setSortBy] = useState('recommended');
  const [isSearching, setIsSearching] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [view, setView] = useState('list'); // 'list' | 'details'

  const totalGuests = adults + kids;

  const filteredRooms = useMemo(() => {
    const withComputed = roomData.map((room) => {
      const computedRating = Math.min(5, 3.6 + ((room.id % 12) * 0.12));
      const computedCity = ['Delhi', 'Mumbai', 'Bengaluru', 'Goa'][room.id % 4];
      return { ...room, computedRating, computedCity, payAtHotel: (room.id % 2) === 0, coupleFriendly: (room.id % 3) === 0 };
    });

    let list = withComputed.filter((room) => {
      const matchesCity = city ? room.computedCity.toLowerCase().includes(city.toLowerCase()) : true;
      const matchesGuests = totalGuests <= room.maxPerson;
      return matchesCity && matchesGuests;
    });

    if (sortBy === 'price_low_high') list = [...list].sort((a, b) => a.price - b.price);
    if (sortBy === 'price_high_low') list = [...list].sort((a, b) => b.price - a.price);
    if (sortBy === 'rating_high_low') list = [...list].sort((a, b) => b.computedRating - a.computedRating);

    return list;
  }, [city, totalGuests, sortBy]);

  const triggerSearch = () => {
    setIsSearching(true);
    setTimeout(() => setIsSearching(false), 500);
  };

  const openRoom = (room) => { setSelectedRoom(room); setView('details'); };
  const closeRoom = () => { setView('list'); setTimeout(() => setSelectedRoom(null), 0); };

  return {
    state: { city, checkIn, checkOut, adults, kids, sortBy, isSearching, filteredRooms, selectedRoom, view },
    actions: { setCity, setCheckIn, setCheckOut, setAdults, setKids, setSortBy, triggerSearch, openRoom, closeRoom },
  };
}


