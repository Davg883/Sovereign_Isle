
export interface Place {
  uri: string;
  title: string;
}

export enum Sender {
  User = 'user',
  AI = 'ai',
}

export type SpecialContentType = 'image' | 'video' | 'itineraries_button';

export interface SpecialContent {
  type: SpecialContentType;
  src?: string;
  alt?: string;
  title?: string;
}

export interface Message {
  id: string;
  sender: Sender;
  text: string;
  specialContent?: SpecialContent;
  places?: Place[];
}
