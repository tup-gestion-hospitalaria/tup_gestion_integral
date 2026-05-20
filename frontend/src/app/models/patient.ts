import { Healthsite } from './healthsite';

export interface Patient {
  fullName: string;
  email: string;
  city: string;
  country: string;
  picture: string;
  healthsite?: Healthsite;
}