import { Healthsite } from './healthsite';

export interface Patient {
  id: string;
  fullName: string;
  email: string;
  city: string;
  country: string;
  picture: string;
  active: boolean;
  healthsite?: Healthsite;
}
