import {
  describe,
  expect,
  it,
  jest,
  beforeAll,
  beforeEach,
} from '@jest/globals';

import { DateHelper } from '../date.helper.js';

describe('Date helper test suite', () => {
  it('getDateQuery - returns proper query', () => {
    jest
      .spyOn(global.Date, 'now')
      .mockImplementation(() => Date.parse('01-30-2022'));

    const result = DateHelper.getWeekEdgeDates();

    expect(result).toEqual({ endDate: '2022-01-30', startDate: '2022-01-23' });
  });

  it('getDateQuery - gets months with single number code', () => {
    jest
      .spyOn(global.Date, 'now')
      .mockImplementation(() => Date.parse('09-09-2022'));

    const result = DateHelper.getWeekEdgeDates();

    expect(result).toEqual({ endDate: '2022-09-09', startDate: '2022-09-02' });
  });

  it('getDateQuery - gets month with double number code', () => {
    jest
      .spyOn(global.Date, 'now')
      .mockImplementation(() => Date.parse('12-09-2022'));

    const result = DateHelper.getWeekEdgeDates();

    expect(result).toEqual({ endDate: '2022-12-09', startDate: '2022-12-02' });
  });

  it('getDateQuery - returns query with week overlapping on two months', () => {
    jest
      .spyOn(global.Date, 'now')
      .mockImplementation(() => Date.parse('12-04-2022'));

    const result = DateHelper.getWeekEdgeDates();

    expect(result).toEqual({ endDate: '2022-12-04', startDate: '2022-11-27' });
  });

  it('should be able add minutes to a Date', () => {
    const date = new Date('2021-10-13T13:13:00.000Z');
    const result = DateHelper.addMinutes(date, 5);
    expect(result).toBeInstanceOf(Date);
    expect(result.toISOString()).toBe('2021-10-13T13:18:00.000Z');
  });

  it('should be able substract minutes from a Date', () => {
    const date = new Date('2003-01-05T20:00:00.000Z');
    const result = DateHelper.subsMinutes(date, 5);
    expect(result).toBeInstanceOf(Date);
    expect(result.toISOString()).toBe('2003-01-05T19:55:00.000Z');
  });

  it('should be able to convert to SQL format', () => {
    const date = new Date('2003-01-05T20:00:00.000Z');
    const result = DateHelper.dateToSQLDateTime(date);
    expect(result).toBe('2003-01-05 20:00:00');
  });
  
  it('dateToPlainISO - converts date to plain ISO format', () => {
    const date = new Date('2003-01-05T20:00:00.000Z');
    const result = DateHelper.dateToPlainISO(date);
    expect(result).toBe('20030105T200000000Z');
  });
});
