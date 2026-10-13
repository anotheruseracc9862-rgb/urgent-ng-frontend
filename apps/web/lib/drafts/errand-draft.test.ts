import { beforeEach, describe, expect, it } from 'vitest';
import { clearErrandDraft, readErrandDraft, saveErrandDraft } from './errand-draft';

describe('errand draft', () => {
  beforeEach(() => sessionStorage.clear());

  it('round-trips a draft', () => {
    saveErrandDraft({
      budgetNaira: 3500,
      title: 'Pick up a document',
      pickup: 'Lekki',
      destination: 'Ikeja',
      category: 'Document',
      urgency: 'immediate',
    });
    expect(readErrandDraft()).toMatchObject({ budgetNaira: 3500, pickup: 'Lekki' });
    clearErrandDraft();
    expect(readErrandDraft()).toBeNull();
  });
});
