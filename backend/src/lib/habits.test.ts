import { describe, it, expect } from 'vitest';
import { computeLogPatch } from './habits.js';

describe('computeLogPatch — binary_daily', () => {
  it('toggle from nothing → completed', () => {
    const r = computeLogPatch({ missionType: 'binary_daily', previous: null, action: { kind: 'toggle' } });
    expect(r).toMatchObject({ value: 1, completed: true, skipped: false });
  });

  it('toggle from completed → uncompleted', () => {
    const r = computeLogPatch({
      missionType: 'binary_daily',
      previous: { value: 1, completed: true, subtask_state: null },
      action: { kind: 'toggle' },
    });
    expect(r).toMatchObject({ value: 0, completed: false, skipped: false });
  });

  it('increment sets completed=true', () => {
    const r = computeLogPatch({
      missionType: 'binary_daily',
      previous: null,
      action: { kind: 'increment', step: 1 },
    });
    expect(r).toMatchObject({ value: 1, completed: true, skipped: false });
  });
});

describe('computeLogPatch — quantitative_daily', () => {
  it('increment accumulates value', () => {
    const r = computeLogPatch({
      missionType: 'quantitative_daily',
      previous: { value: 2, completed: false, subtask_state: null },
      action: { kind: 'increment', step: 1 },
      dailyTarget: 8,
    });
    expect(r).toMatchObject({ value: 3, completed: false, skipped: false });
  });

  it('completes when target reached', () => {
    const r = computeLogPatch({
      missionType: 'quantitative_daily',
      previous: { value: 7, completed: false, subtask_state: null },
      action: { kind: 'increment', step: 1 },
      dailyTarget: 8,
    });
    expect(r).toMatchObject({ value: 8, completed: true, skipped: false });
  });

  it('stays completed past target', () => {
    const r = computeLogPatch({
      missionType: 'quantitative_daily',
      previous: { value: 8, completed: true, subtask_state: null },
      action: { kind: 'increment', step: 1 },
      dailyTarget: 8,
    });
    expect(r).toMatchObject({ value: 9, completed: true, skipped: false });
  });

  it('set_value jumps to the given number', () => {
    const r = computeLogPatch({
      missionType: 'quantitative_daily',
      previous: { value: 2, completed: false, subtask_state: null },
      action: { kind: 'set_value', value: 5 },
      dailyTarget: 8,
    });
    expect(r).toMatchObject({ value: 5, completed: false, skipped: false });
  });

  it('toggle on not-completed fills to target', () => {
    const r = computeLogPatch({
      missionType: 'quantitative_daily',
      previous: { value: 3, completed: false, subtask_state: null },
      action: { kind: 'toggle' },
      dailyTarget: 8,
    });
    expect(r).toMatchObject({ value: 8, completed: true, skipped: false });
  });

  it('toggle on completed resets to zero', () => {
    const r = computeLogPatch({
      missionType: 'quantitative_daily',
      previous: { value: 8, completed: true, subtask_state: null },
      action: { kind: 'toggle' },
      dailyTarget: 8,
    });
    expect(r).toMatchObject({ value: 0, completed: false, skipped: false });
  });

  it('handles missing dailyTarget as 1', () => {
    const r = computeLogPatch({
      missionType: 'quantitative_daily',
      previous: null,
      action: { kind: 'increment', step: 1 },
    });
    expect(r?.completed).toBe(true);
  });
});

describe('computeLogPatch — checklist_daily', () => {
  const subtasks = [
    { key: 'a', label: 'A' },
    { key: 'b', label: 'B' },
    { key: 'c', label: 'C' },
  ];

  it('ticks one subtask and is not completed yet', () => {
    const r = computeLogPatch({
      missionType: 'checklist_daily',
      previous: null,
      action: { kind: 'subtask', key: 'a', completed: true },
      subtasks,
    });
    expect(r?.completed).toBe(false);
    expect(r?.value).toBe(1);
    expect(r?.subtask_state).toEqual({ a: true });
  });

  it('ticking the last subtask completes the day', () => {
    const r = computeLogPatch({
      missionType: 'checklist_daily',
      previous: { value: 2, completed: false, subtask_state: { a: true, b: true } },
      action: { kind: 'subtask', key: 'c', completed: true },
      subtasks,
    });
    expect(r?.completed).toBe(true);
    expect(r?.value).toBe(3);
    expect(r?.subtask_state).toEqual({ a: true, b: true, c: true });
  });

  it('unticking a completed subtask un-completes the day', () => {
    const r = computeLogPatch({
      missionType: 'checklist_daily',
      previous: { value: 3, completed: true, subtask_state: { a: true, b: true, c: true } },
      action: { kind: 'subtask', key: 'b', completed: false },
      subtasks,
    });
    expect(r?.completed).toBe(false);
    expect(r?.subtask_state).toEqual({ a: true, b: false, c: true });
  });

  it('toggle all-unticked → all-ticked', () => {
    const r = computeLogPatch({
      missionType: 'checklist_daily',
      previous: null,
      action: { kind: 'toggle' },
      subtasks,
    });
    expect(r?.completed).toBe(true);
    expect(r?.subtask_state).toEqual({ a: true, b: true, c: true });
  });

  it('toggle all-ticked → all-unticked', () => {
    const r = computeLogPatch({
      missionType: 'checklist_daily',
      previous: { value: 3, completed: true, subtask_state: { a: true, b: true, c: true } },
      action: { kind: 'toggle' },
      subtasks,
    });
    expect(r?.completed).toBe(false);
    expect(r?.subtask_state).toEqual({ a: false, b: false, c: false });
  });

  it('empty subtasks list → never completes', () => {
    const r = computeLogPatch({
      missionType: 'checklist_daily',
      previous: null,
      action: { kind: 'toggle' },
      subtasks: [],
    });
    expect(r?.completed).toBe(false);
  });
});

describe('computeLogPatch — one_shot', () => {
  it('returns null so caller skips the daily path', () => {
    const r = computeLogPatch({
      missionType: 'one_shot',
      previous: null,
      action: { kind: 'toggle' },
    });
    expect(r).toBeNull();
  });
});

describe('computeLogPatch — skip / unskip', () => {
  it('skip on a fresh day marks day as skipped, not completed', () => {
    const r = computeLogPatch({
      missionType: 'binary_daily',
      previous: null,
      action: { kind: 'skip' },
    });
    expect(r).toMatchObject({ value: 0, completed: false, skipped: true });
  });

  it('skip works the same way for quantitative', () => {
    const r = computeLogPatch({
      missionType: 'quantitative_daily',
      previous: { value: 3, completed: false, subtask_state: null },
      action: { kind: 'skip' },
      dailyTarget: 8,
    });
    expect(r).toMatchObject({ value: 0, completed: false, skipped: true });
  });

  it('unskip clears the skipped flag', () => {
    const r = computeLogPatch({
      missionType: 'binary_daily',
      previous: null,
      action: { kind: 'unskip' },
    });
    expect(r).toMatchObject({ value: 0, completed: false, skipped: false });
  });

  it('logging progress on a skipped day clears skipped (binary)', () => {
    const r = computeLogPatch({
      missionType: 'binary_daily',
      previous: null,
      action: { kind: 'toggle' },
    });
    expect(r?.skipped).toBe(false);
    expect(r?.completed).toBe(true);
  });

  it('logging progress on a skipped day clears skipped (quantitative)', () => {
    const r = computeLogPatch({
      missionType: 'quantitative_daily',
      previous: { value: 0, completed: false, subtask_state: null },
      action: { kind: 'increment', step: 1 },
      dailyTarget: 8,
    });
    expect(r?.skipped).toBe(false);
  });

  it('skip on one_shot is still null (no daily log path)', () => {
    const r = computeLogPatch({
      missionType: 'one_shot',
      previous: null,
      action: { kind: 'skip' },
    });
    expect(r).toBeNull();
  });
});
