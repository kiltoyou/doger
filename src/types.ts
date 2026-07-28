export interface Chat {
  id: number;
  name: string;
  preview: string;
  time: string;
  unread: number;
  color: string;
  online?: boolean;
  live?: boolean;
}

export interface Message {
  id: number;
  mine: boolean;
  text?: string;
  voice?: boolean;
  duration?: string;
  time: string;
}

export interface Participant {
  name: string;
  color: string;
  me?: boolean;
}
