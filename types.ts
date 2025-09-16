export interface Place {
  uri: string;
  title: string;
}

export enum Sender {
  User = 'user',
  AI = 'ai',
}

export type SpecialContentType = 'image' | 'video' | 'itineraries_button' | 'map_link';

export interface SpecialContent {
  type: SpecialContentType;
  src?: string;
  alt?: string;
  title?: string;
  // For map_link type, we can include itinerary data
  itinerary?: Array<{name: string, lat: number, lng: number, placeId: string}>;
}

export interface Message {
  id: string;
  sender: Sender;
  text: string;
  specialContent?: SpecialContent;
  places?: Place[];
}