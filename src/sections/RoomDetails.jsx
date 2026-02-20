import { useState } from 'react';
import { FaArrowLeft, FaStar, FaWifi, FaTv, FaSnowflake, FaCoffee, FaCheck, FaClock, FaParking, FaUtensils, FaPlus, FaMinus } from 'react-icons/fa';
import { MdPets, MdLocalLaundryService, MdOutlineChair } from 'react-icons/md';

export default function RoomDetails({ state, actions }) {
  const { selectedRoom } = state;
  const { closeRoom } = actions;
  const [roomCount, setRoomCount] = useState(1);
  const [guestCount, setGuestCount] = useState(2);
  
  if (!selectedRoom) return null;
  const price = selectedRoom.price;
  const service = Math.round(price * 0.1);
  const tax = Math.round(price * 0.12);
  const total = Math.round((price * roomCount) + service + tax);
  
  return (
    <section className="bg-gray-100">
      <div className='bg-white border-b'>
        <div className='container mx-auto px-4 py-3 flex items-center gap-3'>
          <button onClick={closeRoom} className='p-2 rounded hover:bg-gray-200'><FaArrowLeft /></button>
          <h1 className='text-xl font-semibold'>{selectedRoom.name}</h1>
          <div className="ml-2 bg-green-700 text-white text-xs px-2 py-1 rounded flex items-center">
            <span>4.2</span>
            <FaStar className="ml-1" size={10} />
          </div>
        </div>
      </div>
      
      <div className='container mx-auto px-4 py-6 grid lg:grid-cols-12 gap-6'>
        <div className='lg:col-span-8 space-y-4'>
          {/* Main image and gallery */}
          <div className="relative">
            <img src={selectedRoom.imageLg} alt={selectedRoom.name} className='w-full h-72 object-cover rounded-xl' />
            <button className="absolute bottom-4 right-4 bg-white text-black px-3 py-1 rounded text-sm">View all</button>
          </div>
          
          <div className='grid grid-cols-4 gap-2'>
            {[selectedRoom.imageLg, selectedRoom.imageLg, selectedRoom.imageLg, selectedRoom.imageLg].map((img, i) => (
              <img key={i} src={img} alt='' className='h-20 w-full object-cover rounded-lg' />
            ))}
          </div>
          
          {/* Amenities section */}
          <div className="bg-white p-4 rounded-lg">
            <h3 className='text-lg font-semibold mb-4'>Amenities</h3>
            <div className='grid grid-cols-2 md:grid-cols-3 gap-4 text-sm'>
              <div className='flex items-center gap-2'><FaWifi className='text-[#ee2e24]'/>High-speed WiFi</div>
              <div className='flex items-center gap-2'><FaTv className='text-[#ee2e24]'/>Smart TV</div>
              <div className='flex items-center gap-2'><FaSnowflake className='text-[#ee2e24]'/>AC</div>
              <div className='flex items-center gap-2'><FaCoffee className='text-[#ee2e24]'/>Tea/Coffee</div>
              <div className='flex items-center gap-2'><FaParking className='text-[#ee2e24]'/>Free Parking</div>
              <div className='flex items-center gap-2'><FaUtensils className='text-[#ee2e24]'/>Restaurant</div>
              <div className='flex items-center gap-2'><MdPets className='text-[#ee2e24]'/>Pet Friendly</div>
              <div className='flex items-center gap-2'><MdLocalLaundryService className='text-[#ee2e24]'/>Laundry</div>
              <div className='flex items-center gap-2'><MdOutlineChair className='text-[#ee2e24]'/>Seating Area</div>
            </div>
          </div>
          
          {/* About this property */}
          <div className="bg-white p-4 rounded-lg">
            <h3 className='text-lg font-semibold mb-2'>About this OYO</h3>
            <p className='text-gray-700 text-sm leading-6'>{selectedRoom.description}</p>
            <p className='text-gray-700 text-sm leading-6 mt-2'>OYO has taken every measure to ensure your stay is comfortable, safe and clean. The property follows all local laws and hygiene standards.</p>
          </div>
          
          {/* Ratings and reviews */}
          <div className="bg-white p-4 rounded-lg">
            <h3 className='text-lg font-semibold mb-2'>Ratings and reviews</h3>
            <div className="flex items-center mb-4">
              <div className="bg-green-700 text-white px-2 py-1 rounded flex items-center mr-2">
                <span className="text-lg font-bold">4.2</span>
                <FaStar className="ml-1" size={12} />
              </div>
              <span className="text-sm text-gray-600">Based on 120 reviews</span>
            </div>
            
            {/* Rating bars */}
            <div className="space-y-2 mb-4">
              {[5, 4, 3, 2, 1].map(rating => (
                <div key={rating} className="flex items-center">
                  <span className="w-8 text-sm">{rating}</span>
                  <div className="flex-1 bg-gray-200 h-2 rounded-full mx-2">
                    <div className={`bg-green-600 h-2 rounded-full`} style={{width: `${rating * 20}%`}}></div>
                  </div>
                  <span className="w-8 text-sm text-gray-600">{rating * 20}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className='lg:col-span-4 space-y-4'>
          <div className='bg-white rounded-lg shadow p-5'>
            <div className='flex items-center justify-between mb-4'>
              <div>
                <div className='text-gray-400 text-xs line-through'>₹{Math.round(price * 1.3)}</div>
                <div className='text-3xl font-bold text-[#ee2e24]'>₹{price}</div>
                <div className='text-xs text-gray-600'>per room per night</div>
              </div>
              <div className='text-right'>
                <div className='bg-green-700 text-white px-2 py-1 rounded flex items-center'>
                  <span className="font-bold">4.2</span>
                  <FaStar className="ml-1" size={12} />
                </div>
                <div className='text-xs text-green-700 mt-1'>Fabulous</div>
              </div>
            </div>
            
            {/* Date selection */}
            <div className="border rounded-lg p-3 mb-4">
              <div className="flex justify-between mb-2">
                <div>
                  <div className="text-xs text-gray-500">Check In</div>
                  <div className="font-semibold">Wed, 20 Oct</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Check Out</div>
                  <div className="font-semibold">Thu, 21 Oct</div>
                </div>
              </div>
              <div className="flex justify-between mt-3">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Rooms</div>
                  <div className="flex items-center">
                    <button 
                      className="w-8 h-8 bg-gray-200 rounded-l-lg flex items-center justify-center hover:bg-gray-300"
                      onClick={() => setRoomCount(prev => Math.max(1, prev - 1))}
                    >
                      <FaMinus size={12} />
                    </button>
                    <div className="w-10 h-8 bg-white border-t border-b flex items-center justify-center font-semibold">
                      {roomCount}
                    </div>
                    <button 
                      className="w-8 h-8 bg-gray-200 rounded-r-lg flex items-center justify-center hover:bg-gray-300"
                      onClick={() => setRoomCount(prev => Math.min(5, prev + 1))}
                    >
                      <FaPlus size={12} />
                    </button>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Guests</div>
                  <div className="flex items-center">
                    <button 
                      className="w-8 h-8 bg-gray-200 rounded-l-lg flex items-center justify-center hover:bg-gray-300"
                      onClick={() => setGuestCount(prev => Math.max(1, prev - 1))}
                    >
                      <FaMinus size={12} />
                    </button>
                    <div className="w-10 h-8 bg-white border-t border-b flex items-center justify-center font-semibold">
                      {guestCount}
                    </div>
                    <button 
                      className="w-8 h-8 bg-gray-200 rounded-r-lg flex items-center justify-center hover:bg-gray-300"
                      onClick={() => setGuestCount(prev => Math.min(10, prev + 1))}
                    >
                      <FaPlus size={12} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Room selection */}
            <div className="border rounded-lg p-3 mb-4">
              <h4 className="font-semibold mb-2">Choose your room</h4>
              <div className="border rounded p-2 mb-2 flex justify-between items-center">
                <div>
                  <div className="font-semibold">Classic</div>
                  <div className="text-xs text-gray-600">Room only</div>
                </div>
                <div className="flex items-center">
                  <div className="text-sm font-semibold mr-2">₹{price}</div>
                  <input type="radio" name="room" defaultChecked />
                </div>
              </div>
            </div>
            
            {/* Price breakdown */}
            <div className="border rounded-lg p-3 mb-4">
              <h4 className="font-semibold mb-2">Price Breakdown</h4>
              <div className="space-y-2 mb-3">
                <div className="flex justify-between text-sm">
                  <span>{roomCount} Room{roomCount > 1 ? 's' : ''} × 1 Night</span>
                  <span>₹{price}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Service Fee</span>
                  <span>₹{service}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>GST & Service Charge</span>
                  <span>₹{tax}</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-semibold">
                  <span>Total</span>
                  <span>₹{total}</span>
                </div>
              </div>
              <button onClick={() => actions.navigate('booking')} className="w-full bg-[#ee2e24] text-white py-3 rounded-lg font-semibold">Continue to Book</button>
            </div>
            
            <div className='space-y-2 text-sm'>
              <div className='flex items-start gap-2'><FaCheck className='text-green-600 mt-0.5'/><span>Free Cancellation within 48 hours</span></div>
              <div className='flex items-start gap-2'><FaCheck className='text-green-600 mt-0.5'/><span>Pay at hotel available</span></div>
              <div className='flex items-start gap-2'><FaClock className='text-gray-700 mt-0.5'/><span>Check-in 12:00 PM • Check-out 11:00 AM</span></div>
            </div>
            <div className='mt-5 border-t pt-4'>
              <h4 className='font-semibold mb-2'>Price Breakdown</h4>
              <div className='space-y-1 text-sm'>
                <div className='flex justify-between'><span>Base</span><span>₹{price}</span></div>
                <div className='flex justify-between'><span>Service (10%)</span><span>₹{service}</span></div>
                <div className='flex justify-between border-b pb-2'><span>Taxes (12%)</span><span>₹{tax}</span></div>
                <div className='flex justify-between font-semibold pt-1'><span>Total</span><span>₹{total}</span></div>
              </div>
              <button 
                onClick={() => window.location.href = '/payment'} 
                className='w-full mt-4 bg-[#ee2e24] text-white py-3 rounded-lg font-semibold hover:bg-[#d5281f] transition-colors'
              >Book Now</button>
              <div className='text-xs text-gray-500 text-center mt-2'>You won't be charged yet</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}


