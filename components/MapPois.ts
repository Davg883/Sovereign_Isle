export interface PointOfInterest {
  id: string;
  name: string;
  lat: number;
  lng: number;
  prompt: string;
  placeId: string;
}

export const POIs: PointOfInterest[] = [
  {
    id: 'needles',
    name: 'The Needles',
    lat: 50.6625,
    lng: -1.5897,
    prompt: 'Tell me about The Needles at Alum Bay.',
    placeId: 'ChIJ7V20sZ-5c0gRj_j-n_Zz4wA',
  },
  {
    id: 'osborne',
    name: 'Osborne House',
    lat: 50.7503,
    lng: -1.2858,
    prompt: 'What is the history of Osborne House?',
    placeId: 'ChIJPV_B-uK3c0gR7B_V_B-uI0',
  },
  {
    id: 'carisbrooke',
    name: 'Carisbrooke Castle',
    lat: 50.6876,
    lng: -1.3155,
    prompt: "What is special about Carisbrooke Castle?",
    placeId: 'ChIJTQfM_Me3c0gR4gGfM_Me3c0',
  },
  {
    id: 'shanklin',
    name: 'Shanklin Chine',
    lat: 50.6276,
    lng: -1.1764,
    prompt: "Describe what it's like to visit Shanklin Chine.",
    placeId: 'ChIJ2-p8iOG_c0gRxj-p8iOG_c0',
  },
  {
    id: 'ventnor',
    name: 'Ventnor Botanic Garden',
    lat: 50.5907,
    lng: -1.2173,
    prompt: 'What makes Ventnor Botanic Garden unique?',
    placeId: 'ChIJN_YvBfS_c0gR4_YvBfS_c0g',
  },
];