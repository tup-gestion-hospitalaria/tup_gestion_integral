import { parseHealthsites } from './healthsite';

describe('parseHealthsites', () => {
  it('parses a valid healthsites array', () => {
    expect(
      parseHealthsites([
        {
          id: '1',
          name: 'Hospital',
          city: 'La Plata',
          address: 'Calle 1',
          type: 'hospital',
          latitude: -34.9,
          longitude: -57.9,
          googleMapsUrl: 'https://maps.example',
        },
      ]),
    ).toEqual([
      {
        id: '1',
        name: 'Hospital',
        city: 'La Plata',
        address: 'Calle 1',
        type: 'hospital',
        latitude: -34.9,
        longitude: -57.9,
        googleMapsUrl: 'https://maps.example',
      },
    ]);
  });

  it('accepts an empty array', () => {
    expect(parseHealthsites([])).toEqual([]);
  });

  it('rejects non-array payloads', () => {
    expect(() => parseHealthsites({})).toThrow('HEALTHSITES_INVALID_RESPONSE');
  });
});
