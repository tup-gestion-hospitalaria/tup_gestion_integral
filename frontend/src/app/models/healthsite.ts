export interface Healthsite {
  id: string;
  name: string;
  city: string;
  address: string;
  type: string;
  latitude: number | null;
  longitude: number | null;
  googleMapsUrl: string | null;
  distance?: number | null;
}