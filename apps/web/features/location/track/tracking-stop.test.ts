import { describe, expect, it } from 'vitest';
import { trackingStop } from './tracking-stop';

const pickup = { exact: { lat: 6.5, lng: 3.4 }, approx: { lat: 6.501, lng: 3.401 } };
const destination = { approx: { lat: 6.6, lng: 3.5 } };

describe('trackingStop', () => {
  it('is the pickup until the item is picked up, then the drop-off', () => {
    expect(trackingStop({ status: 'IN_PROGRESS', pickup, destination })).toEqual({ point: { lat: 6.5, lng: 3.4 }, label: 'Pickup', kind: 'pickup' });
    expect(trackingStop({ status: 'PICKED_UP', pickup, destination })).toEqual({ point: { lat: 6.6, lng: 3.5 }, label: 'Drop-off', kind: 'destination' });
  });

  it('takes the exact point when there is one, otherwise the approximate point', () => {
    expect(trackingStop({ status: 'ACCEPTED', pickup })?.point).toEqual({ lat: 6.5, lng: 3.4 });
    expect(trackingStop({ status: 'ACCEPTED', pickup: { approx: { lat: 6.7, lng: 3.6 } } })?.point).toEqual({ lat: 6.7, lng: 3.6 });
  });

  it('heads to the drop-off when there is no pickup, and to nothing when no point is known', () => {
    expect(trackingStop({ status: 'IN_PROGRESS', pickup: null, destination })).toMatchObject({ label: 'Drop-off' });
    expect(trackingStop({ status: 'IN_PROGRESS', pickup: { area: 'Yaba' }, destination: undefined })).toBeNull();
  });
});
