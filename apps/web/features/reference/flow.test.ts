import { describe, expect, it } from 'vitest';
import {
  CANCEL_BLOCKED, CONFIRM_COPY, DISPUTE_TYPE_ORDER, DOING_NOW, EXECUTION_STEPS, FLOW_GROUP_LABEL, PLACE_COPY, STATUS_LINE, STEP_COPY,
  flowOf, isService, type CategoryFlow, type RunnerStep,
} from './flow';

const FLOWS: CategoryFlow[] = ['TRANSIT', 'SERVICE'];
const STEPS: RunnerStep[] = ['start', 'pickup', 'deliver'];

describe('flowOf', () => {
  it('treats anything that is not a service as a transit errand', () => {
    expect(flowOf(undefined)).toBe('TRANSIT');
    expect(flowOf(null)).toBe('TRANSIT');
    expect(flowOf({})).toBe('TRANSIT');
    expect(flowOf({ flow: null })).toBe('TRANSIT');
    expect(flowOf({ flow: 'TRANSIT' })).toBe('TRANSIT');
  });

  it('reads a category, or the flow itself', () => {
    expect(flowOf({ flow: 'SERVICE' })).toBe('SERVICE');
    expect(flowOf('SERVICE')).toBe('SERVICE');
    expect(isService({ flow: 'SERVICE' })).toBe(true);
    expect(isService({ flow: 'TRANSIT' })).toBe(false);
  });
});

describe.each(FLOWS)('%s copy', (flow) => {
  it('has five milestones and a label for every status the runner passes through', () => {
    expect(EXECUTION_STEPS[flow]).toHaveLength(5);
    expect(new Set(EXECUTION_STEPS[flow]).size).toBe(5);
    for (const status of ['ACCEPTED', 'IN_PROGRESS', 'PICKED_UP']) expect(DOING_NOW[flow][status]).toBeTruthy();
    for (const status of ['IN_PROGRESS', 'PICKED_UP', 'DELIVERED']) expect(STATUS_LINE[flow][status]).toBeTruthy();
  });

  it('has the words for all three runner steps', () => {
    for (const step of STEPS) {
      const copy = STEP_COPY[flow][step];
      expect(copy.title).toContain(`Step ${STEPS.indexOf(step) + 1} of 3`);
      for (const text of [copy.action, copy.confirm, copy.recorded]) expect(text.length).toBeGreaterThan(5);
    }
  });

  it('explains why cancelling is blocked, and names the places', () => {
    for (const text of Object.values(CANCEL_BLOCKED[flow])) expect(text.length).toBeGreaterThan(10);
    expect(PLACE_COPY[flow].destination).toBeTruthy();
    expect(CONFIRM_COPY[flow]).toMatch(/^I confirm/);
    expect(FLOW_GROUP_LABEL[flow]).toBeTruthy();
  });

  it('offers dispute types, and always a way out with OTHER', () => {
    expect(DISPUTE_TYPE_ORDER[flow].at(-1)).toBe('OTHER');
    expect(new Set(DISPUTE_TYPE_ORDER[flow]).size).toBe(DISPUTE_TYPE_ORDER[flow].length);
  });
});

describe('what differs between the flows', () => {
  it('asks for a photo at both work steps of a service, and at none of a delivery', () => {
    expect(STEPS.map((step) => STEP_COPY.SERVICE[step].photoRequired)).toEqual([false, true, true]);
    expect(STEPS.map((step) => STEP_COPY.TRANSIT[step].photoRequired)).toEqual([false, false, false]);
  });

  it('keeps the transit wording that existing screens and tests rely on', () => {
    expect(STEP_COPY.TRANSIT.start.action).toBe('Start errand');
    expect(STEP_COPY.TRANSIT.pickup.action).toBe('Confirm pickup');
    expect(STEP_COPY.TRANSIT.deliver.action).toBe('Confirm delivery');
    expect(EXECUTION_STEPS.TRANSIT).toEqual(['Accepted', 'Started', 'Picked up', 'Delivered', 'Done']);
  });

  it('gives a service its own dispute types and none of the item ones', () => {
    expect(DISPUTE_TYPE_ORDER.SERVICE).toEqual(expect.arrayContaining(['SERVICE_NOT_DONE', 'POOR_QUALITY', 'PROPERTY_DAMAGE']));
    expect(DISPUTE_TYPE_ORDER.SERVICE.some((type) => type.startsWith('ITEM_'))).toBe(false);
    expect(DISPUTE_TYPE_ORDER.TRANSIT.some((type) => type.startsWith('SERVICE_'))).toBe(false);
  });
});
